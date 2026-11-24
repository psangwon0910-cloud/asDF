import React, { useState } from 'react';
import { HelpCircle, Lock, Unlock } from 'lucide-react';
import { PropertyDefinition } from '../../data/properties';
import { OptimizationDirection, PropertyConstraint } from '../../types/material';
import { ImportanceControl } from './ImportanceControl';

interface PropertySliderProps {
  definition: PropertyDefinition;
  constraint: PropertyConstraint;
  onChange: (updated: PropertyConstraint) => void;
}

const DIRECTION_OPTIONS: Array<{ value: OptimizationDirection; label: string }> = [
  { value: 'minimize', label: '최소화' },
  { value: 'maximize', label: '최대화' },
  { value: 'range', label: '범위 유지' },
  { value: 'target', label: '목표값 근접' },
  { value: 'ignore', label: '선택적(제외)' },
];

export const PropertySlider: React.FC<PropertySliderProps> = ({
  definition,
  constraint,
  onChange,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const isIgnored = constraint.direction === 'ignore';

  const updateField = (patch: Partial<PropertyConstraint>) => {
    onChange({ ...constraint, ...patch });
  };

  const handleDirectionChange = (nextDir: OptimizationDirection) => {
    const patch: Partial<PropertyConstraint> = { direction: nextDir };

    if (nextDir === 'maximize' && constraint.minVal <= definition.minBound) {
      patch.minVal = definition.suggestedMaximizeMin ?? definition.defaultTarget;
    } else if (nextDir === 'minimize' && constraint.maxVal >= definition.maxBound) {
      patch.maxVal = definition.suggestedMinimizeMax ?? definition.defaultTarget;
    } else if (nextDir === 'range' && constraint.minVal >= constraint.maxVal) {
      const span = definition.maxBound - definition.minBound;
      patch.minVal = Number((definition.minBound + span * 0.1).toFixed(definition.decimals));
      patch.maxVal = Number((definition.minBound + span * 0.5).toFixed(definition.decimals));
    }

    updateField(patch);
  };

  return (
    <div
      className={`border rounded-lg p-3.5 transition-colors ${
        isIgnored
          ? 'bg-[#090e1a]/70 border-slate-800/70 opacity-75'
          : 'bg-[#0b1222] border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100 truncate">
              {definition.nameKo}
            </span>
            <span className="text-[11px] font-mono-tabular text-cyan-400 shrink-0">
              {definition.unit}
            </span>
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
              aria-label={`${definition.nameKo} 상세 설명 보기`}
              title="물성 상세 설명"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{definition.shortDesc}</p>
        </div>

        {!isIgnored && (
          <button
            type="button"
            onClick={() => updateField({ isHardConstraint: !constraint.isHardConstraint })}
            className={`px-2 py-1 text-[11px] font-medium rounded border flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
              constraint.isHardConstraint
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={
              constraint.isHardConstraint
                ? '필수 조건: 미충족 소재는 후보에서 제외됩니다'
                : '선호 조건: 점수 계산에 가중 반영됩니다'
            }
          >
            {constraint.isHardConstraint ? (
              <>
                <Lock className="w-3 h-3" />
                <span>필수 조건</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>선호 조건</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Expandable Scientific Detail */}
      {showInfo && (
        <div className="mt-2.5 p-2.5 bg-[#070b14] border border-slate-800 rounded text-xs text-slate-300 leading-relaxed">
          <p className="text-[11px] font-mono-tabular text-slate-400 mb-1">
            {definition.nameEn} · {definition.isDerived ? '자동 계산 파생 물성' : '측정 기준 물성'}
          </p>
          {definition.scientificDetail}
        </div>
      )}

      {/* Optimization Direction Selector */}
      <div className="mt-3 flex flex-wrap gap-1">
        {DIRECTION_OPTIONS.map((opt) => {
          const active = constraint.direction === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleDirectionChange(opt.value)}
              className={`px-2 py-1 text-[11px] rounded border transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? opt.value === 'ignore'
                    ? 'bg-slate-800 border-slate-600 text-slate-200'
                    : 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200 font-medium'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Value Sliders & Numeric Inputs */}
      {!isIgnored && (
        <div className="mt-3 space-y-2.5 pt-2.5 border-t border-slate-800/80">
          {constraint.direction === 'minimize' && (
            constraint.isHardConstraint ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-amber-300/90">허용 상한 (이하만 통과 · 낮을수록 고득점)</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={definition.minBound}
                      max={definition.maxBound}
                      step={definition.step}
                      value={constraint.maxVal}
                      onChange={(e) =>
                        updateField({ maxVal: Math.max(definition.minBound, Number(e.target.value)) })
                      }
                      className="w-20 px-2 py-0.5 text-right font-mono-tabular text-xs bg-slate-950 border border-slate-700 rounded text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[11px] text-slate-500 font-mono-tabular">
                      {definition.unit}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={definition.minBound}
                  max={definition.maxBound}
                  step={definition.step}
                  value={constraint.maxVal}
                  onChange={(e) => updateField({ maxVal: Number(e.target.value) })}
                  className="lab-slider w-full"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#070b14] border border-slate-800/80 rounded text-[11px] text-slate-300">
                <span>값이 작을수록 높은 점수를 받습니다 (상한 제한 없음).</span>
                <button
                  type="button"
                  onClick={() => updateField({ isHardConstraint: true })}
                  className="text-cyan-400 hover:text-cyan-300 underline whitespace-nowrap shrink-0"
                >
                  상한선 지정
                </button>
              </div>
            )
          )}

          {constraint.direction === 'maximize' && (
            constraint.isHardConstraint ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-amber-300/90">요구 하한 (이상만 통과 · 높을수록 고득점)</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={definition.minBound}
                      max={definition.maxBound}
                      step={definition.step}
                      value={constraint.minVal}
                      onChange={(e) =>
                        updateField({ minVal: Math.max(definition.minBound, Number(e.target.value)) })
                      }
                      className="w-20 px-2 py-0.5 text-right font-mono-tabular text-xs bg-slate-950 border border-slate-700 rounded text-cyan-300 focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[11px] text-slate-500 font-mono-tabular">
                      {definition.unit}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={definition.minBound}
                  max={definition.maxBound}
                  step={definition.step}
                  value={constraint.minVal}
                  onChange={(e) => updateField({ minVal: Number(e.target.value) })}
                  className="lab-slider w-full"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#070b14] border border-slate-800/80 rounded text-[11px] text-slate-300">
                <span>값이 클수록 높은 점수를 받습니다 (하한 제한 없음).</span>
                <button
                  type="button"
                  onClick={() => updateField({ isHardConstraint: true })}
                  className="text-cyan-400 hover:text-cyan-300 underline whitespace-nowrap shrink-0"
                >
                  하한선 지정
                </button>
              </div>
            )
          )}

          {constraint.direction === 'range' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">최소 ({definition.unit})</label>
                <input
                  type="number"
                  min={definition.minBound}
                  max={definition.maxBound}
                  step={definition.step}
                  value={constraint.minVal}
                  onChange={(e) => updateField({ minVal: Number(e.target.value) })}
                  className="w-full px-2 py-1 font-mono-tabular text-xs bg-slate-950 border border-slate-700 rounded text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">최대 ({definition.unit})</label>
                <input
                  type="number"
                  min={definition.minBound}
                  max={definition.maxBound}
                  step={definition.step}
                  value={constraint.maxVal}
                  onChange={(e) => updateField({ maxVal: Number(e.target.value) })}
                  className="w-full px-2 py-1 font-mono-tabular text-xs bg-slate-950 border border-slate-700 rounded text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {constraint.direction === 'target' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">목표 수치 (근접할수록 고득점)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={definition.minBound}
                    max={definition.maxBound}
                    step={definition.step}
                    value={constraint.targetVal}
                    onChange={(e) => updateField({ targetVal: Number(e.target.value) })}
                    className="w-20 px-2 py-0.5 text-right font-mono-tabular text-xs bg-slate-950 border border-slate-700 rounded text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[11px] text-slate-500 font-mono-tabular">
                    {definition.unit}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={definition.minBound}
                max={definition.maxBound}
                step={definition.step}
                value={constraint.targetVal}
                onChange={(e) => updateField({ targetVal: Number(e.target.value) })}
                className="lab-slider w-full"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <ImportanceControl
              value={constraint.importance}
              onChange={(importance) => updateField({ importance })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
