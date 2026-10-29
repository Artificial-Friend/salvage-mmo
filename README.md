# Salvage

A browser MMO about salvage in a hard sci-fi solar system. You fly clanky, slow ships with real Newtonian physics, cut parts off the wrecks of old battles, and build your fleet out of what you tear loose. Heat is your signature, mass is your jump cost, and anything you lose stays out there for someone else.

**Status:** single-player prototype (v0.5). Multiplayer is the next milestone.

## Play locally

Needs Node 20+ and LLVM with the WebAssembly target (`clang`, `wasm-ld`).

```sh
npm install
npm run dev          # builds everything and serves http://localhost:8080/
```

Use a desktop browser with WebGPU (Chrome, Edge, or Vivaldi with Vulkan enabled on Linux). It falls back to WebGL 2 automatically.

## Repository layout

| Path | What it is |
| --- | --- |
| `core/core.cpp` | Deterministic simulation core: Newtonian flight, heat and radiators, IR signature, laser, harpoon and winch, drones, weapons, jump drive, zone generation. Freestanding C++ (no libc, no heap). Compiles to WebAssembly for the browser and natively for the future authoritative server. |
| `client/main.js` | Renderer (Three.js WebGPURenderer), procedural materials and wrecks, effects, flight HUD, tactical view, audio, input. |
| `client/ships.js` | Hull classes, their characteristics and mount points, procedural ship models, fitted-ship → core configuration. |
| `client/hub.js` | The hub: save data, hangar bays, fitting, shipyard, storage, market, missions. |
| `client/shell.html` | Page markup and styles. |
| `tools/` | Build scripts (core, page), dev server, syntax check. |
| `tests/` | Physics-core regression tests (`npm test`). |
| `docs/` | Architecture notes and the roadmap. |

## Scripts

| Command | Does |
| --- | --- |
| `npm run build` | Core (WASM + JS fallback), deployable page `dist/index.html`, dev page `dist/dev.html` |
| `npm run dev` | Build and serve locally |
| `npm test` | Core regression tests |
| `npm run check` | Syntax check of the client |

## Design

The living game design document is kept in Claude Docs; `docs/ROADMAP.md` tracks what is being built and in what order.
