export type MaterialCategory =
  | '금속 및 합금'
  | '세라믹'
  | '탄소계 소재'
  | '고분자 및 복합재료'
  | '반도체 및 전자소재'
  | '건축 및 천연소재'
  | '특수 소재';

export type StructureType =
  | 'metal_fcc'
  | 'metal_bcc'
  | 'metal_hcp'
  | 'graphene'
  | 'nanotube'
  | 'diamond'
  | 'graphite'
  | 'ceramic_ionic'
  | 'composite_laminate'
  | 'polymer_chain'
  | 'aerogel_porous'
  | 'metamaterial_lattice';

export type BasePropertyKey =
  | 'density'
  | 'tensileStrength'
  | 'hardness'
  | 'youngModulus'
  | 'thermalConductivity'
  | 'maxServiceTemperature'
  | 'corrosionResistance'
  | 'electricalConductivity'
  | 'thermalExpansion'
  | 'fractureToughness';

export type DerivedPropertyKey = 'specificStrength' | 'specificModulus';

export type PropertyKey = BasePropertyKey | DerivedPropertyKey;

export type DataReliability =
  | 'verified_handbook'
  | 'literature_range'
  | 'experimental_microscale';

export interface MaterialProperties {
  density?: number | null; // g/cm³
  tensileStrength?: number | null; // MPa
  hardness?: number | null; // HV (Vickers Hardness)
  youngModulus?: number | null; // GPa
  thermalConductivity?: number | null; // W/(m·K)
  maxServiceTemperature?: number | null; // °C
  electricalConductivity?: number | null; // MS/m
  thermalExpansion?: number | null; // µm/(m·K) (10^-6 / K)
  fractureToughness?: number | null; // MPa·√m
  corrosionResistance?: number | null; // 1–10 relative index
}

export type PropertyRanges = Partial<Record<BasePropertyKey, [number, number]>>;

export interface Material {
  id: string;
  name: string;
  nameKo: string;
  category: MaterialCategory;
  composition: string;
  properties: MaterialProperties;
  propertyRanges?: PropertyRanges;
  description: string;
  advantages: string[];
  disadvantages: string[];
  applications: string[];
  sources: string[];
  dataConditions?: string;
  reliability: DataReliability;
  visualization?: string;
  structureType: StructureType;
  accentColor: string;
  isVirtual?: boolean;
  virtualDisclaimer?: string;
}

export type OptimizationDirection =
  | 'minimize'
  | 'maximize'
  | 'range'
  | 'target'
  | 'ignore';

export interface PropertyConstraint {
  key: PropertyKey;
  direction: OptimizationDirection;
  isHardConstraint: boolean;
  minVal: number;
  maxVal: number;
  targetVal: number;
  importance: 1 | 2 | 3 | 4 | 5;
}

export interface PropertyScoreBreakdown {
  key: PropertyKey;
  rawValue: number | null;
  normalizedScore: number | null; // 0..100
  weight: number;
  passedHardConstraint: boolean;
  constraintReason?: string;
}

export interface RecommendationItem {
  material: Material;
  totalScore: number; // 0..100
  coverageRatio: number; // 0..1 (fraction of active properties with data)
  passedAllHardConstraints: boolean;
  failedHardConstraints: PropertyKey[];
  breakdowns: PropertyScoreBreakdown[];
  strongestProperty: { key: PropertyKey; score: number } | null;
  weakestProperty: { key: PropertyKey; score: number } | null;
  recommendationReasons: string[];
  differenceHighlights: string[];
  rank: number | null; // 1, 2, 3... for passing candidates
}

export interface ConstraintBottleneck {
  key: PropertyKey;
  eliminatedCount: number;
  suggestedRelaxation: string;
  relaxedMinVal?: number;
  relaxedMaxVal?: number;
}

export interface RecommendationSummary {
  passing: RecommendationItem[];
  rejected: RecommendationItem[];
  topCandidates: RecommendationItem[]; // Up to 3
  bottlenecks: ConstraintBottleneck[];
  relaxedPreviewCandidates: RecommendationItem[];
  activePropertyCount: number;
  totalWeight: number;
}

export interface VirtualMaterialProject {
  id: string;
  name: string;
  createdAt: string;
  referenceIds: string[];
  targetProperties: MaterialProperties;
  structureType: StructureType;
  accentColor: string;
  notes: string;
  feasibilityWarnings: string[];
}

export interface SavedDiscoverySession {
  id: string;
  title: string;
  savedAt: string;
  domainId: string | null;
  constraints: Record<PropertyKey, PropertyConstraint>;
  topMaterialId: string | null;
  topScore: number | null;
}

export interface ApplicationDomainPreset {
  id: string;
  nameKo: string;
  nameEn: string;
  summary: string;
  keyDrivers: string[];
  recommendedCategoryFocus: MaterialCategory[];
  accentColor: string;
  constraints: Partial<Record<PropertyKey, Partial<PropertyConstraint>>>;
}
