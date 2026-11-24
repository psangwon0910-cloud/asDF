import { Material, OptimizationDirection, PropertyConstraint, PropertyKey } from '../types/material';

export interface PropertyDefinition {
  key: PropertyKey;
  tier: 'essential' | 'additional';
  nameKo: string;
  nameEn: string;
  unit: string;
  shortDesc: string;
  scientificDetail: string;
  minBound: number;
  maxBound: number;
  step: number;
  scaleType: 'linear' | 'log';
  defaultDirection: OptimizationDirection;
  defaultMin: number;
  defaultMax: number;
  defaultTarget: number;
  defaultImportance: 1 | 2 | 3 | 4 | 5;
  decimals: number;
  isDerived?: boolean;
  suggestedMaximizeMin?: number;
  suggestedMinimizeMax?: number;
}

export const PROPERTY_DEFINITIONS: PropertyDefinition[] = [
  {
    key: 'density',
    tier: 'essential',
    nameKo: '밀도',
    nameEn: 'Density',
    unit: 'g/cm³',
    shortDesc: '단위 부피당 질량 — 경량화 설계의 핵심 지표',
    scientificDetail:
      '재료의 단위 부피당 질량(ρ). 항공우주·모바일·수송기기에서 구조 중량 절감과 관성 모멘트 감소를 위해 낮을수록 유리한 경우가 많으며, 차폐·밸러스트 용도에서는 고밀도가 요구되기도 합니다.',
    minBound: 0.05,
    maxBound: 20,
    step: 0.05,
    scaleType: 'linear',
    defaultDirection: 'minimize',
    defaultMin: 0.05,
    defaultMax: 5.5,
    defaultTarget: 2.0,
    defaultImportance: 4,
    decimals: 2,
    suggestedMaximizeMin: 7.5,
    suggestedMinimizeMax: 5.5,
  },
  {
    key: 'tensileStrength',
    tier: 'essential',
    nameKo: '인장강도',
    nameEn: 'Ultimate Tensile Strength',
    unit: 'MPa',
    shortDesc: '소재가 파단되기 전까지 견디는 최대 인장 응력',
    scientificDetail:
      '단축 인장 시험에서 시편이 파단에 도달하기 전까지 견딜 수 있는 최대 공칭 응력(σ_uts). 취성 세라믹의 경우 시험편 표면 결함에 민감하므로 굴곡강도나 압축강도와 함께 해석해야 합니다.',
    minBound: 10,
    maxBound: 10000,
    step: 10,
    scaleType: 'log',
    defaultDirection: 'maximize',
    defaultMin: 400,
    defaultMax: 10000,
    defaultTarget: 1200,
    defaultImportance: 5,
    decimals: 0,
    suggestedMaximizeMin: 400,
    suggestedMinimizeMax: 500,
  },
  {
    key: 'hardness',
    tier: 'essential',
    nameKo: '경도',
    nameEn: 'Vickers Hardness',
    unit: 'HV',
    shortDesc: '국부 소성 변형 및 마모·스크래치에 대한 저항성',
    scientificDetail:
      '비커스 압입자(HV) 기준으로 환산한 표면 경도. 내마모 코팅, 절삭 공구, 베어링 표면 설계에서 중요하며, 일반적으로 경도가 매우 높은 소재는 파괴인성이 낮아지는 트레이드오프를 보입니다.',
    minBound: 5,
    maxBound: 10000,
    step: 5,
    scaleType: 'log',
    defaultDirection: 'ignore',
    defaultMin: 100,
    defaultMax: 10000,
    defaultTarget: 500,
    defaultImportance: 2,
    decimals: 0,
  },
  {
    key: 'youngModulus',
    tier: 'essential',
    nameKo: '탄성계수',
    nameEn: "Young's Modulus",
    unit: 'GPa',
    shortDesc: '응력에 대한 변형 저항도 — 구조 강성(Stiffness) 지표',
    scientificDetail:
      '탄성 영역 내 응력-변형률 기울기(E). 정밀 광학 마운트, 반도체 웨이퍼 척, 고속 회전축 등 하중 아래 변형을 최소화해야 하는 구조물에서 핵심적으로 요구됩니다.',
    minBound: 0.1,
    maxBound: 1100,
    step: 1,
    scaleType: 'log',
    defaultDirection: 'maximize',
    defaultMin: 50,
    defaultMax: 1100,
    defaultTarget: 200,
    defaultImportance: 3,
    decimals: 1,
    suggestedMaximizeMin: 50,
    suggestedMinimizeMax: 80,
  },
  {
    key: 'thermalConductivity',
    tier: 'essential',
    nameKo: '열전도율',
    nameEn: 'Thermal Conductivity',
    unit: 'W/m·K',
    shortDesc: '열에너지 전달 속도 — 방열 또는 단열 성능 결정',
    scientificDetail:
      '단위 온도 기울기당 열유속(k). 반도체 히트싱크·전력모듈에는 고열전도율이 필요하고, 우주선 열차폐(TPS)나 극저온 단열재에는 극저열전도율이 요구됩니다.',
    minBound: 0.01,
    maxBound: 3000,
    step: 0.5,
    scaleType: 'log',
    defaultDirection: 'ignore',
    defaultMin: 10,
    defaultMax: 3000,
    defaultTarget: 200,
    defaultImportance: 3,
    decimals: 1,
  },
  {
    key: 'maxServiceTemperature',
    tier: 'essential',
    nameKo: '내열 온도',
    nameEn: 'Max Service Temp',
    unit: '°C',
    shortDesc: '기계적·화학적 물성을 유지하며 연속 사용 가능한 최고 온도',
    scientificDetail:
      '크리프, 산화, 연화 또는 상변태로 인해 구조적 기능을 상실하지 않고 연속 운용 가능한 최대 온도 한계. 고분자는 유리전이온도(Tg)와 열변형온도(HDT)에 지배됩니다.',
    minBound: 50,
    maxBound: 2800,
    step: 10,
    scaleType: 'linear',
    defaultDirection: 'maximize',
    defaultMin: 250,
    defaultMax: 2800,
    defaultTarget: 800,
    defaultImportance: 4,
    decimals: 0,
    suggestedMaximizeMin: 250,
    suggestedMinimizeMax: 300,
  },
  {
    key: 'corrosionResistance',
    tier: 'essential',
    nameKo: '내부식성',
    nameEn: 'Corrosion Resistance',
    unit: 'Index (1–10)',
    shortDesc: '산화·산/알칼리·염수 환경에서의 화학적 안정성 지수',
    scientificDetail:
      '해수, 산성/염기성 화학 약품, 고온 산화 환경에서의 부식 저항 수준을 1(매우 취약)~10(화학적 불활성) 척도로 정규화한 공학적 비교 지수입니다.',
    minBound: 1,
    maxBound: 10,
    step: 0.5,
    scaleType: 'linear',
    defaultDirection: 'maximize',
    defaultMin: 6,
    defaultMax: 10,
    defaultTarget: 9,
    defaultImportance: 3,
    decimals: 1,
  },
  {
    key: 'electricalConductivity',
    tier: 'additional',
    nameKo: '전기전도도',
    nameEn: 'Electrical Conductivity',
    unit: 'MS/m',
    shortDesc: '전류 전달 능력 (절연체는 10⁻¹⁰ 이하 극소값)',
    scientificDetail:
      '전하 이동 용이성(σ). 구리·은·그래핀은 초고전도성을 보이며, 알루미나·PTFE·질화알루미늄 등은 우수한 전기 절연체(0에 근접)로 작동합니다.',
    minBound: 0,
    maxBound: 65,
    step: 0.1,
    scaleType: 'linear',
    defaultDirection: 'ignore',
    defaultMin: 0,
    defaultMax: 65,
    defaultTarget: 20,
    defaultImportance: 2,
    decimals: 2,
    suggestedMaximizeMin: 10,
    suggestedMinimizeMax: 0.5,
  },
  {
    key: 'thermalExpansion',
    tier: 'additional',
    nameKo: '열팽창계수',
    nameEn: 'Thermal Expansion (CTE)',
    unit: 'µm/m·K',
    shortDesc: '온도 1K 변화당 치수 변형률 — 열응력·정밀도 지표',
    scientificDetail:
      '선열팽창계수(α). 반도체 패키징에서 실리콘 웨이퍼(~2.6 µm/m·K)와 매칭하거나, 우주 망원경 구조물처럼 열변형을 최소화해야 할 때는 낮을수록 유리합니다.',
    minBound: 0,
    maxBound: 150,
    step: 0.5,
    scaleType: 'linear',
    defaultDirection: 'ignore',
    defaultMin: 0,
    defaultMax: 25,
    defaultTarget: 5,
    defaultImportance: 2,
    decimals: 1,
  },
  {
    key: 'fractureToughness',
    tier: 'additional',
    nameKo: '파괴인성',
    nameEn: 'Fracture Toughness (K_Ic)',
    unit: 'MPa·√m',
    shortDesc: '균열 전파에 대한 저항성 — 취성 파손 방지 핵심 지표',
    scientificDetail:
      '모드 I 임계 응력확대계수(K_Ic). 미세 균열이 존재할 때 갑작스러운 취성 파괴로 이어지지 않고 에너지를 흡수하는 능력을 나타냅니다.',
    minBound: 0.1,
    maxBound: 150,
    step: 0.5,
    scaleType: 'log',
    defaultDirection: 'ignore',
    defaultMin: 10,
    defaultMax: 150,
    defaultTarget: 50,
    defaultImportance: 3,
    decimals: 1,
  },
  {
    key: 'specificStrength',
    tier: 'additional',
    nameKo: '비강도',
    nameEn: 'Specific Strength (σ/ρ)',
    unit: 'kN·m/kg',
    shortDesc: '단위 질량당 인장강도 (인장강도 ÷ 밀도 자동 계산)',
    scientificDetail:
      '인장강도(MPa)를 밀도(g/cm³)로 나눈 파생 물성(단위 kN·m/kg = MPa/(g/cm³)). 항공기·로켓·경주용 차체 등 무게 대비 강도가 결정적인 설계에서 사용됩니다.',
    minBound: 5,
    maxBound: 5000,
    step: 10,
    scaleType: 'log',
    defaultDirection: 'ignore',
    defaultMin: 200,
    defaultMax: 5000,
    defaultTarget: 800,
    defaultImportance: 4,
    decimals: 0,
    isDerived: true,
  },
  {
    key: 'specificModulus',
    tier: 'additional',
    nameKo: '비탄성계수',
    nameEn: 'Specific Modulus (E/ρ)',
    unit: 'MN·m/kg',
    shortDesc: '단위 질량당 강성 (탄성계수 ÷ 밀도 자동 계산)',
    scientificDetail:
      '탄성계수(GPa)를 밀도(g/cm³)로 나눈 파생 물성(MN·m/kg). 가벼우면서도 휘지 않는 초경량 위성 트러스, 로봇 암, 음향 진동판 설계에 필수적입니다.',
    minBound: 0.5,
    maxBound: 500,
    step: 1,
    scaleType: 'log',
    defaultDirection: 'ignore',
    defaultMin: 25,
    defaultMax: 500,
    defaultTarget: 100,
    defaultImportance: 3,
    decimals: 1,
    isDerived: true,
  },
];

