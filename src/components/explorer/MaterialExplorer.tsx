import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  GitCompare,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { APPLICATION_DOMAINS } from '../../data/applications';
import {
  formatPropertyValue,
  getMaterialPropertyValue,
  PROPERTY_DEFINITIONS,
  PROPERTY_MAP,
} from '../../data/properties';
import {
  Material,
  PropertyConstraint,
  PropertyKey,
  RecommendationItem,
  RecommendationSummary,
} from '../../types/material';
import { MaterialViewer3D, MaterialViewer3DHandle } from '../three/MaterialViewer3D';
import { MaterialAnalyzer } from './MaterialAnalyzer';
import { PropertySlider } from './PropertySlider';

interface MaterialExplorerProps {
  materials: Material[];
  constraints: Record<PropertyKey, PropertyConstraint>;
  summary: RecommendationSummary;
  activeDomainId: string | null;
  compareIds: string[];
  reducedMotion?: boolean;
  onUpdateConstraint: (key: PropertyKey, updated: PropertyConstraint) => void;
  onApplyDomainPreset: (domainId: string) => void;
  onResetConstraints: () => void;
  onToggleCompare: (materialId: string) => void;
  onOpenReport: (snapshotDataUrl: string | null) => void;
  onSaveSession: () => void;
}

