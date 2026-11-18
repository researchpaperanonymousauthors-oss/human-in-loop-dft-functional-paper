// Replay analysis for manuscript v3 (Results, Section S6). Read-only.
// Run from the package root:  node figures/replay_wells_first.js   (or give the package folder as an argument)
const fs = require('fs'), vm = require('vm'), R = (process.argv[2] || require('path').resolve(__dirname, '..')).replace(/\/?$/, '/');
const ctx = {window: {}, console, SIM: JSON.parse(fs.readFileSync(R + 'figures/data/simulation.json', 'utf8'))}; vm.createContext(ctx);
const body = `load("hono");
const idx = (t, r) => [nearest(D.theta, t), nearest(D.rho, r)], key = (i, j) => i * 1000 + j, f = x => x.toFixed(2);
const g = (an, k) => an.named.find(w => w.short === k);
const order = an => g(an, 'cis').E <= g(an, 'trans').E && g(an, 'trans').E <= g(an, 'nitro').E;
const inWin = (w, i, j) => D.theta[i] >= w.theta[0] && D.theta[i] <= w.theta[1] && D.rho[j] >= w.rho[0] && D.rho[j] <= w.rho[1];
const state = (r, K) => { S.picks = []; S.from = 0; S.to = 1; for (let k = 0; k < K; k++) { const [i, j] = idx(...r.picks[k]); S.picks.push({i, j, E: D.stored.get(key(i, j)).E}); }
  const sm = surrogate(), an = analyse(sm.est); return {sm, an, have: new Set(S.picks.map(p => key(p.i, p.j)))}; };
S.picks = [...D.stored.values()].map(v => ({i: v.i, j: v.j, E: v.E})); const full = surrogate().est, anF = analyse(full), ref = anF.barrier;
console.log('all-points pass height', f(ref), 'pass node', D.theta[anF.cell[0]], D.rho[anF.cell[1]]);
// 1. the replay reproduces the recorded runs
let dmax = 0, bad = 0; for (const rs of Object.values(SIM.runs)) for (const r of rs) for (let K = 1; K <= r.picks.length; K++) { const {an} = state(r, K); dmax = Math.max(dmax, Math.abs(an.barrier - r.bar[K - 1])); if (order(an) !== r.ok[K - 1]) bad++; }
console.log('replay check: largest pass-height difference', dmax.toFixed(4), '; well-order mismatches', bad);
if (dmax > 0.001 || bad) throw new Error('the replay does not reproduce the recorded runs');
// 2. first clicks: identical for the five rules, window, energy, outcome, stride
const W = SIM.runs.wells_then_pass, stored = [...D.stored.values()];
console.log('first click identical for all rules:', W.every((r, n) => Object.values(SIM.runs).every(rs => rs[n].picks[0].join() === r.picks[0].join())));
console.log('list positions of the 40 first clicks:', W.map(r => { const [i, j] = idx(...r.picks[0]); return stored.findIndex(v => v.i === i && v.j === j); }).join(' '));
for (const r of W) { const [i, j] = idx(...r.picks[0]); const w = D.wells.find(w => inWin(w, i, j)); if (w) console.log('start', r.seed, 'first click', r.picks[0].join('/'), 'in', w.short, 'window, all-points energy', f(full[i][j]), r.ok[4] && r.ok[9] && r.ok[19] ? 'order ok' : 'ORDER MISSED'); }
console.log('starts that begin outside every window and miss the order at 20 clicks:', W.filter(r => { const [i, j] = idx(...r.picks[0]); return !D.wells.some(w => inWin(w, i, j)) && !r.ok[19]; }).length);
// 3. the nine failing starts after 5, 10, 20 clicks, and one added click at the estimated minimum of the unmeasured well (after click 5)
for (const r of W.filter(r => !r.ok[4])) { for (const K of [5, 10, 20]) { const {an, have} = state(r, K);
    console.log('start', r.seed, 'K', K, ['cis', 'trans', 'nitro'].map(k => k + ' ' + f(g(an, k).E) + (have.has(key(g(an, k).i, g(an, k).j)) ? ' (revealed)' : ' (unrevealed)')).join(', '), '| pass error', f(Math.abs(an.barrier - ref))); }
  const {an, have} = state(r, 5), w = an.named.find(w => !have.has(key(w.i, w.j))), v = D.stored.get(key(w.i, w.j)); S.picks.push({i: v.i, j: v.j, E: v.E});
  console.log('   one more click at', D.theta[w.i] + '/' + D.rho[w.j], '(' + w.short + ') -> order', order(analyse(surrogate().est)) ? 'ok' : 'missed'); }
// 4. the remaining 0.90 kcal/mol
const [ci, cj] = idx(145, 1.45); console.log('all-points energy at 145/1.50:', f(full[idx(145, 1.5)[0]][idx(145, 1.5)[1]]), '; at 145/1.45:', f(full[ci][cj]));
for (const K of [6, 10, 20]) { let pass = 0, n = 0, low = 0, emax = 0; for (const r of W) { const {sm, an, have} = state(r, K); if (have.has(key(anF.cell[0], anF.cell[1]))) pass++;
    const c = g(an, 'cis'); if (!(D.theta[c.i] === 145 && Math.abs(D.rho[c.j] - 1.5) < 1e-6 && have.has(key(c.i, c.j)) && Math.abs(Math.abs(an.barrier - ref) - 0.8987) < 0.005)) continue; n++;
    const lo = suggestions(sm, an).find(s => s.tag === 'Lowest unmeasured'); if (lo && lo.v.i === ci && lo.v.j === cj) low++;
    S.picks.push({i: ci, j: cj, E: D.stored.get(key(ci, cj)).E}); emax = Math.max(emax, Math.abs(analyse(surrogate().est).barrier - ref)); }
  console.log('K', K, ': pass node revealed in', pass, 'starts; error 0.90 with cis node 145/1.50 in', n, '; "Lowest unmeasured" at 145/1.45 in', low, '; largest error after revealing it', f(emax)); }
// 5. all rules: starts that miss the order at 20 clicks, and whether a well of a mis-ordered pair sits at an unrevealed node
let tot = 0, unr = 0; for (const rs of Object.values(SIM.runs)) for (const r of rs) { if (r.ok[19]) continue; tot++; const {an, have} = state(r, 20), c = g(an, 'cis'), t = g(an, 'trans'), n = g(an, 'nitro'), p = [];
  if (c.E > t.E) p.push(c, t); if (t.E > n.E) p.push(t, n); if (p.some(w => !have.has(key(w.i, w.j)))) unr++; }
console.log('all rules, order missed at 20 clicks:', tot, 'of 200; with an unrevealed node in a mis-ordered pair:', unr);`;
vm.runInContext(fs.readFileSync(R + 'site/data/hono.js', 'utf8') + '\n' + fs.readFileSync(R + 'site/js/engine.js', 'utf8') + '\n' + body, ctx);