export const PROPERTY_MAP: Record<PropertyKey, PropertyDefinition> =
  PROPERTY_DEFINITIONS.reduce((acc, def) => {
    acc[def.key] = def;
    return acc;
  }, {} as Record<PropertyKey, PropertyDefinition>);

export function getMaterialPropertyValue(
  material: Material,
  key: PropertyKey
): number | null {
  if (key === 'specificStrength') {
    const uts = material.properties.tensileStrength;
    const rho = material.properties.density;
    if (uts == null || rho == null || rho <= 0) return null;
    return Number((uts / rho).toFixed(1));
  }
  if (key === 'specificModulus') {
    const mod = material.properties.youngModulus;
    const rho = material.properties.density;
    if (mod == null || rho == null || rho <= 0) return null;
    return Number((mod / rho).toFixed(2));
  }
  const val = material.properties[key];
  return typeof val === 'number' && !Number.isNaN(val) ? val : null;
}

export function formatPropertyValue(
  value: number | null | undefined,
  key: PropertyKey
): string {
  if (value == null || Number.isNaN(value)) return '미확보';
  const def = PROPERTY_MAP[key];
  if (key === 'electricalConductivity' && value > 0 && value < 0.01) {
    return value.toExponential(1);
  }
  if (value >= 1000) {
    return Math.round(value).toLocaleString('ko-KR');
  }
  return value.toFixed(def.decimals);
}

export function createDefaultConstraints(): Record<PropertyKey, PropertyConstraint> {
  const result = {} as Record<PropertyKey, PropertyConstraint>;
  for (const def of PROPERTY_DEFINITIONS) {
    result[def.key] = {
      key: def.key,
      direction: def.defaultDirection,
      isHardConstraint: false,
      minVal: def.defaultMin,
      maxVal: def.defaultMax,
      targetVal: def.defaultTarget,
      importance: def.defaultImportance,
    };
  }
  return result;
}
