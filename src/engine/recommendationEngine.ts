import {
  createDefaultConstraints,
  formatPropertyValue,
  getMaterialPropertyValue,
  PROPERTY_DEFINITIONS,
  PROPERTY_MAP,
} from '../data/properties';
import {
  ConstraintBottleneck,
  Material,
  MaterialCategory,
  PropertyConstraint,
  PropertyKey,
  PropertyScoreBreakdown,
  RecommendationItem,
  RecommendationSummary,
} from '../types/material';

/**
 * Compute dataset empirical min/max (in linear or log10 space) for accurate normalization.
 */
function computePropertyBounds(materials: Material[]): Record<PropertyKey, { min: number; max: number }> {
  const bounds = {} as Record<PropertyKey, { min: number; max: number }>;

  for (const def of PROPERTY_DEFINITIONS) {
    const values: number[] = [];
    for (const m of materials) {
      const v = getMaterialPropertyValue(m, def.key);
      if (v != null && Number.isFinite(v)) {
        values.push(v);
      }
    }
    if (values.length === 0) {
      bounds[def.key] = { min: def.minBound, max: def.maxBound };
    } else {
      const min = Math.min(...values);
      const max = Math.max(...values);
      bounds[def.key] = {
        min,
        max: max > min ? max : min + 1,
      };
    }
  }
  return bounds;
}

function toScaleSpace(value: number, min: number, max: number, scaleType: 'linear' | 'log'): number {
  if (scaleType === 'log') {
    const safeMin = Math.max(min, 0.01);
    const safeVal = Math.max(value, safeMin * 0.5);
    const safeMax = Math.max(max, safeMin * 1.1);
    const logMin = Math.log10(safeMin);
    const logMax = Math.log10(safeMax);
    const logVal = Math.log10(safeVal);
    if (logMax <= logMin) return 0.5;
    return Math.min(1.2, Math.max(-0.2, (logVal - logMin) / (logMax - logMin)));
  }
  if (max <= min) return 0.5;
  return Math.min(1.2, Math.max(-0.2, (value - min) / (max - min)));
}

function scoreSingleProperty(
  rawValue: number | null,
  constraint: PropertyConstraint,
  dataBounds: { min: number; max: number }
): { score: number | null; passedHard: boolean; reason?: string } {
  const def = PROPERTY_MAP[constraint.key];

  if (constraint.direction === 'ignore') {
    return { score: null, passedHard: true };
  }

  if (rawValue == null) {
    return {
      score: null,
      passedHard: !constraint.isHardConstraint,
      reason: constraint.isHardConstraint ? `${def.nameKo} 데이터 미확보` : undefined,
    };
  }

  // Evaluate Hard Constraint
  let passedHard = true;
  let reason: string | undefined;

  if (constraint.isHardConstraint) {
    if (constraint.direction === 'minimize' && rawValue > constraint.maxVal) {
      passedHard = false;
      reason = `${def.nameKo} ${formatPropertyValue(rawValue, constraint.key)} ${def.unit} > 상한 ${formatPropertyValue(constraint.maxVal, constraint.key)}`;
    } else if (constraint.direction === 'maximize' && rawValue < constraint.minVal) {
      passedHard = false;
      reason = `${def.nameKo} ${formatPropertyValue(rawValue, constraint.key)} ${def.unit} < 하한 ${formatPropertyValue(constraint.minVal, constraint.key)}`;
    } else if (constraint.direction === 'range') {
      const low = Math.min(constraint.minVal, constraint.maxVal);
      const high = Math.max(constraint.minVal, constraint.maxVal);
      if (rawValue < low || rawValue > high) {
        passedHard = false;
        reason = `${def.nameKo} ${formatPropertyValue(rawValue, constraint.key)} ∉ [${formatPropertyValue(low, constraint.key)}, ${formatPropertyValue(high, constraint.key)}]`;
      }
    } else if (constraint.direction === 'target') {
      const span = Math.max((dataBounds.max - dataBounds.min) * 0.2, Math.abs(constraint.targetVal) * 0.35);
      if (Math.abs(rawValue - constraint.targetVal) > span) {
        passedHard = false;
        reason = `${def.nameKo} 목표치(${formatPropertyValue(constraint.targetVal, constraint.key)}) 허용 오차 초과`;
      }
    }
  }

  // Normalized score s_ij in [0, 100]
  const normVal = Math.min(1, Math.max(0, toScaleSpace(rawValue, dataBounds.min, dataBounds.max, def.scaleType)));
  let normalizedScore = 50;

  if (constraint.direction === 'minimize') {
    normalizedScore = (1 - normVal) * 100;
  } else if (constraint.direction === 'maximize') {
    normalizedScore = normVal * 100;
  } else if (constraint.direction === 'range') {
    const low = Math.min(constraint.minVal, constraint.maxVal);
    const high = Math.max(constraint.minVal, constraint.maxVal);
    if (rawValue >= low && rawValue <= high) {
      const mid = (low + high) / 2;
      const half = Math.max((high - low) / 2, 1e-6);
      const centerBonus = 1 - Math.abs(rawValue - mid) / half;
      normalizedScore = 82 + centerBonus * 18;
    } else {
      const dist = rawValue < low ? low - rawValue : rawValue - high;
      const totalSpan = Math.max(dataBounds.max - dataBounds.min, 1e-6);
      normalizedScore = Math.max(0, 70 * (1 - dist / (totalSpan * 0.5)));
    }
  } else if (constraint.direction === 'target') {
    const normTarget = Math.min(
      1,
      Math.max(0, toScaleSpace(constraint.targetVal, dataBounds.min, dataBounds.max, def.scaleType))
    );
    const diff = Math.abs(normVal - normTarget);
    normalizedScore = Math.max(0, 100 * (1 - diff / 0.55));
  }

  return {
    score: Math.round(normalizedScore * 10) / 10,
    passedHard,
    reason,
  };
}

