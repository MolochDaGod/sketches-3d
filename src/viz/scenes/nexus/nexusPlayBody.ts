/**
 * Production Nexus play body for the /nexus lobby.
 *
 * Extends the existing Ammo capsule (`collision.ts`) — does not add a second
 * controller, mixer library, or physics world. Visual = Ground CDN toon pack
 * (not grudge6 loadRaceKit). Third-person camera is sceneConf.viewMode.
 *
 * CDN: assets.grudge-studio.com/models/characters/{male|female}/{id}.gltf
 * Same-origin via /cdn-assets rewrite (COEP-safe).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Viz } from 'src/viz';

export type NexusGender = 'male' | 'female';

const CDN_PREFIX = '/cdn-assets/models/characters';

const ANIM_FALLBACKS: Record<string, string[]> = {
  idle: ['idle', 'Idle', 'Idle_Loop', 'TPose', 'A_Idle'],
  walk: ['walk', 'Walk', 'Walking', 'walking', 'A_Walk'],
  run: ['run', 'Run', 'Running', 'running', 'sprint', 'A_Run'],
  jump: ['jump', 'Jump', 'A_Jump'],
};

const DEFAULT_TOON = { gender: 'male' as NexusGender, id: 'spacesuit' };

export function parseNexusToonQuery(search = ''): { gender: NexusGender; id: string } {
  try {
    const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const raw = q.get('toon') || '';
    const i = raw.indexOf(':');
    if (i > 0) {
      const gender = raw.slice(0, i);
      const id = raw.slice(i + 1);
      if ((gender === 'male' || gender === 'female') && id) return { gender, id };
    }
  } catch {
    /* keep default */
  }
  return { ...DEFAULT_TOON };
}

function pickClipName(names: string[], want: string): string | null {
  const chain = ANIM_FALLBACKS[want] ?? [want];
  for (const c of chain) {
    const hit = names.find(n => n === c || n.toLowerCase().includes(c.toLowerCase()));
    if (hit) return hit;
  }
  return names[0] ?? null;
}

/**
 * Load a Ground/Nexus toon, SI-fit to the lobby capsule, one mixer.
 * Mesh origin stays at capsule center (engine copies position there);
 * the visual is offset so soles sit on the collider feet.
 */
export async function loadNexusPlayBody(
  viz: Viz,
  opts: { height: number; radius: number; centerToFeet: number }
): Promise<THREE.Group> {
  const pick = parseNexusToonQuery(typeof location !== 'undefined' ? location.search : '');
  const url = `${CDN_PREFIX}/${pick.gender}/${pick.id}.gltf`;
  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } catch (err) {
    console.warn('[nexus] toon load fail', url, err);
    throw err;
  }

  const root = new THREE.Group();
  root.name = `NexusPlayBody_${pick.gender}_${pick.id}`;
  const model = gltf.scene;
  model.traverse(o => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const totalH = opts.height + 2 * opts.radius;
  const box = new THREE.Box3().setFromObject(model);
  const authorH = Math.max(0.01, box.max.y - box.min.y);
  const scale = totalH / authorH;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  // Engine places `mesh` at capsule center. Shift visual so feet = center - centerToFeet.
  model.position.y = -opts.centerToFeet - box2.min.y;
  model.position.x -= (box2.min.x + box2.max.x) * 0.5;
  model.position.z -= (box2.min.z + box2.max.z) * 0.5;
  root.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations || [];
  const names = clips.map(c => c.name);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const want of ['idle', 'walk', 'run', 'jump'] as const) {
    const n = pickClipName(names, want);
    if (!n) continue;
    const clip = clips.find(c => c.name === n);
    if (!clip) continue;
    const act = mixer.clipAction(clip);
    act.enabled = true;
    if (want === 'jump') {
      act.setLoop(THREE.LoopOnce, 1);
      act.clampWhenFinished = true;
    }
    actions.set(want, act);
  }
  actions.get('idle')?.play();
  let current = 'idle';
  const _fwd = new THREE.Vector3();

  root.userData.nexusPlayTick = (v: Viz, dt: number) => {
    mixer.update(Math.min(0.05, Math.max(0, dt)));
    const fp = v.fpCtx;
    if (!fp) return;
    v.camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    if (_fwd.lengthSq() > 1e-6) {
      _fwd.normalize();
      const yaw = Math.atan2(_fwd.x, _fwd.z);
      root.rotation.y = yaw;
    }
    const grounded = fp.playerStateGetters.getIsOnGround();
    const speed = fp.playerStateGetters.getTotalVelocityMagnitude();
    const jumping = fp.playerStateGetters.getIsJumping() || fp.playerStateGetters.getIsDashing();
    let next = 'idle';
    if (!grounded || jumping) next = actions.has('jump') ? 'jump' : 'idle';
    else if (speed > 8) next = actions.has('run') ? 'run' : 'walk';
    else if (speed > 0.6) next = actions.has('walk') ? 'walk' : 'idle';
    if (next !== current) {
      const prev = actions.get(current);
      const act = actions.get(next);
      if (act) {
        prev?.fadeOut(0.12);
        act.reset().fadeIn(0.12).play();
        current = next;
      }
    }
  };

  console.info(
    `[nexus] play body ${pick.gender}:${pick.id} authorH=${authorH.toFixed(2)} fit=${totalH.toFixed(2)} clips=${names.join(',')}`
  );
  return root;
}
