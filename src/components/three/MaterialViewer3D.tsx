import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw, ZoomIn, ZoomOut, Pause, Play, Layers, Eye, EyeOff } from 'lucide-react';
import { ASSET_REGISTRY } from '../../assets/assets';
import { StructureType } from '../../types/material';
import { buildProceduralStructure, BuiltStructure } from './AtomicStructureBuilder';

export interface MaterialViewer3DHandle {
  captureSnapshot: () => string | null;
  resetCamera: () => void;
}

interface MaterialViewer3DProps {
  structureType: StructureType;
  accentColor: string;
  materialId?: string;
  materialLabel?: string;
  heroParallaxMode?: boolean;
  isAnalyzing?: boolean;
  reducedMotion?: boolean;
  showCompactHud?: boolean;
  className?: string;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const MaterialViewer3D = React.forwardRef<MaterialViewer3DHandle, MaterialViewer3DProps>(
  (
    {
      structureType,
      accentColor,
      materialId,
      materialLabel,
      heroParallaxMode = false,
      isAnalyzing = false,
      reducedMotion = false,
      showCompactHud = true,
      className = '',
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [autoRotate, setAutoRotate] = useState(!reducedMotion);
    const [explodeAmount, setExplodeAmount] = useState(0);
    const [hudCollapsed, setHudCollapsed] = useState(false);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    // Mutable refs so React UI updates never tear down the WebGLRenderer
    const autoRotateRef = useRef(autoRotate);
    const explodeTargetRef = useRef(explodeAmount);
    const explodeCurrentRef = useRef(0);
    const isAnalyzingRef = useRef(isAnalyzing);
    const reducedMotionRef = useRef(reducedMotion);
    const heroParallaxRef = useRef(heroParallaxMode);
    const pointerOffsetRef = useRef({ x: 0, y: 0 });

    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const activeStructureRef = useRef<BuiltStructure | null>(null);
    const scanRingRef = useRef<THREE.Mesh | null>(null);
    const isSoftwareGlRef = useRef<boolean>(false);

    useEffect(() => {
      autoRotateRef.current = autoRotate && !reducedMotion;
    }, [autoRotate, reducedMotion]);

    useEffect(() => {
      explodeTargetRef.current = explodeAmount;
    }, [explodeAmount]);

    useEffect(() => {
      isAnalyzingRef.current = isAnalyzing;
    }, [isAnalyzing]);

    useEffect(() => {
      reducedMotionRef.current = reducedMotion;
    }, [reducedMotion]);

    useEffect(() => {
      heroParallaxRef.current = heroParallaxMode;
    }, [heroParallaxMode]);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!renderer || !scene || !camera) return null;
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      },
      resetCamera: () => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        if (camera && controls) {
          camera.position.set(4.8, 3.2, 5.4);
          controls.target.set(0, 0, 0);
          controls.update();
        }
      },
    }));

    // Initialize Three.js Renderer & Scene ONCE
    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareWebGL();
      isSoftwareGlRef.current = isSoftwareGl;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          alpha: true,
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth || 640, container.clientHeight || 480);

      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x060911, 0.032);
      sceneRef.current = scene;

      // Mandatory RoomEnvironment reflections for PBR metals/ceramics
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmremGenerator.dispose();

      const camera = new THREE.PerspectiveCamera(
        42,
        (container.clientWidth || 640) / (container.clientHeight || 480),
        0.1,
        100
      );
      camera.position.set(4.8, 3.2, 5.4);
      cameraRef.current = camera;

      // 3-point warm/cool studio lighting
      const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.85);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
      keyLight.position.set(5, 7, 5);
      keyLight.castShadow = !isSoftwareGl;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.45);
      rimLight.position.set(-6, 3, -5);
      scene.add(rimLight);

      // Grounded calibration stage disc & ring
      const stageGroup = new THREE.Group();
      stageGroup.position.y = -2.35;
      const ringGeo = new THREE.RingGeometry(2.1, 2.16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const stageRing = new THREE.Mesh(ringGeo, ringMat);
      stageRing.rotation.x = -Math.PI / 2;
      stageGroup.add(stageRing);

      const innerRingGeo = new THREE.RingGeometry(1.3, 1.32, 48);
      const innerRing = new THREE.Mesh(
        innerRingGeo,
        new THREE.MeshBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.01;
      stageGroup.add(innerRing);

      // Subtle contact shadow plane
      const shadowGeo = new THREE.CircleGeometry(2.3, 48);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x020617,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      const contactDisc = new THREE.Mesh(shadowGeo, shadowMat);
      contactDisc.rotation.x = -Math.PI / 2;
      contactDisc.position.y = -0.02;
      stageGroup.add(contactDisc);
      scene.add(stageGroup);

      // Analysis laser scanner ring (shown during active material scan)
      const scanGeo = new THREE.TorusGeometry(2.45, 0.022, 12, 96);
      const scanMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0,
      });
      const scanRing = new THREE.Mesh(scanGeo, scanMat);
      scanRing.rotation.x = Math.PI / 2;
      scene.add(scanRing);
      scanRingRef.current = scanRing;

      // Fine floating laboratory particles
      const particleCount = 120;
      const pPositions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        pPositions[i * 3] = (Math.random() - 0.5) * 16;
        pPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        pPositions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.045,
        transparent: true,
        opacity: 0.45,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.minDistance = 2.6;
      controls.maxDistance = 12.5;
      controls.enablePan = false;
      controlsRef.current = controls;

      // Context loss handlers
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setWebglUnavailable(true);
      };
      const handleContextRestored = () => {
        setWebglUnavailable(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      // Pointer parallax on landing hero
      const handlePointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
        const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
        pointerOffsetRef.current.x = nx;
        pointerOffsetRef.current.y = ny;
      };
      container.addEventListener('pointermove', handlePointerMove);

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth || 640;
        const h = container.clientHeight || 480;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(container);

      // Frame loop with software WebGL afterDraw pacing
      let frameId = 0;
      let disposed = false;
      const clock = new THREE.Clock();

      function afterDraw(cb: () => void) {
        if (disposed) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const _targetPos = new THREE.Vector3();

      function tick() {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsed = clock.getElapsedTime();

        const built = activeStructureRef.current;
        if (built) {
          if (autoRotateRef.current && !reducedMotionRef.current) {
            built.group.rotation.y += delta * 0.34;
          }
          if (heroParallaxRef.current && !reducedMotionRef.current) {
            built.group.rotation.x = THREE.MathUtils.damp(
              built.group.rotation.x,
              pointerOffsetRef.current.y * 0.22,
              4,
              delta
            );
            built.group.rotation.z = THREE.MathUtils.damp(
              built.group.rotation.z,
              -pointerOffsetRef.current.x * 0.14,
              4,
              delta
            );
          } else {
            built.group.rotation.x = THREE.MathUtils.damp(built.group.rotation.x, 0, 5, delta);
            built.group.rotation.z = THREE.MathUtils.damp(built.group.rotation.z, 0, 5, delta);
          }

          // Smooth exploded-view damping
          explodeCurrentRef.current = THREE.MathUtils.damp(
            explodeCurrentRef.current,
            explodeTargetRef.current,
            7,
            delta
          );
          const exp = explodeCurrentRef.current;
          for (const part of built.explodableParts) {
            _targetPos.copy(part.basePos).addScaledVector(part.explodeVec, exp);
            part.object.position.copy(_targetPos);
          }
        }

        if (!reducedMotionRef.current) {
          particles.rotation.y += delta * 0.03;
        }

        // Scan ring animation
        const sMat = scanRing.material as THREE.MeshBasicMaterial;
        if (isAnalyzingRef.current) {
          sMat.opacity = 0.78;
          scanRing.position.y = Math.sin(elapsed * 3.4) * 1.8;
          scanRing.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.03);
        } else {
          sMat.opacity = THREE.MathUtils.damp(sMat.opacity, 0, 8, delta);
        }

        controls.update();
        renderer.render(scene, camera);

        if (isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      tick();

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver.disconnect();
        container.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

        if (activeStructureRef.current) {
          scene.remove(activeStructureRef.current.group);
          activeStructureRef.current.dispose();
          activeStructureRef.current = null;
        }
        ringGeo.dispose();
        ringMat.dispose();
        innerRingGeo.dispose();
        shadowGeo.dispose();
        shadowMat.dispose();
        scanGeo.dispose();
        scanMat.dispose();
        pGeo.dispose();
        pMat.dispose();
        envTex.dispose();
        controls.dispose();
        renderer.dispose();
      };
    }, []);

    // Swap Procedural Structure cleanly without recreating WebGL context
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      if (activeStructureRef.current) {
        scene.remove(activeStructureRef.current.group);
        activeStructureRef.current.dispose();
        activeStructureRef.current = null;
      }

      const built = buildProceduralStructure(structureType, accentColor, materialId);
      scene.add(built.group);
      activeStructureRef.current = built;

      if (scanRingRef.current) {
        (scanRingRef.current.material as THREE.MeshBasicMaterial).color.set(accentColor);
      }
    }, [structureType, accentColor, materialId]);

    const handleZoom = (factor: number) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
      const nextLen = THREE.MathUtils.clamp(dir.length() * factor, 2.6, 12.5);
      dir.normalize().multiplyScalar(nextLen);
      camera.position.copy(controls.target).add(dir);
      controls.update();
    };

    const handleResetView = () => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      camera.position.set(4.8, 3.2, 5.4);
      controls.target.set(0, 0, 0);
      controls.update();
      setExplodeAmount(0);
    };

    const schematicLabel = ASSET_REGISTRY.proceduralFallbackLabels[structureType];

    return (
      <div className={`relative w-full h-full overflow-hidden select-none ${className}`}>
        {/* Isolated WebGL mount container */}
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label={materialLabel ? `${materialLabel} 3D 구조 시각화` : '3D 소재 구조 뷰어'}
        />

        {/* WebGL Fallback if unavailable */}
        {webglUnavailable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080d1a] text-center p-6">
            <svg viewBox="0 0 120 120" className="w-24 h-24 text-cyan-400 mb-3" fill="none">
              <polygon
                points="60,12 102,36 102,84 60,108 18,84 18,36"
                stroke="currentColor"
                strokeWidth="2"
              />
              <polygon
                points="60,28 88,44 88,76 60,92 32,76 32,44"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.55"
              />
              <circle cx="60" cy="60" r="6" fill="currentColor" />
            </svg>
            <p className="text-sm font-medium text-slate-200">{materialLabel || '소재 구조 뷰어'}</p>
            <p className="text-xs text-slate-400 mt-1">{schematicLabel}</p>
          </div>
        )}

        {/* Top-left minimal schematic notice (no backdrop-blur over WebGL) */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="bg-[#080c16]/90 border border-slate-800/90 px-3 py-1.5 rounded-md max-w-[78%]">
            <p className="text-[11px] font-mono-tabular text-cyan-400 truncate">
              {schematicLabel}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              실제 원자 크기·결합각과 다른 개념 설명용 모델 · 드래그 회전 / 스크롤 확대
            </p>
          </div>
        </div>

        {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
        {showCompactHud && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[95%]">
            <button
              type="button"
              onClick={() => setHudCollapsed((v) => !v)}
              className="mb-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-[#0b1120]/95 border border-slate-700/80 rounded-md hover:text-white hover:border-cyan-500/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {hudCollapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{hudCollapsed ? '3D 제어 열기' : '제어 숨기기'}</span>
            </button>

            {!hudCollapsed && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3 py-2 bg-[#0a101e]/95 border border-slate-800 rounded-lg shadow-lg">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAutoRotate((v) => !v)}
                    disabled={reducedMotion}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-40"
                    title="자동 회전 전환"
                  >
                    {autoRotate && !reducedMotion ? (
                      <Pause className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{autoRotate && !reducedMotion ? '회전 중' : '정지'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(0.82)}
                    className="p-1.5 text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded transition-colors"
                    aria-label="확대"
                    title="확대"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleZoom(1.22)}
                    className="p-1.5 text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded transition-colors"
                    aria-label="축소"
                    title="축소"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetView}
                    className="p-1.5 text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 rounded transition-colors"
                    aria-label="시점 초기화"
                    title="시점 초기화"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                <label className="flex items-center gap-2 text-xs text-slate-300 whitespace-nowrap">
                  <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>구조 분해</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={explodeAmount}
                    onChange={(e) => setExplodeAmount(Number(e.target.value))}
                    className="lab-slider w-20 sm:w-24"
                    aria-label="구조 분해 정도"
                  />
                  <span className="font-mono-tabular text-[11px] text-cyan-300 w-8 text-right">
                    {Math.round(explodeAmount * 100)}%
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

MaterialViewer3D.displayName = 'MaterialViewer3D';
