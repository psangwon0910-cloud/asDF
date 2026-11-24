import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookmarkCheck, FlaskConical, GitCompare, Trash2 } from 'lucide-react';
import { formatPropertyValue, PROPERTY_DEFINITIONS } from '../../data/properties';
import {
  evaluateVirtualFeasibility,
  inferStructureForVirtualMaterial,
  synthesizeVirtualAsMaterial,
} from '../../engine/virtualLabEngine';
import {
  Material,
  MaterialProperties,
  VirtualMaterialProject,
} from '../../types/material';
import { MaterialViewer3D } from '../three/MaterialViewer3D';

interface MaterialLabProps {
  realMaterials: Material[];
  savedVirtualProjects: VirtualMaterialProject[];
  reducedMotion?: boolean;
  onSaveVirtualProject: (project: VirtualMaterialProject) => void;
  onDeleteVirtualProject: (id: string) => void;
  onCompareWithVirtual: (virtualId: string) => void;
}

const INSPIRATION_TRAITS = [
  { label: '초고강도 참조 (Carbon Fiber)', materialId: 'carbon-fiber', prop: 'tensileStrength' as const },
  { label: '초저밀도 참조 (Aerogel)', materialId: 'silica-aerogel', prop: 'density' as const },
  { label: '초고내열 참조 (SiC)', materialId: 'silicon-carbide', prop: 'maxServiceTemperature' as const },
  { label: '고열전도 참조 (Diamond)', materialId: 'diamond', prop: 'thermalConductivity' as const },
  { label: '고파괴인성 참조 (SS 316L)', materialId: 'ss-316l', prop: 'fractureToughness' as const },
];

