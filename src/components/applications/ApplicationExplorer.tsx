import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { APPLICATION_DOMAINS } from '../../data/applications';
import { MATERIALS_DATABASE } from '../../data/materials';
import { PROPERTY_MAP } from '../../data/properties';
import { PropertyKey } from '../../types/material';

interface ApplicationExplorerProps {
  activeDomainId: string | null;
  onApplyDomainPreset: (domainId: string) => void;
}

export const ApplicationExplorer: React.FC<ApplicationExplorerProps> = ({
  activeDomainId,
  onApplyDomainPreset,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    activeDomainId || APPLICATION_DOMAINS[0].id
  );
  const selected = APPLICATION_DOMAINS.find((d) => d.id === selectedId) || APPLICATION_DOMAINS[0];

  const presetEntries = Object.entries(selected.constraints) as Array<
    [PropertyKey, { direction?: string; isHardConstraint?: boolean; importance?: number; minVal?: number; maxVal?: number }]
  >;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-100">
          활용 분야 기반 물성 설계 프로파일
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          산업 분야별 핵심 공학 요구사항을 확인하고 추천 알고리즘의 기본 가중치로 불러옵니다. 불러온 이후 탐색실에서 모든 슬라이더를 자유롭게 수정할 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Domain List */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
          {APPLICATION_DOMAINS.map((domain) => {
            const isSelected = domain.id === selected.id;
            const isApplied = domain.id === activeDomainId;
            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => setSelectedId(domain.id)}
                className={`text-left p-3.5 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-[#0e172a] border-cyan-500/70 text-slate-100'
                    : 'bg-[#0a101e] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{domain.nameKo}</span>
                  <span className="text-[11px] font-mono-tabular text-slate-400">
                    {isApplied ? '현재 적용 중' : domain.nameEn}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{domain.summary}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Domain Deep Spec */}
        <div className="lg:col-span-7 bg-[#0a101e] border border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <p className="text-xs font-mono-tabular text-cyan-400">{selected.nameEn}</p>
              <h3 className="text-2xl font-display font-bold text-slate-50 mt-1">
                {selected.nameKo} 분야 소재 설계 기준
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">{selected.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onApplyDomainPreset(selected.id)}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {activeDomainId === selected.id ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>탐색실로 이동</span>
                </>
              ) : (
                <>
                  <span>이 조건으로 탐색 시작</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[#070b14] border border-slate-800 rounded-lg">
              <h4 className="text-xs font-semibold text-slate-300 mb-2.5">핵심 요구 물성 드라이버</h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selected.keyDrivers.map((d) => (
                  <li key={d} className="flex items-center gap-2">
                    <span className="text-cyan-400">▸</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-[#070b14] border border-slate-800 rounded-lg">
              <h4 className="text-xs font-semibold text-slate-300 mb-2.5">주력 검토 소재 분류</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selected.recommendedCategoryFocus.join(' · ')}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                실제 추천 엔진은 전 데이터베이스({MATERIALS_DATABASE.length}종)를 대상으로 평가하며, 조건을 충족하는 타 분류 소재도 함께 발굴합니다.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-3">
              추천 알고리즘 자동 설정 가중치 및 제약 조건
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-left">
                    <th className="py-2 pr-3 font-medium">물성 항목</th>
                    <th className="py-2 px-3 font-medium">최적화 방향</th>
                    <th className="py-2 px-3 font-medium">조건 유형</th>
                    <th className="py-2 pl-3 font-medium text-right">중요도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {presetEntries.map(([key, cfg]) => {
                    const def = PROPERTY_MAP[key];
                    const dirLabel =
                      cfg.direction === 'minimize'
                        ? `최소화 (≤ ${cfg.maxVal} ${def.unit})`
                        : cfg.direction === 'maximize'
                        ? `최대화 (≥ ${cfg.minVal} ${def.unit})`
                        : cfg.direction;
                    return (
                      <tr key={key}>
                        <td className="py-2.5 pr-3 text-slate-200 font-medium">{def.nameKo}</td>
                        <td className="py-2.5 px-3 font-mono-tabular text-cyan-300">{dirLabel}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {cfg.isHardConstraint ? '필수 조건' : '선호 조건'}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono-tabular text-slate-100">
                          {cfg.importance} / 5
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
