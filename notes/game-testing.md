# New game testing — Nexus modular + Destiny mobility

This fork’s **new game** is tested here, not in a parallel engine. Player = AmmoJS capsule in `src/viz/collision.ts`. Parkour = `src/viz/parkour`. Hub = `src/viz/scenes/nexus`.

## What we are testing

1. **Nexus modular character designs** — baked toon bodies (CDN GLTF), origins, 8-stat point-buy. Not grudge6 `loadRaceKit`.
2. **Space-like traversal** — low-G, air control, dash, jump pads. Destiny 2 *mobility*, not a space-sim cockpit.
3. **Same body across maps** — load a toon once; scene change only rebinds collision/terrain.

## Character SSOT

| Piece | Location |
| --- | --- |
| Toon roster | `GrudgeSpaceRTS/src/dangerroom/nexus/nexusToons.ts` |
| 8 stats | `.../nexus/attributes.ts` — BIO NEU KIN QNT SYN CHR ENT GRA |
| Origins | `.../nexus/origins.ts` |
| CDN | `https://assets.grudge-studio.com/models/characters/{male\|female}/{id}.gltf` |
| Production Ground | GrudgeSpaceRTS `/ground` |

Default space-test bodies: **male/spacesuit**, **female/scifi**. One mixer per body. Feet on the same height field as the capsule.

## Destiny 2 mobility map (do not invent a second controller)

| D2 | Test here | Stat |
| --- | --- | --- |
| Sprint | `moveSpeed.onGround` | KIN |
| Jump | `jumpVelocity` | KIN |
| Float / glide | air damping + lower `gravity` | GRA |
| Air dash | `dashConfig` (hub: on, infinite) | KIN + CHR |
| Slide | not in hub yet — add to existing collision, not a new package |
| Mantle | capsule vs mesh; `boost_nova` / `plats` |
| Jump pad | `jump_pad_speedup_test` |
| Zero-G | gravity → ~8–14; GRA 2+ on drifter origin |

Hub (`nexus.ts`) now: `gravity: 30`, ground 10, air 13, jump 12, dash on.

## Scenes to run

| Scene | Why |
| --- | --- |
| `/nexus` | Hub + dash + portals (this is the new-game lobby) |
| `/movement_v2` | Timed parkour — D2 air control |
| `/boost_nova` | Boost / nova pads |
| `/jump_pad_speedup_test` | Jump pad + speedup |
| `/plats` | Platforming |
| `/tutorial` | First-run |

## Pass / fail

**Pass**

- [x] `/nexus` third-person + Ground CDN toon (`?toon=male:spacesuit` default; `female:scifi`)
- [x] portal `goto` keeps `?toon=` + session physics (F8) on every physics scene
- [x] F8 ControlPanel edits gravity, MM ground/air, jump velocity, dash distance on the Ammo player
- [ ] spacesuit or scifi toon loads from CDN (or Ground `/ground` if this scene still uses default capsule)
- [ ] idle/walk/run/jump clips resolve via `NEXUS_TOON_ANIM_FALLBACKS`
- [ ] dash in air does not reset vertical velocity to zero (`useExternalVelocity: true`)
- [ ] air speed ≥ ground speed (D2 float)
- [ ] KIN 4+ feels faster than KIN 0 on Ground
- [ ] GRA 2+ (drifter) resists fall / knockback vs GRA 0
- [ ] portal `nexus` → `movement_v2` keeps the same player config family
- [ ] no second `AnimationMixer`, no second physics world, no Meshy/capsule as the shipped hero

**Fail / do not**

- Replace the Ammo player with `three-player-controller` on this body
- Use grudge6 Toon RTS kits as the Nexus play mesh
- Invent a class tree (knight/mage) — origins only

## How to run

```bash
yarn install
yarn dev   # or: just run
# open /nexus then portal MOVEMENT V2
```

Original Ameobea demos stay at [3d.ameo.design](https://3d.ameo.design).
