"use strict";
/* demo.js: auto-play of a simulated clicker. The clicks come from data/simulation.js (recorded); the map, the pass estimate and the narration
   are recomputed at every step by engine.js. A difference above 0.001 kcal/mol from the recorded estimate, or a rule-based click that matches
   no live suggestion, sets B3_CHECK.failed and shows "Check failed". Test hooks: B3_DEMO.goto(k), B3_DEMO.setup(scenario, start), B3_CHECK. */
const $ = id => document.getElementById(id);
const NCLICK = 20, STEP_MS = 1500, TOL = 0.001;
const SCEN = {wells: "wells_then_pass", pass: "pass_only", random: "random"};
const RULE = {wells: true, pass: true, random: false};
window.B3_CHECK = {failed: false, barrier: [], matched: 0};
let scen = "wells", start = 1, tl = [], k = 0, timer = null, speed = 1, refOrder = "", refPass = 0;

const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = x => x.toFixed(1);
function orderText(named) { const s = [...named].sort((a, b) => a.E - b.E); return s.length === 3 ? `${s[0].short} lowest, then ${s[1].short}, then ${s[2].short}` : s.map(w => w.short).join(", "); }

// Build the whole timeline for one scenario and one start: state 0 (no clicks) to state NCLICK.
function setup(sc, st) {
  scen = sc; start = st; const rec = B3_SIM.runs[SCEN[sc]][st - 1];
  S.from = 0; S.to = 1; B3_CHECK.failed = false; B3_CHECK.barrier = []; B3_CHECK.matched = 0;
  const picks = rec.picks.slice(0, NCLICK).map(([th, r]) => D.stored.get(nearest(D.theta, th) * 1000 + nearest(D.rho, r)));
  tl = [];
  for (let n = 0; n <= NCLICK; n++) {
    S.picks = picks.slice(0, n).map(v => ({i: v.i, j: v.j, E: v.E}));
    const sm = surrogate(), an = analyse(sm.est), sg = suggestions(sm, an);
    const e = {n, sm, an, sg, bar: an.barrier, order: orderText(an.named), picks: S.picks.slice(), reason: null};
    if (n >= 1) {
      const v = picks[n - 1], hit = tl[n - 1].sg.find(s => s.v.i === v.i && s.v.j === v.j);
      e.hit = hit ? hit.tag : null;
      if (RULE[sc] && n >= 2 && !hit) B3_CHECK.failed = true; else if (hit && RULE[sc]) B3_CHECK.matched++;
      if (Math.abs(an.barrier - rec.bar[n - 1]) > TOL) B3_CHECK.failed = true;
    }
    B3_CHECK.barrier.push(an.barrier);
    tl.push(e);
  }
  return tl;
}
function reason(n) {
  const e = tl[n];
  if (n === 1) return "the simulated clicker starts at a random stored point.";
  if (scen === "random") return "it picks a stored point at random.";
  if (!e.hit) return "it takes a stored point that no suggestion offered.";
  if (/^Unmeasured well/.test(e.hit)) return `it takes '${e.hit}'; no Skala energy is revealed there yet.`;
  if (e.hit === "Pass guess") return "it takes 'Pass guess', the highest point on the estimated lowest path.";
  return `it takes '${e.hit}', the top suggestion of its rule.`;
}
function narrate(n) {
  if (n === 0) return `Start: only the GFN2-xTB map. Pass estimate ${f1(tl[0].bar)} kcal/mol; with all ${D.stored.size} points it is ${f1(refPass)}.`;
  return `Click ${n}: ${reason(n)} Pass estimate ${f1(tl[n - 1].bar)} to ${f1(tl[n].bar)} kcal/mol.`;
}