export const MaterialExplorer: React.FC<MaterialExplorerProps> = ({
  constraints,
  summary,
  activeDomainId,
  compareIds,
  reducedMotion = false,
  onUpdateConstraint,
  onApplyDomainPreset,
  onResetConstraints,
  onToggleCompare,
  onOpenReport,
  onSaveSession,
}) => {
  const [showAdditionalProps, setShowAdditionalProps] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAllEvaluated, setShowAllEvaluated] = useState(false);
  const viewerRef = useRef<MaterialViewer3DHandle | null>(null);

  const essentialDefs = useMemo(
    () => PROPERTY_DEFINITIONS.filter((d) => d.tier === 'essential'),
    []
  );
  const additionalDefs = useMemo(
    () => PROPERTY_DEFINITIONS.filter((d) => d.tier === 'additional'),
    []
  );

  // Determine actively inspected RecommendationItem
  const allEvaluated = useMemo(
    () => [...summary.passing, ...summary.rejected],
    [summary]
  );

  const inspectedItem: RecommendationItem | undefined = useMemo(() => {
    if (selectedMaterialId) {
      const found = allEvaluated.find((item) => item.material.id === selectedMaterialId);
      if (found) return found;
    }
    return summary.topCandidates[0] || allEvaluated[0];
  }, [selectedMaterialId, allEvaluated, summary.topCandidates]);

  const inspectedMaterial = inspectedItem?.material;
  const isInCompare = inspectedMaterial ? compareIds.includes(inspectedMaterial.id) : false;

  const handleRelaxBottleneck = (key: PropertyKey, relaxedMin?: number, relaxedMax?: number) => {
    const cur = constraints[key];
    if (relaxedMax !== undefined) {
      onUpdateConstraint(key, { ...cur, maxVal: relaxedMax });
    } else if (relaxedMin !== undefined) {
      onUpdateConstraint(key, { ...cur, minVal: relaxedMin });
    } else {
      onUpdateConstraint(key, { ...cur, isHardConstraint: false });
    }
  };

  const reliabilityLabel = (rel: Material['reliability']) => {
    if (rel === 'verified_handbook') return '공인 핸드북 검증 데이터';
    if (rel === 'literature_range') return '학술 문헌·데이터시트 범위';
    return '미시 스케일 실험/이론값 (벌크와 구분)';
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Workspace Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>물성 조건 탐색실</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <div className="flex items-center gap-2">
            <label htmlFor="domain-preset-select" className="text-xs text-slate-400 whitespace-nowrap">
              분야 프리셋:
            </label>
            <select
              id="domain-preset-select"
              value={activeDomainId || ''}
              onChange={(e) => {
                if (e.target.value) onApplyDomainPreset(e.target.value);
              }}
              className="px-2.5 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="">사용자 직접 설정</option>
              {APPLICATION_DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameKo} ({d.nameEn})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono-tabular text-slate-400 mr-2">
            충족 후보 {summary.passing.length} / 전체 {allEvaluated.length}종 · 활성 물성{' '}
            {summary.activePropertyCount}개
          </span>

          <button
            type="button"
            onClick={onResetConstraints}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>조건 초기화</span>
          </button>

          <button
            type="button"
            onClick={onSaveSession}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>탐색 조건 저장</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenReport(viewerRef.current?.captureSnapshot() ?? null)}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>발견 결과 보고서</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace (Mobile stacks 3D stage on top via order classes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Column: Property Sliders (order-2 on mobile, order-1 on desktop) */}
        <aside className="order-2 lg:order-1 lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              필수 공학 물성 설정 (7종)
            </h2>
            <span className="text-[11px] font-mono-tabular text-slate-400">
              가중치 합 Σw = {summary.totalWeight}
            </span>
          </div>

          <div className="space-y-2.5">
            {essentialDefs.map((def) => (
              <PropertySlider
                key={def.key}
                definition={def}
                constraint={constraints[def.key]}
                onChange={(updated) => onUpdateConstraint(def.key, updated)}
              />
            ))}
          </div>

          {/* Additional 5 Properties Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdditionalProps((v) => !v)}
              className="w-full px-3.5 py-2.5 bg-[#0b1222] hover:bg-[#0f182e] border border-slate-800 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors"
            >
              <span>추가 전문 물성 설정 (전기전도도·열팽창·파괴인성·비강도·비탄성계수)</span>
              {showAdditionalProps ? (
                <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>

            {showAdditionalProps && (
              <div className="mt-2.5 space-y-2.5">
                {additionalDefs.map((def) => (
                  <PropertySlider
                    key={def.key}
                    definition={def}
                    constraint={constraints[def.key]}
                    onChange={(updated) => onUpdateConstraint(def.key, updated)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right / Main Laboratory Stage (order-1 on mobile so 3D is at top!) */}
        <div className="order-1 lg:order-2 lg:col-span-8 space-y-5">
          {/* 3D Specimen Viewport + Active Material Summary */}
          {inspectedMaterial && inspectedItem && (
            <div className="bg-[#0a101e] border border-slate-800 rounded-lg overflow-hidden">
              <div className="grid grid-cols-1 xl:grid-cols-12 items-stretch">
                {/* 3D Viewport */}
                <div className="xl:col-span-7 h-[340px] sm:h-[420px] xl:h-[460px] bg-[#070b14] relative">
                  <MaterialViewer3D
                    ref={viewerRef}
                    structureType={inspectedMaterial.structureType}
                    accentColor={inspectedMaterial.accentColor}
                    materialId={inspectedMaterial.id}
                    materialLabel={inspectedMaterial.nameKo}
                    isAnalyzing={isAnalyzing}
                    reducedMotion={reducedMotion}
                    showCompactHud={true}
                  />
                </div>

                {/* Specimen Telemetry Header */}
                <div className="xl:col-span-5 p-5 flex flex-col justify-between border-t xl:border-t-0 xl:border-l border-slate-800/80 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-mono-tabular text-cyan-400">
                          {inspectedItem.rank
                            ? `현재 추천 ${inspectedItem.rank}순위`
                            : '필수 조건 미충족 시편'}{' '}
                          · {inspectedMaterial.category}
                        </p>
                        <h3 className="text-xl font-display font-bold text-slate-50 mt-1 leading-snug">
                          {inspectedMaterial.nameKo}
                        </h3>
                        <p className="text-xs font-mono-tabular text-slate-400 mt-0.5">
                          {inspectedMaterial.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-mono-tabular font-bold text-cyan-300">
                          {inspectedItem.totalScore.toFixed(1)}
                        </div>
                        <div className="text-[10px] font-mono-tabular text-slate-400">
                          / 100 점
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {inspectedMaterial.description}
                    </p>

                    <div className="p-2.5 bg-[#070b14] border border-slate-800 rounded text-[11px] space-y-1">
                      <p className="text-slate-300 font-mono-tabular">
                        조성: {inspectedMaterial.composition}
                      </p>
                      <p className="text-slate-400">
                        신뢰도: {reliabilityLabel(inspectedMaterial.reliability)} · 커버리지{' '}
                        {Math.round(inspectedItem.coverageRatio * 100)}%
                      </p>
                      {inspectedMaterial.dataConditions && (
                        <p className="text-slate-400">측정 조건: {inspectedMaterial.dataConditions}</p>
                      )}
                    </div>

                    {/* Strongest / Weakest & Reasons */}
                    <div className="space-y-1.5 text-xs">
                      {inspectedItem.strongestProperty && (
                        <p className="text-emerald-300">
                          ▸ 강점 물성: {PROPERTY_MAP[inspectedItem.strongestProperty.key].nameKo} (
                          {inspectedItem.strongestProperty.score.toFixed(0)}점)
                        </p>
                      )}
                      {inspectedItem.weakestProperty && (
                        <p className="text-amber-300">
                          ▸ 상대 약점: {PROPERTY_MAP[inspectedItem.weakestProperty.key].nameKo} (
                          {inspectedItem.weakestProperty.score.toFixed(0)}점)
                        </p>
                      )}
                      {inspectedItem.differenceHighlights.map((diff, i) => (
                        <p key={i} className="text-cyan-300">
                          ▸ 차별점: {diff}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onToggleCompare(inspectedMaterial.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        isInCompare
                          ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>{isInCompare ? '비교 목록에서 제거' : '성능 비교에 추가'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenReport(viewerRef.current?.captureSnapshot() ?? null)}
                      className="px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>상세 보고서</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 Recommendations OR No-Match Bottleneck Diagnostic */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-100">
                실시간 추천 결과 (가중치 알고리즘 기반)
              </h2>
              <span className="text-xs font-mono-tabular text-slate-400">
                Sᵢ = Σ(wⱼ · sᵢⱼ) / Σwⱼ · 데이터 보정 적용
              </span>
            </div>

            {summary.passing.length === 0 ? (
              <div className="bg-[#0a101e] border border-amber-500/50 rounded-lg p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-200">
                      현재 필수 조건을 모두 만족하는 소재가 데이터베이스에 없습니다
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      MATTER FINDER는 조건에 맞지 않는 소재를 억지로 1순위로 추천하지 않습니다.
                      아래에서 가장 많은 후보를 탈락시킨 제약 조건을 확인하고 완화해 보세요.
                    </p>
                  </div>
                </div>

                {summary.bottlenecks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-200">주요 제약 병목 분석</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {summary.bottlenecks.slice(0, 4).map((b) => (
                        <div
                          key={b.key}
                          className="p-3 bg-[#070b14] border border-slate-800 rounded-md flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-100">
                              {PROPERTY_MAP[b.key].nameKo} 조건 ({b.eliminatedCount}종 제외됨)
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              제안: {b.suggestedRelaxation}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRelaxBottleneck(b.key, b.relaxedMinVal, b.relaxedMaxVal)
                            }
                            className="px-2.5 py-1.5 text-[11px] font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 rounded whitespace-nowrap shrink-0"
                          >
                            완화 적용
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.relaxedPreviewCandidates.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <p className="text-xs text-slate-400">
                      조건 완화 시 가장 근접한 대안 후보 (클릭하여 3D 확인)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {summary.relaxedPreviewCandidates.map((item) => (
                        <button
                          key={item.material.id}
                          type="button"
                          onClick={() => setSelectedMaterialId(item.material.id)}
                          className="text-left p-3 bg-[#070b14] hover:bg-[#0d1526] border border-slate-800 rounded-md transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {item.material.nameKo}
                            </span>
                            <span className="text-xs font-mono-tabular text-amber-300 shrink-0">
                              {item.totalScore.toFixed(1)}점
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-400 mt-1 truncate">
                            미충족: {item.failedHardConstraints.map((k) => PROPERTY_MAP[k].nameKo).join(', ')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {summary.topCandidates.map((item, idx) => {
                  const isSelected = inspectedMaterial?.id === item.material.id;
                  const roleLabel =
                    idx === 0
                      ? '1순위 · 최적 적합 소재'
                      : idx === 1
                      ? '2순위 · 균형 대안 소재'
                      : '3순위 · 특성 차별화 후보';

                  return (
                    <div
                      key={item.material.id}
                      onClick={() => setSelectedMaterialId(item.material.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedMaterialId(item.material.id);
                        }
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-[#0e182d] border-cyan-400/80'
                          : 'bg-[#0a101e] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono-tabular text-cyan-400">
                            {roleLabel}
                          </span>
                          <span className="text-base font-mono-tabular font-bold text-slate-50">
                            {item.totalScore.toFixed(1)}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">
                            {item.material.nameKo}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.material.category} · {item.material.name}
                          </p>
                        </div>

                        <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                          {item.recommendationReasons.slice(0, 2).map((r, ri) => (
                            <p key={ri} className="leading-snug">
                              · {r}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>조건 충족</span>
                        </span>
                        <span className="text-slate-400 font-mono-tabular">
                          활용: {item.material.applications[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Toggle All Evaluated Candidates Table */}
            <div>
              <button
                type="button"
                onClick={() => setShowAllEvaluated((v) => !v)}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>
                  {showAllEvaluated
                    ? '전체 평가 목록 접기'
                    : `전체 소재 평가 순위 보기 (${allEvaluated.length}종)`}
                </span>
                {showAllEvaluated ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAllEvaluated && (
                <div className="mt-2.5 bg-[#0a101e] border border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-left">
                        <th className="py-2.5 px-3 font-medium">순위</th>
                        <th className="py-2.5 px-3 font-medium">소재</th>
                        <th className="py-2.5 px-3 font-medium">분류</th>
                        <th className="py-2.5 px-3 font-medium text-right">점수</th>
                        <th className="py-2.5 px-3 font-medium text-right">밀도</th>
                        <th className="py-2.5 px-3 font-medium text-right">인장강도</th>
                        <th className="py-2.5 px-3 font-medium text-right">내열온도</th>
                        <th className="py-2.5 px-3 font-medium">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {allEvaluated.map((item) => {
                        const m = item.material;
                        return (
                          <tr
                            key={m.id}
                            onClick={() => setSelectedMaterialId(m.id)}
                            className={`cursor-pointer transition-colors ${
                              inspectedMaterial?.id === m.id
                                ? 'bg-cyan-950/30'
                                : 'hover:bg-slate-900/60'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono-tabular text-cyan-300">
                              {item.rank ? `${item.rank}` : '—'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-100">{m.nameKo}</td>
                            <td className="py-2 px-3 text-slate-400">{m.category}</td>
                            <td className="py-2 px-3 text-right font-mono-tabular text-slate-100">
                              {item.totalScore.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-tabular text-slate-300">
                              {formatPropertyValue(m.properties.density, 'density')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-tabular text-slate-300">
                              {formatPropertyValue(m.properties.tensileStrength, 'tensileStrength')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono-tabular text-slate-300">
                              {formatPropertyValue(
                                m.properties.maxServiceTemperature,
                                'maxServiceTemperature'
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {item.passedAllHardConstraints ? (
                                <span className="text-emerald-400">충족</span>
                              ) : (
                                <span className="text-rose-400">
                                  미충족 ({item.failedHardConstraints.length})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Real-Time Analysis Sequence & Full Property Table */}
          {inspectedItem && inspectedMaterial && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <MaterialAnalyzer
                item={inspectedItem}
                onAnalysisActiveChange={setIsAnalyzing}
                reducedMotion={reducedMotion}
              />

              {/* Complete 12-Property Verified Datasheet */}
              <div className="bg-[#0a101e] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    전체 물성 데이터시트 (12개 항목)
                  </h3>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    {inspectedMaterial.name}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-left">
                        <th className="py-1.5 pr-2 font-medium">물성</th>
                        <th className="py-1.5 px-2 font-medium text-right">대표값</th>
                        <th className="py-1.5 px-2 font-medium text-right">변동 범위</th>
                        <th className="py-1.5 pl-2 font-medium">단위</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {PROPERTY_DEFINITIONS.map((def) => {
                        const val = getMaterialPropertyValue(inspectedMaterial, def.key);
                        const range =
                          !def.isDerived && inspectedMaterial.propertyRanges
                            ? inspectedMaterial.propertyRanges[
                                def.key as keyof typeof inspectedMaterial.propertyRanges
                              ]
                            : undefined;

                        return (
                          <tr key={def.key}>
                            <td className="py-1.5 pr-2 text-slate-300">{def.nameKo}</td>
                            <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-100">
                              {val != null ? (
                                formatPropertyValue(val, def.key)
                              ) : (
                                <span className="text-amber-400">미확보</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-400">
                              {range
                                ? `${formatPropertyValue(range[0], def.key)}–${formatPropertyValue(range[1], def.key)}`
                                : '—'}
                            </td>
                            <td className="py-1.5 pl-2 font-mono-tabular text-slate-500">
                              {def.unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <p>장점: {inspectedMaterial.advantages.join(' / ')}</p>
                  <p>유의점: {inspectedMaterial.disadvantages.join(' / ')}</p>
                  <p className="font-mono-tabular text-slate-500">
                    출처: {inspectedMaterial.sources.join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
