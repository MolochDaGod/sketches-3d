/**
 * Grudge Studio · sketches-3d Nexus Era play kit
 * Drop into src/viz/ and wire from nexus + challenge scenes.
 *
 * PUTER / Grudge flow:
 *   1. Set SceneConfig.viewMode to NEXUS_ERA_THIRD_PERSON
 *   2. After fpCtx is ready, mountNexusEraCharacter(viz)
 *   3. Keep existing dashConfig — air dash already lives in collision.ts
 *   4. Optional: enable wall-run via NEXUS_ERA_PLAYER.wallRun
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const NEXUS_ERA_THIRD_PERSON = {
  type: 'thirdPerson' as const,
  distance: 7.2,
  minPolarAngle: 0.22,
  maxPolarAngle: Math.PI / 2 + 0.18,
  initialPolarAngle: 1.12,
  initialAzimuthAngle: Math.PI,
  cameraFOV: 62,
  cameraCollisionBias: 0.28,
  minCameraDistance: 1.35,
  cameraExtendSpeed: 220,
  zoomEnabled: true,
  minZoomDistance: 2.2,
  maxZoomDistance: 14,
  zoomSpeed: 6,
  fovTransitionDistance: 3,
};

export const NEXUS_ERA_PLAYER = {
  playerColliderShape: 'capsule' as const,
  colliderSize: { height: 1.85, radius: 0.38 },
  moveSpeed: { onGround: 11.5, inAir: 13.5 },
  jumpVelocity: 12.4,
  oobYThreshold: -80,
  dashConfig: {
    enable: true,
    useExternalVelocity: true,
    sfx: { play: true, name: 'dash' },
  },
  wallRun: {
    enable: true,
    minSpeed: 7.5,
    maxDuration: 1.35,
    gravityScale: 0.18,
    stickForce: 18,
    jumpOffBoost: 11,
    reattachCooldown: 0.28,
    maxWallAngleFromVertical: 0.42,
  },
};

export const NEXUS_ERA_CDN = {
  kit: 'https://assets.grudge-studio.com/js/grudge6-kit.js',
  characterGlb: 'https://assets.grudge-studio.com/models/nexus/runner/NEXUS_Runner.glb',
  fallbackGlb: 'https://threejs.org/examples/models/gltf/Soldier.glb',
};

export type VizLike = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  fpCtx?: {
    playerObject?: THREE.Object3D;
    getPlayerPos?: () => THREE.Vector3;
    getPlayerVelocity?: () => THREE.Vector3;
    getOnGround?: () => boolean;
  };
  registerBeforeRenderCb?: (cb: (curTimeSecs: number, tDiffSecs: number) => void) => void;
};

export async function mountNexusEraCharacter(viz: VizLike, opts?: { url?: string }) {
  const urls = [opts?.url, NEXUS_ERA_CDN.characterGlb, NEXUS_ERA_CDN.fallbackGlb].filter(Boolean) as string[];
  const group = new THREE.Group();
  group.name = 'NexusEraCharacter';
  group.visible = true;
  viz.scene.add(group);

  const loader = new GLTFLoader();
  let root: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let idleA: THREE.AnimationAction | null = null;
  let runA: THREE.AnimationAction | null = null;

  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      root = gltf.scene;
      root.traverse((o) => {
        o.visible = true;
        o.frustumCulled = false;
      });
      const clips = gltf.animations ?? [];
      if (clips.length) {
        mixer = new THREE.AnimationMixer(root);
        const idle = clips.find((c) => /idle/i.test(c.name)) ?? clips[0];
        const run = clips.find((c) => /run|walk/i.test(c.name));
        idleA = mixer.clipAction(idle);
        idleA.play();
        if (run) {
          runA = mixer.clipAction(run);
          runA.setEffectiveWeight(0);
          runA.play();
        }
      }
      break;
    } catch {
      root = null;
    }
  }
  if (!root) root = buildFallbackRunner();

  root.rotation.set(0, 0, 0);
  root.position.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  group.add(root);
  fitHumanHeight(root, 1.8);

  const HALF = (NEXUS_ERA_PLAYER.colliderSize.height || 1.85) / 2;

  viz.registerBeforeRenderCb?.((_t, dt) => {
    mixer?.update(dt);
    const vel = viz.fpCtx?.getPlayerVelocity?.();
    const grounded = viz.fpCtx?.getOnGround?.() ?? true;
    const spd = vel ? Math.hypot(vel.x, vel.z) : 0;
    if (runA && idleA) {
      const w = THREE.MathUtils.clamp(spd / 8, 0, 1);
      runA.setEffectiveWeight(grounded ? w : 0);
      idleA.setEffectiveWeight(grounded ? 1 - w : 0.15);
    }
    const pos = viz.fpCtx?.getPlayerPos?.() ?? viz.fpCtx?.playerObject?.position;
    if (!pos) return;
    group.visible = true;
    group.position.set(pos.x, pos.y - HALF, pos.z);
    group.rotation.set(0, 0, 0);
    const fwd = new THREE.Vector3();
    viz.camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() > 1e-6) group.rotation.y = Math.atan2(fwd.x, fwd.z);
  });

  return group;
}

function fitHumanHeight(root: THREE.Object3D, targetH: number) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y < 1e-4) return;
  root.scale.multiplyScalar(targetH / size.y);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
}

function buildFallbackRunner() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.9, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a2433, metalness: 0.55, roughness: 0.35 })
  );
  body.position.y = 1.05;
  const helm = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x7ee0ff, emissive: 0x1a6a88, emissiveIntensity: 0.7 })
  );
  helm.position.y = 1.68;
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.07, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff2244, emissiveIntensity: 1.4 })
  );
  visor.position.set(0, 1.7, 0.16);
  g.add(body, helm, visor);
  g.name = 'NexusEraFallbackRunner';
  return g;
}

export function withNexusEraPlay(config: Record<string, unknown>) {
  return {
    ...config,
    viewMode: NEXUS_ERA_THIRD_PERSON,
    player: {
      ...((config.player as object) ?? {}),
      ...NEXUS_ERA_PLAYER,
      dashConfig: {
        ...((config.player as { dashConfig?: object } | undefined)?.dashConfig ?? {}),
        ...NEXUS_ERA_PLAYER.dashConfig,
      },
    },
  };
}
