import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Compass, FlaskConical, GitCompare } from 'lucide-react';
import { APPLICATION_DOMAINS } from '../../data/applications';
import { MATERIALS_DATABASE } from '../../data/materials';
import { StructureType } from '../../types/material';
import { MaterialViewer3D } from '../three/MaterialViewer3D';

interface LandingPageProps {
  onStartExplore: () => void;
  onSelectDomain: (domainId: string) => void;
  onOpenLab: () => void;
  onOpenCompare: () => void;
  reducedMotion?: boolean;
}

const HERO_SPECIMENS: Array<{
  id: string;
  label: string;
  formula: string;
  structureType: StructureType;
  accentColor: string;
  summary: string;
}> = [
  {
    id: 'graphene',
    label: '그래핀 벌집 격자',
    formula: 'sp² 2D Carbon',
    structureType: 'graphene',
    accentColor: '#06b6d4',
    summary: '탄성계수 1,000 GPa · 열전도율 3,000 W/m·K (단일층 내재 물성)',
  },
  {
    id: 'metal',
    label: '금속 결정 격자',
    formula: 'Ti-6Al-4V HCP / FCC',
    structureType: 'metal_hcp',
    accentColor: '#38bdf8',
    summary: '밀도 4.43 g/cm³ · 인장강도 950 MPa · 항공·생체 표준 합금',
  },
  {
    id: 'nanotube',
    label: '탄소 나노튜브',
    formula: 'MWCNT Helical',
    structureType: 'nanotube',
    accentColor: '#2dd4bf',
    summary: '밀도 1.40 g/cm³ · 비강도 3,214 kN·m/kg (거시 정렬 섬유)',
  },
  {
    id: 'ceramic',
    label: '세라믹 이온 결정',
    formula: 'α-SiC / Al₂O₃',
    structureType: 'ceramic_ionic',
    accentColor: '#67e8f9',
    summary: '내열 온도 1,650°C · 경도 2,600 HV · 초고온 내식 세라믹',
  },
  {
    id: 'composite',
    label: '복합재 적층 구조',
    formula: 'CFRP [0/±45/90]',
    structureType: 'composite_laminate',
    accentColor: '#3b82f6',
    summary: '밀도 1.58 g/cm³ · 준등방 인장강도 950 MPa · 초경량 기체 구조재',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartExplore,
  onSelectDomain,
  onOpenLab,
  onOpenCompare,
  reducedMotion = false,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = HERO_SPECIMENS[activeIdx];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Main Hero Lab Stage */}
      <section className="relative flex-1 grid grid-cols-1 lg:grid-cols-12 items-stretch border-b border-slate-800/80">
        {/* Left: Typographic Entry & Controls */}
        <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-12 lg:py-16 bg-[#060911] z-10">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6"
          >
            <p className="text-xs font-mono-tabular text-cyan-400 tracking-wider">
              MATTER FINDER · INTERACTIVE MATERIALS SIMULATOR
            </p>

            <h1 className="font-display text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight text-slate-50 leading-[1.06] text-balance">
              FIND YOUR MATERIAL.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              세상에 존재하는 수많은 소재 중, 당신의 조건에 가장 적합한 소재를 찾아보세요.
              원하는 물성과 중요도를 직접 설계하면 실제 공학 데이터와 3D 구조 시뮬레이션이
              실시간으로 반응합니다.
            </p>

            {/* Primary CTA + Secondary Shortcuts */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onStartExplore}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>소재 탐색 시작하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenLab}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 font-medium text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <span>가상 소재 설계실</span>
              </button>

              <button
                type="button"
                onClick={onOpenCompare}
                className="px-4 py-3 bg-transparent hover:bg-slate-900 text-slate-300 border border-slate-800 font-medium text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <GitCompare className="w-4 h-4 text-blue-400" />
                <span>성능 비교</span>
              </button>
            </div>

            {/* Interactive Specimen Structure Switcher */}
            <div className="pt-6 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>중앙 3D 시편 구조 전환</span>
                <span className="font-mono-tabular text-cyan-400">{current.formula}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HERO_SPECIMENS.map((spec, idx) => {
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-400/70 text-cyan-200 font-medium'
                          : 'bg-[#0b1120] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {spec.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-mono-tabular text-slate-400">{current.summary}</p>
            </div>
          </motion.div>
        </div>

        {/* Right: Live 3D Specimen Chamber */}
        <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[480px] lg:min-h-[600px] bg-[#070b14] border-t lg:border-t-0 lg:border-l border-slate-800/80">
          <MaterialViewer3D
            structureType={current.structureType}
            accentColor={current.accentColor}
            materialLabel={current.label}
            heroParallaxMode={true}
            reducedMotion={reducedMotion}
            showCompactHud={true}
          />
        </div>
      </section>

      {/* Domain Quick-Launch Strip */}
      <section className="px-6 sm:px-10 lg:px-14 py-10 bg-[#070b14]">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>활용 분야별 탐색 프로파일</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                목표 산업을 선택하면 핵심 물성 가중치가 자동 구성되며, 이후 모든 조건을 직접 미세 조정할 수 있습니다.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-400">
              {MATERIALS_DATABASE.length}종 검증 소재 · 12개 공학 물성 · 실시간 가중치 연산
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {APPLICATION_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => onSelectDomain(domain.id)}
                className="text-left p-4 bg-[#0b1120] hover:bg-[#0f182c] border border-slate-800 hover:border-cyan-500/60 rounded-lg transition-colors group"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                    {domain.nameKo}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    {domain.nameEn}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {domain.summary}
                </p>
                <p className="text-[11px] font-mono-tabular text-cyan-400/90 mt-2.5 truncate">
                  {domain.keyDrivers.slice(0, 3).join(' · ')}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
