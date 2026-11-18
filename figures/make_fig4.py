"""Figure 4: how the estimate improves, two simulated clickers started from the same first click."""
from common import *
style()
S = load_sim(); M = load_maps(); th, rh = np.array(M["theta"]), np.array(M["rho"]); ref = S["refBar"]
rows = [("wells_then_pass", "Wells first,\nthen pass"), ("pass_only", "Pass suggestion\nonly")]
cols = [0, 5, 10, 20]
fig, axes = plt.subplots(2, 4, figsize=(7.09, 3.9), sharex=True, sharey=True, gridspec_kw=dict(hspace=0.12, wspace=0.07))
for r, (name, lab) in enumerate(rows):
    snaps = S["snapshots"][name]; col = STRAT[name][1]
    for c, k in enumerate(cols):
        ax = axes[r, c]; sn = snaps[str(k)]; Z = arr(sn["est"])
        im = ax.pcolormesh(th, rh, Z.T, cmap="viridis", vmin=0, vmax=100, shading="nearest", rasterized=True)
        if sn["picks"]:
            pk = np.array(sn["picks"]); ax.scatter(pk[:, 0], pk[:, 1], s=9, color="white", edgecolor="#111", linewidth=0.6, zorder=4)
            ax.scatter(*pk[0], s=26, marker="*", color="#ffb000", edgecolor="#111", linewidth=0.5, zorder=5)
        bar = S["runs"][name][0]["bar"][k - 1] if k else sn["barrier"]
        ax.text(0.97, 0.97, "%.1f" % bar, transform=ax.transAxes, ha="right", va="top", fontsize=8, fontweight="bold", color="white",
                path_effects=[__import__("matplotlib.patheffects").patheffects.withStroke(linewidth=2, foreground="#222")])
        ax.set_xlim(-3, 183); ax.set_ylim(0.97, 2.43); ax.set_xticks([30, 90, 150]); ax.set_yticks([1.0, 1.5, 2.0])
        if r == 0: ax.set_title("start (xTB map)" if k == 0 else "%d clicks" % k, fontsize=7.5, pad=3)
        if c == 0: ax.set_ylabel(lab, color=col, fontweight="bold", fontsize=7.5)
        if r == 1: ax.set_xlabel("angle (degrees)")
for ax in axes[:, 1:].ravel(): ax.tick_params(labelleft=False)
cb = fig.colorbar(im, ax=axes, location="right", fraction=0.025, pad=0.02, aspect=30); cb.set_label("estimated energy (kcal/mol above the lowest point)", fontsize=7); cb.ax.tick_params(labelsize=7)
fig.text(0.07, -0.045, "Number in each panel: estimated cis to trans pass (kcal/mol); all-points value %.1f. White circles: revealed points; star: first click (the same for both rows)." % ref, fontsize=6.8, color=INK2, ha="left")
fig.text(0.02, 0.5, "distance (angstrom)", rotation=90, va="center", fontsize=7.5)
save(fig, "fig4_snapshots")
for name, _ in rows: print(name, [S["snapshots"][name][str(k)]["barrier"] for k in cols])
