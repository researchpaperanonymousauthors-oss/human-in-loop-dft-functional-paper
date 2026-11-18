const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8777/explore-click.html'); await p.waitForSelector('#map .heatmaplayer');
  const out = await p.evaluate(() => {
    const stored = [...D.stored.values()]; const round = m => m.map(r => r.map(v => Number.isFinite(v) ? +v.toFixed(3) : null));
    S.from = 0; S.to = 1;
    S.picks = stored.map(v => ({i: v.i, j: v.j, E: v.E})); const sf = surrogate(); const af = analyse(sf.est);
    const coarse = stored.filter(v => D.theta[v.i] % 10 === 0 && Math.abs(D.rho[v.j] * 10 - Math.round(D.rho[v.j] * 10)) < 1e-6);
    S.picks = coarse.map(v => ({i: v.i, j: v.j, E: v.E})); const sc = surrogate(); const ac = analyse(sc.est);
    S.picks = []; const s0 = surrogate(); const a0 = analyse(s0.est);
    const named = an => an.named.map(w => ({short: w.short, i: w.i, j: w.j, E: +w.E.toFixed(3)}));
    return {theta: D.theta, rho: D.rho, wells: D.wells, estFull: round(sf.est), estCoarse: round(sc.est), estCheap: round(s0.est),
      barFull: af.barrier, barCoarse: ac.barrier, barCheap: a0.barrier, namedFull: named(af), namedCheap: named(a0), cellFull: af.cell, nStored: stored.length, nCoarse: coarse.length};
  });
  fs.writeFileSync(process.argv[2], JSON.stringify(out)); console.log(out.barFull, out.barCoarse, out.barCheap, out.nStored, out.nCoarse, JSON.stringify(out.namedFull), JSON.stringify(out.namedCheap));
  await b.close();
})();
