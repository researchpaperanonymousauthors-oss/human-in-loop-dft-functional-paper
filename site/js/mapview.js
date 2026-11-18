"use strict";
/* mapview.js: drawing only. Needs Plotly and engine.js (global D). */
const MapView = {
  // sm: result of surrogate(); o: {suggestions, picks, reveal, interactive, zoom, newest, static}
  render(id, sm, o) {
    const el = document.getElementById(id);
    const z = D.rho.map((r, j) => D.theta.map((t, i) => Number.isFinite(sm.est[i][j]) ? Math.min(sm.est[i][j], 100) : null));
    const data = [{type: "heatmap", x: D.theta, y: D.rho, z, zmin: 0, zmax: 100, colorscale: "Viridis", colorbar: {title: "kcal/mol", thickness: 14},
      hovertemplate: "angle %{x:.0f}, dist. %{y:.2f}<br>%{z:.1f} kcal/mol<extra></extra>"}];
    if (o.reveal) { const xs = [], ys = [], tx = [];
      for (const v of D.stored.values()) { xs.push(D.theta[v.i]); ys.push(D.rho[v.j]); tx.push((v.E - D.skmin).toFixed(0)); }
      data.push({type: "scatter", mode: "markers", x: xs, y: ys, text: tx, marker: {size: 5, color: "rgba(255,255,255,.55)"}, hovertemplate: "stored Skala: %{text} kcal/mol<extra></extra>", showlegend: false}); }
    const P = o.picks || [];
    if (P.length) data.push({type: "scatter", mode: "markers+text", x: P.map(p => D.theta[p.i]), y: P.map(p => D.rho[p.j]), text: P.map((p, k) => String(k + 1)), textposition: "top center", textfont: {color: "#fff", size: 10},
      marker: {size: 10, color: "#fff", line: {color: "#000", width: 1.5}}, hoverinfo: "skip", showlegend: false});
    if (o.newest && P.length) { const p = P[P.length - 1];
      data.push({type: "scatter", mode: "markers", x: [D.theta[p.i]], y: [D.rho[p.j]], marker: {size: 22, color: "rgba(0,0,0,0)", line: {color: "#2a78d6", width: 3}}, hoverinfo: "skip", showlegend: false}); }
    const sg = o.suggestions || [];
    if (sg.length) data.push({type: "scatter", mode: "markers+text", x: sg.map(s => D.theta[s.v.i]), y: sg.map(s => D.rho[s.v.j]), text: sg.map((s, k) => String(k + 1)), textposition: "middle center", textfont: {color: "#000", size: 11},
      marker: {size: 19, symbol: "square", color: "#ffb000", line: {color: "#000", width: 1}}, hoverinfo: "skip", showlegend: false});
    const fixed = !o.interactive || !o.zoom;
    const layout = {margin: {l: 52, r: 10, t: 8, b: 44}, xaxis: {title: "angle (degrees)", range: [-3, 183], fixedrange: fixed}, yaxis: {title: "distance (angstrom)", range: [D.rho[0] - 0.04, D.rho[D.nR - 1] + 0.04], fixedrange: fixed},
      dragmode: o.zoom ? "select" : false, hovermode: "closest", paper_bgcolor: "rgba(0,0,0,0)", selectdirection: "any", clickmode: "event"};
    const cfg = {displayModeBar: false, responsive: true, staticPlot: !!o.static};
    const first = !el.data;
    return (first ? Plotly.newPlot : Plotly.react)(id, data, layout, cfg).then(() => first);
  },
  // the moving proton (orange) in the molecular frame; x = angle, y = distance, or null
  molecule(svgId, hovId, x, y) {
    const svg = document.getElementById(svgId); if (!svg) return; const col = {N: "#3050f8", O: "#e8312a", C: "#666", H: "#ddd"}; let h = "";
    const fr = D.frame; const cx = p => p.x, cy = p => -p.y;
    h += [[0, 1], [0, 2]].map(([a, b]) => `<line x1="${cx(fr[a])}" y1="${cy(fr[a])}" x2="${cx(fr[b])}" y2="${cy(fr[b])}" stroke="#999" stroke-width="0.08"/>`).join("");
    h += `<circle cx="0" cy="0" r="0.05" fill="#888"/>`;
    fr.forEach(a => { h += `<circle cx="${cx(a)}" cy="${cy(a)}" r="0.32" fill="${col[a.symbol]}" stroke="#000" stroke-width="0.03"/><text x="${cx(a)}" y="${cy(a) + 0.1}" text-anchor="middle" font-size="0.3" fill="${a.symbol === "H" ? "#000" : "#fff"}">${a.symbol}</text>`; });
    if (x !== null && x !== undefined) { const t = x * Math.PI / 180; for (const sg of [1, -1]) { const px = sg * y * Math.sin(t), py = -y * Math.cos(t);
      h += `<circle cx="${px}" cy="${py}" r="0.22" fill="#ffb000" stroke="#000" stroke-width="0.03" opacity="${sg === 1 ? 1 : 0.35}"/>`; } }
    svg.innerHTML = h;
    const hov = document.getElementById(hovId);
    if (hov) hov.textContent = x === null || x === undefined ? "Hover the map: the proton (orange) sits at that place. The faint copy is its mirror image." : `angle ${x.toFixed(0)}, distance ${y.toFixed(2)} angstrom`;
  }
};
