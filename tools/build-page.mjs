// Assembles the game into one self-contained page.
//   node tools/build-page.mjs        → dist/index.html  (Three.js from the jsDelivr CDN; deployable anywhere)
//   node tools/build-page.mjs --dev  → dist/dev.html    (Three.js from ./node_modules; for the local dev server)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const rd = (p) => readFileSync(path.join(root, p), 'utf8');
const THREE_VERSION = JSON.parse(rd('package.json')).dependencies.three.replace(/[^\d.]/g, '');

const shell = rd('client/shell.html');
// client modules share one scope, concatenated in dependency order
const main = ['client/main.js', 'client/ships.js', 'client/hub.js'].map(rd).join('\n');
const wasm = readFileSync(path.join(root, 'build/core.wasm')).toString('base64');
const js = rd('build/core.js');
const cut = js.indexOf('var retasmFunc = asmFunc(');
if (cut < 0) throw new Error('unexpected wasm2js output');
const fallback = `window.__coreFallback = function () {\n${js.slice(0, cut)}return asmFunc({});\n};`;
const base = dev ? '/node_modules/three/' : `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/`;
const importmap = `<script type="importmap">${JSON.stringify({ imports: {
  three: `${base}build/three.webgpu.js`, 'three/webgpu': `${base}build/three.webgpu.js`,
  'three/tsl': `${base}build/three.tsl.js`, 'three/addons/': `${base}examples/jsm/` } })}</script>`;

// function replacers: the payloads contain `$` sequences that string replacement would interpret
const body = shell
  .replace('%%IMPORTMAP%%', () => importmap)
  .replace('%%WASM%%', () => wasm)
  .replace('%%COREJS%%', () => fallback)
  .replace('%%MAIN%%', () => main);
// title, fonts and styles belong in <head>; everything from the stage on is the body
const split = body.indexOf('<div id="stage">');
const page = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${body.slice(0, split)}</head>\n<body>\n${body.slice(split)}\n</body>\n</html>\n`;
mkdirSync(path.join(root, 'dist'), { recursive: true });
const dst = path.join(root, 'dist', dev ? 'dev.html' : 'index.html');
writeFileSync(dst, page);
console.log(`page built → ${path.relative(root, dst)} (${(page.length / 1024).toFixed(0)} KB, three@${THREE_VERSION}${dev ? ', local' : ', CDN'})`);