export const MaterialLab: React.FC<MaterialLabProps> = ({
  realMaterials,
  savedVirtualProjects,
  reducedMotion = false,
  onSaveVirtualProject,
  onDeleteVirtualProject,
  onCompareWithVirtual,
}) => {
  const [projectName, setProjectName] = useState('Project NOVA-01');
  const [referenceIds, setReferenceIds] = useState<string[]>(['ti-6al-4v', 'cfrp-laminate']);
  const [accentColor, setAccentColor] = useState('#22d3ee');
  const [notes, setNotes] = useState('');
  const [targetProps, setTargetProps] = useState<MaterialProperties>({
    density: 1.85,
    tensileStrength: 1450,
    hardness: 420,
    youngModulus: 185,
    thermalConductivity: 95,
    maxServiceTemperature: 850,
    electricalConductivity: 1.2,
    thermalExpansion: 4.5,
    fractureToughness: 48,
    corrosionResistance: 9.0,
  });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const feasibilityWarnings = useMemo(
    () => evaluateVirtualFeasibility(targetProps),
    [targetProps]
  );
  const inferredStructure = useMemo(
    () => inferStructureForVirtualMaterial(targetProps),
    [targetProps]
  );

  const referenceMaterials = useMemo(
    () =>
      referenceIds
        .map((id) => realMaterials.find((m) => m.id === id))
        .filter((m): m is Material => Boolean(m)),
    [referenceIds, realMaterials]
  );

  const previewMaterial = useMemo(
    () =>
      synthesizeVirtualAsMaterial(
        'virtual-preview',
        projectName || 'Untitled Spec',
        targetProps,
        referenceMaterials,
        notes,
        accentColor
      ),
    [projectName, targetProps, referenceMaterials, notes, accentColor]
  );

  const handleInheritTrait = (materialId: string, prop: keyof MaterialProperties) => {
    const mat = realMaterials.find((m) => m.id === materialId);
    if (!mat) return;
    const val = mat.properties[prop];
    if (val != null) {
      setTargetProps((prev) => ({ ...prev, [prop]: val }));
    }
    if (!referenceIds.includes(materialId)) {
      setReferenceIds((prev) => [...prev.slice(-2), materialId]);
    }
  };

  const handleBlendReferences = () => {
    if (referenceMaterials.length === 0) return;
    const keys: Array<keyof MaterialProperties> = [
      'density',
      'tensileStrength',
      'hardness',
      'youngModulus',
      'thermalConductivity',
      'maxServiceTemperature',
      'electricalConductivity',
      'thermalExpansion',
      'fractureToughness',
      'corrosionResistance',
    ];
    const next: MaterialProperties = { ...targetProps };
    for (const k of keys) {
      const vals = referenceMaterials
        .map((m) => m.properties[k])
        .filter((v): v is number => v != null);
      if (vals.length > 0) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        next[k] = Number(avg.toFixed(2));
      }
    }
    setTargetProps(next);
  };

  const handleSave = () => {
    const cleanName = projectName.trim() || `Project NOVA-${savedVirtualProjects.length + 1}`;
    const id = `virtual-${Date.now()}`;
    const project: VirtualMaterialProject = {
      id,
      name: cleanName,
      createdAt: new Date().toISOString(),
      referenceIds,
      targetProperties: { ...targetProps },
      structureType: inferredStructure,
      accentColor,
      notes,
      feasibilityWarnings,
    };
    onSaveVirtualProject(project);
    setSavedNotice(`"${cleanName}" 가상 설계 사양이 저장되었습니다.`);
    window.setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleLoadProject = (proj: VirtualMaterialProject) => {
    setProjectName(proj.name);
    setReferenceIds(proj.referenceIds);
    setTargetProps(proj.targetProperties);
    setAccentColor(proj.accentColor);
    setNotes(proj.notes);
  };

  const labProps = PROPERTY_DEFINITIONS.filter((d) => !d.isDerived);

  const specificStrength =
    targetProps.tensileStrength && targetProps.density
      ? Math.round(targetProps.tensileStrength / targetProps.density)
      : null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header + Explicit Scientific Boundary Notice */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono-tabular">
            <FlaskConical className="w-4 h-4" />
            <span>VIRTUAL MATERIAL DESIGN LABORATORY</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-100 mt-1">
            가상 소재 설계실 (Material Lab)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            기존 소재의 강점 물성을 참고해 가상 목표 스펙을 조합하고 3D 구조 변화와 물리적 타당성 한계를 시뮬레이션합니다.
          </p>
        </div>

        <div className="p-3 bg-amber-950/25 border border-amber-500/40 rounded-lg max-w-xl text-xs text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            가상 설계 결과는 <strong>목표 물성 사양 시뮬레이션</strong>이며, 실제 실험실에서 합성·제조 가능함을 검증한 신소재가 아닙니다.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Target Specification Controls */}
        <div className="order-2 lg:order-1 lg:col-span-5 space-y-4">
          {/* Identity & Reference Inspiration */}
          <div className="bg-[#0a101e] border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">가상 프로젝트 이름</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="예: Project NOVA-01"
                  className="w-full px-3 py-2 text-sm font-mono-tabular bg-[#070b14] border border-slate-700 rounded-md text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">시편 강조 색상</label>
                <div className="flex items-center gap-2 h-[38px]">
                  {['#22d3ee', '#3b82f6', '#34d399', '#f59e0b', '#ec4899'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAccentColor(col)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        accentColor === col ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                      aria-label={`색상 ${col}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 1. Reference Material Traits */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  1. 기존 소재 물성 참고 (개별 특성 가져오기)
                </span>
                <button
                  type="button"
                  onClick={handleBlendReferences}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                >
                  선택 참고 소재 평균으로 초기화
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_TRAITS.map((trait) => (
                  <button
                    key={trait.label}
                    type="button"
                    onClick={() => handleInheritTrait(trait.materialId, trait.prop)}
                    className="px-2.5 py-1 text-[11px] bg-[#070b14] hover:bg-slate-800 border border-slate-700/80 rounded text-slate-300 transition-colors"
                  >
                    {trait.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Target Property Sliders */}
          <div className="bg-[#0a101e] border border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200">
              2. 사용자 목표 물성 직접 설정
            </h3>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {labProps.map((def) => {
                const val = targetProps[def.key as keyof MaterialProperties] ?? def.defaultTarget;
                return (
                  <div key={def.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">{def.nameKo}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={def.minBound}
                          max={def.maxBound}
                          step={def.step}
                          value={val}
                          onChange={(e) =>
                            setTargetProps((prev) => ({
                              ...prev,
                              [def.key]: Number(e.target.value),
                            }))
                          }
                          className="w-24 px-2 py-0.5 text-right font-mono-tabular text-xs bg-[#070b14] border border-slate-700 rounded text-cyan-300"
                        />
                        <span className="text-[11px] font-mono-tabular text-slate-500 w-16">
                          {def.unit}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={def.minBound}
                      max={def.maxBound}
                      step={def.step}
                      value={val}
                      onChange={(e) =>
                        setTargetProps((prev) => ({
                          ...prev,
                          [def.key]: Number(e.target.value),
                        }))
                      }
                      className="lab-slider w-full"
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-md flex items-center gap-1.5 transition-colors"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>가상 설계 프로젝트 저장</span>
              </button>
              {savedNotice && <span className="text-xs text-emerald-400">{savedNotice}</span>}
            </div>
          </div>
        </div>

        {/* Right: 3. Virtual Design Result & 4. Feasibility Analysis */}
        <div className="order-1 lg:order-2 lg:col-span-7 space-y-5">
          {/* Live 3D Morphing Chamber */}
          <div className="bg-[#0a101e] border border-slate-800 rounded-lg overflow-hidden">
            <div className="h-[340px] sm:h-[400px] bg-[#070b14]">
              <MaterialViewer3D
                structureType={inferredStructure}
                accentColor={accentColor}
                materialLabel={previewMaterial.nameKo}
                reducedMotion={reducedMotion}
                showCompactHud={true}
              />
            </div>

            <div className="p-5 border-t border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-mono-tabular text-cyan-400">
                    3. 가상 설계 결과 (Target Simulation Spec)
                  </p>
                  <h3 className="text-xl font-display font-bold text-slate-50 mt-0.5">
                    {projectName || 'Project NOVA-01'}
                  </h3>
                </div>
                {specificStrength !== null && (
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block">목표 비강도 (σ/ρ)</span>
                    <span className="text-lg font-mono-tabular font-bold text-cyan-300">
                      {specificStrength.toLocaleString('ko-KR')} kN·m/kg
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-[#070b14] border border-slate-800 rounded">
                  <span className="text-slate-400 block">목표 밀도</span>
                  <span className="font-mono-tabular font-semibold text-slate-100">
                    {formatPropertyValue(targetProps.density, 'density')} g/cm³
                  </span>
                </div>
                <div className="p-2.5 bg-[#070b14] border border-slate-800 rounded">
                  <span className="text-slate-400 block">목표 인장강도</span>
                  <span className="font-mono-tabular font-semibold text-slate-100">
                    {formatPropertyValue(targetProps.tensileStrength, 'tensileStrength')} MPa
                  </span>
                </div>
                <div className="p-2.5 bg-[#070b14] border border-slate-800 rounded">
                  <span className="text-slate-400 block">목표 내열성</span>
                  <span className="font-mono-tabular font-semibold text-slate-100">
                    {formatPropertyValue(targetProps.maxServiceTemperature, 'maxServiceTemperature')} °C
                  </span>
                </div>
                <div className="p-2.5 bg-[#070b14] border border-slate-800 rounded">
                  <span className="text-slate-400 block">목표 열전도율</span>
                  <span className="font-mono-tabular font-semibold text-slate-100">
                    {formatPropertyValue(targetProps.thermalConductivity, 'thermalConductivity')} W/m·K
                  </span>
                </div>
              </div>

              {/* 4. Feasibility Review */}
              <div className="p-3.5 bg-[#070b14] border border-amber-500/30 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-amber-300">
                  4. 실제 구현 가능성 검토 필요 (물리적 한계 진단)
                </p>
                <ul className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
                  {feasibilityWarnings.map((w, i) => (
                    <li key={i}>· {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Saved Virtual Projects Drawer */}
          <div className="bg-[#0a101e] border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                저장된 가상 설계 프로젝트 ({savedVirtualProjects.length}건)
              </h3>
              <span className="text-xs text-slate-400">
                브라우저 로컬 저장소에 영구 보관됩니다
              </span>
            </div>

            {savedVirtualProjects.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                아직 저장된 가상 소재 프로젝트가 없습니다. 왼쪽 패널에서 목표 물성을 조정하고 저장해 보세요.
              </p>
            ) : (
              <div className="space-y-2.5">
                {savedVirtualProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 bg-[#070b14] border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: proj.accentColor }}
                        />
                        <span className="text-sm font-semibold text-slate-100 truncate">
                          {proj.name}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-slate-500">
                          {new Date(proj.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono-tabular text-slate-400 mt-1">
                        밀도 {proj.targetProperties.density} g/cm³ · 강도{' '}
                        {proj.targetProperties.tensileStrength} MPa · 내열{' '}
                        {proj.targetProperties.maxServiceTemperature}°C
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadProject(proj)}
                        className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-200"
                      >
                        불러오기
                      </button>
                      <button
                        type="button"
                        onClick={() => onCompareWithVirtual(proj.id)}
                        className="px-2.5 py-1.5 text-xs bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded text-cyan-200 flex items-center gap-1"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>실제 소재와 비교</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVirtualProject(proj.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                        aria-label={`${proj.name} 삭제`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
