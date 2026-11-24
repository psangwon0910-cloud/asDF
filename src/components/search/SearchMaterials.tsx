import React, { useMemo, useState } from 'react';
import { GitCompare, Search, SlidersHorizontal } from 'lucide-react';
import { formatPropertyValue, getMaterialPropertyValue, PROPERTY_DEFINITIONS } from '../../data/properties';
import { evaluateMaterials, parseNaturalQueryToPlan } from '../../engine/recommendationEngine';
import { Material, MaterialCategory } from '../../types/material';
import { MaterialViewer3D } from '../three/MaterialViewer3D';

interface SearchMaterialsProps {
  materials: Material[];
  compareIds: string[];
  reducedMotion?: boolean;
  onToggleCompare: (materialId: string) => void;
  onSendToExplorer: (materialId: string) => void;
}

const CATEGORIES: Array<MaterialCategory | '전체'> = [
  '전체',
  '금속 및 합금',
  '세라믹',
  '탄소계 소재',
  '고분자 및 복합재료',
  '반도체 및 전자소재',
  '건축 및 천연소재',
  '특수 소재',
];

const QUICK_NATURAL_QUERIES = [
  '가장 가벼운 소재',
  '강도가 높은 소재',
  '열전도율이 높은 소재',
  '내열성이 뛰어난 소재',
  '부식에 강한 세라믹',
  '단열 성능이 뛰어난 소재',
  '반도체 저열팽창 소재',
  '전기 전도도가 높은 금속',
];

