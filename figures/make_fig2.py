"""Figure 2: the system and the point plan."""
from common import *
import matplotlib.patheffects as pe
from matplotlib.patches import Circle, Arc
style()
P = load_points(); M = load_maps(); th, rh = P["theta"], P["rho"]
d = json.load(open(os.path.join(ROOT, "site", "data", "hono.json")))
frame = d["frame"]; wall = d["wall"]
fig = plt.figure(figsize=(7.09, 3.5))
gs = fig.add_gridspec(1, 2, width_ratios=[1, 1.25], wspace=0.28)
# (a) geometry
ax = fig.add_subplot(gs[0]); ax.set_aspect("equal"); ax.axis("off")
COL = {"N": "#2f4bd6", "O": "#d62f2f"}
pos = [(f["x"], f["y"], f["symbol"]) for f in frame]
for x, y, s in pos:
    ax.add_patch(Circle((x, y), wall, fc="none", ec=MUTED, lw=0.7, ls=(0, (3, 2)), zorder=1))
n = pos[0]
for x, y, s in pos[1:]: ax.plot([n[0], x], [n[1], y], color=INK2, lw=2.2, zorder=2, solid_capstyle="round")
for x, y, s in pos: ax.plot(x, y, "o", ms=15 if s == "N" else 15, color=COL[s], mec="white", mew=1.0, zorder=3); ax.text(x, y, s, color="white", ha="center", va="center", fontsize=7.5, fontweight="bold", zorder=4)
ax.plot([0, 0], [-1.45, 2.55], color=INK2, lw=0.7, ls=(0, (6, 3)), zorder=0); ax.text(0.04, 2.5, "mirror axis", fontsize=6.5, color=INK2, ha="left", va="top")
ax.plot(0, 0, "+", color=INK, ms=8, mew=1.1, zorder=5); ax.text(0.07, -0.12, "centre", fontsize=6.5, ha="left", va="top")
# wells and one example proton with theta and rho
named = {w["short"]: w for w in M["namedFull"]}
def xy(t, r): return r * np.sin(np.radians(t)), r * np.cos(np.radians(t))
for k, w in named.items():
    x, y = xy(th[w["i"]], rh[w["j"]]); ax.plot(x, y, WELL_MARK[k], ms=7.5, color=WELL[k], mec="white", mew=0.9, zorder=6)
    ax.plot(-x, y, WELL_MARK[k], ms=7.5, color=WELL[k], mec="white", mew=0.9, alpha=0.35, zorder=5)
    off = {"cis": (8, -9), "trans": (7, 4), "nitro": (7, 5)}[k]; ax.annotate(k, (x, y), xytext=off, textcoords="offset points", fontsize=7, color=WELL[k], fontweight="bold", zorder=7)
t0, r0 = 60.0, 1.7; px, py = xy(t0, r0)
ax.plot([0, px], [0, py], color="#e08a00", lw=1.0, zorder=5); ax.plot(px, py, "o", ms=6, color="#ffb000", mec=INK, mew=0.8, zorder=6); ax.text(px + 0.08, py + 0.05, "H+", fontsize=7, ha="left")
ax.plot([0, 0], [0, 1.0], color="#e08a00", lw=0.8, zorder=5)
ax.add_patch(Arc((0, 0), 1.2, 1.2, theta1=90 - t0, theta2=90, color="#e08a00", lw=0.9, zorder=5))
ax.text(0.28, 0.78, r"$\theta$", fontsize=9, color="#b36b00"); ax.text(px * 0.55 + 0.05, py * 0.5 - 0.22, r"$\rho$", fontsize=9, color="#b36b00")
ax.text(-1.95, -1.65, "dashed circles: 0.8 angstrom wall\nfaint markers: mirror images (not computed)\nThe frame never moves: this is a\nproton-position map, not a relaxed path.", fontsize=6.3, color=INK2, ha="left", va="top")
ax.set_xlim(-2.0, 2.1); ax.set_ylim(-2.35, 2.55)
ax.set_title("Frozen nitrite frame and one proton", loc="left", pad=3); panel(ax, "a", dx=-0.02)
# (b) point plan on the xTB map
bx = fig.add_subplot(gs[1])
bx.pcolormesh(th, rh, P["cheap"].T, cmap="viridis", vmin=0, vmax=100, shading="nearest", alpha=0.45, rasterized=True)
pts = d["runs"]["def2-svp"]["points"]
coarse = [(p["theta"], p["rho"]) for p in pts if p["theta"] % 10 == 0 and abs(p["rho"] * 10 - round(p["rho"] * 10)) < 1e-6]
cs = set(coarse); fine = [(p["theta"], p["rho"]) for p in pts if (p["theta"], p["rho"]) not in cs]
print(len(coarse), len(fine))
bx.scatter(*zip(*fine), s=3.2, color="#ffffff", edgecolor="#6d6c63", linewidth=0.3, zorder=3, label="fine level, %d points" % len(fine))
bx.scatter(*zip(*coarse), s=11, color=INK, edgecolor="white", linewidth=0.5, zorder=4, label="coarse level, %d points" % len(coarse))
for k, w in named.items():
    bx.plot(th[w["i"]], rh[w["j"]], WELL_MARK[k], ms=8, color=WELL[k], mec="white", mew=1.0, zorder=6)
    bx.annotate(k, (th[w["i"]], rh[w["j"]]), xytext=(5, 6), textcoords="offset points", fontsize=7, color="white", fontweight="bold", zorder=7, path_effects=[pe.withStroke(linewidth=1.8, foreground="#222")])
bx.text(100, 1.3, "wall\n(no point)", ha="center", va="center", fontsize=7, color=INK2)
bx.set_xlim(-3, 183); bx.set_ylim(0.97, 2.43); bx.set_xticks([0, 45, 90, 135, 180]); bx.set_xlabel("angle theta (degrees)"); bx.set_ylabel("distance rho (angstrom)")
bx.legend(loc="upper center", bbox_to_anchor=(0.5, -0.2), ncol=2, frameon=False, fontsize=6.8, markerscale=1.4)
bx.set_title("Planned points on the xTB map", loc="left", pad=3); panel(bx, "b", dx=-0.1)
save(fig, "fig2_system_and_plan")
