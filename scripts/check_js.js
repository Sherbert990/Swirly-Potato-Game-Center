#!/usr/bin/env node
/*
 * Syntax-check every piece of client JS: the shared SDK, standalone game scripts,
 * and the inline <script> blocks in the hub + game HTML. Catches parse errors that
 * CI's pytest (backend-only) never would. Exits non-zero on the first failure.
 *
 *   node scripts/check_js.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');
const targets = [];

// Standalone JS files.
for (const rel of ['shared/gamecenter.js', 'games/lavender-leap/game.js']) {
  if (fs.existsSync(path.join(REPO, rel))) targets.push({ rel, kind: 'js' });
}
// HTML files with inline scripts: the hub + every file under games/.
const htmls = ['index.html'];
const gamesDir = path.join(REPO, 'games');
for (const entry of fs.readdirSync(gamesDir)) {
  const dir = path.join(gamesDir, entry);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) htmls.push(path.join('games', entry, f));
}
htmls.forEach((rel) => targets.push({ rel, kind: 'html' }));

let failures = 0;
for (const { rel, kind } of targets) {
  try {
    const src = fs.readFileSync(path.join(REPO, rel), 'utf8');
    if (kind === 'js') {
      vm.compileFunction(src, [], {});
    } else {
      const blocks = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      if (blocks.length) vm.compileFunction(blocks.join('\n;\n'), [], {});
    }
    console.log('ok    ' + rel);
  } catch (e) {
    console.error('FAIL  ' + rel + '\n      ' + String(e.message).split('\n')[0]);
    failures++;
  }
}
console.log(failures ? `\n${failures} file(s) failed to parse` : `\nall ${targets.length} JS targets parse OK`);
process.exit(failures ? 1 : 0);
