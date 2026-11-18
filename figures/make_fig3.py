"""Figure 3: Skala against the cheap map."""
from common import *
style()
P = load_points(); M = load_maps(); th, rh = P["theta"], P["rho"]
cheap, sk, pb = P["cheap"], P["sk"], P["pb"]
est_full = arr(M["estFull"]); est_cheap = arr(M["estCheap"])
named_full = {w["short"]: w for w in M["namedFull"]}; named_cheap = {w["short"]: w for w in M["namedCheap"]}
# difference Skala - xTB after removing the mean offset over points below 40 kcal/mol (as in the text)
m40 = np.isfinite(sk) & np.isfinite(cheap) & (sk < 40)
offset = float(np.mean((sk - cheap)[m40])); mae = float(np.mean(np.abs((sk - cheap)[m40] - offset)))
diff = sk - cheap - offset
# pass path from the all-points estimate
a = (named_full["cis"]["i"], named_full["cis"]["j"]); b = (named_full["trans"]["i"], named_full["trans"]["j"])
h, path = minimax_path(est_full, a, b)
assert abs((h - est_full[a]) - M["barFull"]) < 0.02, (h - est_full[a], M["barFull"])
n_unmeasured = sum(1 for p in path if not np.isfinite(sk[p]))
print("offset %.2f MAE %.2f pass %.2f unmeasured path nodes %d" % (offset, mae, M["barFull"], n_unmeasured))
top = max(path, key=lambda p: est_full[p])

fig = plt.figure(figsize=(7.09, 5.3))
gs = fig.add_gridspec(2, 3, height_ratios=[1.25, 1], hspace=0.62, wspace=0.34)
X, Y = np.meshgrid(th, rh, indexing="ij")
unmeasured = np.where(np.isfinite(cheap) & ~np.isfinite(sk), 1.0, np.nan)
mpl.rcParams["hatch.color"] = "#b5b4aa"; mpl.rcParams["hatch.linewidth"] = 0.5
def draw(ax, Z, cmap, vmin, vmax, title, hatch=False):
    im = ax.pcolormesh(th, rh, Z.T, cmap=cmap, vmin=vmin, vmax=vmax, shading="nearest", rasterized=True)
    if hatch:
        hm = ax.pcolormesh(th, rh, unmeasured.T, cmap=mpl.colors.ListedColormap(["#ffffff"]), shading="nearest", edgecolor="none", linewidth=0, zorder=2)
        hm.set_hatch("//////")
    ax.set_xlim(-3, 183); ax.set_ylim(0.97, 2.43); ax.set_xticks([0, 45, 90, 135, 180]); ax.set_xlabel("angle (degrees)"); ax.set_title(title, loc="left", pad=3)
    ax.set_facecolor("white"); return im
def wells(ax, named, label=True):
    for k, w in named.items():
        ax.plot(th[w["i"]], rh[w["j"]], WELL_MARK[k], color=WELL[k], ms=5.5, mec="white", mew=0.8, zorder=5)
        if label: ax.annotate(k, (th[w["i"]], rh[w["j"]]), xytext=(5, -10) if k == "trans" else (4, 5), textcoords="offset points", fontsize=7, color="white" if k != "nitro" else "white", fontweight="bold", zorder=6,
                              path_effects=[mpl.patheffects.withStroke(linewidth=1.6, foreground="#222")])
