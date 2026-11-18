"use strict";
/* compare.js: Table 1 and the two line charts, computed at load from data/simulation.js (no map, no Plotly).
   Medians are the mean of the two middle values. Test hook: B3_TABLE1. */
const $ = id => document.getElementById(id);
const STRAT = [
  {key: "wells_then_pass", label: "Wells first, then pass", col: "#2a78d6", dash: "", mk: "circle"},
  {key: "uncertainty_only", label: "Most uncertain only", col: "#008300", dash: "2 3", mk: "tri"},
  {key: "random", label: "Random", col: "#52514e", dash: "6 2 1 2", mk: "cross"},
  {key: "spread", label: "Spread out", col: "#9a998f", dash: "9 4", mk: "diamond"},
  {key: "pass_only", label: "Pass guess only", col: "#e34948", dash: "5 3", mk: "square"},
];
const SIM = window.B3_SIM, REF = SIM.refBar, NC = 30, KS = [5, 10, 20];
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = x => x.toFixed(1);
const stat = {};
for (const s of STRAT) { const runs = SIM.runs[s.key]; stat[s.key] = {med: [], ok: []};
  for (let k = 1; k <= NC; k++) { stat[s.key].med.push(median(runs.map(r => Math.abs(r.bar[k - 1] - REF)))); stat[s.key].ok.push(runs.filter(r => r.ok[k - 1]).length); } }
const cheapErr = Math.abs(SIM.cheapBar - REF);
window.B3_TABLE1 = {cheap: cheapErr, rows: Object.fromEntries(STRAT.map(s => [s.key, {med: KS.map(k => stat[s.key].med[k - 1]), ok: KS.map(k => stat[s.key].ok[k - 1])}]))};

$("cheap").textContent = f1(cheapErr);
$("t1").innerHTML = `<thead><tr><th rowspan="2">Click rule</th>${KS.map(k => `<th colspan="2">${k} clicks</th>`).join("")}</tr><tr>${KS.map(() => "<th>median diff.</th><th>order right</th>").join("")}</tr></thead><tbody>` +
  STRAT.map(s => `<tr><td>${s.label}</td>${KS.map(k => `<td>${f1(stat[s.key].med[k - 1])}</td><td>${stat[s.key].ok[k - 1]} of 40</td>`).join("")}</tr>`).join("") + "</tbody>";

function marker(mk, x, y, col) {
  x = +x; y = +y; const r = 3.4;
  if (mk === "circle") return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
  if (mk === "square") return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="${col}"/>`;
  if (mk === "tri") return `<polygon points="${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}" fill="${col}"/>`;
  if (mk === "diamond") return `<polygon points="${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}" fill="${col}"/>`;
  return `<path d="M${x - r} ${y - r}L${x + r} ${y + r}M${x - r} ${y + r}L${x + r} ${y - r}" stroke="${col}" stroke-width="2"/>`;
}
function lineChart(id, ymax, ytitle, val, refLine, fmt) {
  const W = 400, H = 270, L = 44, R = 124, T = 10, B = 40, x = k => L + (W - L - R) * (k - 1) / (NC - 1), y = v => H - B - (H - T - B) * v / ymax;
  let g = "";
  const step = ymax > 30 ? 10 : 5; for (let v = 0; v <= ymax; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e4e0"/><text x="${L - 5}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#555">${v}</text>`;
  for (const k of [1, 5, 10, 20, 30]) g += `<text x="${x(k)}" y="${H - B + 15}" text-anchor="middle" font-size="11" fill="#555">${k}</text>`;
  g += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#555">number of clicks</text>`;
  g += `<text x="11" y="${(T + H - B) / 2}" text-anchor="middle" font-size="11" fill="#555" transform="rotate(-90 11 ${(T + H - B) / 2})">${ytitle}</text>`;
  if (refLine !== null) g += `<line x1="${L}" x2="${W - R}" y1="${y(refLine.v)}" y2="${y(refLine.v)}" stroke="#1a1a1a" stroke-dasharray="3 3"/><text x="${W - R - 3}" y="${y(refLine.v) - 4}" text-anchor="end" font-size="10.5" fill="#1a1a1a">${refLine.t}</text>`;
  const ends = [];
  for (const s of STRAT) { const v = val(s.key), pts = v.map((a, i) => `${x(i + 1).toFixed(1)},${y(a).toFixed(1)}`).join(" ");
    g += `<polyline points="${pts}" fill="none" stroke="${s.col}" stroke-width="${s.key === "wells_then_pass" || s.key === "pass_only" ? 2.2 : 1.5}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/>`;
    for (const k of [5, 10, 20, 30]) g += marker(s.mk, x(k).toFixed(1), y(v[k - 1]).toFixed(1), s.col);
    ends.push({s, yy: y(v[NC - 1])}); }
  ends.sort((a, b) => a.yy - b.yy); let last = -99; for (const e of ends) { e.ly = Math.max(e.yy, last + 12); last = e.ly; }
  for (const e of ends) g += `<text x="${W - R + 6}" y="${e.ly + 4}" font-size="10.5" fill="${e.s.col === "#9a998f" ? "#6b6a62" : e.s.col}">${e.s.label}</text>`;
  $(id).innerHTML = g;
}
lineChart("ch-err", 15, "|error| of the pass (kcal/mol)", k => stat[k].med, {v: cheapErr, t: `cheap map alone, ${f1(cheapErr)}`});
lineChart("ch-ord", 40, "starts with right well order (of 40)", k => stat[k].ok, null);

// step through
let ct = null;
function row(k) { $("cv").textContent = k; $("cs").value = k;
  $("tk").innerHTML = `<thead><tr><th>Click rule</th><th>median difference (kcal/mol)</th><th>well order right</th></tr></thead><tbody>` +
    STRAT.map(s => `<tr><td>${s.label}</td><td>${f1(stat[s.key].med[k - 1])}</td><td>${stat[s.key].ok[k - 1]} of 40</td></tr>`).join("") + "</tbody>"; }
$("cs").oninput = () => { stop(); row(+$("cs").value); };
function stop() { if (ct) { clearInterval(ct); ct = null; } $("cplay").textContent = "Play"; }
$("cplay").onclick = () => { if (ct) { stop(); return; } let k = +$("cs").value; if (k >= NC) k = 0; $("cplay").textContent = "Pause";
  ct = setInterval(() => { k++; row(k); if (k >= NC) stop(); }, 400); };
row(10);
