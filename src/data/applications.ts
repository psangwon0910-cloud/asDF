import { ApplicationDomainPreset } from '../types/material';

export const APPLICATION_DOMAINS: ApplicationDomainPreset[] = [
  {
    id: 'aerospace',
    nameKo: '항공우주',
    nameEn: 'Aerospace Structures',
    summary:
      '연료 효율과 탑재 하중 극대화를 위해 극도로 낮은 밀도와 높은 비강도·비탄성계수, 피로 저항성 및 온도 안정성이 최우선으로 요구됩니다.',
    keyDrivers: ['낮은 밀도', '높은 비강도 (σ/ρ)', '높은 비탄성계수 (E/ρ)', '파괴인성 및 피로 안정성'],
    recommendedCategoryFocus: ['고분자 및 복합재료', '금속 및 합금'],
    accentColor: '#38bdf8',
    constraints: {
      density: { direction: 'minimize', isHardConstraint: true, minVal: 0.05, maxVal: 5.0, importance: 5 },
      specificStrength: { direction: 'maximize', isHardConstraint: false, minVal: 200, maxVal: 5000, importance: 5 },
      specificModulus: { direction: 'maximize', isHardConstraint: false, minVal: 25, maxVal: 500, importance: 4 },
      tensileStrength: { direction: 'maximize', isHardConstraint: true, minVal: 450, maxVal: 10000, importance: 4 },
      fractureToughness: { direction: 'maximize', isHardConstraint: true, minVal: 15, maxVal: 150, importance: 4 },
      maxServiceTemperature: { direction: 'maximize', isHardConstraint: false, minVal: 150, maxVal: 2800, importance: 3 },
    },
  },
  {
    id: 'semiconductor',
    nameKo: '반도체',
    nameEn: 'Semiconductor & Packaging',
    summary:
      '나노미터 공정 정밀도를 위해 실리콘과 매칭되는 저열팽창계수, 신속한 열 분산(고열전도율), 고강성 및 선택적 절연·전도 특성이 핵심입니다.',
    keyDrivers: ['열전도율 관리', '저열팽창계수 (CTE 매칭)', '높은 탄성계수 (정밀 강성)', '화학적 고순도/내식성'],
    recommendedCategoryFocus: ['반도체 및 전자소재', '세라믹', '탄소계 소재', '금속 및 합금'],
    accentColor: '#22d3ee',
    constraints: {
      thermalConductivity: { direction: 'maximize', isHardConstraint: false, minVal: 30, maxVal: 3000, importance: 5 },
      thermalExpansion: { direction: 'minimize', isHardConstraint: true, minVal: 0, maxVal: 12, importance: 5 },
      youngModulus: { direction: 'maximize', isHardConstraint: false, minVal: 150, maxVal: 1100, importance: 4 },
      corrosionResistance: { direction: 'maximize', isHardConstraint: false, minVal: 7, maxVal: 10, importance: 4 },
      maxServiceTemperature: { direction: 'maximize', isHardConstraint: false, minVal: 300, maxVal: 2800, importance: 3 },
    },
  },
  {
    id: 'space',
    nameKo: '우주 탐사',
    nameEn: 'Deep Space & Re-entry',
    summary:
      '발사 중량을 줄이기 위한 초저밀도와 극저온(-200°C)~초고온 열사이클 안정성, 진공·방사선 환경에서의 열변형 최소화가 필수입니다.',
    keyDrivers: ['극한 온도 안정성', '초저밀도 및 높은 비강성', '최소 열팽창계수', '화학적·진공 내구성'],
    recommendedCategoryFocus: ['특수 소재', '탄소계 소재', '세라믹', '고분자 및 복합재료'],
    accentColor: '#818cf8',
    constraints: {
      density: { direction: 'minimize', isHardConstraint: true, minVal: 0.05, maxVal: 4.6, importance: 5 },
      maxServiceTemperature: { direction: 'maximize', isHardConstraint: true, minVal: 350, maxVal: 2800, importance: 5 },
      thermalExpansion: { direction: 'minimize', isHardConstraint: false, minVal: 0, maxVal: 10, importance: 4 },
      specificModulus: { direction: 'maximize', isHardConstraint: false, minVal: 25, maxVal: 500, importance: 4 },
    },
  },
  {
    id: 'automotive',
    nameKo: '자동차',
    nameEn: 'Automotive & EV Mobility',
    summary:
      '전기차 주행거리 향상과 충돌 안전성을 위해 경량화(저밀도), 충분한 파괴인성·충격 흡수력, 그리고 구동모터/배터리 열관리 성능이 중요합니다.',
    keyDrivers: ['경량화 (밀도 최소화)', '높은 인장강도', '충격 파괴인성', '열전도 및 내식성'],
    recommendedCategoryFocus: ['금속 및 합금', '고분자 및 복합재료'],
    accentColor: '#34d399',
    constraints: {
      density: { direction: 'minimize', isHardConstraint: true, minVal: 0.05, maxVal: 4.8, importance: 5 },
      tensileStrength: { direction: 'maximize', isHardConstraint: true, minVal: 250, maxVal: 10000, importance: 4 },
      fractureToughness: { direction: 'maximize', isHardConstraint: false, minVal: 15, maxVal: 150, importance: 4 },
      corrosionResistance: { direction: 'maximize', isHardConstraint: false, minVal: 6, maxVal: 10, importance: 3 },
    },
  },
  {
    id: 'energy',
    nameKo: '에너지',
    nameEn: 'Clean Energy & Turbines',
    summary:
      '발전 가스터빈·원자로·수소·풍력 시스템에서 고온 크리프 저항, 부식·수소 취성 저항 및 장기 기계적 내구성이 핵심 지표로 작용합니다.',
    keyDrivers: ['고온 내열성', '높은 내부식성', '크리프 및 피로 강도', '열전도/단열 최적화'],
    recommendedCategoryFocus: ['금속 및 합금', '세라믹', '고분자 및 복합재료'],
    accentColor: '#f59e0b',
    constraints: {
      maxServiceTemperature: { direction: 'maximize', isHardConstraint: true, minVal: 600, maxVal: 2800, importance: 5 },
      corrosionResistance: { direction: 'maximize', isHardConstraint: true, minVal: 8, maxVal: 10, importance: 5 },
      tensileStrength: { direction: 'maximize', isHardConstraint: false, minVal: 400, maxVal: 10000, importance: 4 },
      fractureToughness: { direction: 'maximize', isHardConstraint: false, minVal: 10, maxVal: 150, importance: 3 },
    },
  },
  {
    id: 'medical',
    nameKo: '의료',
    nameEn: 'Biomedical & Implants',
    summary:
      '체액 내 이온 용출을 막는 최상급 내부식성, 인체 뼈와 조화되는 탄성계수 및 경량성, 반복 하중을 견디는 피로·파괴인성이 필요합니다.',
    keyDrivers: ['최고 수준 내부식성', '우수한 파괴인성', '적정 밀도 및 강도', '생체 비활성'],
    recommendedCategoryFocus: ['금속 및 합금', '세라믹', '고분자 및 복합재료', '특수 소재'],
    accentColor: '#2dd4bf',
    constraints: {
      corrosionResistance: { direction: 'maximize', isHardConstraint: true, minVal: 8.5, maxVal: 10, importance: 5 },
      fractureToughness: { direction: 'maximize', isHardConstraint: false, minVal: 8, maxVal: 150, importance: 4 },
      density: { direction: 'minimize', isHardConstraint: false, minVal: 0.05, maxVal: 8.5, importance: 3 },
      tensileStrength: { direction: 'maximize', isHardConstraint: false, minVal: 90, maxVal: 10000, importance: 4 },
    },
  },
  {
    id: 'construction',
    nameKo: '건축',
    nameEn: 'Civil & Architectural',
    summary:
      '장대 교량과 초고층 구조물의 장기 내후성(내부식성), 좌굴·처짐 억제를 위한 높은 탄성계수 및 구조적 파괴인성이 핵심입니다.',
    keyDrivers: ['장기 내후/내부식성', '높은 파괴인성', '탄성계수 (처짐 억제)', '적정 강도 대비 경제성'],
    recommendedCategoryFocus: ['건축 및 천연소재', '금속 및 합금', '고분자 및 복합재료'],
    accentColor: '#94a3b8',
    constraints: {
      corrosionResistance: { direction: 'maximize', isHardConstraint: true, minVal: 7.0, maxVal: 10, importance: 5 },
      youngModulus: { direction: 'maximize', isHardConstraint: false, minVal: 20, maxVal: 1100, importance: 4 },
      fractureToughness: { direction: 'maximize', isHardConstraint: false, minVal: 20, maxVal: 150, importance: 4 },
      tensileStrength: { direction: 'maximize', isHardConstraint: false, minVal: 250, maxVal: 10000, importance: 4 },
    },
  },
  {
    id: 'electronics',
    nameKo: '전자기기',
    nameEn: 'Consumer & Power Electronics',
    summary:
      '모바일·웨어러블·고전력 장치의 발열 제어(고열전도율), 경량 외장 강도, 그리고 용도에 따른 고전기전도성 또는 절연성이 요구됩니다.',
    keyDrivers: ['열전도율 (방열)', '저밀도 경량화', '전기전도도 제어', '표면 경도/내스크래치'],
    recommendedCategoryFocus: ['반도체 및 전자소재', '금속 및 합금', '탄소계 소재', '세라믹'],
    accentColor: '#60a5fa',
    constraints: {
      thermalConductivity: { direction: 'maximize', isHardConstraint: true, minVal: 80, maxVal: 3000, importance: 5 },
      density: { direction: 'minimize', isHardConstraint: false, minVal: 0.05, maxVal: 9.0, importance: 4 },
      electricalConductivity: { direction: 'maximize', isHardConstraint: false, minVal: 1, maxVal: 65, importance: 3 },
      hardness: { direction: 'maximize', isHardConstraint: false, minVal: 50, maxVal: 10000, importance: 3 },
    },
  },
  {
    id: 'extreme',
    nameKo: '극한 환경',
    nameEn: 'Extreme Thermal & Chemical',
    summary:
      '1,000°C 이상의 초고온 플라즈마·연소 환경이나 강산/부식성 유체 속에서 물성 열화 없이 버티는 최고 수준의 내열·내부식·경도가 필요합니다.',
    keyDrivers: ['초고온 내열성 (1,000°C+)', '최고 화학적 불활성', '고경도·내마모성', '저열팽창 열충격 저항'],
    recommendedCategoryFocus: ['세라믹', '금속 및 합금', '탄소계 소재'],
    accentColor: '#fb7185',
    constraints: {
      maxServiceTemperature: { direction: 'maximize', isHardConstraint: true, minVal: 1000, maxVal: 2800, importance: 5 },
      corrosionResistance: { direction: 'maximize', isHardConstraint: true, minVal: 7.5, maxVal: 10, importance: 5 },
      hardness: { direction: 'maximize', isHardConstraint: false, minVal: 300, maxVal: 10000, importance: 4 },
      thermalExpansion: { direction: 'minimize', isHardConstraint: false, minVal: 0, maxVal: 15, importance: 4 },
    },
  },
];