export const SearchMaterials: React.FC<SearchMaterialsProps> = ({
  materials,
  compareIds,
  reducedMotion = false,
  onToggleCompare,
  onSendToExplorer,
}) => {
  const [category, setCategory] = useState<MaterialCategory | '전체'>('전체');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(materials[0]?.id ?? '');

  const searchResult = useMemo(() => {
    const trimmed = query.trim();
    const plan = trimmed ? parseNaturalQueryToPlan(trimmed) : null;

    const effectiveCategory =
      category !== '전체' ? category : plan?.categoryFilter ?? '전체';

    const pool =
      effectiveCategory === '전체'
        ? materials
        : materials.filter((m) => m.category === effectiveCategory);

    if (plan && plan.matchedIntentLabel !== '텍스트/물성 통합 탐색') {
      const evaluated = evaluateMaterials(pool, plan.constraints);
      return {
        plan,
        items: evaluated.passing.map((item) => ({
          material: item.material,
          score: item.totalScore,
        })),
      };
    }

    const q = trimmed.toLowerCase();
    const filtered = q
      ? pool.filter(
          (m) =>
            m.nameKo.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.composition.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q) ||
            m.applications.some((a) => a.toLowerCase().includes(q))
        )
      : pool;

    return {
      plan,
      items: filtered.map((m) => ({ material: m, score: null as number | null })),
    };
  }, [materials, category, query]);

  const activeMaterial =
    materials.find((m) => m.id === selectedId) ||
    searchResult.items[0]?.material ||
    materials[0];

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Natural-Language Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-100">
              자유 탐색 및 자연어 물성 검색
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              소재 분류별 탐색이나 자연어 질의를 통해 실제 물성 엔진이 계산한 후보를 즉시 3D로 관찰하세요.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-cyan-400">
            검색 결과 {searchResult.items.length}종
          </span>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 가장 가벼운 소재, 강도가 높은 소재, 열전도율이 높은 소재, Ti-6Al-4V..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0b1222] border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-4 py-2.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 whitespace-nowrap shrink-0"
            >
              검색 초기화
            </button>
          )}
        </div>

        {/* Quick Natural Query Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">추천 자연어 질의:</span>
          {QUICK_NATURAL_QUERIES.map((qText) => (
            <button
              key={qText}
              type="button"
              onClick={() => setQuery(qText)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                query === qText
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-[#0b1120] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {qText}
            </button>
          ))}
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CATEGORIES.map((cat) => {
            const count =
              cat === '전체'
                ? materials.length
                : materials.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  category === cat
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                    : 'bg-[#0b1120] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`font-mono-tabular text-[10px] ${
                    category === cat ? 'text-slate-900/80' : 'text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {searchResult.plan && (
          <p className="text-xs font-mono-tabular text-cyan-300">
            해석된 탐색 의도: {searchResult.plan.matchedIntentLabel} · {searchResult.plan.sortDescription}
          </p>
        )}
      </div>

      {/* Main Grid: List + 3D Specimen Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Material List */}
        <div className="order-2 lg:order-1 lg:col-span-5 space-y-2 max-h-[680px] overflow-y-auto pr-1">
          {searchResult.items.length === 0 ? (
            <div className="p-6 bg-[#0a101e] border border-slate-800 rounded-lg text-center text-sm text-slate-400">
              조건에 해당하는 소재가 없습니다. 검색어나 분류 필터를 변경해 보세요.
            </div>
          ) : (
            searchResult.items.map(({ material: m, score }, idx) => {
              const selected = activeMaterial?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-[#0e182d] border-cyan-400/80'
                      : 'bg-[#0a101e] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{m.nameKo}</p>
                      <p className="text-[11px] font-mono-tabular text-slate-400 truncate mt-0.5">
                        {m.name} · {m.category}
                      </p>
                    </div>
                    {score !== null && (
                      <span className="text-xs font-mono-tabular font-bold text-cyan-300 shrink-0">
                        #{idx + 1} · {score.toFixed(1)}점
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono-tabular text-slate-400">
                    <span>밀도 {formatPropertyValue(m.properties.density, 'density')} g/cm³</span>
                    <span>
                      강도 {formatPropertyValue(m.properties.tensileStrength, 'tensileStrength')} MPa
                    </span>
                    <span>
                      내열 {formatPropertyValue(m.properties.maxServiceTemperature, 'maxServiceTemperature')}°C
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 3D Specimen Inspector */}
        {activeMaterial && (
          <div className="order-1 lg:order-2 lg:col-span-7 bg-[#0a101e] border border-slate-800 rounded-lg overflow-hidden">
            <div className="h-[340px] sm:h-[400px] bg-[#070b14]">
              <MaterialViewer3D
                structureType={activeMaterial.structureType}
                accentColor={activeMaterial.accentColor}
                materialId={activeMaterial.id}
                materialLabel={activeMaterial.nameKo}
                reducedMotion={reducedMotion}
                showCompactHud={true}
              />
            </div>

            <div className="p-5 space-y-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono-tabular text-cyan-400">
                    {activeMaterial.category} · {activeMaterial.composition}
                  </p>
                  <h3 className="text-xl font-display font-bold text-slate-50 mt-1">
                    {activeMaterial.nameKo}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleCompare(activeMaterial.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      compareIds.includes(activeMaterial.id)
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>
                      {compareIds.includes(activeMaterial.id) ? '비교 목록 제거' : '비교함 추가'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendToExplorer(activeMaterial.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>탐색실로 이동</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{activeMaterial.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PROPERTY_DEFINITIONS.slice(0, 8).map((def) => {
                  const val = getMaterialPropertyValue(activeMaterial, def.key);
                  return (
                    <div
                      key={def.key}
                      className="p-2.5 bg-[#070b14] border border-slate-800/80 rounded"
                    >
                      <p className="text-[11px] text-slate-400 truncate">{def.nameKo}</p>
                      <p className="text-sm font-mono-tabular font-semibold text-slate-100 mt-0.5">
                        {formatPropertyValue(val, def.key)}{' '}
                        <span className="text-[10px] text-slate-500">{val != null ? def.unit : ''}</span>
                      </p>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] font-mono-tabular text-slate-500">
                출처: {activeMaterial.sources.join(' · ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
