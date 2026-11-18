// Records every click (1..30) of five simulated clickers on the stored points, plus map snapshots for Figure 4.
const { chromium } = require('playwright'); const fs = require('fs');
const SEEDS = 40, NCLICK = 30, OUT = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('http://localhost:8777/explore-click.html'); await p.waitForSelector('#map .heatmaplayer');
  const res = await p.evaluate(({SEEDS, NCLICK}) => {
    const stored = [...D.stored.values()];
    const rng = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    S.picks = stored.map(v => ({i: v.i, j: v.j, E: v.E})); S.from = 0; S.to = 1;
    const ref = analyse(surrogate().est); const refBar = ref.barrier;
    // coarse-only reference (nodes on the 10 deg / 0.10 A grid)
    const coarse = stored.filter(v => D.theta[v.i] % 10 === 0 && Math.abs(D.rho[v.j] * 10 - Math.round(D.rho[v.j] * 10)) < 1e-6);
    S.picks = coarse.map(v => ({i: v.i, j: v.j, E: v.E})); const refCoarse = analyse(surrogate().est).barrier;
    const order = an => { const g = k => an.named.find(w => w.short === k); const t = g('trans'), n = g('nitro'), c = g('cis'); return !!(c && t && n && c.E <= t.E && t.E <= n.E); };
    const strategies = {
      random: (rand, have) => { const c = stored.filter(v => !have.has(v.i * 1000 + v.j)); return c[Math.floor(rand() * c.length)]; },
      spread: (rand, have) => { const c = stored.filter(v => !have.has(v.i * 1000 + v.j)); if (!S.picks.length) return c[Math.floor(rand() * c.length)]; let best = null, bd = -1; for (const v of c) { let d = 1e9; for (const q of S.picks) { const e = ((D.theta[v.i] - D.theta[q.i]) / 180) ** 2 + ((D.rho[v.j] - D.rho[q.j]) / 1.4) ** 2; if (e < d) d = e; } if (d > bd) { bd = d; best = v; } } return best; },
      pass_only: () => { const sm = surrogate(), an = analyse(sm.est), sg = suggestions(sm, an); return (sg.find(s => s.tag === 'Pass guess') || sg[0]).v; },
      uncertainty_only: () => { const sm = surrogate(), an = analyse(sm.est), sg = suggestions(sm, an); return (sg.find(s => s.tag === 'Most uncertain') || sg[0]).v; },
      wells_then_pass: () => { const sm = surrogate(), an = analyse(sm.est), sg = suggestions(sm, an); return (sg.find(s => /^Unmeasured well/.test(s.tag)) || sg.find(s => s.tag === 'Pass guess') || sg[0]).v; },
    };
    const snapK = [0, 5, 10, 20];
    const out = {refBar, refCoarse, runs: {}, snapshots: {}};
    S.picks = []; const an0 = analyse(surrogate().est); out.cheapBar = an0.barrier; out.cheapOrder = order(an0);
    const round = m => m.map(r => r.map(v => Number.isFinite(v) ? +v.toFixed(2) : null));
    for (const [name, fn] of Object.entries(strategies)) {
      out.runs[name] = [];
      for (let sd = 0; sd < SEEDS; sd++) {
        const rand = rng(1234 + 77 * sd); S.picks = []; S.from = 0; S.to = 1; const bar = [], ok = [], picks = [];
        for (let k = 1; k <= NCLICK; k++) {
          const have = new Set(S.picks.map(q => q.i * 1000 + q.j));
          const v = (k === 1 && name !== 'random' && name !== 'spread') ? strategies.random(rand, have) : fn(rand, have);
          S.picks.push({i: v.i, j: v.j, E: v.E}); picks.push([D.theta[v.i], D.rho[v.j]]);
          const sm = surrogate(), an = analyse(sm.est); bar.push(+an.barrier.toFixed(3)); ok.push(order(an));
          if (sd === 0 && (name === 'wells_then_pass' || name === 'pass_only') && snapK.includes(k)) {
            (out.snapshots[name] = out.snapshots[name] || {})[k] = {est: round(sm.est), picks: picks.slice(), barrier: +an.barrier.toFixed(2)}; }
        }
        out.runs[name].push({seed: sd, bar, ok, picks});
        if (sd === 0 && (name === 'wells_then_pass' || name === 'pass_only')) { S.picks = []; const sm = surrogate(), an = analyse(sm.est); (out.snapshots[name] = out.snapshots[name] || {})[0] = {est: round(sm.est), picks: [], barrier: +an.barrier.toFixed(2)}; }
      }
    }
    out.theta = D.theta; out.rho = D.rho; out.wells = D.wells;
    return out;
  }, {SEEDS, NCLICK});
  fs.writeFileSync(OUT, JSON.stringify(res)); console.log('errors', JSON.stringify(errs));
  // check against Table 1 numbers
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  for (const [n, rs] of Object.entries(res.runs)) console.log(n, [5, 10, 20].map(k => med(rs.map(r => Math.abs(r.bar[k - 1] - res.refBar))).toFixed(1) + '/' + rs.filter(r => r.ok[k - 1]).length).join('  '));
  console.log('ref', res.refBar.toFixed(2), 'coarse ref', res.refCoarse.toFixed(2), 'cheap', res.cheapBar.toFixed(2));
  await b.close();
})();
