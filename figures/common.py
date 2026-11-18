"""Shared helpers for the Paper B3 figures. Reads only files in Paper_B3_idea/ (data/hono.json from the page,
figures/data/maps.json and figures/data/simulation.json written by export_maps.js and make_simulation.js)."""
import json, os, heapq
import numpy as np
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
KCAL = 627.509474
OUT = HERE

# colours: validated with dataviz validate_palette.js (wells: all-pairs pass; strategies: pass with line style + marker as secondary encoding)
INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#8a897f", "#e4e3de"
WELL = {"cis": "#2a78d6", "trans": "#eb6834", "nitro": "#1baf7a"}
WELL_MARK = {"cis": "o", "trans": "s", "nitro": "^"}
STRAT = {  # name: (label, colour, linestyle, marker)
    "wells_then_pass": ("Wells first, then pass", "#2a78d6", "-", "o"),
    "pass_only": ("Pass suggestion only", "#e34948", (0, (5, 2)), "s"),
    "uncertainty_only": ("Most uncertain only", "#008300", (0, (5, 1.5, 1, 1.5)), "^"),
    "random": ("Random clicks", "#52514e", (0, (1, 1.5)), "D"),
    "spread": ("Spread (farthest point)", "#9a998f", (0, (8, 3)), "x"),
}
DIV = LinearSegmentedColormap.from_list("div", ["#2a78d6", "#f0efec", "#eb6834"])

def style():
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 7.5, "axes.labelsize": 7.5, "axes.titlesize": 8, "xtick.labelsize": 7, "ytick.labelsize": 7,
        "legend.fontsize": 7, "axes.edgecolor": INK2, "axes.linewidth": 0.6, "xtick.color": INK2, "ytick.color": INK2, "axes.labelcolor": INK, "text.color": INK,
        "xtick.major.width": 0.6, "ytick.major.width": 0.6, "xtick.major.size": 2.5, "ytick.major.size": 2.5, "figure.dpi": 150, "savefig.dpi": 300,
        "axes.spines.top": False, "axes.spines.right": False, "pdf.fonttype": 42})

def save(fig, name):
    fig.savefig(os.path.join(OUT, name + ".png"), dpi=300, bbox_inches="tight", facecolor="white")
    fig.savefig(os.path.join(OUT, name + ".pdf"), bbox_inches="tight", facecolor="white")
    print("saved", name)

def panel(ax, letter, dx=-0.02, dy=1.02):
    ax.text(dx, dy, letter, transform=ax.transAxes, fontsize=9, fontweight="bold", va="bottom", ha="right")

def load_points():
    d = json.load(open(os.path.join(ROOT, "site", "data", "hono.json")))
    th, rh = np.array(d["theta"]), np.array(d["rho"])
    nT, nR = len(th), len(rh)
    cheap = np.array([[np.nan if v is None else v * KCAL for v in r] for r in d["cheap_hartree"]]); cheap -= np.nanmin(cheap)
    sk = np.full((nT, nR), np.nan); pb = np.full((nT, nR), np.nan); sec = np.full((nT, nR), np.nan)
    for p in d["runs"]["def2-svp"]["points"]:
        i = int(np.argmin(abs(th - p["theta"]))); j = int(np.argmin(abs(rh - p["rho"])))
        if p["skala"] is not None: sk[i, j] = p["skala"] * KCAL
        if p["pbe"] is not None: pb[i, j] = p["pbe"] * KCAL
        sec[i, j] = p["seconds"]
    sk -= np.nanmin(sk); pb -= np.nanmin(pb)
    return dict(theta=th, rho=rh, cheap=cheap, sk=sk, pb=pb, seconds=sec, wells=d["wells"], frame=d["frame"], wall=d["wall"])

def load_maps(): return json.load(open(os.path.join(HERE, "data", "maps.json")))
def load_sim(): return json.load(open(os.path.join(HERE, "data", "simulation.json")))

def arr(m): return np.array([[np.nan if v is None else v for v in r] for r in m], float)

def minimax_path(est, a, b):
    """Lowest possible highest point on a four-neighbour grid path from a to b; returns height and the path (list of (i, j))."""
    nT, nR = est.shape; best = np.full(est.shape, np.inf); par = {}
    best[a] = est[a]; heap = [(est[a], a)]
    while heap:
        h, (i, j) = heapq.heappop(heap)
        if h > best[i, j]: continue
        if (i, j) == b: break
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p, q = i + di, j + dj
            if p < 0 or q < 0 or p >= nT or q >= nR or not np.isfinite(est[p, q]): continue
            nh = max(h, est[p, q])
            if nh < best[p, q] - 1e-12: best[p, q] = nh; par[(p, q)] = (i, j); heapq.heappush(heap, (nh, (p, q)))
    path = [b]
    while path[-1] != a: path.append(par[path[-1]])
    return best[b], path[::-1]
