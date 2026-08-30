/**
 * Production Nexus play body for the /nexus lobby.
 */
import * as THREE from 'three';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { mount, unmount } from 'svelte';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Viz } from 'src/viz';
import type { SceneConfig, SceneDef } from 'src/viz/scenes';
import { DefaultDashConfig } from 'src/viz/sceneDefaults';
import { getPlayerColliderCenterToFeetOffset } from 'src/viz/physicsConfig';
import NexusPlayEditor from './NexusPlayEditor.svelte';

export type NexusGender = 'male' | 'female';
const CDN_PREFIX = '/cdn-assets/models/characters';
const ANIM_FALLBACKS: Record<string, string[]> = {
  idle: ['idle', 'Idle', 'Idle_Loop', 'TPose', 'A_Idle'],
  walk: ['walk', 'Walk', 'Walking', 'walking', 'A_Walk'],
  run: ['run', 'Run', 'Running', 'running', 'sprint', 'A_Run'],
  jump: ['jump', 'Jump', 'A_Jump'],
};
const DEFAULT_TOON = { gender: 'male' as NexusGender, id: 'spacesuit' };
const TOON_SESSION_KEY = 'nexus.toon';
const PHYS_SESSION_KEY = 'nexus.physics';

export type NexusPlayPhysics = {
  gravity: number;
  onGround: number;
  inAir: number;
  jumpVelocity: number;
  dashMagnitude: number;
};
export const NEXUS_PLAY_DEFAULTS: NexusPlayPhysics = {
  gravity: 30, onGround: 10, inAir: 13, jumpVelocity: 12, dashMagnitude: 16,
};

