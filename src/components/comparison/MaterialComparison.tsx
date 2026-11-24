import React, { useState } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import {
  formatPropertyValue,
  getMaterialPropertyValue,
  PROPERTY_DEFINITIONS,
} from '../../data/properties';
import { Material, PropertyKey } from '../../types/material';
import { PropertyBarChart, RadarComparisonChart } from '../charts/MaterialChart';
import { MaterialViewer3D } from '../three/MaterialViewer3D';

interface MaterialComparisonProps {
  allMaterials: Material[];
  compareIds: string[];
  reducedMotion?: boolean;
  onSetCompareIds: (ids: string[]) => void;
}

const RADAR_AXES: PropertyKey[] = [
  'density',
  'tensileStrength',
  'youngModulus',
  'thermalConductivity',
  'maxServiceTemperature',
  'fractureToughness',
  'corrosionResistance',
];

const PRESET_GROUPS: Array<{ label: string; ids: string[] }> = [
  {
    label: '항공 경량 구조 4종',
    ids: ['cfrp-laminate', 'ti-6al-4v', 'al-7075-t6', 'mg-az31b'],
  },
  {
    label: '초고온 내열 소재 4종',
    ids: ['silicon-carbide', 'ni-superalloy-sx', 'inconel-718', 'tungsten'],
  },
  {
    label: '고방열 열관리 4종',
    ids: ['diamond', 'graphene', 'copper-etp', 'aluminum-nitride'],
  },
];

