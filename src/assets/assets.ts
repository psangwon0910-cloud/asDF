import { MaterialCategory, StructureType } from '../types/material';

/**
 * Decoupled Asset Registry (AssetManager Architecture)
 *
 * Designed so external GLTF models, PBR textures, and microscopy images
 * under `/public/assets/...` can be plugged in without altering simulation or UI logic.
 * When external files are absent, the engine automatically uses procedural Three.js
 * geometry and procedural SVG/Canvas rendering (zero 404 guarantee).
 */

export interface AssetRegistry {
  directories: {
    root: string;
    backgrounds: string;
    materials: string;
    structures: string;
    icons: string;
    textures: string;
    animations: string;
    models: string;
  };
  materialImages: Record<string, string | null>;
  materialModels: Record<string, string | null>;
  backgrounds: Record<string, string | null>;
  textures: Record<string, string | null>;
  icons: Record<MaterialCategory, string>;
  animations: Record<string, { durationMs: number; easing: string }>;
  proceduralFallbackLabels: Record<StructureType, string>;
}

export const ASSET_REGISTRY: AssetRegistry = {
  directories: {
    root: '/assets/',
    backgrounds: '/assets/backgrounds/',
    materials: '/assets/materials/',
    structures: '/assets/structures/',
    icons: '/assets/icons/',
    textures: '/assets/textures/',
    animations: '/assets/animations/',
    models: '/assets/models/',
  },
  materialImages: {
    // External microscopy / specimen renders can be registered here when added to /public/assets/materials/
  },
  materialModels: {
    // External .glb/.gltf models can be registered here when added to /public/assets/models/
  },
  backgrounds: {
    laboratoryGrid: null,
  },
  textures: {
    brushedMetal: null,
    carbonWeave: null,
  },
  icons: {
    '금속 및 합금': 'hexagon-lattice',
    '세라믹': 'ionic-cube',
    '탄소계 소재': 'honeycomb-ring',
    '고분자 및 복합재료': 'laminate-plies',
    '반도체 및 전자소재': 'silicon-diamond',
    '건축 및 천연소재': 'layered-composite',
    '특수 소재': 'octet-truss',
  },
  animations: {
    specimenEnter: { durationMs: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    analysisStage: { durationMs: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    cameraTransition: { durationMs: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  proceduralFallbackLabels: {
    metal_fcc: 'FCC 면심입방 결정 격자 (개략적 3D 시각화)',
    metal_bcc: 'BCC 체심입방 결정 격자 (개략적 3D 시각화)',
    metal_hcp: 'HCP 조밀육방 결정 격자 (개략적 3D 시각화)',
    graphene: 'sp² 육각형 탄소 벌집 단일층 (개략적 3D 시각화)',
    nanotube: '원통형 키랄 탄소 나노튜브 (개략적 3D 시각화)',
    diamond: 'sp³ 사면체 다이아몬드 공유결합 격자 (개략적 3D 시각화)',
    graphite: 'AB 적층 흑연 층상 구조 (개략적 3D 시각화)',
    ceramic_ionic: '양이온-음이온 이온 결정 격자 (개략적 3D 시각화)',
    composite_laminate: '다축 배향 섬유 강화 적층 복합재 (개략적 3D 시각화)',
    polymer_chain: '고분자 사슬 얽힘 및 가교 네트워크 (개략적 3D 시각화)',
    aerogel_porous: '나노 다공성 3차원 실리카/탄소 망상 구조 (개략적 3D 시각화)',
    metamaterial_lattice: '옥텟-트러스(Octet-Truss) 공학 메타격자 (개략적 3D 시각화)',
  },
};

export function resolveMaterialAsset(materialId: string, structureType: StructureType) {
  return {
    imageUrl: ASSET_REGISTRY.materialImages[materialId] ?? null,
    modelUrl: ASSET_REGISTRY.materialModels[materialId] ?? null,
    proceduralLabel: ASSET_REGISTRY.proceduralFallbackLabels[structureType],
  };
}
