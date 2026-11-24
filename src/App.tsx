import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Menu, Sparkles, Trash2, X } from 'lucide-react';
import { ApplicationExplorer } from './components/applications/ApplicationExplorer';
import { MaterialComparison } from './components/comparison/MaterialComparison';
import { MaterialExplorer } from './components/explorer/MaterialExplorer';
import { MaterialLab } from './components/lab/MaterialLab';
import { LandingPage } from './components/landing/LandingPage';
import { ResultReport } from './components/report/ResultReport';
import { SearchMaterials } from './components/search/SearchMaterials';
import { APPLICATION_DOMAINS } from './data/applications';
import { createDefaultConstraints } from './data/properties';
import { evaluateMaterials } from './engine/recommendationEngine';
import { synthesizeVirtualAsMaterial } from './engine/virtualLabEngine';
import { materialRepository } from './services/materialRepository';
import {
  Material,
  PropertyConstraint,
  PropertyKey,
  SavedDiscoverySession,
  VirtualMaterialProject,
} from './types/material';

type AppView =
  | 'landing'
  | 'explorer'
  | 'search'
  | 'compare'
  | 'lab'
  | 'applications'
  | 'report';

const STORAGE_KEYS = {
  constraints: 'matter_finder_constraints_v1',
  virtualProjects: 'matter_finder_virtual_v1',
  sessions: 'matter_finder_sessions_v1',
  compareIds: 'matter_finder_compare_v1',
  reducedMotion: 'matter_finder_reduced_motion_v1',
};

function safeReadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const realMaterials = useMemo(() => materialRepository.getAllMaterials(), []);

  const [view, setView] = useState<AppView>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionsDrawerOpen, setSessionsDrawerOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [reportSnapshotUrl, setReportSnapshotUrl] = useState<string | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    const stored = safeReadStorage<boolean | null>(STORAGE_KEYS.reducedMotion, null);
    if (stored !== null) return stored;
    return typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  });

  const [constraints, setConstraints] = useState<Record<PropertyKey, PropertyConstraint>>(() =>
    safeReadStorage(STORAGE_KEYS.constraints, createDefaultConstraints())
  );

  const [virtualProjects, setVirtualProjects] = useState<VirtualMaterialProject[]>(() =>
    safeReadStorage(STORAGE_KEYS.virtualProjects, [])
  );

  const [savedSessions, setSavedSessions] = useState<SavedDiscoverySession[]>(() =>
    safeReadStorage(STORAGE_KEYS.sessions, [])
  );

  const [compareIds, setCompareIds] = useState<string[]>(() =>
    safeReadStorage(STORAGE_KEYS.compareIds, ['cfrp-laminate', 'ti-6al-4v', 'al-7075-t6'])
  );

  // Persist states cleanly
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.constraints, JSON.stringify(constraints));
    } catch {
      // Ignore storage quota errors
    }
  }, [constraints]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.virtualProjects, JSON.stringify(virtualProjects));
    } catch {
      // Ignore storage quota errors
    }
  }, [virtualProjects]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(savedSessions));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedSessions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.compareIds, JSON.stringify(compareIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [compareIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.reducedMotion, JSON.stringify(reducedMotion));
    } catch {
      // Ignore
    }
  }, [reducedMotion]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3200);
  };

  // Virtual projects converted to Material interface for comparison
  const virtualAsMaterials: Material[] = useMemo(
    () =>
      virtualProjects.map((proj) => {
        const refs = proj.referenceIds
          .map((rid) => realMaterials.find((m) => m.id === rid))
          .filter((m): m is Material => Boolean(m));
        return synthesizeVirtualAsMaterial(
          proj.id,
          proj.name,
          proj.targetProperties,
          refs,
          proj.notes,
          proj.accentColor
        );
      }),
    [virtualProjects, realMaterials]
  );

  const allMaterialsForCompare = useMemo(
    () => [...realMaterials, ...virtualAsMaterials],
    [realMaterials, virtualAsMaterials]
  );

  // Live Recommendation Engine Computation
  const summary = useMemo(
    () => evaluateMaterials(realMaterials, constraints),
    [realMaterials, constraints]
  );

  const handleUpdateConstraint = (key: PropertyKey, updated: PropertyConstraint) => {
    setActiveDomainId(null);
    setConstraints((prev) => ({ ...prev, [key]: updated }));
  };

  const handleApplyDomainPreset = (domainId: string) => {
    const domain = APPLICATION_DOMAINS.find((d) => d.id === domainId);
    if (!domain) return;
    const next = createDefaultConstraints();
    // Reset all to ignore first so domain weights stand out cleanly
    (Object.keys(next) as PropertyKey[]).forEach((k) => {
      next[k].direction = 'ignore';
      next[k].isHardConstraint = false;
    });
    for (const [k, patch] of Object.entries(domain.constraints)) {
      const key = k as PropertyKey;
      if (next[key] && patch) {
        next[key] = { ...next[key], ...patch };
      }
    }
    setConstraints(next);
    setActiveDomainId(domainId);
    setView('explorer');
    showToast(`${domain.nameKo} 분야 물성 가중치 프로파일이 적용되었습니다.`);
  };

  const handleResetConstraints = () => {
    setConstraints(createDefaultConstraints());
    setActiveDomainId(null);
    showToast('물성 조건이 기본 연구소 프리셋으로 초기화되었습니다.');
  };

  const handleToggleCompare = (materialId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(materialId)) {
        return prev.filter((id) => id !== materialId);
      }
      if (prev.length >= 4) {
        showToast('비교 목록은 최대 4개까지 추가할 수 있습니다.');
        return prev;
      }
      showToast('소재가 성능 비교 목록에 추가되었습니다.');
      return [...prev, materialId];
    });
  };

  const handleSaveSession = () => {
    const top = summary.topCandidates[0];
    const domainName = activeDomainId
      ? APPLICATION_DOMAINS.find((d) => d.id === activeDomainId)?.nameKo
      : null;
    const title = top
      ? `${domainName ? `${domainName} · ` : ''}${top.material.nameKo} (${top.totalScore.toFixed(1)}점)`
      : `탐색 조건 스냅샷 (${new Date().toLocaleTimeString('ko-KR')})`;

    const session: SavedDiscoverySession = {
      id: `session-${Date.now()}`,
      title,
      savedAt: new Date().toISOString(),
      domainId: activeDomainId,
      constraints: JSON.parse(JSON.stringify(constraints)),
      topMaterialId: top?.material.id ?? null,
      topScore: top?.totalScore ?? null,
    };

    setSavedSessions((prev) => [session, ...prev].slice(0, 20));
    showToast('현재 탐색 조건과 추천 결과가 저장되었습니다.');
  };

  const handleLoadSession = (session: SavedDiscoverySession) => {
    setConstraints(session.constraints);
    setActiveDomainId(session.domainId);
    setSessionsDrawerOpen(false);
    setView('explorer');
    showToast('저장된 탐색 프로젝트를 불러왔습니다.');
  };

  const handleNavigate = (nextView: AppView) => {
    setView(nextView);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const navLinks: Array<{ id: AppView; label: string }> = [
    { id: 'explorer', label: '탐색실' },
    { id: 'search', label: '자유 탐색' },
    { id: 'compare', label: '성능 비교' },
    { id: 'lab', label: '가상 설계실' },
    { id: 'applications', label: '활용 분야' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#060911] text-slate-100">
      {/* Strict 3-Zone Single-Row Top Bar */}
      <header className="no-print sticky top-0 z-40 h-16 px-4 sm:px-8 bg-[#060911]/95 border-b border-slate-800/90 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title (single text element) */}
        <button
          type="button"
          onClick={() => handleNavigate('landing')}
          className="font-display text-lg font-bold tracking-tight text-slate-50 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          MATTER FINDER
        </button>

        {/* Zone 2: 5 Concise Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {navLinks.map((link) => {
            const active = view === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavigate(link.id)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Hamburger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavigate('report')}
            className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            발견 보고서
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 text-slate-300 hover:text-white border border-slate-800 rounded-md"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden bg-[#0a101e] border-b border-slate-800 px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNavigate(link.id)}
              className={`w-full text-left px-3 py-2.5 text-sm rounded-md ${
                view === link.id
                  ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNavigate('report')}
            className="w-full text-left px-3 py-2.5 text-sm font-semibold text-cyan-300 bg-cyan-500/10 rounded-md"
          >
            발견 보고서 보기
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
          >
            {view === 'landing' && (
              <LandingPage
                onStartExplore={() => handleNavigate('explorer')}
                onSelectDomain={handleApplyDomainPreset}
                onOpenLab={() => handleNavigate('lab')}
                onOpenCompare={() => handleNavigate('compare')}
                reducedMotion={reducedMotion}
              />
            )}

            {view === 'explorer' && (
              <MaterialExplorer
                materials={realMaterials}
                constraints={constraints}
                summary={summary}
                activeDomainId={activeDomainId}
                compareIds={compareIds}
                reducedMotion={reducedMotion}
                onUpdateConstraint={handleUpdateConstraint}
                onApplyDomainPreset={handleApplyDomainPreset}
                onResetConstraints={handleResetConstraints}
                onToggleCompare={handleToggleCompare}
                onOpenReport={(snap) => {
                  setReportSnapshotUrl(snap);
                  handleNavigate('report');
                }}
                onSaveSession={handleSaveSession}
              />
            )}

            {view === 'search' && (
              <SearchMaterials
                materials={realMaterials}
                compareIds={compareIds}
                reducedMotion={reducedMotion}
                onToggleCompare={handleToggleCompare}
                onSendToExplorer={() => handleNavigate('explorer')}
              />
            )}

            {view === 'compare' && (
              <MaterialComparison
                allMaterials={allMaterialsForCompare}
                compareIds={compareIds}
                reducedMotion={reducedMotion}
                onSetCompareIds={setCompareIds}
              />
            )}

            {view === 'lab' && (
              <MaterialLab
                realMaterials={realMaterials}
                savedVirtualProjects={virtualProjects}
                reducedMotion={reducedMotion}
                onSaveVirtualProject={(proj) => setVirtualProjects((prev) => [proj, ...prev])}
                onDeleteVirtualProject={(id) => {
                  setVirtualProjects((prev) => prev.filter((p) => p.id !== id));
                  setCompareIds((prev) => prev.filter((cid) => cid !== id));
                }}
                onCompareWithVirtual={(virtualId) => {
                  setCompareIds((prev) => {
                    if (prev.includes(virtualId)) return prev;
                    return [virtualId, ...prev].slice(0, 4);
                  });
                  handleNavigate('compare');
                }}
              />
            )}

            {view === 'applications' && (
              <ApplicationExplorer
                activeDomainId={activeDomainId}
                onApplyDomainPreset={handleApplyDomainPreset}
              />
            )}

            {view === 'report' && (
              <ResultReport
                allMaterials={realMaterials}
                constraints={constraints}
                summary={summary}
                initialSnapshotUrl={reportSnapshotUrl}
                reducedMotion={reducedMotion}
                onBackToExplorer={() => handleNavigate('explorer')}
                onSaveSession={handleSaveSession}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Laboratory Footer with Reduced Motion & Saved Sessions Access */}
      <footer className="no-print border-t border-slate-800/80 bg-[#060911] px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-300">MATTER FINDER</span>
            <span>·</span>
            <span>실제 문헌·핸드북 기반 공학 물성 데이터 및 개략적 3D 시각화 시뮬레이터</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setSessionsDrawerOpen(true)}
              className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
              <span>저장된 탐색 프로젝트 ({savedSessions.length})</span>
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 whitespace-nowrap">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="accent-cyan-400"
              />
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>애니메이션 최소화</span>
            </label>
          </div>
        </div>
      </footer>

      {/* Saved Sessions Modal Drawer */}
      {sessionsDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0a101e] border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100">
                저장된 탐색 조건 및 결과 프로젝트
              </h3>
              <button
                type="button"
                onClick={() => setSessionsDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savedSessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                아직 저장된 탐색 프로젝트가 없습니다. 탐색실이나 보고서 화면에서 &quot;탐색 조건 저장&quot;을 눌러 보관할 수 있습니다.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {savedSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-[#070b14] border border-slate-800 rounded-lg flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{s.title}</p>
                      <p className="text-[11px] font-mono-tabular text-slate-500 mt-0.5">
                        {new Date(s.savedAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadSession(s)}
                        className="px-2.5 py-1 text-xs font-medium bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 rounded"
                      >
                        불러오기
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSavedSessions((prev) => prev.filter((item) => item.id !== s.id))
                        }
                        className="p-1 text-slate-500 hover:text-rose-400"
                        aria-label="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="no-print fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-[#0b1325] border border-cyan-500/60 text-cyan-200 text-xs font-medium rounded-lg shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