import matplotlib.patheffects
ax = fig.add_subplot(gs[0, 0]); im = draw(ax, cheap, "viridis", 0, 100, "GFN2-xTB"); ax.set_ylabel("distance (angstrom)"); wells(ax, named_cheap); panel(ax, "a")
ax2 = fig.add_subplot(gs[0, 1]); draw(ax2, sk, "viridis", 0, 100, "Skala-1.1/def2-SVP, 665 points", hatch=True); wells(ax2, named_full)
pp = np.array([(th[i], rh[j]) for i, j in path]); ax2.plot(pp[:, 0], pp[:, 1], color="white", lw=1.0, ls=(0, (3, 1.5)), zorder=4)
ax2.plot(th[top[0]], rh[top[1]], "*", color="white", mec="#222", mew=0.6, ms=9, zorder=7)
ax2.annotate("pass, %.1f" % M["barFull"], (th[top[0]], rh[top[1]]), xytext=(96, 1.3), textcoords="data", fontsize=7, color=INK, ha="center", va="center", fontweight="bold", arrowprops=dict(arrowstyle="-", color=INK, lw=0.6), zorder=7)
panel(ax2, "b")
cb = fig.colorbar(im, ax=[ax, ax2], location="bottom", fraction=0.045, pad=0.22, aspect=40); cb.set_label("kcal/mol above the lowest point of each map", fontsize=7); cb.ax.tick_params(labelsize=7)
ax3 = fig.add_subplot(gs[0, 2]); im3 = draw(ax3, diff, DIV, -15, 15, "Skala minus xTB", hatch=True)
cs = ax3.contour(th, rh, np.where(np.isfinite(sk), sk, 99).T, levels=[40], colors=[INK], linewidths=0.8)
cb3 = fig.colorbar(im3, ax=ax3, location="bottom", fraction=0.05, pad=0.22, aspect=18, ticks=[-15, 0, 15]); cb3.set_label("kcal/mol, mean offset %.1f removed" % offset, fontsize=7); cb3.ax.tick_params(labelsize=7)
panel(ax3, "c")

# (d) well energies by method
axd = fig.add_subplot(gs[1, 0:2])
names = ["cis", "trans", "nitro"]
def pbwell(w):
    t0, t1 = w["theta"]; r0, r1 = w["rho"]; mask = (th[:, None] >= t0) & (th[:, None] <= t1) & (rh[None, :] >= r0) & (rh[None, :] <= r1)
    return float(np.nanmin(np.where(mask, pb, np.nan)))
pbv = [pbwell(w) for w in sorted(P["wells"], key=lambda w: names.index(w["short"]))]
xtb = [named_cheap[n]["E"] for n in names]; skv = [named_full[n]["E"] for n in names]
print("xtb", xtb, "pbe", pbv, "skala", skv)
w = 0.26; xs = np.arange(3)
for k, (lab, vals, col, hatch) in enumerate([("GFN2-xTB", xtb, "#b9b8ae", "///"), ("PBE", pbv, "#8a897f", ""), ("Skala-1.1", skv, "#2a78d6", "")]):
    bars = axd.bar(xs + (k - 1) * (w + 0.02), vals, w, color=col, edgecolor="white", linewidth=0.8, hatch=hatch, label=lab, zorder=3)
    for r, v in zip(bars, vals): axd.text(r.get_x() + r.get_width() / 2, v + 0.25, "%.1f" % v, ha="center", va="bottom", fontsize=6.5)
axd.set_xticks(xs); axd.set_xticklabels(["cis (proton toward\nthe other O)", "trans (proton away\nfrom the other O)", "nitro (proton\non N)"]); axd.set_ylabel("kcal/mol"); axd.set_ylim(0, 11.5)
axd.legend(frameon=False, loc="upper left", ncol=1); axd.grid(axis="y", color=GRID, lw=0.6, zorder=0); axd.set_axisbelow(True)
axd.set_title("Well energies above the cis well", loc="left", pad=3); panel(axd, "d")
# (e) pass height
axe = fig.add_subplot(gs[1, 2])
vals = [M["barCheap"], M["barCoarse"], M["barFull"]]; labs = ["xTB\nalone", "Skala,\n214 coarse\npoints", "Skala,\nall 665\npoints"]
bars = axe.bar(range(3), vals, 0.62, color=["#b9b8ae", "#8fb4e8", "#2a78d6"], edgecolor="white", zorder=3)
for r, v in zip(bars, vals): axe.text(r.get_x() + r.get_width() / 2, v + 0.6, "%.1f" % v, ha="center", va="bottom", fontsize=7, fontweight="bold")
axe.set_xticks(range(3)); axe.set_xticklabels(labs); axe.set_ylim(0, 52); axe.set_ylabel("kcal/mol above the cis well"); axe.grid(axis="y", color=GRID, lw=0.6, zorder=0); axe.set_axisbelow(True)
axe.set_title("Pass, cis to trans", loc="left", pad=3); panel(axe, "e")
save(fig, "fig3_skala_vs_cheap")