function chart(n) {
  const W = 320, H = 190, L = 40, R = 12, T = 12, B = 34, ys = tl.map(e => e.bar).concat([refPass]);
  const lo = Math.floor(Math.min(...ys) / 5) * 5 - 5, hi = Math.ceil(Math.max(...ys) / 5) * 5 + 5;
  const x = c => L + (W - L - R) * c / NCLICK, y = v => H - B - (H - T - B) * (v - lo) / (hi - lo);
  let g = "";
  for (let v = lo; v <= hi; v += 5) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e4e0"/><text x="${L - 5}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#555">${v}</text>`;
  for (const c of [0, 5, 10, 15, 20]) g += `<text x="${x(c)}" y="${H - B + 15}" text-anchor="middle" font-size="11" fill="#555">${c}</text>`;
  g += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#555">number of clicks</text>`;
  g += `<text x="10" y="${(T + H - B) / 2}" text-anchor="middle" font-size="11" fill="#555" transform="rotate(-90 10 ${(T + H - B) / 2})">pass (kcal/mol)</text>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${y(refPass)}" y2="${y(refPass)}" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="4 3"/>`;
  const pts = tl.slice(0, n + 1).map(e => `${x(e.n).toFixed(1)},${y(e.bar).toFixed(1)}`);
  g += `<polyline points="${pts.join(" ")}" fill="none" stroke="#2a78d6" stroke-width="2"/>`;
  tl.slice(0, n + 1).forEach(e => g += `<circle cx="${x(e.n).toFixed(1)}" cy="${y(e.bar).toFixed(1)}" r="${e.n === n ? 4.5 : 2.5}" fill="#2a78d6"/>`);
  $("chart").innerHTML = g;
  $("chart").setAttribute("aria-label", `Pass estimate against number of clicks. After ${n} clicks it is ${f1(tl[n].bar)} kcal/mol; with all points it is ${f1(refPass)}.`);
}
function endCard(n) {
  const el = $("end");
  if (n < NCLICK) { el.hidden = true; return; }
  const runs = B3_SIM.runs[SCEN[scen]], errs = runs.map(r => Math.abs(r.bar[NCLICK - 1] - B3_SIM.refBar)), okN = runs.filter(r => r.ok[NCLICK - 1]).length;
  el.hidden = false;
  el.innerHTML = `<h2>End of the replay</h2><p>Final estimate ${f1(tl[n].bar)} kcal/mol; with all points ${f1(refPass)}; difference ${f1(Math.abs(tl[n].bar - refPass))} kcal/mol.</p>` +
    `<p>One of 40 simulated starts. Over all 40: median difference ${f1(median(errs))}, well order right in ${okN} (<a href="compare.html">Table 2</a>).</p>` +
    `<p class="note">Try another start, another clicker, or <a href="explore-click.html">click the map yourself</a>.</p>`;
}
function show(n) {
  k = Math.max(0, Math.min(NCLICK, n)); const e = tl[k];
  MapView.render("map", e.sm, {picks: e.picks, newest: true, static: true});
  $("k").textContent = k; $("est").textContent = f1(e.bar); $("diff").textContent = f1(Math.abs(e.bar - refPass));
  $("order").textContent = `Well order now: ${e.order}. With all points: ${refOrder}.`;
  $("narr").textContent = narrate(k); $("check").hidden = !B3_CHECK.failed;
  $("log").tBodies[0].innerHTML = e.picks.map((p, q) => `<tr><td>${q + 1}</td><td>${D.theta[p.i]}</td><td>${D.rho[p.j].toFixed(2)}</td><td>${(p.E - D.skmin).toFixed(1)}</td><td>${f1(tl[q + 1].bar)}</td></tr>`).join("");
  $("logbox").scrollTop = 1e6; chart(k); endCard(k);
  $("play").textContent = timer ? "Pause" : (k >= NCLICK ? "Play again" : "Play");
  try { history.replaceState(null, "", `?scenario=${scen}&start=${start}` + (timer ? "" : "&autoplay=0")); } catch (e) { /* file:// may refuse */ }
}
function pause() { if (timer) { clearInterval(timer); timer = null; } $("play").textContent = k >= NCLICK ? "Play again" : "Play"; }
function play() { pause(); if (k >= NCLICK) show(0); timer = setInterval(() => { if (k >= NCLICK) { pause(); show(k); return; } show(k + 1); if (k >= NCLICK) pause(); }, STEP_MS / speed); $("play").textContent = "Pause"; }
function reload(sc, st, autoplay) { pause(); setup(sc, st); show(0); if (autoplay) play(); }

// ---- start
load("hono"); S.from = 0; S.to = 1;
S.picks = [...D.stored.values()].map(v => ({i: v.i, j: v.j, E: v.E})); { const an = analyse(surrogate().est); refPass = an.barrier; refOrder = orderText(an.named); }
$("n").textContent = NCLICK; $("nall").textContent = D.stored.size; $("ref").textContent = f1(refPass);
for (let q = 1; q <= 40; q++) $("start").add(new Option(q, q));
const qp = new URLSearchParams(location.search);
const sc0 = SCEN[qp.get("scenario")] ? qp.get("scenario") : "wells", st0 = Math.min(40, Math.max(1, parseInt(qp.get("start")) || 1));
$("scenario").value = sc0; $("start").value = st0;
const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
$("play").onclick = () => timer ? pause() : play();
$("back").onclick = () => { pause(); show(k - 1); };
$("fwd").onclick = () => { pause(); show(k + 1); };
$("restart").onclick = () => { pause(); show(0); };
$("speed").onchange = () => { speed = +$("speed").value; if (timer) play(); };
$("scenario").onchange = () => reload($("scenario").value, +$("start").value, !!timer);
$("start").onchange = () => reload($("scenario").value, +$("start").value, !!timer);
document.addEventListener("keydown", ev => {
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName) || ev.target.tagName === "BUTTON" && ev.key === " ") return;
  if (ev.key === " ") { ev.preventDefault(); timer ? pause() : play(); }
  else if (ev.key === "ArrowLeft") { pause(); show(k - 1); } else if (ev.key === "ArrowRight") { pause(); show(k + 1); } else if (ev.key === "Home") { pause(); show(0); }
});
window.B3_DEMO = {goto: n => { pause(); show(n); return tl[k].bar; }, setup, play, pause, state: () => ({scen, start, k, bar: tl[k].bar}), timeline: () => tl.map(e => e.bar)};
setup(sc0, st0); show(0);
if (qp.get("autoplay") !== "0" && !reduced) play();