export function evaluateMaterials(
  materials: Material[],
  constraints: Record<PropertyKey, PropertyConstraint>
): RecommendationSummary {
  const bounds = computePropertyBounds(materials);
  const activeConstraints = Object.values(constraints).filter((c) => c.direction !== 'ignore');
  const totalWeight = activeConstraints.reduce((sum, c) => sum + c.importance, 0);

  const evaluated: RecommendationItem[] = materials.map((material) => {
    const breakdowns: PropertyScoreBreakdown[] = [];
    const failedHardConstraints: PropertyKey[] = [];
    let weightedSum = 0;
    let validWeightSum = 0;
    let validActiveCount = 0;

    for (const constraint of activeConstraints) {
      const rawValue = getMaterialPropertyValue(material, constraint.key);
      const res = scoreSingleProperty(rawValue, constraint, bounds[constraint.key]);

      if (!res.passedHard) {
        failedHardConstraints.push(constraint.key);
      }

      if (res.score !== null) {
        weightedSum += res.score * constraint.importance;
        validWeightSum += constraint.importance;
        validActiveCount += 1;
      }

      breakdowns.push({
        key: constraint.key,
        rawValue,
        normalizedScore: res.score,
        weight: constraint.importance,
        passedHardConstraint: res.passedHard,
        constraintReason: res.reason,
      });
    }

    const coverageRatio =
      activeConstraints.length > 0 ? validActiveCount / activeConstraints.length : 1;

    // Raw weighted average S_i = sum(w_j * s_ij) / sum(w_j)
    const rawWeightedAvg = validWeightSum > 0 ? weightedSum / validWeightSum : 0;

    // Penalize incomplete data coverage honestly so missing data never inflates rank
    const completenessMultiplier = 0.65 + 0.35 * coverageRatio;
    const totalScore =
      activeConstraints.length === 0
        ? 0
        : Math.round(rawWeightedAvg * completenessMultiplier * 10) / 10;

    const scoredBreakdowns = breakdowns
      .filter((b): b is PropertyScoreBreakdown & { normalizedScore: number } => b.normalizedScore !== null)
      .sort((a, b) => b.normalizedScore - a.normalizedScore);

    const strongest =
      scoredBreakdowns.length > 0
        ? { key: scoredBreakdowns[0].key, score: scoredBreakdowns[0].normalizedScore }
        : null;
    const weakest =
      scoredBreakdowns.length > 0
        ? {
            key: scoredBreakdowns[scoredBreakdowns.length - 1].key,
            score: scoredBreakdowns[scoredBreakdowns.length - 1].normalizedScore,
          }
        : null;

    const passedAllHardConstraints = failedHardConstraints.length === 0;

    // Generate authentic data-driven reasons
    const recommendationReasons: string[] = [];
    if (strongest) {
      const def = PROPERTY_MAP[strongest.key];
      const val = getMaterialPropertyValue(material, strongest.key);
      recommendationReasons.push(
        `${def.nameKo} 항목에서 ${formatPropertyValue(val, strongest.key)} ${def.unit} (적합도 ${strongest.score.toFixed(0)}점)으로 우수한 성능을 보입니다.`
      );
    }
    if (coverageRatio < 1) {
      const missingCount = activeConstraints.length - validActiveCount;
      recommendationReasons.push(
        `선택한 조건 중 ${missingCount}개 물성의 검증 데이터가 미확보 상태여서 데이터 신뢰 보정(${Math.round(coverageRatio * 100)}% 커버리지)이 반영되었습니다.`
      );
    } else if (activeConstraints.length > 0) {
      recommendationReasons.push(
        `설정한 ${activeConstraints.length}개 평가 물성 전체에 대한 실제 검증 데이터를 보유하고 있습니다.`
      );
    }
    if (passedAllHardConstraints && activeConstraints.some((c) => c.isHardConstraint)) {
      recommendationReasons.push('사용자가 지정한 모든 필수 제약 조건을 충족합니다.');
    }

    return {
      material,
      totalScore,
      coverageRatio,
      passedAllHardConstraints,
      failedHardConstraints,
      breakdowns,
      strongestProperty: strongest,
      weakestProperty: weakest,
      recommendationReasons,
      differenceHighlights: [],
      rank: null,
    };
  });

  const passing = evaluated
    .filter((item) => item.passedAllHardConstraints)
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const rejected = evaluated
    .filter((item) => !item.passedAllHardConstraints)
    .sort((a, b) => {
      if (a.failedHardConstraints.length !== b.failedHardConstraints.length) {
        return a.failedHardConstraints.length - b.failedHardConstraints.length;
      }
      return b.totalScore - a.totalScore;
    });

  // Annotate comparative differences between #1, #2, #3
  const topCandidates = passing.slice(0, 3);
  if (topCandidates.length > 1) {
    const leader = topCandidates[0];
    topCandidates.forEach((candidate, index) => {
      if (index === 0) {
        const second = topCandidates[1];
        const gap = (candidate.totalScore - second.totalScore).toFixed(1);
        candidate.differenceHighlights = [
          `2순위(${second.material.nameKo}) 대비 종합 적합도 +${gap}점 우위`,
        ];
      } else {
        const betterProps = candidate.breakdowns
          .filter((b) => {
            const leaderB = leader.breakdowns.find((lb) => lb.key === b.key);
            return (
              b.normalizedScore != null &&
              leaderB?.normalizedScore != null &&
              b.normalizedScore > leaderB.normalizedScore + 4
            );
          })
          .map((b) => PROPERTY_MAP[b.key].nameKo);

        if (betterProps.length > 0) {
          candidate.differenceHighlights = [
            `1순위 대비 ${betterProps.slice(0, 2).join('·')} 항목에서 더 우수한 대안`,
          ];
        } else {
          candidate.differenceHighlights = [
            `1순위와 유사한 물성 균형을 갖춘 ${candidate.material.category} 계열 대안`,
          ];
        }
      }
    });
  }

  // Bottleneck analysis when passing is empty
  const bottlenecks: ConstraintBottleneck[] = [];
  if (passing.length === 0) {
    const hardConstraints = activeConstraints.filter((c) => c.isHardConstraint);
    for (const hc of hardConstraints) {
      const eliminated = evaluated.filter((e) => e.failedHardConstraints.includes(hc.key)).length;
      const def = PROPERTY_MAP[hc.key];
      // Compute what relaxing only this constraint yields
      const values = materials
        .map((m) => getMaterialPropertyValue(m, hc.key))
        .filter((v): v is number => v != null)
        .sort((a, b) => a - b);

      let suggestedRelaxation = '';
      let relaxedMinVal: number | undefined;
      let relaxedMaxVal: number | undefined;

      if (hc.direction === 'minimize' && values.length > 0) {
        const target = Math.min(def.maxBound, Number((hc.maxVal * 1.45).toFixed(def.decimals)));
        relaxedMaxVal = target;
        suggestedRelaxation = `${def.nameKo} 상한을 ${formatPropertyValue(target, hc.key)} ${def.unit}까지 완화`;
      } else if (hc.direction === 'maximize' && values.length > 0) {
        const target = Math.max(def.minBound, Number((hc.minVal * 0.65).toFixed(def.decimals)));
        relaxedMinVal = target;
        suggestedRelaxation = `${def.nameKo} 하한을 ${formatPropertyValue(target, hc.key)} ${def.unit}까지 완화`;
      } else {
        suggestedRelaxation = `${def.nameKo} 필수 조건을 선호 조건으로 전환`;
      }

      bottlenecks.push({
        key: hc.key,
        eliminatedCount: eliminated,
        suggestedRelaxation,
        relaxedMinVal,
        relaxedMaxVal,
      });
    }
    bottlenecks.sort((a, b) => b.eliminatedCount - a.eliminatedCount);
  }

  return {
    passing,
    rejected,
    topCandidates,
    bottlenecks,
    relaxedPreviewCandidates: passing.length === 0 ? rejected.slice(0, 3) : [],
    activePropertyCount: activeConstraints.length,
    totalWeight,
  };
}

