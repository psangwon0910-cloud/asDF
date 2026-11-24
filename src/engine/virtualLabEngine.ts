import { Material, MaterialProperties, StructureType } from '../types/material';

/**
 * Evaluates physical plausibility and engineering trade-offs for a Virtual Material specification.
 * Explicitly ensures users understand virtual goals are NOT verified manufacturable materials.
 */
export function evaluateVirtualFeasibility(props: MaterialProperties): string[] {
  const warnings: string[] = [];
  const density = props.density ?? 2.5;
  const uts = props.tensileStrength ?? 500;
  const modulus = props.youngModulus ?? 100;
  const k = props.thermalConductivity ?? 20;
  const temp = props.maxServiceTemperature ?? 300;
  const toughness = props.fractureToughness ?? 20;
  const hardness = props.hardness ?? 250;
  const elec = props.electricalConductivity ?? 1;

  const specificStrength = density > 0 ? uts / density : 0;

  if (density < 0.8 && uts > 500) {
    warnings.push(
      `초저밀도(${density.toFixed(2)} g/cm³)와 고인장강도(${uts} MPa) 조합은 비강도 ${Math.round(specificStrength)} kN·m/kg로 일반 벌크 소재의 Ashby 한계를 상회합니다. 다공성 나노아키텍처 또는 탄소나노소재 수준을 전제로 합니다.`
    );
  }
  if (temp > 1200 && density < 2.0) {
    warnings.push(
      `1,200°C 이상의 초고온 내열성과 2.0 g/cm³ 미만의 저밀도 동시 달성은 산소 분위기 산화 저항 코팅 또는 C/C·세라믹 기지 복합화 검증이 필수입니다.`
    );
  }
  if (hardness > 1500 && toughness > 50) {
    warnings.push(
      `초고경도(${hardness} HV)와 높은 파괴인성(${toughness} MPa·√m)은 전위 이동 억제와 균열 둔화가 상충하는 전형적 강도-인성 트레이드오프 영역입니다.`
    );
  }
  if (k > 300 && elec < 0.01 && modulus < 200) {
    warnings.push(
      `300 W/m·K 이상의 고열전도성과 전기 절연성 병립은 다이아몬드·c-BN·AlN 등 고강성 공유결합 포논(Phonon) 전도 결정에서만 제한적으로 관찰됩니다.`
    );
  }
  if (warnings.length === 0) {
    warnings.push(
      '현재 목표 스펙은 기존 합금·세라믹·복합재의 물성 상관관계 범위 내에 위치하나, 실제 합성 시 공정·열처리·계면 결합 검증이 필요합니다.'
    );
  }

  return warnings;
}

export function inferStructureForVirtualMaterial(props: MaterialProperties): StructureType {
  const density = props.density ?? 3;
  const temp = props.maxServiceTemperature ?? 400;
  const elec = props.electricalConductivity ?? 1;
  const k = props.thermalConductivity ?? 30;
  const hardness = props.hardness ?? 200;

  if (density < 0.6) return 'aerogel_porous';
  if (k > 600 && elec > 10) return 'graphene';
  if (hardness > 2500) return 'diamond';
  if (temp > 1100 && elec < 0.1) return 'ceramic_ionic';
  if (density < 2.1 && (props.tensileStrength ?? 0) > 600) return 'composite_laminate';
  if (elec > 5) return 'metal_fcc';
  return 'metamaterial_lattice';
}

export function synthesizeVirtualAsMaterial(
  id: string,
  name: string,
  props: MaterialProperties,
  referenceMaterials: Material[],
  notes: string,
  accentColor: string
): Material {
  const structureType = inferStructureForVirtualMaterial(props);
  const warnings = evaluateVirtualFeasibility(props);

  return {
    id,
    name: `${name} (Virtual Spec)`,
    nameKo: `${name} [가상 설계 스펙]`,
    category: '특수 소재',
    composition:
      referenceMaterials.length > 0
        ? `Target Blend Inspired by: ${referenceMaterials.map((r) => r.name).join(' + ')}`
        : 'User-Defined Virtual Target Specification',
    properties: { ...props },
    description:
      notes ||
      '사용자가 Virtual Material Lab에서 목표 물성을 조합·설계한 가상 소재 시뮬레이션 스펙입니다.',
    advantages: [
      '사용자 맞춤형 목표 물성 프로파일 반영',
      ...referenceMaterials.slice(0, 2).map((r) => `참고 소재(${r.nameKo})의 핵심 강점 지향`),
    ],
    disadvantages: [
      '가상 목표치로 실제 합성 가능성 및 계면 안정성 미검증',
      ...warnings.slice(0, 1),
    ],
    applications: ['개념 설계 및 목표 물성 벤치마킹', '신소재 R&D 타겟 사양서'],
    sources: ['MATTER FINDER Virtual Material Lab (User Target Simulation — Non-Empirical)'],
    dataConditions: '사용자 설정 가상 목표 스펙 (실제 시험 측정 데이터 아님)',
    reliability: 'experimental_microscale',
    structureType,
    accentColor,
    isVirtual: true,
    virtualDisclaimer:
      '본 데이터는 연구·탐색 목적의 가상 목표 스펙이며, 실제 합성 또는 제조 가능성을 보증하지 않습니다.',
  };
}
