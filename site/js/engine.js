"use strict";
/* engine.js: the whole computation of the explorer, with no page elements.
   Lines from "nearest" to "suggestions" are the engine of the first explorer, unchanged.
   Globals kept on purpose for the figure scripts and the tests: D, S, nearest, surrogate, analyse, suggestions. */
const KCAL = 627.509474, BUDGET = 40, ZOOM_CAP = 12;
let D = null, S = null;

// ---------------------------------------------------------------- data (read from the classic script data/hono.js)
function load(name) {
  D = window.B3_DATA[name];
  const runs = Object.values(D.runs); const run = runs[0];
  D.nT = D.theta.length; D.nR = D.rho.length;
  D.cheap = D.cheap_hartree.map(row => row.map(v => v === null ? NaN : v * KCAL));
  const cmin = Math.min(...D.cheap.flat().filter(Number.isFinite)); D.cheap = D.cheap.map(row => row.map(v => v - cmin));   // cheap map in kcal/mol, 0 at its minimum
  D.stored = new Map();
  for (const p of run.points) { if (p.skala === null) continue; const i = nearest(D.theta, p.theta), j = nearest(D.rho, p.rho); D.stored.set(i * 1000 + j, {i, j, E: p.skala * KCAL}); }
  D.basis = run.basis; D.skmin = Math.min(...[...D.stored.values()].map(v => v.E));
  resetState();
}
function nearest(arr, v) { let b = 0, d = 1e9; arr.forEach((a, k) => { const e = Math.abs(a - v); if (e < d) { d = e; b = k; } }); return b; }

// ---------------------------------------------------------------- surrogate: cheap map + Gaussian-process correction of (Skala - cheap)
function feat(i, j) { return [D.theta[i] / 180, (D.rho[j] - D.rho[0]) / (D.rho[D.nR - 1] - D.rho[0])]; }
const GP_LEN = 0.3, GP_VAR = 25, GP_NOISE = 2;   // chosen offline on the stored points: mean error 5.1 (cheap map alone) -> 4.6, 3.7, 3.0 kcal/mol after 6, 12, 20 random picks
function kern(a, b) { const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; return GP_VAR * Math.exp(-d / (2 * GP_LEN * GP_LEN)); }
function chol(A) { const n = A.length, L = A.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]; L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j]; }
  return L; }
function solveL(L, b) { const x = []; for (let i = 0; i < L.length; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * x[k]; x[i] = s / L[i][i]; } return x; }
function solveLT(L, b) { const n = L.length, x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; } return x; }
function surrogate() {
  const est = D.cheap.map(r => r.slice()), sd = D.cheap.map(r => r.map(() => NaN));
  const P = S.picks; if (!P.length) return {est: rel(est), sd};
  const delta = P.map(p => p.E - D.cheap[p.i][p.j] - 0), shift = delta.reduce((a, b) => a + b, 0) / delta.length;
  const F = P.map(p => feat(p.i, p.j)), K = F.map((a, r) => F.map((b, c) => kern(a, b) + (r === c ? GP_NOISE : 0)));
  const L = chol(K), alpha = solveLT(L, solveL(L, delta.map(d => d - shift)));
  for (let i = 0; i < D.nT; i++) for (let j = 0; j < D.nR; j++) {
    if (!Number.isFinite(D.cheap[i][j])) continue; const f = feat(i, j), k = F.map(a => kern(f, a));
    const mu = k.reduce((s, v, q) => s + v * alpha[q], 0), w = solveL(L, k), v = GP_VAR - w.reduce((s, x) => s + x * x, 0);
    est[i][j] = D.cheap[i][j] + shift + mu; sd[i][j] = Math.sqrt(Math.max(v, 0)); }
  for (const p of P) est[p.i][p.j] = p.E;   // measured nodes are exact (both frames carry the same constant offset, removed by rel)
  return {est: rel(est), sd};
}
function rel(m) { const lo = Math.min(...m.flat().filter(Number.isFinite)); return m.map(r => r.map(v => v - lo)); }

// ---------------------------------------------------------------- wells, pass, barrier
function wells(est) {
  const out = [];
  for (let i = 0; i < D.nT; i++) for (let j = 0; j < D.nR; j++) { const v = est[i][j]; if (!Number.isFinite(v)) continue; let ok = true;
    for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1; b++) { if (!a && !b) continue; const p = i + a, q = j + b; if (p < 0 || q < 0 || p >= D.nT || q >= D.nR) continue; if (Number.isFinite(est[p][q]) && est[p][q] < v - 1e-9) { ok = false; break; } }
    if (ok) out.push({i, j, E: v}); }
  out.sort((a, b) => a.E - b.E); return out;
}
function minimax(est, a, b) {   // lowest possible highest point on a grid path from a to b (Dijkstra on the max)
  const best = est.map(r => r.map(() => Infinity)), top = est.map(r => r.map(() => null)); best[a.i][a.j] = est[a.i][a.j]; top[a.i][a.j] = [a.i, a.j];
  const heap = [[est[a.i][a.j], a.i, a.j]];
  while (heap.length) { heap.sort((x, y) => x[0] - y[0]); const [h, i, j] = heap.shift(); if (h > best[i][j]) continue; if (i === b.i && j === b.j) break;
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) { const p = i + di, q = j + dj; if (p < 0 || q < 0 || p >= D.nT || q >= D.nR || !Number.isFinite(est[p][q])) continue;
      const nh = Math.max(h, est[p][q]); if (nh < best[p][q] - 1e-12) { best[p][q] = nh; top[p][q] = est[p][q] >= h ? [p, q] : top[i][j]; heap.push([nh, p, q]); } } }
  return {height: best[b.i][b.j], cell: top[b.i][b.j]};
}
// Named wells (windows given in the data file). The barrier is measured between the two wells the person selects.
function analyse(est) {
  if (!D.wells || !D.wells.length) return analyseAuto(est);
  const named = D.wells.map((w, k) => { let best = null;
    for (let i = 0; i < D.nT; i++) for (let j = 0; j < D.nR; j++) { const v = est[i][j]; if (!Number.isFinite(v)) continue; const t = D.theta[i], r = D.rho[j];
      if (t >= w.theta[0] && t <= w.theta[1] && r >= w.rho[0] && r <= w.rho[1] && (best === null || v < best.E)) best = {i, j, E: v, k, name: w.name, short: w.short}; }
    return best; }).filter(Boolean);
  const A = named.find(w => w.k === S.from), B = named.find(w => w.k === S.to);
  if (!A || !B || A.k === B.k) return {W: named, named, barrier: null};
  const m = minimax(est, A, B); return {W: named, named, a: A, b: B, barrier: m.height - A.E, gap: B.E - A.E, cell: m.cell};
}
function analyseAuto(est) {
  const W = wells(est).filter((w, k, arr) => arr.slice(0, k).every(o => Math.abs(o.i - w.i) + Math.abs(o.j - w.j) > 3));   // merge neighbours
  if (W.length < 2) return {W, barrier: null};
  const a = W[0], b = W[1], m = minimax(est, a, b); return {W, a, b, barrier: m.height - Math.min(a.E, b.E), cell: m.cell, lowWell: a.E <= b.E ? a : b};
}

