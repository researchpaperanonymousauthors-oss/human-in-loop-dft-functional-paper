"""Figure 1 (fig0_concept): concept schematic, built exactly from schematic_plan.md. Vector only; coordinates are inches."""
from common import *
from matplotlib.patches import FancyBboxPatch, Ellipse, PathPatch, Rectangle, Circle, Polygon, FancyArrowPatch
from matplotlib.path import Path
style()
W, H = 7.09, 3.80
fig = plt.figure(figsize=(W, H)); ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
BLUE = WELL["cis"]; AMBER = "#ffb000"
def box(x, y, w, h, fc):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.06", fc=fc, ec=INK2, lw=0.8, zorder=1))
def T(x, y, s, size=6.3, color=INK2, weight="normal", ha="left", style_="normal", rot=0, z=6):
    return ax.text(x, y, s, fontsize=size, color=color, fontweight=weight, ha=ha, va="center", style=style_, rotation=rot, zorder=z)
def badge(n, x, y):
    ax.add_patch(Circle((x, y), 0.085, fc=BLUE, ec="white", lw=0.5, zorder=8)); ax.text(x, y, str(n), color="white", fontsize=6.5, fontweight="bold", ha="center", va="center", zorder=9)
# boxes
box(0.10, 1.02, 3.90, 2.70, "white"); T(0.22, 3.58, "Energy map: xTB, corrected where Skala is revealed", 7, INK, "bold")
box(4.26, 2.50, 2.73, 1.22, "#e7f1fb"); badge(4, 4.26 + 0.185, 3.58); T(4.26 + 0.33, 3.58, "Suggest: next points, up to four", 7, INK, "bold")
box(4.26, 1.64, 2.73, 0.68, "#e5f4e4"); badge(3, 4.26 + 0.185, 2.19); T(4.26 + 0.33, 2.19, "Update: estimate so far", 7, INK, "bold")
box(4.26, 1.02, 2.73, 0.50, "white"); T(4.38, 1.40, "Controls", 7, INK, "bold")
box(0.10, 0.08, 2.20, 0.72, "#fbeed4"); badge(2, 0.10 + 0.185, 0.66); T(0.10 + 0.33, 0.66, "Reveal: replay mode", 7, INK, "bold")
box(2.50, 0.08, 4.49, 0.72, GRID); badge(5, 2.50 + 0.185, 0.66); T(2.50 + 0.33, 0.66, "Log: session log, downloadable (JSON)", 7, INK, "bold")
# bodies
T(4.38, 2.71, "Simple rules. You may ignore them", 6); T(4.38, 2.59, "and click the map instead.", 6)
T(4.38, 2.03, "Map = xTB + GP fit of (Skala − xTB)"); T(4.38, 1.895, "Barrier = lowest pass between two named wells"); T(4.38, 1.76, "Skala energies revealed: 5 of 40")
T(4.38, 1.26, "Mode: Click a point | Zoom box (up to 12 points)"); T(4.38, 1.125, "Show every stored Skala point | Start again")
T(0.22, 0.47, "665 Skala-1.1/def2-SVP energies"); T(0.22, 0.32, "stored in advance; a click reveals one")
T(2.62, 0.47, "Each revealed point: number, seconds, how it was chosen (free click,"); T(2.62, 0.32, "suggestion, zoom box), angle, distance, energy, barrier estimate, suggestions on offer.")
# suggest rows
rend = fig.canvas.get_renderer()
rows = [(3.36, "Pass guess", "top of the lowest path"), (3.195, "Unmeasured well: nitro", "no energy there yet"), (3.03, "Most uncertain", "estimate least certain"), (2.865, "Lowest unmeasured", "lowest estimate left")]
for k, (y, tag, why) in enumerate(rows, 1):
    ax.add_patch(Rectangle((4.38, y - 0.065), 0.13, 0.13, fc=AMBER, ec=INK, lw=0.6, zorder=6)); ax.text(4.445, y, str(k), fontsize=5.5, fontweight="bold", ha="center", va="center", zorder=7, color=INK)
    t = T(4.58, y, tag, 6.3, INK, "bold"); bb = t.get_window_extent(rend).transformed(ax.transData.inverted()); T(bb.x1 + 0.05, y, why, 6.3)
