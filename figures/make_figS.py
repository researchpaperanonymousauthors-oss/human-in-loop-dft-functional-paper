"""Supplementary figures S1 (method comparison), S2 (cost), S3 (well windows and wells-first clicks)."""
from common import *
from matplotlib.patches import Rectangle
style()
P = load_points(); th, rh = P["theta"], P["rho"]; cheap, sk, pb = P["cheap"], P["sk"], P["pb"]
# S1
m = np.isfinite(sk) & np.isfinite(cheap) & np.isfinite(pb) & (sk < 40)
fig, axs = plt.subplots(1, 2, figsize=(7.09, 3.3), gridspec_kw=dict(wspace=0.3))
for ax, (lab, y, col, letter) in zip(axs, [("GFN2-xTB", cheap, "#8a897f", "a"), ("PBE", pb, "#52514e", "b")]):
    off = float(np.mean((y - sk)[m])); mae = float(np.mean(np.abs((y - sk)[m] - off)))
    ax.plot([0, 40], [0, 40], color=GRID, lw=1, zorder=0); ax.plot([0, 40], [off, 40 + off], color=INK2, lw=0.8, ls=(0, (4, 2)), zorder=1)
    ax.scatter(sk[m], y[m], s=9, color=col, edgecolor="white", linewidth=0.3, zorder=3)
    ax.set_xlim(0, 40); ax.set_ylim(-2, 48); ax.set_xlabel("Skala-1.1 (kcal/mol above its lowest point)"); ax.set_ylabel("%s (kcal/mol above its lowest point)" % lab)
    ax.set_title("%s against Skala (%d points)" % (lab, m.sum()), loc="left", pad=3); panel(ax, letter, dx=-0.12)
    ax.text(0.04, 0.95, "offset (method minus Skala) %.1f,\nmean absolute difference after removing it\n%.1f kcal/mol; points below 40 kcal/mol" % (off, mae), transform=ax.transAxes, va="top", fontsize=6.8)
    print(lab, m.sum(), round(off, 2), round(mae, 2))
save(fig, "figS1_method_comparison")
# S2
rec = [json.loads(l) for l in open(os.path.join(ROOT, "data", "hono_def2-svp_points.jsonl"))]
t = np.array([r["skala_seconds"] for r in rec])
fig, (a, b) = plt.subplots(1, 2, figsize=(7.09, 2.9), gridspec_kw=dict(wspace=0.32))
a.hist(t, bins=np.arange(0, 160, 5), color="#2a78d6", edgecolor="white", linewidth=0.6); a.axvline(np.median(t), color=INK, lw=0.9, ls=(0, (3, 2)))
a.text(np.median(t) + 2, a.get_ylim()[1] * 0.95, "median %.0f s\nmean %.0f s\nmax %.0f s" % (np.median(t), t.mean(), t.max()), va="top", fontsize=7)
a.set_xlabel("Skala time per point on one worker (s)"); a.set_ylabel("number of points"); a.set_title("Time per point", loc="left", pad=3); panel(a, "a", dx=-0.12)
b.plot(np.arange(1, len(t) + 1), np.cumsum(t) / 3600, color="#2a78d6", lw=1.6); b.axvline(214, color=INK2, lw=0.8, ls=(0, (3, 2))); b.text(218, 0.4, "end of coarse level\n(214 points)", fontsize=6.8, color=INK2)
b.set_xlabel("points computed (in order of completion)"); b.set_ylabel("cumulative worker-hours"); b.set_title("Total %.1f worker-hours for %d points" % (t.sum() / 3600, len(t)), loc="left", pad=3); panel(b, "b", dx=-0.12)
b.set_xlim(0, len(t)); b.set_ylim(0, 11)
save(fig, "figS2_cost"); print("time", np.median(t), t.mean(), t.max(), t.sum() / 3600)
# S3
S = load_sim(); fig, ax = plt.subplots(figsize=(4.4, 3.4))
ax.pcolormesh(th, rh, sk.T, cmap="viridis", vmin=0, vmax=100, shading="nearest", alpha=0.55, rasterized=True)
for w in P["wells"]:
    t0, t1 = w["theta"]; r0, r1 = w["rho"]; ax.add_patch(Rectangle((t0, r0), t1 - t0, r1 - r0, fc="none", ec=WELL[w["short"]], lw=1.6, zorder=4))
    ax.text(t0 + 2, r1 + 0.02, w["short"], color=WELL[w["short"]], fontsize=7.5, fontweight="bold", va="bottom", zorder=6)
pk = np.array([p for r in S["runs"]["wells_then_pass"] for p in r["picks"][1:6]]); rng = np.random.default_rng(1)
ax.scatter(pk[:, 0] + rng.normal(0, 0.8, len(pk)), pk[:, 1] + rng.normal(0, 0.008, len(pk)), s=6, color="white", edgecolor="#111", linewidth=0.4, zorder=5)
ax.set_xlim(-3, 183); ax.set_ylim(0.97, 2.43); ax.set_xticks([0, 45, 90, 135, 180]); ax.set_xlabel("angle (degrees)"); ax.set_ylabel("distance (angstrom)")
ax.set_title("Well windows and clicks 2 to 6 of the\nwells-first clickers (40 starts)", loc="left", pad=3)
save(fig, "figS3_well_windows")
