import { MATERIALS_DATABASE } from '../data/materials';
import { Material } from '../types/material';

/**
 * Decoupled Repository Interface for Materials Data
 * Currently backed by the local verified handbook dataset (`MATERIALS_DATABASE`).
 * Can be swapped for an external REST/GraphQL or Supabase/Firestore endpoint without modifying UI or engine code.
 */
export interface MaterialRepository {
  getAllMaterials(): Material[];
  getMaterialById(id: string): Material | undefined;
}

class LocalMaterialRepository implements MaterialRepository {
  private readonly materials: Material[];

  constructor(initialData: Material[]) {
    this.materials = initialData;
  }

  getAllMaterials(): Material[] {
    return this.materials;
  }

  getMaterialById(id: string): Material | undefined {
    return this.materials.find((m) => m.id === id);
  }
}

export const materialRepository: MaterialRepository = new LocalMaterialRepository(
  MATERIALS_DATABASE
);
