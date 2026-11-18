"use strict";
/* explorer.js: page logic of explore-click.html and explore-box.html. <body data-mode="click"> or "zoom". */
const $ = id => document.getElementById(id);
const MODE = document.body.dataset.mode === "zoom" ? "zoom" : "click";
window.onSay = t => { $("msg").textContent = t; };

function draw() {
  const sm = surrogate(), an = analyse(sm.est), sg = suggestions(sm, an); S.lastOffered = sg.map(s => s.tag); S.cur = {sm, an, sg};
  MapView.render("map", sm, {suggestions: sg, picks: S.picks, reveal: S.reveal, interactive: true, zoom: MODE === "zoom"}).then(first => { if (first) wire(); });
  $("count").textContent = S.picks.length;
  $("barrier").textContent = an.barrier === null ? "-" : an.barrier.toFixed(1) + " kcal/mol";
  $("barnote").textContent = (S.picks.length ? "(estimate)" : "(cheap map only; reveal energies to improve it)") + (an.gap === undefined ? "" : `  The ${an.b.short} well lies ${an.gap >= 0 ? "above" : "below"} the ${an.a.short} well by ${Math.abs(an.gap).toFixed(1)} kcal/mol.`);
  $("wells").textContent = an.W.slice(0, 4).map(w => w.short ? `${w.short}: ${w.E.toFixed(1)} kcal/mol (angle ${D.theta[w.i]}, dist. ${D.rho[w.j].toFixed(2)})` : `well at angle ${D.theta[w.i]}, dist. ${D.rho[w.j].toFixed(2)}: ${w.E.toFixed(1)} kcal/mol`).join("  |  ");
  const sel = (id, cur) => { const el = $(id); if (el.options.length !== D.wells.length) { el.innerHTML = ""; D.wells.forEach((w, k) => el.add(new Option(w.name, k))); } el.value = cur; };
  sel("from", S.from); sel("to", S.to);
  $("sugg").innerHTML = sg.map((s, k) => `<div class="sugg"><button class="n" data-k="${k}" aria-label="Reveal suggestion ${k + 1}: ${s.tag}">${k + 1}</button><div><b>${s.tag}</b> (angle ${D.theta[s.v.i]}, dist. ${D.rho[s.v.j].toFixed(2)})<small>${s.why}</small></div></div>`).join("") || '<span class="note">No more stored points to suggest.</span>';
  document.querySelectorAll("#sugg button").forEach(b => b.onclick = () => { const s = S.cur.sg[+b.dataset.k]; if (take(s.v, `suggestion ${+b.dataset.k + 1}: ${s.tag}`)) { say(""); draw(); } });
  $("log").tBodies[0].innerHTML = S.log.map(e => `<tr><td>${e.n}</td><td>${e.seconds}</td><td>${e.how}</td><td>${e.theta}</td><td>${e.rho.toFixed(2)}</td><td>${e.skala_kcal_above_lowest_stored.toFixed(1)}</td><td>${e.barrier_estimate === null ? "-" : e.barrier_estimate.toFixed(1)}</td></tr>`).join("");
  $("logbox").scrollTop = 1e6;
  $("reveal").textContent = S.reveal ? "Hide stored points" : "Show every stored Skala point";
  $("reveal").setAttribute("aria-pressed", S.reveal ? "true" : "false");
  MapView.molecule("mol", "hov", null);
}
function wire() {
  const el = $("map");
  if (MODE === "click") el.on("plotly_click", ev => { if (!ev.points.length) return; clickAt(ev.points[0].x, ev.points[0].y); });
  el.on("plotly_hover", ev => { const p = ev.points[0]; if (p) MapView.molecule("mol", "hov", p.x, p.y); });
  if (MODE === "zoom") el.on("plotly_selected", ev => { if (!ev || !ev.range) return;
    const [x0, x1] = ev.range.x.sort((a, b) => a - b), [y0, y1] = ev.range.y.sort((a, b) => a - b);
    const have = new Set(S.picks.map(p => p.i * 1000 + p.j));
    const inside = [...D.stored.values()].filter(v => !have.has(v.i * 1000 + v.j) && D.theta[v.i] >= x0 && D.theta[v.i] <= x1 && D.rho[v.j] >= y0 && D.rho[v.j] <= y1);
    if (!inside.length) { say("No unmeasured stored point inside that box."); return; }
    inside.sort((a, b) => S.cur.sm.est[a.i][a.j] - S.cur.sm.est[b.i][b.j]); let n = 0;
    for (const v of inside.slice(0, ZOOM_CAP)) if (take(v, "zoom box")) n++;
    say(`Zoom box revealed ${n} point${n === 1 ? "" : "s"}` + (inside.length > ZOOM_CAP ? ` (${inside.length - ZOOM_CAP} more inside, lowest energies first).` : ".")); draw(); });
}
function clickAt(x, y) {
  const {best, dist} = pointNear(x, y);
  if (!best) { say("Every stored point is already measured."); return; }
  if (dist > 0.12) { say("No stored point near there. The cheap map is shown, but no Skala energy was computed in that region."); return; }
  if (take(best, MODE === "click" ? "free click" : "keyboard form")) { say(""); draw(); }
}
// keyboard form: angle and distance typed in, the nearest stored point is revealed
$("kb-go").onclick = () => {
  const a = parseFloat($("kb-angle").value), r = parseFloat($("kb-dist").value);
  if (!Number.isFinite(a) || !Number.isFinite(r)) { say("Type an angle (0 to 180) and a distance (1.0 to 2.4 angstrom)."); return; }
  const {best} = pointNear(a, r);
  if (!best) { say("Every stored point is already measured."); return; }
  if (take(best, "keyboard form")) { say(`Revealed the stored point nearest to your entry: angle ${D.theta[best.i]}, distance ${D.rho[best.j].toFixed(2)}.`); draw(); }
};
$("reset").onclick = () => { resetState(); S.mode = MODE; say(""); draw(); };
$("from").onchange = () => { S.from = +$("from").value; draw(); };
$("to").onchange = () => { S.to = +$("to").value; draw(); };
$("reveal").onclick = () => { S.reveal = !S.reveal; if (S.reveal) S.shownAll = true; draw(); };
$("save").onclick = () => { const blob = new Blob([JSON.stringify({system: D.system, basis: D.basis, mode: "replay", showed_all_stored_points: !!S.shownAll, log: S.log}, null, 1)], {type: "application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `session_${D.system}.json`; a.click(); };
try { load("hono"); S.mode = MODE; $("title").textContent = D.title; $("sysinfo").textContent = `${D.stored.size} stored points, Skala-1.1 / ${D.basis}; cheap map GFN2-xTB`; $("budget").textContent = BUDGET; draw(); }
catch (e) { $("msg").textContent = "Could not load the data: " + e; }