# map sketch
ax.plot([0.48, 0.48, 3.86], [3.40, 1.36, 1.36], color=INK2, lw=0.6, zorder=3, solid_capstyle="round")
T(0.50, 1.25, "proton angle", 6); T(0.36, 2.38, "proton distance", 6, ha="center", rot=90)
for (cx, cy, w, h, lab, lx, ly, key) in [(0.95, 2.00, 0.84, 0.80, "nitro", 0.95, 1.50, "nitro"), (1.90, 2.72, 0.92, 0.72, "trans", 1.72, 3.18, "trans"), (3.20, 2.05, 1.04, 0.86, "cis", 3.48, 1.56, "cis")]:
    for sc, fc in ((1, "#f4f3f0"), (2 / 3, GRID), (1 / 3, "#cfcec7")): ax.add_patch(Ellipse((cx, cy), w * sc, h * sc, fc=fc, ec=MUTED, lw=0.5, zorder=2))
    T(lx, ly, lab, 6.8, WELL[key], "bold", ha="center")
ax.add_patch(PathPatch(Path([(3.20, 2.05), (2.75, 3.45), (1.90, 2.72)], [Path.MOVETO, Path.CURVE3, Path.CURVE3]), fc="none", ec=INK, lw=0.9, ls=(0, (3, 2)), zorder=4))
ax.add_patch(Rectangle((2.18, 2.76), 0.52, 0.42, fc="none", ec=BLUE, lw=0.8, ls=(0, (3, 2)), zorder=4)); T(2.72, 3.25, "zoom box", 6, BLUE, ha="right")
for (x, y) in [(3.20, 2.05), (3.06, 2.42), (2.98, 1.86), (3.60, 3.02)]: ax.add_patch(Circle((x, y), 0.05, fc="white", ec=INK, lw=0.8, zorder=5))
for k, (x, y) in enumerate([(2.44, 2.97), (0.95, 2.00), (0.85, 3.05), (3.40, 1.90)], 1):
    ax.add_patch(Rectangle((x - 0.065, y - 0.065), 0.13, 0.13, fc=AMBER, ec=INK, lw=0.6, zorder=6)); ax.text(x, y, str(k), fontsize=5.5, fontweight="bold", ha="center", va="center", zorder=7, color=INK)
ax.add_patch(Circle((1.90, 2.72), 0.075, fc="white", ec=BLUE, lw=1.4, zorder=6))
cur = np.array([(0, 0), (0, -.17), (.04, -.13), (.07, -.195), (.097, -.182), (.067, -.118), (.12, -.118)]) + np.array([1.915, 2.705])
ax.add_patch(Polygon(cur, closed=True, fc=INK, ec="white", lw=0.5, zorder=9))
badge(1, 2.16, 2.40); T(2.27, 2.40, "Click", 7, BLUE, "bold")
# legend
ax.add_patch(Circle((1.84, 1.19), 0.05, fc="white", ec=INK, lw=0.8, zorder=5)); T(1.93, 1.19, "revealed", 6)
ax.add_patch(Rectangle((2.40 - 0.0, 1.19 - 0.065), 0.13, 0.13, fc=AMBER, ec=INK, lw=0.6, zorder=6)); T(2.58, 1.19, "suggested", 6)
ax.plot([3.08, 3.28], [1.19, 1.19], color=INK, lw=0.9, ls=(0, (3, 2)), zorder=5); T(3.32, 1.19, "lowest path", 6)
# loop arrows
def arrow(p, q, color=INK, lw=0.9): ax.add_patch(FancyArrowPatch(p, q, arrowstyle="-|>", mutation_scale=7, color=color, lw=lw, zorder=7, shrinkA=0, shrinkB=0))
arrow((1.60, 0.80), (1.81, 2.63)); T(1.82, 1.75, "one Skala energy", 6, ha="left", style_="italic")
arrow((4.00, 1.98), (4.26, 1.98)); arrow((5.62, 2.32), (5.62, 2.50)); arrow((4.26, 3.11), (4.00, 3.11), BLUE, 1.1); T(4.13, 2.545, "repeat, up to 40", 6, BLUE, ha="center", rot=90, z=9)
arrow((3.30, 1.02), (3.30, 0.80))
save(fig, "fig0_concept")
fig.savefig(os.path.join(OUT, "fig_schematic.svg"), bbox_inches="tight", facecolor="white")