const rememberToon = (pick: { gender: NexusGender; id: string }) => {
  try { sessionStorage.setItem(TOON_SESSION_KEY, `${pick.gender}:${pick.id}`); } catch { /* */ }
};
const sessionToon = (): { gender: NexusGender; id: string } | null => {
  try {
    const raw = sessionStorage.getItem(TOON_SESSION_KEY) || '';
    const i = raw.indexOf(':');
    if (i > 0) {
      const gender = raw.slice(0, i);
      const id = raw.slice(i + 1);
      if ((gender === 'male' || gender === 'female') && id) return { gender, id };
    }
  } catch { /* */ }
  return null;
};
export function parseNexusToonQuery(search = ''): { gender: NexusGender; id: string } {
  try {
    const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const raw = q.get('toon') || '';
    const i = raw.indexOf(':');
    if (i > 0) {
      const gender = raw.slice(0, i);
      const id = raw.slice(i + 1);
      if ((gender === 'male' || gender === 'female') && id) {
        const pick = { gender, id };
        rememberToon(pick);
        return pick;
      }
    }
  } catch { /* */ }
  return sessionToon() ?? { ...DEFAULT_TOON };
}
export function readNexusPlayPhysics(): NexusPlayPhysics | null {
  try {
    const raw = sessionStorage.getItem(PHYS_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NexusPlayPhysics>;
    return {
      gravity: Number.isFinite(parsed.gravity) ? parsed.gravity! : NEXUS_PLAY_DEFAULTS.gravity,
      onGround: Number.isFinite(parsed.onGround) ? parsed.onGround! : NEXUS_PLAY_DEFAULTS.onGround,
      inAir: Number.isFinite(parsed.inAir) ? parsed.inAir! : NEXUS_PLAY_DEFAULTS.inAir,
      jumpVelocity: Number.isFinite(parsed.jumpVelocity) ? parsed.jumpVelocity! : NEXUS_PLAY_DEFAULTS.jumpVelocity,
      dashMagnitude: Number.isFinite(parsed.dashMagnitude) ? parsed.dashMagnitude! : NEXUS_PLAY_DEFAULTS.dashMagnitude,
    };
  } catch { return null; }
}
export function writeNexusPlayPhysics(p: NexusPlayPhysics) {
  try { sessionStorage.setItem(PHYS_SESSION_KEY, JSON.stringify(p)); } catch { /* */ }
}
export function nexusPortalGoto(path: string) {
  const pick = parseNexusToonQuery(typeof location !== 'undefined' ? location.search : '');
  rememberToon(pick);
  void goto(`${resolve(path)}?toon=${encodeURIComponent(`${pick.gender}:${pick.id}`)}`, { keepFocus: true });
}
export function applyNexusPlayPhysics(viz: Viz, p: NexusPlayPhysics) {
  writeNexusPlayPhysics(p);
  const conf = viz.sceneConf;
  if (!conf.player) conf.player = {};
  if (!conf.player.moveSpeed) conf.player.moveSpeed = { onGround: p.onGround, inAir: p.inAir };
  conf.gravity = p.gravity;
  conf.player.moveSpeed.onGround = p.onGround;
  conf.player.moveSpeed.inAir = p.inAir;
  conf.player.jumpVelocity = p.jumpVelocity;
  conf.player.dashConfig = { ...DefaultDashConfig, ...(conf.player.dashConfig ?? {}), enable: true, dashMagnitude: p.dashMagnitude };
  const fp = viz.fpCtx;
  if (!fp) return;
  fp.setGravity(p.gravity);
  fp.playerController.setJumpSpeed(p.jumpVelocity);
  const dash = conf.player.dashConfig;
  fp.playerController.setDashConfig(dash.enable, dash.dashMagnitude, dash.minDashDelaySeconds, dash.useExternalVelocity ?? false);
}
function physicsFromScene(sceneConf: SceneConfig): NexusPlayPhysics {
  return {
    gravity: sceneConf.gravity ?? NEXUS_PLAY_DEFAULTS.gravity,
    onGround: sceneConf.player?.moveSpeed?.onGround ?? NEXUS_PLAY_DEFAULTS.onGround,
    inAir: sceneConf.player?.moveSpeed?.inAir ?? NEXUS_PLAY_DEFAULTS.inAir,
    jumpVelocity: sceneConf.player?.jumpVelocity ?? NEXUS_PLAY_DEFAULTS.jumpVelocity,
    dashMagnitude: sceneConf.player?.dashConfig?.dashMagnitude ?? NEXUS_PLAY_DEFAULTS.dashMagnitude,
  };
}
const NEXUS_THIRD_PERSON: NonNullable<SceneConfig['viewMode']> = {
  type: 'thirdPerson', distance: 11, cameraFOV: 70, zoomEnabled: true,
  minZoomDistance: 4, maxZoomDistance: 18,
  initialPolarAngle: Math.PI / 2.35, initialAzimuthAngle: Math.PI,
};
const mountF8Editor = (viz: Viz, sceneConf: SceneConfig) => {
  if (typeof window === 'undefined') return;
  let open = false;
  let host: HTMLDivElement | null = null;
  let comp: ReturnType<typeof mount> | null = null;
  const close = () => { if (comp) { unmount(comp); comp = null; } host?.remove(); host = null; open = false; };
  const toggle = (evt?: KeyboardEvent) => {
    evt?.preventDefault();
    if (open) { close(); return; }
    document.exitPointerLock?.();
    host = document.createElement('div');
    document.body.appendChild(host);
    const seed = readNexusPlayPhysics() ?? physicsFromScene(sceneConf);
    comp = mount(NexusPlayEditor, { target: host, props: { viz, initial: seed } });
    open = true;
  };
  sceneConf.customControlsEntries = [...(sceneConf.customControlsEntries ?? []), { key: 'f8', label: 'Mobility editor', action: toggle }];
  viz.registerDestroyedCb(close);
};
function isNexusHubPath() {
  if (typeof location === 'undefined') return false;
  const p = location.pathname.replace(/\/$/, '') || '/';
  return p === '/' || p.endsWith('/nexus');
}
export async function hydrateNexusPlay(viz: Viz, sceneConf: SceneConfig, sceneDef: SceneDef) {
  if (sceneDef.physics === false) return;
  if (sceneConf.viewMode?.type === 'orbit') return;
  if (isNexusHubPath()) {
    rememberToon(parseNexusToonQuery(location.search));
    if (!readNexusPlayPhysics()) writeNexusPlayPhysics(NEXUS_PLAY_DEFAULTS);
  }
  const phys = readNexusPlayPhysics();
  const wantBody = isNexusHubPath() || !!sessionToon() || !!new URLSearchParams(location.search).get('toon');
  if (!sceneConf.player) sceneConf.player = {};
  if (phys) {
    if (!sceneConf.player.moveSpeed) sceneConf.player.moveSpeed = { onGround: phys.onGround, inAir: phys.inAir };
    sceneConf.gravity = phys.gravity;
    sceneConf.player.moveSpeed.onGround = phys.onGround;
    sceneConf.player.moveSpeed.inAir = phys.inAir;
    sceneConf.player.jumpVelocity = phys.jumpVelocity;
    sceneConf.player.dashConfig = { ...DefaultDashConfig, ...(sceneConf.player.dashConfig ?? {}), enable: true, dashMagnitude: phys.dashMagnitude };
  }
  if (wantBody && sceneConf.viewMode?.type !== 'thirdPerson' && sceneConf.viewMode?.type !== 'top-down') {
    sceneConf.viewMode = { ...NEXUS_THIRD_PERSON };
  }
  const collider = sceneConf.player.colliderSize ?? { height: 2.2, radius: 1.14 };
  const shape = sceneConf.player.playerColliderShape ?? 'capsule';
  const centerToFeet = getPlayerColliderCenterToFeetOffset(shape, collider.height, collider.radius);
  if (wantBody && !sceneConf.player.mesh) {
    try {
      sceneConf.player.mesh = await loadNexusPlayBody(viz, { height: collider.height, radius: collider.radius, centerToFeet });
    } catch (err) {
      console.warn('[nexus] play body unavailable on this scene — capsule-only', err);
    }
  }
  const mesh = sceneConf.player.mesh;
  if (mesh?.userData?.nexusPlayTick) {
    viz.registerBeforeRenderCb((_t, dt) => mesh.userData.nexusPlayTick(viz, dt));
  }
  mountF8Editor(viz, sceneConf);
}
function pickClipName(names: string[], want: string): string | null {
  const chain = ANIM_FALLBACKS[want] ?? [want];
  for (const c of chain) {
    const hit = names.find(n => n === c || n.toLowerCase().includes(c.toLowerCase()));
    if (hit) return hit;
  }
  return names[0] ?? null;
}
function flipIfHeadBelowHips(model: THREE.Object3D) {
  let hips: THREE.Object3D | null = null;
  let head: THREE.Object3D | null = null;
  model.traverse((o) => {
    const n = o.name.toLowerCase();
    if (!hips && /hips$/.test(n)) hips = o;
    if (!head && /(^|:)head$/.test(n)) head = o;
  });
  if (!hips || !head) return;
  model.updateMatrixWorld(true);
  const hy = hips.getWorldPosition(new THREE.Vector3()).y;
  const hd = head.getWorldPosition(new THREE.Vector3()).y;
  if (hd < hy) {
    model.rotation.x = Math.PI;
    model.updateMatrixWorld(true);
    const hd2 = head.getWorldPosition(new THREE.Vector3()).y;
    const hy2 = hips.getWorldPosition(new THREE.Vector3()).y;
    if (hd2 < hy2) model.rotation.x = 0;
    model.updateMatrixWorld(true);
  }
}
export async function loadNexusPlayBody(
  viz: Viz,
  opts: { height: number; radius: number; centerToFeet: number }
): Promise<THREE.Group> {
  const pick = parseNexusToonQuery(typeof location !== 'undefined' ? location.search : '');
  const url = `${CDN_PREFIX}/${pick.gender}/${pick.id}.gltf`;
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const root = new THREE.Group();
  root.name = `NexusPlayBody_${pick.gender}_${pick.id}`;
  const model = gltf.scene;
  model.traverse(o => {
    if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  model.rotation.set(0, 0, 0);
  model.position.set(0, 0, 0);
  model.scale.set(Math.abs(model.scale.x) || 1, Math.abs(model.scale.y) || 1, Math.abs(model.scale.z) || 1);
  model.updateMatrixWorld(true);
  flipIfHeadBelowHips(model);
  const totalH = opts.height + 2 * opts.radius;
  const box = new THREE.Box3().setFromObject(model);
  const authorH = Math.max(0.01, box.max.y - box.min.y);
  model.scale.setScalar(Math.abs(totalH / authorH));
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  model.position.y = -opts.centerToFeet - box2.min.y;
  model.position.x -= (box2.min.x + box2.max.x) * 0.5;
  model.position.z -= (box2.min.z + box2.max.z) * 0.5;
  root.add(model);
  root.rotation.set(0, 0, 0);
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
    if (want === 'jump') { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; }
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
      root.rotation.set(0, Math.atan2(_fwd.x, _fwd.z), 0);
    } else {
      root.rotation.x = 0;
      root.rotation.z = 0;
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
      if (act) { prev?.fadeOut(0.12); act.reset().fadeIn(0.12).play(); current = next; }
    }
  };
  return root;
}