export interface NaturalSearchPlan {
  matchedIntentLabel: string;
  categoryFilter: MaterialCategory | '전체';
  constraints: Record<PropertyKey, PropertyConstraint>;
  sortDescription: string;
}

/**
 * Maps Korean/English natural-language engineering queries directly to real constraint configurations
 * evaluated by the recommendation engine (never just string-matching material names).
 */
export function parseNaturalQueryToPlan(query: string): NaturalSearchPlan {
  const q = query.trim().toLowerCase();
  const base = createDefaultConstraints();

  // Reset all to ignore first so the intent cleanly drives scoring
  (Object.keys(base) as PropertyKey[]).forEach((k) => {
    base[k].direction = 'ignore';
    base[k].isHardConstraint = false;
  });

  let categoryFilter: MaterialCategory | '전체' = '전체';
  const intents: string[] = [];

  if (q.includes('금속') || q.includes('합금') || q.includes('강철')) categoryFilter = '금속 및 합금';
  else if (q.includes('세라믹') || q.includes('유리')) categoryFilter = '세라믹';
  else if (q.includes('탄소') || q.includes('그래핀')) categoryFilter = '탄소계 소재';
  else if (q.includes('고분자') || q.includes('플라스틱') || q.includes('복합')) categoryFilter = '고분자 및 복합재료';
  else if (q.includes('반도체') || q.includes('전자')) categoryFilter = '반도체 및 전자소재';
  else if (q.includes('건축') || q.includes('목재') || q.includes('콘크리트') || q.includes('천연')) categoryFilter = '건축 및 천연소재';
  else if (q.includes('특수') || q.includes('메타') || q.includes('초전도')) categoryFilter = '특수 소재';

  if (q.includes('가벼') || q.includes('경량') || q.includes('저밀도') || q.includes('light')) {
    base.density.direction = 'minimize';
    base.density.importance = 5;
    intents.push('최소 밀도(경량화)');
  }
  if (q.includes('강도') || q.includes('튼튼') || q.includes('강한') || q.includes('strength')) {
    base.tensileStrength.direction = 'maximize';
    base.tensileStrength.importance = 5;
    intents.push('최대 인장강도');
  }
  if (q.includes('비강도')) {
    base.specificStrength.direction = 'maximize';
    base.specificStrength.importance = 5;
    intents.push('최대 비강도');
  }
  if (q.includes('열전도') || q.includes('방열') || q.includes('thermal')) {
    base.thermalConductivity.direction = 'maximize';
    base.thermalConductivity.importance = 5;
    intents.push('최고 열전도율');
  }
  if (q.includes('단열') || q.includes('보온')) {
    base.thermalConductivity.direction = 'minimize';
    base.thermalConductivity.importance = 5;
    intents.push('최소 열전도율(단열)');
  }
  if (q.includes('내열') || q.includes('고온') || q.includes('불에') || q.includes('heat')) {
    base.maxServiceTemperature.direction = 'maximize';
    base.maxServiceTemperature.importance = 5;
    intents.push('최고 내열 온도');
  }
  if (q.includes('전기') || q.includes('전도') || q.includes('전류')) {
    base.electricalConductivity.direction = 'maximize';
    base.electricalConductivity.importance = 5;
    intents.push('최고 전기전도도');
  }
  if (q.includes('절연')) {
    base.electricalConductivity.direction = 'minimize';
    base.electricalConductivity.importance = 5;
    intents.push('전기 절연성');
  }
  if (q.includes('부식') || q.includes('녹') || q.includes('내화학') || q.includes('corrosion')) {
    base.corrosionResistance.direction = 'maximize';
    base.corrosionResistance.importance = 5;
    intents.push('최고 내부식성');
  }
  if (q.includes('경도') || q.includes('단단') || q.includes('마모')) {
    base.hardness.direction = 'maximize';
    base.hardness.importance = 5;
    intents.push('최고 표면 경도');
  }
  if (q.includes('강성') || q.includes('탄성') || q.includes('휘지')) {
    base.youngModulus.direction = 'maximize';
    base.youngModulus.importance = 5;
    intents.push('최대 탄성계수');
  }
  if (q.includes('인성') || q.includes('충격') || q.includes('깨지지')) {
    base.fractureToughness.direction = 'maximize';
    base.fractureToughness.importance = 5;
    intents.push('최대 파괴인성');
  }

  return {
    matchedIntentLabel: intents.length > 0 ? intents.join(' + ') : '텍스트/물성 통합 탐색',
    categoryFilter,
    constraints: base,
    sortDescription:
      intents.length > 0
        ? `실제 물성 엔진 가중치(${intents.join(', ')}) 기반 실시간 정렬`
        : '소재명·조성·응용분야 키워드 매칭',
  };
}
