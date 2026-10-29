# Architecture

## Simulation core (`core/core.cpp`)

- One deterministic step function, fixed at 120 Hz. No libc, no heap: all state lives in static `float` arrays.
- The client reads state through zero-copy typed views (`shipPtr()`, `partsPtr()`, …) and writes controls into `inputPtr()`. Events (part cut free, drone woke, extraction…) go into a ring buffer read once per frame.
- Ship characteristics come from `configPtr()` + `applyConfig()`, written by the client from the hull class and fitted parts. A server will do the same from the player's saved ship.
- **Layouts are a contract.** The `S_*`, `P_*`, `W_*`, `D_*`, `G_*`, `I_*`, `E_*` enums are mirrored in `client/main.js` and `tests/core.test.mjs`; the core exports `layoutS/P/W/D` so the client can refuse to run against a mismatched build. Change all three together.
- Builds: `core.wasm` (SIMD) for normal use, and `core.js` (Binaryen wasm2js) as a fallback when a page can't instantiate WebAssembly.

## Client (`client/`)

- Three plain ES modules concatenated in order (`main.js`, `ships.js`, `hub.js`) into one page. They share one scope — a deliberate shortcut from the prototype; splitting into real modules is tracked in the roadmap.
- Rendering: Three.js `WebGPURenderer`. "Auto" uses WebGPU when the browser offers a full adapter and WebGL 2 when it only offers compatibility mode (OpenGL-backed, common on Linux). Post-processing passes run without MSAA in compatibility mode.
- Everything visual is procedural (materials, wrecks, ships, sky), so the page is ~600 KB with no asset downloads.

## Saves

- Browser `localStorage`, key `salvage.save.v3`, with migration from v2. A server account replaces this with multiplayer.

## Multiplayer plan (next milestone)

- An authoritative server runs the same core natively, one instance per zone. Clients send inputs; the server sends snapshots; clients predict their own ship and interpolate others.
- Destroyed player ships become persistent wrecks with their fittings still attached.
