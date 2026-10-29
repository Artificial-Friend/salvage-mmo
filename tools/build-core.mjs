// Compiles the simulation core:
//   core/core.cpp → build/core.wasm   (SIMD, the normal path)
//                 → build/core.js     (plain-JS fallback via Binaryen wasm2js)
// Needs clang/clang++ with the wasm32 target and wasm-ld (LLVM ≥ 15).
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'build');
mkdirSync(out, { recursive: true });
const cxx = process.env.CXX || 'clang++';
const common = ['--target=wasm32', '-nostdlib', '-fno-exceptions', '-fno-rtti', '-O3', '-ffast-math', '-std=c++17',
  '-Wall', '-Wno-unused-function', '-Wno-unused-const-variable',
  '-Wl,--no-entry', '-Wl,--export-dynamic', '-Wl,-z,stack-size=262144'];
const src = path.join(root, 'core', 'core.cpp');
const run = (cmd, args) => { console.log('›', cmd, args.slice(-3).join(' ')); execFileSync(cmd, args, { stdio: 'inherit' }); };

run(cxx, [...common, '-msimd128', '-o', path.join(out, 'core.wasm'), src]);
run(cxx, [...common, '-o', path.join(out, 'core-nosimd.wasm'), src]);
const wasm2js = path.join(root, 'node_modules', '.bin', 'wasm2js');
if (!existsSync(wasm2js)) throw new Error('wasm2js not found — run npm install');
run(wasm2js, [path.join(out, 'core-nosimd.wasm'), '-O3', '-o', path.join(out, 'core.js')]);
console.log('core built →', path.relative(root, out));
