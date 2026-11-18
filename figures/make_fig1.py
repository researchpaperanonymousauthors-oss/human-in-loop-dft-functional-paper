"""Figure 1: the tool. (a) the click loop, (b) the page after 10 clicks with numbered parts."""
from common import *
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
import matplotlib.image as mpimg
style()
B = json.load(open(os.path.join(HERE, "data", "page_boxes.json")))["boxes"]
img = mpimg.imread(os.path.join(HERE, "data", "page_after10.png")); sc = img.shape[1] / 1280.0   # pixels per CSS px
x0, x1, y0 = 60, 1225, 8; y1 = int(B["log"]["y"] + B["log"]["h"] + 14)
crop = img[int(y0 * sc):int(y1 * sc), int(x0 * sc):int(x1 * sc)]
fig = plt.figure(figsize=(7.09, 6.0))
gs = fig.add_gridspec(1, 2, width_ratios=[0.78, 1], wspace=0.02)
# (a) loop
ax = fig.add_subplot(gs[0]); ax.set_xlim(0, 12); ax.set_ylim(-0.4, 20); ax.axis("off")
boxes = [(16.0, 3.4, "Cheap map", "GFN2-xTB estimate\nof every node", "#eceae4"),
         (11.0, 3.4, "Person clicks a point", "or takes one of the\nfour suggestions", "#e7f1fb"),
         (5.4, 4.2, "Page reveals one\nSkala energy", "REPLAY MODE: looked up in\n665 energies computed\nin advance", "#fbeed4"),
         (0.9, 3.4, "Estimate updates", "map correction, wells,\npass and new suggestions", "#e5f4e4")]
for k, (y, h, t, sub, fc) in enumerate(boxes):
    ax.add_patch(FancyBboxPatch((0.15, y), 7.7, h, boxstyle="round,pad=0.02,rounding_size=0.25", fc=fc, ec=INK2, lw=0.8))
    ax.text(4.0, y + h - 0.35, t, ha="center", va="top", fontsize=7.2, fontweight="bold", linespacing=1.15)
    ax.text(4.0, y + 0.3, sub, ha="center", va="bottom", fontsize=5.9, color=INK2, linespacing=1.2)
for ya, yb in ((16.0, 14.5), (11.0, 9.7), (5.4, 4.5)):
    ax.add_patch(FancyArrowPatch((4.0, ya), (4.0, yb), arrowstyle="-|>", mutation_scale=9, color=INK, lw=1.0))
ax.add_patch(FancyArrowPatch((7.9, 2.6), (7.9, 12.6), connectionstyle="arc3,rad=0.5", arrowstyle="-|>", mutation_scale=9, color="#2a78d6", lw=1.3))
ax.text(11.2, 7.6, "repeat up to 40 times", rotation=90, ha="center", va="center", fontsize=6.5, color="#2a78d6")
ax.text(4.0, 0.45, "Every click goes to a session log", ha="center", va="top", fontsize=6.0, color=INK2, style="italic")
ax.set_title(" ", pad=3); panel(ax, "a", dx=0.0, dy=0.985)
# (b) screenshot with callouts
bx = fig.add_subplot(gs[1]); bx.imshow(crop, extent=[x0, x1, y1, y0], interpolation="lanczos"); bx.axis("off")
def badge(n, x, y):
    bx.add_patch(Circle((x, y), 30, fc="#0b0b0b", ec="white", lw=1.2, zorder=5)); bx.text(x, y, str(n), color="white", ha="center", va="center", fontsize=6.5, fontweight="bold", zorder=6)
badge(1, B["map"]["x"] + B["map"]["w"] - 30, B["map"]["y"] + B["map"]["h"] - 30)
badge(2, B["sugg"]["x"] + B["sugg"]["w"] - 26, B["sugg"]["y"] + 26)
badge(3, B["est"]["x"] + B["est"]["w"] - 26, B["est"]["y"] + 26)
badge(4, B["log"]["x"] + B["log"]["w"] - 26, B["log"]["y"] + 4)
badge(5, 800, 150)
bx.set_xlim(x0, x1); bx.set_ylim(y1, y0); panel(bx, "b", dx=0.0, dy=0.995)
import textwrap
note = ("Parts of the page in (b): 1 map, the xTB estimate corrected by the revealed points (white circles); orange squares are suggestions. 2 up to four suggestions that the person may ignore. "
        "3 barrier estimate between two named wells. 4 session log with time, how the point was chosen, angle, distance, energy and barrier estimate. 5 the page states that it is in replay mode.")
fig.text(0.01, 0.0, "\n".join(textwrap.wrap(note, 150)), fontsize=6.3, color=INK2, ha="left", va="top", linespacing=1.5)
save(fig, "fig1_tool")
