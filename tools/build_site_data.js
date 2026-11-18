// Writes the data wrappers that the pages load as classic <script> files (fetch is blocked on file://).
//   site/data/hono.js        window.B3_DATA = {hono: <site/data/hono.json>}
//   site/data/simulation.js  window.B3_SIM  = the 5 strategies x 40 starts x 30 clicks, without map snapshots
// and copies figures/fig_schematic.svg to site/img/ (or writes a labelled placeholder).
// Usage: node tools/build_site_data.js [--check]   (--check fails if an output is stale)
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), check = process.argv.includes('--check');
const out = {};
const hono = JSON.parse(fs.readFileSync(path.join(root, 'site/data/hono.json'), 'utf8'));
out['site/data/hono.js'] = 'window.B3_DATA=' + JSON.stringify({hono}) + ';\n';
const sim = JSON.parse(fs.readFileSync(path.join(root, 'figures/data/simulation.json'), 'utf8'));
const runs = {};
for (const [name, rs] of Object.entries(sim.runs)) runs[name] = rs.map(r => ({bar: r.bar, ok: r.ok.map(v => v ? 1 : 0), picks: r.picks}));
out['site/data/simulation.js'] = 'window.B3_SIM=' + JSON.stringify({refBar: sim.refBar, refCoarse: sim.refCoarse, cheapBar: sim.cheapBar, cheapOrder: sim.cheapOrder, runs}) + ';\n';
let bad = 0;
for (const [rel, text] of Object.entries(out)) {
  const p = path.join(root, rel);
  if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.log('STALE', rel); bad++; } else console.log('ok   ', rel); }
  else { fs.writeFileSync(p, text); console.log('wrote', rel, (text.length / 1024).toFixed(0) + ' kB'); }
}
const norm = t => t.replace(/<metadata>[\s\S]*?<\/metadata>/g, '');   // provenance metadata that some tools add on every write
const svg = path.join(root, 'figures/fig_schematic.svg'), dst = path.join(root, 'site/img/fig_schematic.svg');
if (fs.existsSync(svg)) { if (check) { if (!fs.existsSync(dst) || norm(fs.readFileSync(svg, 'utf8')) !== norm(fs.readFileSync(dst, 'utf8'))) { console.log('STALE site/img/fig_schematic.svg'); bad++; } } else { fs.copyFileSync(svg, dst); console.log('copied schematic'); } }
else if (!check) { fs.writeFileSync(dst, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120" role="img" aria-label="placeholder for the concept schematic"><rect width="600" height="120" fill="#f6f6f4" stroke="#c9c9c9"/><text x="300" y="66" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#5a5a5a">Concept schematic goes here</text></svg>\n'); console.log('wrote placeholder schematic'); }
// sanity checks from the plan
const nSk = hono.runs[Object.keys(hono.runs)[0]].points.filter(p => p.skala !== null).length;
const nRuns = Object.keys(sim.runs).length, nStarts = sim.runs.random.length, nClicks = sim.runs.random[0].bar.length;
console.log(`Skala points ${nSk}; strategies ${nRuns} x starts ${nStarts} x clicks ${nClicks}`);
if (nSk !== 665 || nRuns !== 5 || nStarts !== 40 || nClicks !== 30) { console.log('UNEXPECTED SIZES'); bad++; }
process.exit(bad ? 1 : 0);
