import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { formatPropertyValue, getMaterialPropertyValue, PROPERTY_MAP } from '../../data/properties';
import { RecommendationItem } from '../../types/material';

interface MaterialAnalyzerProps {
  item: RecommendationItem;
  onAnalysisActiveChange: (active: boolean) => void;
  reducedMotion?: boolean;
}

const STAGES = [
  { id: 'structure', title: '1. 미세구조 및 결정 격자 스캔', keys: [] as string[] },
  { id: 'density', title: '2. 밀도·비중 분석', keys: ['density'] },
  { id: 'mechanical', title: '3. 강도·경도·강성 분석', keys: ['tensileStrength', 'youngModulus', 'hardness', 'specificStrength', 'specificModulus', 'fractureToughness'] },
  { id: 'thermal', title: '4. 열적·전기·내부식성 분석', keys: ['thermalConductivity', 'maxServiceTemperature', 'corrosionResistance', 'electricalConductivity', 'thermalExpansion'] },
  { id: 'score', title: '5. 가중치 정규화 종합 점수 산출', keys: [] as string[] },
];

export const MaterialAnalyzer: React.FC<MaterialAnalyzerProps> = ({
  item,
  onAnalysisActiveChange,
  reducedMotion = false,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(reducedMotion ? 5 : 0);

  const runSequence = () => {
    if (reducedMotion) {
      setStepIdx(5);
      onAnalysisActiveChange(false);
      return;
    }
    setStepIdx(0);
    onAnalysisActiveChange(true);
  };

  useEffect(() => {
    if (reducedMotion) {
      setStepIdx(5);
      onAnalysisActiveChange(false);
      return;
    }
    setStepIdx(0);
    onAnalysisActiveChange(true);
  }, [item.material.id, reducedMotion, onAnalysisActiveChange]);

  useEffect(() => {
    if (reducedMotion || stepIdx >= 5) {
      if (stepIdx >= 5) onAnalysisActiveChange(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setStepIdx((s) => s + 1);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [stepIdx, reducedMotion, onAnalysisActiveChange]);

  const m = item.material;

  return (
    <div className="bg-[#0a101e] border border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">실시간 소재 정밀 분석 시퀀스</h3>
          <p className="text-xs text-slate-400">
            선택된 조건과 실제 물성 데이터베이스를 실시간 연산하여 산출합니다
          </p>
        </div>
        <button
          type="button"
          onClick={runSequence}
          className="px-2.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-3 h-3" />
          <span>재분석</span>
        </button>
      </div>

      {/* Stage Progression */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const completed = stepIdx > idx;
          const active = stepIdx === idx;
          const stageBreakdowns = item.breakdowns.filter((b) => stage.keys.includes(b.key));

          return (
            <motion.div
              key={stage.id}
              initial={reducedMotion ? false : { opacity: 0.45 }}
              animate={{ opacity: completed || active ? 1 : 0.4 }}
              transition={{ duration: 0.2 }}
              className={`p-2.5 rounded border text-xs ${
                active
                  ? 'bg-cyan-950/25 border-cyan-500/60'
                  : completed
                  ? 'bg-[#070b14] border-slate-800'
                  : 'bg-[#070b14]/50 border-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={completed || active ? 'text-slate-100 font-medium' : 'text-slate-500'}>
                  {stage.title}
                </span>
                <span className="font-mono-tabular text-[11px] text-cyan-400">
                  {completed ? '완료' : active ? '연산 중' : '대기'}
                </span>
              </div>

              {(completed || active) && stage.id === 'structure' && (
                <p className="mt-1.5 text-[11px] font-mono-tabular text-slate-300">
                  조성: {m.composition} · 분류: {m.category}
                </p>
              )}

              {(completed || active) && stageBreakdowns.length > 0 && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {stageBreakdowns.map((b) => {
                    const def = PROPERTY_MAP[b.key];
                    const raw = getMaterialPropertyValue(m, b.key);
                    return (
                      <div
                        key={b.key}
                        className="flex items-center justify-between px-2 py-1 bg-[#0b1222] border border-slate-800/80 rounded"
                      >
                        <span className="text-slate-400 truncate">{def.nameKo}</span>
                        <div className="flex items-center gap-2 font-mono-tabular shrink-0">
                          <span className="text-slate-200">
                            {formatPropertyValue(raw, b.key)} {raw != null ? def.unit : ''}
                          </span>
                          {b.normalizedScore != null && (
                            <span
                              className={
                                b.passedHardConstraint ? 'text-cyan-400' : 'text-rose-400'
                              }
                            >
                              ({b.normalizedScore.toFixed(0)}점)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {completed && stage.id === 'score' && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.passedAllHardConstraints ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-medium">모든 필수 조건 충족</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-medium">
                          필수 조건 {item.failedHardConstraints.length}건 미충족
                        </span>
                      </>
                    )}
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400 font-mono-tabular">
                      데이터 커버리지 {Math.round(item.coverageRatio * 100)}%
                    </span>
                  </div>
                  <span className="text-sm font-mono-tabular font-bold text-cyan-300">
                    최종 점수 {item.totalScore.toFixed(1)} / 100
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