export const MaterialComparison: React.FC<MaterialComparisonProps> = ({
  allMaterials,
  compareIds,
  reducedMotion = false,
  onSetCompareIds,
}) => {
  const [selectedBarProp, setSelectedBarProp] = useState<PropertyKey>('tensileStrength');
  const [invertLowIsBetter, setInvertLowIsBetter] = useState(true);
  const [addTargetId, setAddTargetId] = useState<string>('');

  const comparedMaterials = compareIds
    .map((id) => allMaterials.find((m) => m.id === id))
    .filter((m): m is Material => Boolean(m))
    .slice(0, 4);

  const availableToAdd = allMaterials.filter((m) => !compareIds.includes(m.id));

  const handleAdd = () => {
    const targetId = addTargetId || availableToAdd[0]?.id;
    if (!targetId || comparedMaterials.length >= 4) return;
    onSetCompareIds([...compareIds, targetId]);
    setAddTargetId('');
  };

  const handleRemove = (id: string) => {
    onSetCompareIds(compareIds.filter((c) => c !== id));
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Preset Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-100">
            다중 소재 성능 비교 분석 (최대 4종)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            실제 물성 데이터와 정규화 지수를 결합하여 구조·기계·열적 성능을 동시에 비교합니다. 가상 설계 소재도 함께 비교할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESET_GROUPS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSetCompareIds(preset.ids)}
              className="px-3 py-1.5 text-xs font-medium bg-[#0b1222] hover:bg-slate-800 border border-slate-700 rounded-md text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Slots Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((slotIdx) => {
          const mat = comparedMaterials[slotIdx];
          if (!mat) {
            return (
              <div
                key={`empty-${slotIdx}`}
                className="p-4 bg-[#080d19] border border-dashed border-slate-800 rounded-lg flex flex-col justify-between space-y-3"
              >
                <span className="text-xs font-mono-tabular text-slate-500">
                  비교 슬롯 #{slotIdx + 1} (비어 있음)
                </span>
                {slotIdx === comparedMaterials.length && availableToAdd.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={addTargetId || availableToAdd[0]?.id}
                      onChange={(e) => setAddTargetId(e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-[#0b1222] border border-slate-700 rounded text-slate-200"
                    >
                      {availableToAdd.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nameKo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>추가</span>
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={mat.id}
              className="p-4 bg-[#0a101e] border border-slate-800 rounded-lg flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono-tabular text-cyan-400">
                    비교 #{slotIdx + 1} · {mat.category}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-100 truncate mt-0.5">
                    {mat.nameKo}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">{mat.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(mat.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  aria-label={`${mat.nameKo} 비교 제거`}
                  title="비교에서 제거"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] font-mono-tabular text-slate-400 truncate">
                ρ {formatPropertyValue(mat.properties.density, 'density')} · σ{' '}
                {formatPropertyValue(mat.properties.tensileStrength, 'tensileStrength')} MPa
              </p>
            </div>
          );
        })}
      </div>

      {comparedMaterials.length === 0 ? (
        <div className="p-10 bg-[#0a101e] border border-slate-800 rounded-lg text-center text-sm text-slate-400">
          비교할 소재를 1개 이상 추가하거나 상단의 비교 프리셋 버튼을 선택해 주세요.
        </div>
      ) : (
        <>
          {/* Radar + Property Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    다축 정규화 레이더 비교
                  </h3>
                  <p className="text-xs text-slate-400">
                    로그 스케일 정규화 (0–100) · 꼭짓점에 마우스를 올리면 원시 수치와 단위가 표시됩니다
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={invertLowIsBetter}
                    onChange={(e) => setInvertLowIsBetter(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <span>경량/저열팽창 역방향 고득점</span>
                </label>
              </div>

              <RadarComparisonChart
                materials={comparedMaterials}
                allMaterialsForBounds={allMaterials}
                axes={RADAR_AXES}
                invertLowIsBetter={invertLowIsBetter}
                reducedMotion={reducedMotion}
              />
            </div>

            <div className="lg:col-span-6 bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    단일 물성 정량 막대 비교
                  </h3>
                  <p className="text-xs text-slate-400">
                    정규화하지 않은 실제 측정 단위 기준 정량 비교
                  </p>
                </div>
                <select
                  value={selectedBarProp}
                  onChange={(e) => setSelectedBarProp(e.target.value as PropertyKey)}
                  className="px-3 py-1.5 text-xs bg-[#070b14] border border-slate-700 rounded text-cyan-300 focus:outline-none focus:border-cyan-400"
                >
                  {PROPERTY_DEFINITIONS.map((def) => (
                    <option key={def.key} value={def.key}>
                      {def.nameKo} ({def.unit})
                    </option>
                  ))}
                </select>
              </div>

              <PropertyBarChart
                materials={comparedMaterials}
                propertyKey={selectedBarProp}
                reducedMotion={reducedMotion}
              />

              {/* Secondary quick bar chart for Specific Strength */}
              <div className="pt-4 border-t border-slate-800/80">
                <PropertyBarChart
                  materials={comparedMaterials}
                  propertyKey={selectedBarProp === 'specificStrength' ? 'density' : 'specificStrength'}
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>
          </div>

          {/* 3D Structure Side-by-Side Comparison (first 2 active slots) */}
          <div className="bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  3D 미세구조 병렬 관찰
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                상위 {Math.min(comparedMaterials.length, 2)}개 비교 시편 동시 렌더링
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparedMaterials.slice(0, 2).map((mat) => (
                <div
                  key={mat.id}
                  className="bg-[#070b14] border border-slate-800 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100 truncate">
                      {mat.nameKo}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-cyan-400 shrink-0">
                      {mat.category}
                    </span>
                  </div>
                  <div className="h-[280px]">
                    <MaterialViewer3D
                      structureType={mat.structureType}
                      accentColor={mat.accentColor}
                      materialId={mat.id}
                      materialLabel={mat.nameKo}
                      reducedMotion={reducedMotion}
                      showCompactHud={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Comparison Matrix Table */}
          <div className="bg-[#0a101e] border border-slate-800 rounded-lg overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-3 px-4 font-medium">물성 (단위)</th>
                  {comparedMaterials.map((m) => (
                    <th key={m.id} className="py-3 px-4 font-semibold text-slate-100">
                      {m.nameKo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {PROPERTY_DEFINITIONS.map((def) => (
                  <tr key={def.key} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-4 text-slate-300">
                      {def.nameKo}{' '}
                      <span className="text-[11px] font-mono-tabular text-slate-500">
                        ({def.unit})
                      </span>
                    </td>
                    {comparedMaterials.map((m) => {
                      const val = getMaterialPropertyValue(m, def.key);
                      return (
                        <td
                          key={`${m.id}-${def.key}`}
                          className="py-2.5 px-4 font-mono-tabular text-slate-100"
                        >
                          {val != null ? (
                            formatPropertyValue(val, def.key)
                          ) : (
                            <span className="text-amber-400">미확보</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
