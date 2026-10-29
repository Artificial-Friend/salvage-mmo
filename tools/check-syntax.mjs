// Parses the concatenated client the same way the page will, so syntax errors fail CI instead of a player's browser.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
const src = ['client/main.js', 'client/ships.js', 'client/hub.js'].map((p) => readFileSync(p, 'utf8')).join('\n');
const f = path.join(mkdtempSync(path.join(tmpdir(), 'salvage-')), 'client.mjs');
writeFileSync(f, src);
execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log('client syntax ok');
