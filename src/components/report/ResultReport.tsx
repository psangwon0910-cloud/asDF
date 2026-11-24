import React, { useRef } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Printer,
} from 'lucide-react';
import {
  formatPropertyValue,
  getMaterialPropertyValue,
  PROPERTY_MAP,
} from '../../data/properties';
import { Material, PropertyConstraint, PropertyKey, RecommendationSummary } from '../../types/material';
import { downloadRecommendationCSV, downloadSpecimenSnapshotPNG } from '../../utils/exportUtils';
import { RadarComparisonChart, ScoreComparisonChart } from '../charts/MaterialChart';
import { MaterialViewer3D, MaterialViewer3DHandle } from '../three/MaterialViewer3D';

interface ResultReportProps {
  allMaterials: Material[];
  constraints: Record<PropertyKey, PropertyConstraint>;
  summary: RecommendationSummary;
  initialSnapshotUrl: string | null;
  reducedMotion?: boolean;
  onBackToExplorer: () => void;
  onSaveSession: () => void;
}

const REPORT_RADAR_AXES: PropertyKey[] = [
  'density',
  'tensileStrength',
  'youngModulus',
  'thermalConductivity',
  'maxServiceTemperature',
  'corrosionResistance',
];

export const ResultReport: React.FC<ResultReportProps> = ({
  allMaterials,
  constraints,
  summary,
  initialSnapshotUrl,
  reducedMotion = false,
  onBackToExplorer,
  onSaveSession,
}) => {
  const viewerRef = useRef<MaterialViewer3DHandle | null>(null);
  const topCandidate = summary.topCandidates[0] || summary.relaxedPreviewCandidates[0];
  const hasFullMatch = summary.topCandidates.length > 0;

  if (!topCandidate) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-4">
        <h2 className="text-xl font-semibold text-slate-100">분석할 소재 데이터가 없습니다.</h2>
        <button
          type="button"
          onClick={onBackToExplorer}
          className="px-4 py-2 bg-cyan-500 text-slate-950 font-semibold rounded-md text-sm"
        >
          탐색실로 돌아가기
        </button>
      </div>
    );
  }

  const m = topCandidate.material;
  const activeConstraints = Object.values(constraints).filter((c) => c.direction !== 'ignore');
  const compareGroup = (
    hasFullMatch ? summary.topCandidates : summary.relaxedPreviewCandidates
  ).map((i) => i.material);

  const handleExportPNG = () => {
    const snap = viewerRef.current?.captureSnapshot() || initialSnapshotUrl;
    downloadSpecimenSnapshotPNG(m, topCandidate.totalScore, snap);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Action Header (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onBackToExplorer}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>탐색실로 돌아가기</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF 보고서 저장 / 인쇄</span>
          </button>

          <button
            type="button"
            onClick={() => downloadRecommendationCSV(summary, constraints)}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV 데이터</span>
          </button>

          <button
            type="button"
            onClick={handleExportPNG}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>시편 이미지(PNG)</span>
          </button>

          <button
            type="button"
            onClick={onSaveSession}
            className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>프로젝트 저장</span>
          </button>
        </div>
      </div>

      {/* Discovery Hero Banner */}
      <section className="print-surface bg-[#0a101e] border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-center space-y-5">
            <p className="text-xs font-mono-tabular text-cyan-400 tracking-wider">
              {hasFullMatch
                ? 'YOUR MATERIAL HAS BEEN FOUND.'
                : 'CONSTRAINT RELAXATION ADVISORY · NEAREST CANDIDATE'}
            </p>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-50 leading-tight text-balance">
                {m.nameKo}
              </h1>
              <p className="text-sm font-mono-tabular text-slate-400 mt-1">
                {m.name} · {m.category} · {m.composition}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[#070b14] print-surface border border-slate-800 rounded-lg">
                <span className="text-[11px] text-slate-400 block">종합 적합도</span>
                <span className="text-2xl font-mono-tabular font-bold text-cyan-300">
                  {topCandidate.totalScore.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 ml-1">/ 100</span>
              </div>
              <div className="p-3 bg-[#070b14] print-surface border border-slate-800 rounded-lg">
                <span className="text-[11px] text-slate-400 block">필수 조건 충족</span>
                <span className="text-lg font-mono-tabular font-bold text-slate-100">
                  {hasFullMatch
                    ? '100%'
                    : `${Math.max(
                        0,
                        activeConstraints.filter((c) => c.isHardConstraint).length -
                          topCandidate.failedHardConstraints.length
                      )} / ${activeConstraints.filter((c) => c.isHardConstraint).length}`}
                </span>
              </div>
              <div className="p-3 bg-[#070b14] print-surface border border-slate-800 rounded-lg">
                <span className="text-[11px] text-slate-400 block">데이터 커버리지</span>
                <span className="text-lg font-mono-tabular font-bold text-slate-100">
                  {Math.round(topCandidate.coverageRatio * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
              {topCandidate.recommendationReasons.map((r, i) => (
                <p key={i}>▸ {r}</p>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">주요 활용 가능 분야: </span>
              {m.applications.join(' · ')}
            </div>
          </div>

          <div className="lg:col-span-6 h-[340px] lg:h-auto min-h-[360px] bg-[#070b14] border-t lg:border-t-0 lg:border-l border-slate-800">
            <div className="no-print w-full h-full">
              <MaterialViewer3D
                ref={viewerRef}
                structureType={m.structureType}
                accentColor={m.accentColor}
                materialId={m.id}
                materialLabel={m.nameKo}
                reducedMotion={reducedMotion}
                showCompactHud={true}
              />
            </div>
            {initialSnapshotUrl && (
              <img
                src={initialSnapshotUrl}
                alt={`${m.nameKo} 3D 구조 스냅샷`}
                className="hidden print-only w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      </section>

      {/* Report Charts: Score Distribution & Radar Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="print-surface bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              1. 상위 후보 소재별 종합 적합도 점수
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              사용자 중요도 가중치(wⱼ)와 정규화 물성 점수(sᵢⱼ) 실측 연산 결과
            </p>
          </div>
          <ScoreComparisonChart
            items={hasFullMatch ? summary.passing.slice(0, 5) : summary.rejected.slice(0, 5)}
            reducedMotion={reducedMotion}
          />
        </div>

        <div className="print-surface bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              2. 상위 3개 후보 주요 물성 다축 비교
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              1순위 대비 2·3순위 대안 소재의 특성 균형 시각화
            </p>
          </div>
          <RadarComparisonChart
            materials={compareGroup}
            allMaterialsForBounds={allMaterials}
            axes={REPORT_RADAR_AXES}
            invertLowIsBetter={true}
            reducedMotion={reducedMotion}
          />
        </div>
      </section>

      {/* 3. Target Condition vs Actual Material Properties */}
      <section className="print-surface bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            3. 목표 물성 조건 vs 추천 소재 실제 물성 비교
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            활성화된 탐색 조건별 요구 수준과 {m.nameKo}의 실제 측정 대표값 대조
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left">
                <th className="py-2 pr-3 font-medium">물성 (단위)</th>
                <th className="py-2 px-3 font-medium">사용자 목표 조건</th>
                <th className="py-2 px-3 font-medium">중요도</th>
                <th className="py-2 px-3 font-medium text-right">실제 소재 물성</th>
                <th className="py-2 pl-3 font-medium text-right">정규화 점수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {topCandidate.breakdowns.map((b) => {
                const def = PROPERTY_MAP[b.key];
                const c = constraints[b.key];
                const condLabel =
                  c.direction === 'minimize'
                    ? `최소화 (상한 ≤ ${c.maxVal})`
                    : c.direction === 'maximize'
                    ? `최대화 (하한 ≥ ${c.minVal})`
                    : c.direction === 'range'
                    ? `범위 [${c.minVal} – ${c.maxVal}]`
                    : `목표치 근접 (${c.targetVal})`;
                const val = getMaterialPropertyValue(m, b.key);

                return (
                  <tr key={b.key}>
                    <td className="py-2.5 pr-3 font-medium text-slate-200">
                      {def.nameKo}{' '}
                      <span className="font-mono-tabular text-slate-500">({def.unit})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {condLabel} {c.isHardConstraint ? '[필수]' : '[선호]'}
                    </td>
                    <td className="py-2.5 px-3 font-mono-tabular text-slate-300">
                      {b.weight} / 5
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-100">
                      {val != null ? formatPropertyValue(val, b.key) : '데이터 미확보'}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono-tabular text-cyan-300">
                      {b.normalizedScore != null ? `${b.normalizedScore.toFixed(1)}점` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Advantages/Disadvantages & Methodology Limitations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="print-surface bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-100">
            4. 후보 소재별 장단점 요약
          </h2>
          <div className="space-y-3">
            {compareGroup.map((cand, idx) => (
              <div key={cand.id} className="p-3 bg-[#070b14] print-surface border border-slate-800 rounded">
                <p className="text-xs font-semibold text-cyan-300">
                  {idx + 1}순위 · {cand.nameKo}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  장점: {cand.advantages.join(' / ')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  단점 및 제약: {cand.disadvantages.join(' / ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="print-surface bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-3 text-xs text-slate-300 leading-relaxed">
          <h2 className="text-base font-semibold text-slate-100">
            알고리즘, 데이터 출처 및 공학적 한계점
          </h2>
          <p>
            <strong className="text-slate-100">추천 알고리즘:</strong> 활성 물성별
            최소/최대/범위/목표치 조건을 적용하여 필수 조건(Hard Constraint) 필터링 후,
            데이터셋 분포(광역 물성은 Log10 스케일)에 따라 0–100점으로 정규화한 점수(sᵢⱼ)와
            사용자 중요도 가중치(wⱼ)의 가중평균 Sᵢ = Σ(wⱼ·sᵢⱼ) / Σwⱼ 를 계산하고,
            결측 데이터가 있는 경우 데이터 커버리지 보정 계수를 적용했습니다.
          </p>
          <p>
            <strong className="text-slate-100">데이터 출처 및 측정 조건:</strong>{' '}
            {m.sources.join(', ')} ({m.dataConditions ?? '표준 상온 시편 기준'})
          </p>
          <p className="text-amber-300/90">
            <strong className="text-amber-200">해석 시 유의사항:</strong> 실제 소재 물성은
            열처리, 가공 이력, 섬유 배향, 시험 온도 및 시편 결함에 따라 변동 범위를 가집니다.
            본 시뮬레이터의 추천 결과는 초기 소재 스크리닝 및 개념 설계 참고용이며, 최종 양산 설계에는
            공인 규격(ASTM/ISO) 시편 시험 검증이 필요합니다.
          </p>
        </div>
      </section>
    </div>
  );
};
