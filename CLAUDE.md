# Working on Salvage

## Workflow
- `main` is always playable. Work on a branch (`feat/…`, `fix/…`, `docs/…`, `chore/…`), open a pull request, merge when CI is green.
- One concern per PR. Reference the issue it closes (`Closes #12`).
- Before pushing: `npm run build && npm run check && npm test`.

## The core/client contract
- `core/core.cpp` state layouts (`S_*`, `P_*`, `W_*`, `D_*`, `G_*`, `I_*`, `E_*`, `K_*`) are mirrored in `client/main.js`, `client/ships.js` and `tests/core.test.mjs`. Change them together, and bump `S_N`/`P_N`/`W_N`/`D_N` when a layout grows (the client refuses to start on a mismatch).
- The core stays freestanding: no libc, no heap, no floating-point non-determinism tricks. It must keep building for both `wasm32` and native (the future server).
- Every new core behaviour gets a regression test in `tests/core.test.mjs`.

## Client
- Client files share one scope and are concatenated in order: `main.js`, `graphics.js`, `surfaces.js`, `shipkit.js`, `shipgen.js`, `ships.js`, `hub.js` (see `tools/build-page.mjs`).
- Every post-processing pipeline is built by `buildPipeline()` in `graphics.js`; new effects go there with a switch in `GFX_OPTIONS` and a value in every preset.
- Three.js is pinned (see `package.json`); the deployable page loads it from jsDelivr at that exact version.
- WebGPU compatibility mode (OpenGL-backed) cannot resolve multisampled post-processing passes; `msaaSamples()` returns 0 there.
- Ships, parts and wrecks are built with `client/shipgen.js`: add detail to a `Batch` through surface frames (`Hull.frame`) so it sits on the hull, and give every design a `lod 1` path.
- Wreck hull sections are owned by the core (`SEC_A/SEC_B/SEC_L` in `core/core.cpp`, `HULL_SECTION` in `client/shipkit.js`, mirrored in the tests). Parts, the laser and collisions use that exact shape; change all three together.
- Saves are versioned (`salvage.save.v3`); any change to the save shape needs a migration from the previous version.

## Design
- Physics is real in its rules and compressed in scale. Restrictions come from world rules (mass, heat, signature, fuel), not arbitrary game rules.
- Danger should be readable: every threat gets a warning before it acts (drones stir before waking, storms are forecast).