// ---------------------------------------------------------------- suggestions
function suggestions(sm, an) {
  const have = new Set(S.picks.map(p => p.i * 1000 + p.j)), out = [];
  const nearestStored = (i, j) => { let best = null, d = 1e9; for (const v of D.stored.values()) { if (have.has(v.i * 1000 + v.j)) continue; const e = ((D.theta[v.i] - D.theta[i]) / 180) ** 2 + ((D.rho[v.j] - D.rho[j]) / (D.rho[D.nR - 1] - D.rho[0])) ** 2; if (e < d) { d = e; best = v; } } return best; };
  const add = (tag, why, c) => { if (!c) return; const v = nearestStored(c[0], c[1]); if (v && !out.some(o => o.v === v)) out.push({tag, why, v}); };
  if (an.cell) add("Pass guess", "highest point on the estimated lowest path between the two selected wells", an.cell);
  for (const w of an.W.slice(0, 3)) { const win = D.wells ? D.wells[w.k] : null;
    const measured = S.picks.some(p => win ? (D.theta[p.i] >= win.theta[0] && D.theta[p.i] <= win.theta[1] && D.rho[p.j] >= win.rho[0] && D.rho[p.j] <= win.rho[1]) : Math.abs(p.i - w.i) + Math.abs(p.j - w.j) <= 2);
    if (!measured) { add("Unmeasured well" + (w.short ? ": " + w.short : ""), "no Skala energy has been revealed inside this well yet", [w.i, w.j]); break; } }
  if (S.picks.length) { let b = null, bv = -1; for (let i = 0; i < D.nT; i++) for (let j = 0; j < D.nR; j++) { const v = sm.sd[i][j]; if (Number.isFinite(v) && v > bv && sm.est[i][j] < 60) { bv = v; b = [i, j]; } } add("Most uncertain", "the estimate is least certain here (below 60 kcal/mol)", b); }
  let lo = null, lv = 1e9; for (const v of D.stored.values()) { if (have.has(v.i * 1000 + v.j)) continue; const e = sm.est[v.i][v.j]; if (Number.isFinite(e) && e < lv) { lv = e; lo = [v.i, v.j]; } } add("Lowest unmeasured", "lowest estimated energy among points not yet revealed", lo);
  return out.slice(0, 4);
}

// ---------------------------------------------------------------- state (no page elements)
function resetState() { S = {picks: [], log: [], t0: null, reveal: false, mode: "click", msg: "", from: 0, to: Math.min(1, (D.wells || []).length - 1)}; }
function say(t) { S.msg = t; if (typeof window.onSay === "function") window.onSay(t); }
function take(v, how) {
  if (S.picks.length >= BUDGET) { say("The budget of " + BUDGET + " energies is used up. Start again or download the log."); return false; }
  if (S.picks.some(p => p.i === v.i && p.j === v.j)) { say("You already measured that point."); return false; }
  const now = Date.now(); S.t0 = S.t0 || now; S.picks.push({i: v.i, j: v.j, E: v.E});
  const sm2 = surrogate(), an2 = analyse(sm2.est);
  S.log.push({n: S.picks.length, seconds: +((now - S.t0) / 1000).toFixed(1), selected_by: "person", how, theta: D.theta[v.i], rho: D.rho[v.j], skala_kcal_above_lowest_stored: +(v.E - D.skmin).toFixed(2), barrier_estimate: an2.barrier === null ? null : +an2.barrier.toFixed(2), offered: (S.lastOffered || [])});
  return true;
}
// nearest unmeasured stored point to (x, y) in the unit-square metric; null when none lies within 0.12
function pointNear(x, y) {
  const have = new Set(S.picks.map(p => p.i * 1000 + p.j)); let best = null, d = 1e9; const sr = D.rho[D.nR - 1] - D.rho[0];
  for (const v of D.stored.values()) { if (have.has(v.i * 1000 + v.j)) continue; const e = ((D.theta[v.i] - x) / 180) ** 2 + ((D.rho[v.j] - y) / sr) ** 2; if (e < d) { d = e; best = v; } }
  return {best, dist: Math.sqrt(d)};
}
