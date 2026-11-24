import * as THREE from 'three';
import { StructureType } from '../../types/material';

export interface BuiltStructure {
  group: THREE.Group;
  explodableParts: Array<{
    object: THREE.Object3D;
    basePos: THREE.Vector3;
    explodeVec: THREE.Vector3;
  }>;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function createBondInstancedMesh(
  pairs: Array<[THREE.Vector3, THREE.Vector3]>,
  radius: number,
  material: THREE.Material
): THREE.InstancedMesh {
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 10, 1);
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(pairs.length, 1));
  if (pairs.length === 0) {
    mesh.count = 0;
    return mesh;
  }
  pairs.forEach(([a, b], i) => {
    _mid.addVectors(a, b).multiplyScalar(0.5);
    _dir.subVectors(b, a);
    const len = _dir.length();
    if (len > 1e-5) {
      _dir.normalize();
      _quat.setFromUnitVectors(_up, _dir);
    } else {
      _quat.identity();
    }
    _dummy.position.copy(_mid);
    _dummy.quaternion.copy(_quat);
    _dummy.scale.set(1, len, 1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function createAtomInstancedMesh(
  positions: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  radiiScales?: number[]
): THREE.InstancedMesh {
  const geo = new THREE.SphereGeometry(radius, 22, 18);
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(positions.length, 1));
  if (positions.length === 0) {
    mesh.count = 0;
    return mesh;
  }
  positions.forEach((pos, i) => {
    _dummy.position.copy(pos);
    _dummy.quaternion.identity();
    const s = radiiScales && radiiScales[i] !== undefined ? radiiScales[i] : 1;
    _dummy.scale.setScalar(s);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function createRingInstancedMesh(
  centers: THREE.Vector3[],
  normals: THREE.Vector3 | THREE.Vector3[],
  radius: number,
  tube: number,
  material: THREE.Material
): THREE.InstancedMesh {
  const geo = new THREE.TorusGeometry(radius, tube, 8, 26);
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(centers.length, 1));
  if (centers.length === 0) {
    mesh.count = 0;
    return mesh;
  }
  const ringUp = new THREE.Vector3(0, 0, 1);
  const nVec = new THREE.Vector3();
  const q = new THREE.Quaternion();
  centers.forEach((c, i) => {
    const srcNormal = Array.isArray(normals) ? normals[i] : normals;
    nVec.copy(srcNormal).normalize();
    q.setFromUnitVectors(ringUp, nVec);
    _dummy.position.copy(c);
    _dummy.quaternion.copy(q);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function createOrbitalLobeInstancedMesh(
  positions: THREE.Vector3[],
  radius: number,
  material: THREE.Material
): THREE.InstancedMesh {
  const geo = new THREE.SphereGeometry(radius, 12, 10);
  geo.scale(0.62, 1.4, 0.62);
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(positions.length * 2, 1));
  if (positions.length === 0) {
    mesh.count = 0;
    return mesh;
  }
  positions.forEach((pos, i) => {
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(1);
    _dummy.position.set(pos.x, pos.y + radius * 1.38, pos.z);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i * 2, _dummy.matrix);

    _dummy.position.set(pos.x, pos.y - radius * 1.38, pos.z);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i * 2 + 1, _dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.renderOrder = 2;
  return mesh;
}

function createTetrahedronFrom4Points(pts: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3]): THREE.BufferGeometry {
  const [p0, p1, p2, p3] = pts;
  const positions = new Float32Array([
    p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
    p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z,
    p0.x, p0.y, p0.z, p3.x, p3.y, p3.z, p1.x, p1.y, p1.z,
    p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createProceduralWeaveTexture(accentHex: string, angleDeg: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0c1322';
    ctx.fillRect(0, 0, 256, 256);

    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.translate(-128, -128);

    for (let y = -128; y < 384; y += 10) {
      ctx.fillStyle = y % 20 === 0 ? '#1e293b' : '#141e30';
      ctx.fillRect(-128, y, 512, 6);
      ctx.fillStyle = accentHex;
      ctx.globalAlpha = 0.24;
      ctx.fillRect(-128, y + 6, 512, 1.5);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function buildProceduralStructure(
  structureType: StructureType,
  accentHex: string,
  materialId?: string
): BuiltStructure {
  const group = new THREE.Group();
  const explodableParts: BuiltStructure['explodableParts'] = [];
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  const accentColor = new THREE.Color(accentHex || '#22d3ee');

  const track = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      const geo = (child as THREE.Mesh).geometry;
      if (geo) geometries.add(geo);
      const mat = (child as THREE.Mesh).material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => materials.add(m));
      } else if (mat) {
        materials.add(mat);
      }
    });
  };

  const addExplodable = (obj: THREE.Object3D, explodeVec: THREE.Vector3) => {
    explodableParts.push({
      object: obj,
      basePos: obj.position.clone(),
      explodeVec,
    });
  };

  // =========================================================================
  // 1. GRAPHENE & GRAPHITE (sp² Honeycomb + Aromatic π-Resonance + pz Orbitals + AB Bernal Stacking)
  // =========================================================================
  if (structureType === 'graphene' || structureType === 'graphite') {
    const isGraphite = structureType === 'graphite';
    const layers = isGraphite ? 3 : 1;
    const layerSpacing = 1.18;

    const isWhiteBn = materialId === 'hexagonal-bn';
    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: isWhiteBn ? 0xf1f5f9 : 0x1e293b,
      metalness: isWhiteBn ? 0.18 : 0.78,
      roughness: isWhiteBn ? 0.28 : 0.18,
      clearcoat: 0.9,
      emissive: accentColor.clone().multiplyScalar(0.16),
    });
    const sigmaBondMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.5,
      roughness: 0.3,
    });
    const aromaticRingMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.74,
    });
    const pzOrbitalMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.24,
      roughness: 0.15,
      depthWrite: false,
    });

    const a = 0.44;
    const dx = a * Math.sqrt(3);
    const dz = a * 1.5;

    const layerAtomCenters: THREE.Vector3[][] = [];

    for (let l = 0; l < layers; l++) {
      const layerGroup = new THREE.Group();
      const yOffset = (l - (layers - 1) / 2) * layerSpacing;
      const shiftX = l % 2 === 1 ? dx / 2 : 0;
      const shiftZ = l % 2 === 1 ? a / 2 : 0;

      const hexCenters: THREE.Vector3[] = [];
      const atomMap = new Map<string, THREE.Vector3>();
      const atoms: THREE.Vector3[] = [];

      for (let r = -3; r <= 3; r++) {
        for (let c = -3; c <= 3; c++) {
          const baseCx = c * dx + (Math.abs(r) % 2 === 1 ? dx / 2 : 0);
          const baseCz = r * dz;
          // Symmetric clipping across all AB layers
          if (Math.hypot(baseCx, baseCz) < 2.05) {
            const cx = baseCx + shiftX;
            const cz = baseCz + shiftZ;
            hexCenters.push(new THREE.Vector3(cx, 0, cz));
            for (let k = 0; k < 6; k++) {
              const theta = (k / 6) * Math.PI * 2 + Math.PI / 6;
              const vx = cx + a * Math.cos(theta);
              const vz = cz + a * Math.sin(theta);
              const key = `${Math.round(vx * 100)}_${Math.round(vz * 100)}`;
              if (!atomMap.has(key)) {
                const v = new THREE.Vector3(vx, 0, vz);
                atomMap.set(key, v);
                atoms.push(v);
              }
            }
          }
        }
      }

      const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const dist = atoms[i].distanceTo(atoms[j]);
          if (dist > a * 0.7 && dist < a * 1.25) {
            pairs.push([atoms[i], atoms[j]]);
          }
        }
      }

      layerAtomCenters.push(atoms.map((p) => new THREE.Vector3(p.x, yOffset, p.z)));

      layerGroup.add(createAtomInstancedMesh(atoms, 0.115, carbonMat));
      layerGroup.add(createBondInstancedMesh(pairs, 0.036, sigmaBondMat));
      const rings = createRingInstancedMesh(
        hexCenters,
        new THREE.Vector3(0, 1, 0),
        a * 0.56,
        0.014,
        aromaticRingMat
      );
      rings.renderOrder = 1;
      layerGroup.add(rings);

      if (!isGraphite) {
        const orbitals = createOrbitalLobeInstancedMesh(atoms, 0.115, pzOrbitalMat);
        layerGroup.add(orbitals);
        addExplodable(orbitals, new THREE.Vector3(0, 0.75, 0));
      }

      layerGroup.position.set(0, yOffset, 0);
      group.add(layerGroup);
      addExplodable(
        layerGroup,
        new THREE.Vector3(0, (l - (layers - 1) / 2) * 1.15, 0)
      );
    }

    if (isGraphite && layerAtomCenters.length >= 2) {
      const vdwPoints: THREE.Vector3[] = [];
      for (let l = 0; l < layerAtomCenters.length - 1; l++) {
        const upper = layerAtomCenters[l + 1];
        const lower = layerAtomCenters[l];
        for (let i = 0; i < lower.length; i += 2) {
          for (let j = 0; j < upper.length; j++) {
            const horiz = Math.hypot(lower[i].x - upper[j].x, lower[i].z - upper[j].z);
            if (horiz < 0.08) {
              vdwPoints.push(lower[i], upper[j]);
              break;
            }
          }
        }
      }
      if (vdwPoints.length > 0) {
        const vdwGeo = new THREE.BufferGeometry().setFromPoints(vdwPoints);
        const vdwMat = new THREE.LineDashedMaterial({
          color: accentColor,
          dashSize: 0.1,
          gapSize: 0.08,
          transparent: true,
          opacity: 0.55,
        });
        const vdwLines = new THREE.LineSegments(vdwGeo, vdwMat);
        vdwLines.computeLineDistances();
        group.add(vdwLines);
      }
    }

  // =========================================================================
  // 2. CARBON NANOTUBE / TURBOSTRATIC CARBON FIBER
  // =========================================================================
  } else if (structureType === 'nanotube') {
    const isCarbonFiber = materialId === 'carbon-fiber';
    const nRings = 12;
    const nAround = 14;
    const radius = 1.18;
    const height = 4.2;

    const atoms: THREE.Vector3[] = [];
    const ringCenters: THREE.Vector3[] = [];
    const ringNormals: THREE.Vector3[] = [];

    for (let r = 0; r < nRings; r++) {
      const y = (r / (nRings - 1) - 0.5) * height;
      const isZig = r % 2 === 1;
      for (let s = 0; s < nAround; s++) {
        const pairIdx = Math.floor(s / 2);
        const inPair = s % 2;
        const baseTheta = ((pairIdx * 2 + (isZig ? 1 : 0)) / nAround) * Math.PI * 2;
        const deltaTheta = (inPair === 0 ? -0.32 : 0.32) * ((Math.PI * 2) / nAround);
        const theta = baseTheta + deltaTheta;
        atoms.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius));
      }
    }

    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const d = atoms[i].distanceTo(atoms[j]);
        if (d > 0.25 && d < 0.62) {
          pairs.push([atoms[i], atoms[j]]);
        }
      }
    }

    for (let r = 1; r < nRings - 1; r += 2) {
      const y = (r / (nRings - 1) - 0.5) * height;
      for (let s = 0; s < nAround; s += 2) {
        const theta = (s / nAround) * Math.PI * 2;
        const nx = Math.cos(theta);
        const nz = Math.sin(theta);
        ringCenters.push(new THREE.Vector3(nx * (radius * 0.99), y, nz * (radius * 0.99)));
        ringNormals.push(new THREE.Vector3(nx, 0, nz));
      }
    }

    const carbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.16,
      clearcoat: 0.95,
      emissive: accentColor.clone().multiplyScalar(0.18),
    });
    const bondMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.45,
      roughness: 0.28,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.65,
    });

    const tubeGroup = new THREE.Group();
    tubeGroup.add(createAtomInstancedMesh(atoms, 0.088, carbonMat));
    tubeGroup.add(createBondInstancedMesh(pairs, 0.028, bondMat));
    tubeGroup.add(createRingInstancedMesh(ringCenters, ringNormals, 0.17, 0.012, ringMat));

    if (isCarbonFiber) {
      // Aligned turbostratic graphitic core fibrils inside carbon fiber filament
      const fibrilGroup = new THREE.Group();
      const fibrilMat = new THREE.MeshPhysicalMaterial({
        color: 0x334155,
        metalness: 0.72,
        roughness: 0.24,
      });
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        const rOff = k === 0 ? 0 : 0.46;
        const fibrilGeo = new THREE.CylinderGeometry(0.14, 0.14, height * 0.96, 12);
        const m = new THREE.Mesh(fibrilGeo, fibrilMat);
        m.position.set(Math.cos(ang) * rOff, 0, Math.sin(ang) * rOff);
        fibrilGroup.add(m);
      }
      tubeGroup.add(fibrilGroup);
      addExplodable(fibrilGroup, new THREE.Vector3(1.15, 0.25, 0));
    } else {
      // Single-sided translucent π-conduit core (avoids DoubleSide transparent Z-sorting flicker)
      const coreGeo = new THREE.CylinderGeometry(0.86, 0.86, height * 0.9, 28, 1, true);
      const coreMat = new THREE.MeshPhysicalMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0.16,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      const innerCore = new THREE.Mesh(coreGeo, coreMat);
      innerCore.renderOrder = 1;
      tubeGroup.add(innerCore);
      addExplodable(innerCore, new THREE.Vector3(1.05, 0.35, 0));

      // Crisp coaxial MWCNT wireframe guide rings instead of overlapping translucent cylinders
      const wallWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CylinderGeometry(1.48, 1.48, height * 0.82, 18, 2, true)),
        new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.28 })
      );
      tubeGroup.add(wallWire);
      addExplodable(wallWire, new THREE.Vector3(-1.05, -0.35, 0));
    }

    tubeGroup.rotation.z = Math.PI / 5;
    group.add(tubeGroup);

  // =========================================================================
  // 3. DIAMOND (Exact Symmetric 18-Atom Fd-3m Conventional Unit Cell + Exact sp³ Tetrahedra)
  // =========================================================================
  } else if (structureType === 'diamond') {
    const a = 2.4;
    const h = a / 2;
    const q = a / 4;

    // 14 FCC lattice sites (8 corners + 6 face centers)
    const fccSites: THREE.Vector3[] = [
      new THREE.Vector3(-h, -h, -h),
      new THREE.Vector3(h, -h, -h),
      new THREE.Vector3(-h, h, -h),
      new THREE.Vector3(h, h, -h),
      new THREE.Vector3(-h, -h, h),
      new THREE.Vector3(h, -h, h),
      new THREE.Vector3(-h, h, h),
      new THREE.Vector3(h, h, h),
      new THREE.Vector3(-h, 0, 0),
      new THREE.Vector3(h, 0, 0),
      new THREE.Vector3(0, -h, 0),
      new THREE.Vector3(0, h, 0),
      new THREE.Vector3(0, 0, -h),
      new THREE.Vector3(0, 0, h),
    ];

    // 4 interior sp³ tetrahedral basis sites
    const interiorSites: THREE.Vector3[] = [
      new THREE.Vector3(-q, -q, -q),
      new THREE.Vector3(-q, q, q),
      new THREE.Vector3(q, -q, q),
      new THREE.Vector3(q, q, -q),
    ];

    const atoms = [...fccSites, ...interiorSites];
    const bondLen = (Math.sqrt(3) / 4) * a;
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const tetraMeshesGroup = new THREE.Group();

    const tetraMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.18,
      roughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    interiorSites.forEach((center) => {
      const neighbors: THREE.Vector3[] = [];
      fccSites.forEach((site) => {
        if (Math.abs(center.distanceTo(site) - bondLen) < 0.08) {
          pairs.push([center, site]);
          neighbors.push(site);
        }
      });
      if (neighbors.length === 4) {
        const exactTetraGeo = createTetrahedronFrom4Points([
          neighbors[0],
          neighbors[1],
          neighbors[2],
          neighbors[3],
        ]);
        const tetraMesh = new THREE.Mesh(exactTetraGeo, tetraMat);
        tetraMesh.renderOrder = 1;
        tetraMeshesGroup.add(tetraMesh);
      }
    });

    const isCubicBn = materialId === 'cubic-bn';
    const isSilicon = materialId === 'silicon-wafer';
    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: isSilicon ? 0x94a3b8 : 0xe0f2fe,
      metalness: isSilicon ? 0.75 : 0.12,
      roughness: isSilicon ? 0.14 : 0.05,
      clearcoat: 1.0,
      ior: isSilicon ? 1.8 : 2.41,
      iridescence: isSilicon ? 0.25 : 0.75,
    });
    const sp3BondMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.35,
      roughness: 0.22,
      clearcoat: 0.6,
    });

    const latticeGroup = new THREE.Group();
    if (isCubicBn) {
      const nitrogenMat = new THREE.MeshPhysicalMaterial({
        color: accentColor,
        metalness: 0.25,
        roughness: 0.18,
        clearcoat: 0.85,
      });
      latticeGroup.add(createAtomInstancedMesh(fccSites, 0.155, diamondMat));
      latticeGroup.add(createAtomInstancedMesh(interiorSites, 0.165, nitrogenMat));
    } else {
      latticeGroup.add(createAtomInstancedMesh(atoms, 0.155, diamondMat));
    }
    latticeGroup.add(createBondInstancedMesh(pairs, 0.052, sp3BondMat));
    group.add(latticeGroup);

    group.add(tetraMeshesGroup);
    addExplodable(tetraMeshesGroup, new THREE.Vector3(0, 0.9, 0));

    const cageGeo = new THREE.BoxGeometry(a, a, a);
    const cageLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(cageGeo),
      new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.42 })
    );
    group.add(cageLine);
    addExplodable(cageLine, new THREE.Vector3(0, -0.9, 0));

  // =========================================================================
  // 4. METALLIC CRYSTAL LATTICES (FCC / BCC / HCP + Solute Atoms + Slip Plane + Drude Electron Sea)
  // =========================================================================
  } else if (
    structureType === 'metal_fcc' ||
    structureType === 'metal_bcc' ||
    structureType === 'metal_hcp'
  ) {
    const hostAtoms: THREE.Vector3[] = [];
    const soluteAtoms: THREE.Vector3[] = [];
    const isAlloy = materialId
      ? !['tungsten', 'copper-etp', 'silver-ag', 'tantalum'].includes(materialId)
      : true;
    const isB2Ordered = materialId === 'nitinol-sma';

    const a = 2.3;
    if (structureType === 'metal_hcp') {
      const rHex = 1.25;
      const yLayer = 1.1;
      for (const y of [-yLayer, yLayer]) {
        hostAtoms.push(new THREE.Vector3(0, y, 0));
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2;
          const pos = new THREE.Vector3(Math.cos(ang) * rHex, y, Math.sin(ang) * rHex);
          if (isAlloy && k === 2 && y > 0) soluteAtoms.push(pos);
          else hostAtoms.push(pos);
        }
      }
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2 + Math.PI / 6;
        const pos = new THREE.Vector3(Math.cos(ang) * (rHex * 0.58), 0, Math.sin(ang) * (rHex * 0.58));
        if (isAlloy && k === 0) soluteAtoms.push(pos);
        else hostAtoms.push(pos);
      }
    } else {
      const half = a / 2;
      for (const x of [-half, half]) {
        for (const y of [-half, half]) {
          for (const z of [-half, half]) {
            hostAtoms.push(new THREE.Vector3(x, y, z));
          }
        }
      }
      if (structureType === 'metal_bcc') {
        const center = new THREE.Vector3(0, 0, 0);
        if (isB2Ordered || isAlloy) soluteAtoms.push(center);
        else hostAtoms.push(center);
      } else {
        const faces = [
          new THREE.Vector3(half, 0, 0),
          new THREE.Vector3(-half, 0, 0),
          new THREE.Vector3(0, half, 0),
          new THREE.Vector3(0, -half, 0),
          new THREE.Vector3(0, 0, half),
          new THREE.Vector3(0, 0, -half),
        ];
        faces.forEach((f, idx) => {
          if (isAlloy && (idx === 0 || idx === 3)) soluteAtoms.push(f);
          else hostAtoms.push(f);
        });
      }
    }

    const hostMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.96,
      roughness: 0.14,
      anisotropy: 0.8,
      clearcoat: 0.35,
    });
    const soluteMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.9,
      roughness: 0.2,
      emissive: accentColor.clone().multiplyScalar(0.15),
    });
    const metallicBondMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.75,
      roughness: 0.35,
    });

    const allAtoms = [...hostAtoms, ...soluteAtoms];
    const maxBond = structureType === 'metal_bcc' ? a * 0.92 : a * 0.78;
    const bonds: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < allAtoms.length; i++) {
      for (let j = i + 1; j < allAtoms.length; j++) {
        const d = allAtoms[i].distanceTo(allAtoms[j]);
        if (d > 0.5 && d <= maxBond) {
          bonds.push([allAtoms[i], allAtoms[j]]);
        }
      }
    }

    const latticeGroup = new THREE.Group();
    if (hostAtoms.length > 0) {
      latticeGroup.add(createAtomInstancedMesh(hostAtoms, 0.28, hostMat));
    }
    if (soluteAtoms.length > 0) {
      latticeGroup.add(createAtomInstancedMesh(soluteAtoms, 0.30, soluteMat));
    }
    if (bonds.length > 0) {
      latticeGroup.add(createBondInstancedMesh(bonds, 0.036, metallicBondMat));
    }
    group.add(latticeGroup);

    // Exact crystallographic slip plane: (0001) basal plane for HCP, (111) plane for FCC/BCC
    const planeGeo =
      structureType === 'metal_hcp'
        ? new THREE.CylinderGeometry(1.42, 1.42, 0.02, 6)
        : new THREE.CircleGeometry(1.75, 6);
    const planeMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.14,
      roughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slipPlane = new THREE.Mesh(planeGeo, planeMat);
    if (structureType !== 'metal_hcp') {
      slipPlane.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 1, 1).normalize()
      );
    }
    slipPlane.renderOrder = 1;
    group.add(slipPlane);
    addExplodable(slipPlane, new THREE.Vector3(0, 1.1, 0));

    // Delocalized metallic electron cloud (Drude electron sea)
    const eCount = 54;
    const ePositions = new Float32Array(eCount * 3);
    for (let i = 0; i < eCount; i++) {
      const th = i * 2.39996;
      const r = 0.6 + ((i * 17) % 100) / 100 * 1.05;
      const y = (((i * 31) % 100) / 100 - 0.5) * 2.2;
      ePositions[i * 3] = Math.cos(th) * r;
      ePositions[i * 3 + 1] = y;
      ePositions[i * 3 + 2] = Math.sin(th) * r;
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePositions, 3));
    const eCloud = new THREE.Points(
      eGeo,
      new THREE.PointsMaterial({
        color: accentColor,
        size: 0.072,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      })
    );
    eCloud.renderOrder = 2;
    group.add(eCloud);
    addExplodable(eCloud, new THREE.Vector3(0, -1.0, 0));

    const frameGeo =
      structureType === 'metal_hcp'
        ? new THREE.CylinderGeometry(1.25, 1.25, 2.2, 6)
        : new THREE.BoxGeometry(a, a, a);
    const frameMesh = new THREE.LineSegments(
      new THREE.EdgesGeometry(frameGeo),
      new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.45 })
    );
    group.add(frameMesh);

  // =========================================================================
  // 5. CERAMIC IONIC / COVALENT CRYSTAL (Coordination Polyhedra [MO6] + Distinct Ionic Radii)
  // =========================================================================
  } else if (structureType === 'ceramic_ionic') {
    const cations: THREE.Vector3[] = [];
    const anions: THREE.Vector3[] = [];
    const step = 0.96;

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const p = new THREE.Vector3(x * step, y * step, z * step);
          if (Math.abs(x + y + z) % 2 === 0) {
            cations.push(p);
          } else {
            anions.push(p);
          }
        }
      }
    }

    const cationMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.35,
      roughness: 0.18,
      clearcoat: 0.95,
    });
    const anionMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.05,
      roughness: 0.45,
      clearcoat: 0.4,
    });
    const bondMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.25,
      roughness: 0.45,
    });

    const all = [...cations, ...anions];
    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (Math.abs(all[i].distanceTo(all[j]) - step) < 0.1) {
          pairs.push([all[i], all[j]]);
        }
      }
    }

    const cationMesh = createAtomInstancedMesh(cations, 0.175, cationMat);
    const anionMesh = createAtomInstancedMesh(anions, 0.255, anionMat);
    const bondMesh = createBondInstancedMesh(pairs, 0.035, bondMat);

    group.add(cationMesh);
    group.add(anionMesh);
    group.add(bondMesh);

    const octGeo = new THREE.OctahedronGeometry(step, 0);
    const octMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.22,
      roughness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const octGroup = new THREE.Group();
    const centralPoly = new THREE.Mesh(octGeo, octMat);
    centralPoly.renderOrder = 1;
    octGroup.add(centralPoly);
    octGroup.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(octGeo),
        new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.7 })
      )
    );
    group.add(octGroup);

    addExplodable(cationMesh, new THREE.Vector3(0, 0.9, 0));
    addExplodable(anionMesh, new THREE.Vector3(0, -0.9, 0));
    addExplodable(octGroup, new THREE.Vector3(1.1, 0, 0));

  // =========================================================================
  // 6. COMPOSITE LAMINATE ([0 / +45 / -45 / 90] Fiber Tows + Cross-Linked Matrix)
  // =========================================================================
  } else if (structureType === 'composite_laminate') {
    const plyAngles = [0, 45, -45, 90];
    const plyGap = 0.56;
    plyAngles.forEach((angle, idx) => {
      const plyGroup = new THREE.Group();
      const tex = createProceduralWeaveTexture(accentHex, angle);
      textures.add(tex);

      const plateGeo = new THREE.BoxGeometry(3.2, 0.18, 2.4);
      const plateMat = new THREE.MeshPhysicalMaterial({
        color: idx % 2 === 0 ? 0x1e293b : 0x0f172a,
        map: tex,
        roughness: idx % 2 === 0 ? 0.32 : 0.58,
        metalness: 0.25,
        clearcoat: 0.65,
      });
      plyGroup.add(new THREE.Mesh(plateGeo, plateMat));

      const fiberMat = new THREE.MeshPhysicalMaterial({
        color: accentColor,
        metalness: 0.72,
        roughness: 0.2,
      });
      const rad = (angle * Math.PI) / 180;
      const rodCount = 6;
      for (let r = 0; r < rodCount; r++) {
        const offset = (r - (rodCount - 1) / 2) * 0.36;
        const rodGeo = new THREE.CylinderGeometry(0.036, 0.036, 2.8, 10);
        const rod = new THREE.Mesh(rodGeo, fiberMat);
        rod.rotation.z = Math.PI / 2;
        rod.rotation.y = rad;
        rod.position.set(-Math.sin(rad) * offset * 0.65, 0.11, Math.cos(rad) * offset * 0.65);
        plyGroup.add(rod);
      }

      const yPos = (idx - (plyAngles.length - 1) / 2) * plyGap;
      plyGroup.position.set(0, yPos, 0);
      group.add(plyGroup);
      addExplodable(plyGroup, new THREE.Vector3(0, (idx - (plyAngles.length - 1) / 2) * 0.92, 0));
    });

  // =========================================================================
  // 7. POLYMER CHAIN (Aligned Gel-Spun UHMWPE vs -CF2- Fluoropolymer vs Aromatic/Crosslinked)
  // =========================================================================
  } else if (structureType === 'polymer_chain') {
    const isFluoropolymer = materialId === 'ptfe';
    const isAlignedFiber = materialId === 'uhmwpe-fiber';
    const isThermoset = materialId === 'epoxy-structural';
    const isAromatic =
      materialId === 'peek' || materialId === 'polycarbonate' || materialId === 'epoxy-structural';

    const backboneAtoms: THREE.Vector3[] = [];
    const sideGroupAtoms: THREE.Vector3[] = [];
    const ringCenters: THREE.Vector3[] = [];
    const ringNormals: THREE.Vector3[] = [];
    const backboneBonds: Array<[THREE.Vector3, THREE.Vector3]> = [];
    const sideBonds: Array<[THREE.Vector3, THREE.Vector3]> = [];

    if (isAlignedFiber) {
      // Extended all-trans crystalline polyethylene chains (UHMWPE Dyneema)
      const offsets: Array<[number, number]> = [
        [-0.75, -0.55],
        [0.75, -0.55],
        [-0.75, 0.55],
        [0.75, 0.55],
      ];
      offsets.forEach(([ox, oz], cIdx) => {
        const chainPts: THREE.Vector3[] = [];
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const zig = (i % 2 === 0 ? 1 : -1) * 0.14;
          const p = new THREE.Vector3(ox + zig, (t - 0.5) * 3.6, oz);
          chainPts.push(p);
          backboneAtoms.push(p);
          if (i > 0) backboneBonds.push([chainPts[i - 1], p]);

          if (i > 0 && i < steps) {
            const h1 = new THREE.Vector3(ox + zig * 1.6, p.y, oz + 0.24);
            const h2 = new THREE.Vector3(ox + zig * 1.6, p.y, oz - 0.24);
            sideGroupAtoms.push(h1, h2);
            sideBonds.push([p, h1], [p, h2]);
          }
        }
        // Keep cIdx referenced cleanly
        if (cIdx < 0) chainPts.length = 0;
      });
    } else {
      const chainCount = 3;
      const chainAnchorPts: THREE.Vector3[][] = [];
      for (let c = 0; c < chainCount; c++) {
        const phase = (c / chainCount) * Math.PI * 2;
        const chainPts: THREE.Vector3[] = [];
        const steps = 18;

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = t * Math.PI * 3.2 + phase;
          const r = 0.88 + Math.sin(t * Math.PI * 2 + c) * 0.18;
          const zig = (i % 2 === 0 ? 1 : -1) * 0.1;
          const p = new THREE.Vector3(
            Math.cos(angle) * (r + zig),
            (t - 0.5) * 3.4,
            Math.sin(angle) * (r + zig)
          );
          chainPts.push(p);
          backboneAtoms.push(p);

          if (i > 0) {
            backboneBonds.push([chainPts[i - 1], p]);
          }

          if (i > 0 && i < steps) {
            // Radial outward direction and tangential binormal so substituents never pierce inward
            const outDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
            const tang = new THREE.Vector3(-Math.sin(angle), 0.35, Math.cos(angle)).normalize();

            if (isFluoropolymer) {
              // Dual -CF2- fluorine pair fanning outward from backbone
              const f1 = p.clone().addScaledVector(outDir, 0.28).add(new THREE.Vector3(0, 0.18, 0));
              const f2 = p.clone().addScaledVector(outDir, 0.28).add(new THREE.Vector3(0, -0.18, 0));
              sideGroupAtoms.push(f1, f2);
              sideBonds.push([p, f1], [p, f2]);
            } else if (isAromatic && i % 3 === 0) {
              const ringCenter = p.clone().addScaledVector(outDir, 0.44);
              const ringAttach = p.clone().addScaledVector(outDir, 0.22);
              ringCenters.push(ringCenter);
              ringNormals.push(tang);
              sideBonds.push([p, ringAttach]);
            } else if (i % 2 === 0) {
              const sub = p.clone().addScaledVector(outDir, 0.3);
              sideGroupAtoms.push(sub);
              sideBonds.push([p, sub]);
            }
          }
        }
        chainAnchorPts.push(chainPts);
      }

      // Cross-linking covalent bridges between thermoset epoxy chains
      if (isThermoset) {
        [4, 9, 14].forEach((idx, k) => {
          const a = chainAnchorPts[k % 3][idx];
          const b = chainAnchorPts[(k + 1) % 3][idx];
          backboneBonds.push([a, b]);
        });
      }
    }

    const backboneMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.5,
      roughness: 0.25,
      clearcoat: 0.85,
    });
    const sideMat = new THREE.MeshPhysicalMaterial({
      color: isFluoropolymer ? 0x67e8f9 : accentColor,
      metalness: 0.2,
      roughness: 0.3,
      clearcoat: 0.8,
    });
    const covalentBondMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.35,
      roughness: 0.35,
    });

    const chainGroup = new THREE.Group();
    chainGroup.add(createAtomInstancedMesh(backboneAtoms, 0.12, backboneMat));
    chainGroup.add(createBondInstancedMesh(backboneBonds, 0.042, covalentBondMat));

    const sideGroup = new THREE.Group();
    if (sideGroupAtoms.length > 0) {
      sideGroup.add(
        createAtomInstancedMesh(sideGroupAtoms, isAlignedFiber ? 0.068 : 0.088, sideMat)
      );
    }
    if (sideBonds.length > 0) {
      sideGroup.add(createBondInstancedMesh(sideBonds, 0.025, sideMat));
    }
    if (ringCenters.length > 0) {
      const ringMat = new THREE.MeshPhysicalMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.35,
        metalness: 0.4,
        roughness: 0.2,
      });
      sideGroup.add(createRingInstancedMesh(ringCenters, ringNormals, 0.22, 0.032, ringMat));
    }

    group.add(chainGroup);
    group.add(sideGroup);
    addExplodable(sideGroup, new THREE.Vector3(0.85, 0, 0));

  // =========================================================================
  // 8. AEROGEL / BULK METALLIC GLASS (Connected 4-Coord Mesoporous SiO₂ vs Dense Random-Packed BMG)
  // =========================================================================
  } else if (structureType === 'aerogel_porous') {
    const isBmg = materialId === 'bulk-metallic-glass';

    if (isBmg) {
      // Dense Random-Packed (DRP) Amorphous Metallic Glass (Zr-Ti-Cu-Ni-Be, no crystal planes)
      const rng = (seed: number) => {
        const x = Math.sin(seed * 78.233 + 11.7) * 43758.5453;
        return x - Math.floor(x);
      };

      const atomRadiusByTier = [0.24, 0.19, 0.15]; // Zr/Ti large, Cu/Ni medium, Be small
      const nodes: Array<{ pos: THREE.Vector3; tier: number; rad: number }> = [];

      // Deterministic Fibonacci-sphere multi-shell seeds
      const count = 42;
      for (let i = 0; i < count; i++) {
        const tier = i % 5 === 0 ? 2 : i % 2 === 0 ? 0 : 1;
        const shellR = i === 0 ? 0 : 0.48 + ((i / count) * 1.15);
        const theta = i * 2.39996 + (rng(i + 1) - 0.5) * 0.45;
        const yNorm = 1 - (2 * (i + 0.5)) / count;
        const rHoriz = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        nodes.push({
          pos: new THREE.Vector3(
            rHoriz * Math.cos(theta) * shellR,
            yNorm * shellR,
            rHoriz * Math.sin(theta) * shellR
          ),
          tier,
          rad: atomRadiusByTier[tier],
        });
      }

      // Deterministic collision-free relaxation so zero spheres clip or float
      const deltaVec = new THREE.Vector3();
      for (let iter = 0; iter < 50; iter++) {
        for (let i = 0; i < nodes.length; i++) {
          // Gentle cohesive attraction toward center (dense glass packing)
          nodes[i].pos.multiplyScalar(0.96);
          for (let j = i + 1; j < nodes.length; j++) {
            deltaVec.subVectors(nodes[j].pos, nodes[i].pos);
            const dist = deltaVec.length();
            const minSep = nodes[i].rad + nodes[j].rad + 0.04;
            if (dist < minSep) {
              if (dist < 1e-4) deltaVec.set(1, 0, 0);
              else deltaVec.divideScalar(dist);
              const push = (minSep - dist) * 0.5;
              nodes[i].pos.addScaledVector(deltaVec, -push);
              nodes[j].pos.addScaledVector(deltaVec, push);
            }
          }
        }
      }

      const largePos: THREE.Vector3[] = [];
      const medPos: THREE.Vector3[] = [];
      const smallPos: THREE.Vector3[] = [];
      nodes.forEach((n) => {
        if (n.tier === 0) largePos.push(n.pos);
        else if (n.tier === 1) medPos.push(n.pos);
        else smallPos.push(n.pos);
      });

      const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = nodes[i].pos.distanceTo(nodes[j].pos);
          const touchDist = nodes[i].rad + nodes[j].rad + 0.14;
          if (d <= touchDist) {
            pairs.push([nodes[i].pos, nodes[j].pos]);
          }
        }
      }

      const zrMat = new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        metalness: 0.94,
        roughness: 0.14,
        clearcoat: 0.4,
      });
      const cuNiMat = new THREE.MeshPhysicalMaterial({
        color: accentColor,
        metalness: 0.88,
        roughness: 0.18,
      });
      const beMat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.22,
      });
      const bondMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.6,
        roughness: 0.35,
      });

      const hostMesh = createAtomInstancedMesh(largePos, atomRadiusByTier[0], zrMat);
      const medMesh = createAtomInstancedMesh(medPos, atomRadiusByTier[1], cuNiMat);
      const smallMesh = createAtomInstancedMesh(smallPos, atomRadiusByTier[2], beMat);
      const bondMesh = createBondInstancedMesh(pairs, 0.03, bondMat);

      group.add(hostMesh);
      group.add(medMesh);
      group.add(smallMesh);
      group.add(bondMesh);

      addExplodable(medMesh, new THREE.Vector3(0.85, 0.55, 0));
      addExplodable(smallMesh, new THREE.Vector3(-0.85, -0.55, 0));
    } else {
      // =====================================================================
      // SILICA AEROGEL: 100% Connected Mesoporous Si-O-Si Siloxane Network
      // (Zero isolated floating atoms, tetrahedral <=4 Si coordination, open air pores)
      // =====================================================================
      const rng = (seed: number) => {
        const x = Math.sin(seed * 91.3458 + 7.13) * 47453.5453;
        return x - Math.floor(x);
      };

      // 1. Place 32 Si nodes distributed evenly on two open mesoporous shells + bridge sites
      const siNodes: THREE.Vector3[] = [];
      const outerCount = 24;
      for (let i = 0; i < outerCount; i++) {
        const yNorm = 1 - (2 * (i + 0.5)) / outerCount;
        const rH = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const theta = i * 2.39996 + (rng(i + 3) - 0.5) * 0.28;
        const r = 1.48 + (rng(i + 51) - 0.5) * 0.42;
        siNodes.push(
          new THREE.Vector3(rH * Math.cos(theta) * r, yNorm * r, rH * Math.sin(theta) * r)
        );
      }
      const innerCount = 8;
      for (let i = 0; i < innerCount; i++) {
        const yNorm = 1 - (2 * (i + 0.5)) / innerCount;
        const rH = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
        const theta = i * 2.39996 + 0.6;
        const r = 0.78 + (rng(i + 97) - 0.5) * 0.2;
        siNodes.push(
          new THREE.Vector3(rH * Math.cos(theta) * r, yNorm * r, rH * Math.sin(theta) * r)
        );
      }

      // 2. Deterministic repulsion relaxation so minimum Si-Si distance >= 0.86 (no overlapping nodes)
      const diff = new THREE.Vector3();
      for (let iter = 0; iter < 45; iter++) {
        for (let i = 0; i < siNodes.length; i++) {
          for (let j = i + 1; j < siNodes.length; j++) {
            diff.subVectors(siNodes[j], siNodes[i]);
            const dist = diff.length();
            if (dist < 0.92) {
              if (dist < 1e-4) diff.set(1, 0, 0);
              else diff.divideScalar(dist);
              const push = (0.92 - dist) * 0.45;
              siNodes[i].addScaledVector(diff, -push);
              siNodes[j].addScaledVector(diff, push);
            }
          }
          // Keep overall network compact within radius 1.95
          const len = siNodes[i].length();
          if (len > 1.92) siNodes[i].multiplyScalar(1.92 / len);
        }
      }

      // 3. Build guaranteed connected spanning tree (Prim's MST) so ZERO atoms ever float alone
      const n = siNodes.length;
      const inTree = new Array(n).fill(false);
      const degrees = new Array(n).fill(0);
      const edgeSet = new Set<string>();
      const edges: Array<[number, number]> = [];

      const addEdge = (u: number, v: number) => {
        const a = Math.min(u, v);
        const b = Math.max(u, v);
        const key = `${a}_${b}`;
        if (a === b || edgeSet.has(key)) return false;
        edgeSet.add(key);
        edges.push([a, b]);
        degrees[a]++;
        degrees[b]++;
        return true;
      };

      inTree[0] = true;
      for (let step = 1; step < n; step++) {
        let bestU = -1;
        let bestV = -1;
        let bestD = Infinity;
        for (let u = 0; u < n; u++) {
          if (!inTree[u]) continue;
          for (let v = 0; v < n; v++) {
            if (inTree[v]) continue;
            // Prefer keeping coordination <= 4 unless needed for connectivity
            const penalty = degrees[u] >= 4 ? 10 : 0;
            const d = siNodes[u].distanceTo(siNodes[v]) + penalty;
            if (d < bestD) {
              bestD = d;
              bestU = u;
              bestV = v;
            }
          }
        }
        if (bestU !== -1 && bestV !== -1) {
          addEdge(bestU, bestV);
          inTree[bestV] = true;
        }
      }

      // 4. Close mesoporous siloxane rings: ensure every Si node has degree 2..4 (zero dangling twigs)
      const candidates: Array<{ u: number; v: number; d: number }> = [];
      for (let u = 0; u < n; u++) {
        for (let v = u + 1; v < n; v++) {
          const d = siNodes[u].distanceTo(siNodes[v]);
          if (d < 1.55) candidates.push({ u, v, d });
        }
      }
      candidates.sort((a, b) => a.d - b.d);

      // First pass: eliminate degree-1 dead-ends so every node participates in closed pores
      for (let pass = 0; pass < 2; pass++) {
        for (const { u, v } of candidates) {
          const maxDeg = pass === 0 ? 3 : 4;
          if ((degrees[u] < 2 || degrees[v] < 2) && degrees[u] < maxDeg && degrees[v] < maxDeg) {
            addEdge(u, v);
          }
        }
      }

      // 5. Generate kinked bridging Oxygen atoms (Si-O-Si ~145° bond angle) along each edge
      const oBridges: THREE.Vector3[] = [];
      const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
      const edgeDir = new THREE.Vector3();
      const radialOut = new THREE.Vector3();

      edges.forEach(([u, v], idx) => {
        const a = siNodes[u];
        const b = siNodes[v];
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        edgeDir.subVectors(b, a).normalize();
        // Push bridging O slightly outward perpendicular to Si-Si chord (~145 deg Si-O-Si kink)
        radialOut.copy(mid);
        radialOut.addScaledVector(edgeDir, -radialOut.dot(edgeDir));
        if (radialOut.lengthSq() < 1e-4) {
          radialOut.set(0, 1, 0);
        } else {
          radialOut.normalize();
        }
        const kink = 0.11 + (idx % 2 === 0 ? 0.03 : -0.02);
        mid.addScaledVector(radialOut, kink);
        oBridges.push(mid);
        pairs.push([a, mid], [mid, b]);
      });

      const isGrapheneAerogel = materialId === 'graphene-aerogel';
      const isFusedSilica = materialId === 'fused-silica';

      const siMat = new THREE.MeshPhysicalMaterial({
        color: isGrapheneAerogel ? 0x1e293b : accentColor,
        roughness: isGrapheneAerogel ? 0.22 : 0.18,
        metalness: isGrapheneAerogel ? 0.78 : 0.25,
        clearcoat: 0.9,
      });
      const oxygenMat = new THREE.MeshPhysicalMaterial({
        color: isGrapheneAerogel ? accentColor : 0xf8fafc,
        roughness: 0.3,
        metalness: isGrapheneAerogel ? 0.55 : 0.05,
      });
      const bondMat = new THREE.MeshStandardMaterial({
        color: isGrapheneAerogel ? 0x475569 : 0x94a3b8,
        roughness: 0.35,
        metalness: 0.25,
      });

      const networkGroup = new THREE.Group();
      networkGroup.add(createAtomInstancedMesh(siNodes, 0.135, siMat));
      networkGroup.add(createAtomInstancedMesh(oBridges, 0.09, oxygenMat));
      networkGroup.add(createBondInstancedMesh(pairs, 0.032, bondMat));
      group.add(networkGroup);

      if (!isFusedSilica) {
        // Subtle mesopore air-pocket envelopes (>90% air porosity visualization)
        const poreGroup = new THREE.Group();
        const poreMat = new THREE.MeshPhysicalMaterial({
          color: accentColor,
          transparent: true,
          opacity: 0.1,
          roughness: 0.15,
          side: THREE.FrontSide,
          depthWrite: false,
        });
        const poreCenters = [
          new THREE.Vector3(0.52, 0.42, 0.36),
          new THREE.Vector3(-0.56, -0.32, 0.42),
          new THREE.Vector3(0.08, -0.48, -0.56),
        ];
        poreCenters.forEach((pc, idx) => {
          const pMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(idx === 0 ? 0.46 : 0.38, 1),
            poreMat
          );
          pMesh.position.copy(pc);
          pMesh.renderOrder = 2;
          poreGroup.add(pMesh);
        });
        group.add(poreGroup);
        addExplodable(poreGroup, new THREE.Vector3(0, 1.05, 0));
      }
    }

  // =========================================================================
  // 9. METAMATERIAL OCTET-TRUSS (Architected Nodal Trusses + Octahedral Core)
  // =========================================================================
  } else {
    const vertices: THREE.Vector3[] = [
      new THREE.Vector3(-1.3, -1.3, -1.3),
      new THREE.Vector3(1.3, -1.3, -1.3),
      new THREE.Vector3(-1.3, 1.3, -1.3),
      new THREE.Vector3(1.3, 1.3, -1.3),
      new THREE.Vector3(-1.3, -1.3, 1.3),
      new THREE.Vector3(1.3, -1.3, 1.3),
      new THREE.Vector3(-1.3, 1.3, 1.3),
      new THREE.Vector3(1.3, 1.3, 1.3),
      new THREE.Vector3(1.3, 0, 0),
      new THREE.Vector3(-1.3, 0, 0),
      new THREE.Vector3(0, 1.3, 0),
      new THREE.Vector3(0, -1.3, 0),
      new THREE.Vector3(0, 0, 1.3),
      new THREE.Vector3(0, 0, -1.3),
    ];

    const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const d = vertices[i].distanceTo(vertices[j]);
        if (d > 1.75 && d < 1.95) {
          pairs.push([vertices[i], vertices[j]]);
        }
      }
    }

    const nodeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.92,
      roughness: 0.14,
    });
    const beamMat = new THREE.MeshPhysicalMaterial({
      color: accentColor,
      metalness: 0.85,
      roughness: 0.2,
      anisotropy: 0.65,
    });

    const nodeMesh = createAtomInstancedMesh(vertices, 0.16, nodeMat);
    const beamMesh = createBondInstancedMesh(pairs, 0.062, beamMat);
    group.add(nodeMesh);
    group.add(beamMesh);
    addExplodable(nodeMesh, new THREE.Vector3(0, 0.85, 0));

    const octGeo = new THREE.OctahedronGeometry(1.3, 0);
    const octSolid = new THREE.Mesh(
      octGeo,
      new THREE.MeshPhysicalMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.14,
        roughness: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    octSolid.renderOrder = 1;
    const octWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(octGeo),
      new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.78 })
    );
    const coreGroup = new THREE.Group();
    coreGroup.add(octSolid);
    coreGroup.add(octWire);
    group.add(coreGroup);
    addExplodable(coreGroup, new THREE.Vector3(0, -0.85, 0));
  }

  track(group);

  return {
    group,
    explodableParts,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
