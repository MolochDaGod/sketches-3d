# sketches-3d (Grudge fork)

Grudge Studio fork of [Ameobea/sketches-3d](https://github.com/Ameobea/sketches-3d).  
This tree is the **new-game test harness**: Nexus modular character designs on the existing AmmoJS / Three.js parkour player, with **Destiny 2-style mobility** (sprint, jump, air dash, floaty air control) — not a second controller.

| Hub | Mobility lab |
| --- | --- |
| **`nexus`** scene — portal lobby (`src/viz/scenes/nexus`) | **`movement_v2`**, `boost_nova`, `jump_pad_speedup_test`, `plats` |

Live Ground (same toon roster, production): [GrudgeSpaceRTS `/ground`](https://grudge-space-rts.vercel.app/) · toons on CDN `assets.grudge-studio.com/models/characters/{gender}/{id}.gltf`

Testing SSOT: [`notes/game-testing.md`](notes/game-testing.md)

---

## New game testing (this fork)

### Nexus modular characters

Roster SSOT is **not** grudge6 race kits. It is the baked Nexus / Grudges toon pack used by Ground:

- Code: `GrudgeSpaceRTS/src/dangerroom/nexus/nexusToons.ts`
- Stats: BIO · NEU · KIN · QNT · SYN · CHR · ENT · GRA (`attributes.ts`, 20-point buy)
- Origins: military / scientist / medic / engineer / drifter / psionic — **no** knight/warrior/mage/ranger classes
- Clips: idle / walk / run / jump / attack with name fallbacks

Male: adventurer, beach, casual, casual-hoodie, farmer, king, punk, **spacesuit**, suit, swat, worker  
Female: adventurer, casual, formal, medieval, punk, **scifi**, soldier, suit, witch, worker

**spacesuit** + **scifi** are the default vanguard bodies for space traversal tests.

### Destiny-like mobility (extend existing player)

Do **not** add a second mixer, physics world, or `three-player-controller` on the same body. Tune `SceneConfig.player` on the Ammo capsule already in `src/viz/collision.ts`:

| D2 feel | Existing knob |
| --- | --- |
| Sprint | `moveSpeed.onGround` |
| Jump | `jumpVelocity` |
| Air control / float | `moveSpeed.inAir` + `externalVelocityAirDampingFactor` |
| Air dash | `dashConfig.enable` (hub already on, infinite charges) |
| Low-G / space | `gravity` (hub is 30) scaled by GRA |
| Kinetic punch | KIN seeds melee range/speed on Ground |

Hub defaults today (`nexus.ts`): ground 10, air 13, jump 12, dash on, gravity 30, capsule 2.2 × 1.14.

**Play:** `nexus` → portal **MOVEMENT V2**. Also `boost_nova`, `jump_pad_speedup_test`, `plats`, `tutorial`.

---

# 3D Sketches + Experiments (upstream)

Upstream home of Geotoy / Geoscript and the original browser sketches. Built with Blender, Three.js, custom shaders, SvelteKit. Desktop mouse + keyboard. Audio via [web-synth](https://github.com/ameobea/web-synth).

## In-Browser Demos (Ameobea originals)

- [Pinklights](https://3d.ameo.design/pinklights.html)
- [Bridge2](https://3d.ameo.design/bridge2.html)
- [Rainy](https://3d.ameo.design/rainy.html)
- [Particle Conduit](https://3d.ameo.design/blink.html)
