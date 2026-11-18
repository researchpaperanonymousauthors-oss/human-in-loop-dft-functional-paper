"""Paper B3: planned simulation points and the Skala run that fills them.

New code for Paper B3. It imports nothing from the Paper B1 or B2 code.

A system is a frozen molecular frame plus one moving proton. The proton position has two
coordinates: theta (degrees, the direction seen from the centre of the frame) and rho (angstrom,
the distance from that centre). The frame has a mirror plane, so only theta = 0..180 is computed
and the other half of the ring is the mirror image.

Two levels of points:
  level 1 (coarse): theta every 10 degrees, rho every 0.10 A. Every node that is not inside the "wall".
  level 2 (fine):   theta every 5 degrees,  rho every 0.05 A. Every node whose cheap (xTB) energy is
                    below CAP kcal/mol above the cheap minimum, so the zoom works anywhere in the
                    explorable region and the stored data do not give away where the features are.
The wall: nodes where the moving proton is closer than WALL angstrom to a frame atom are skipped.

Use
    python b3_points.py plan  hono                      # print the plan, no calculation
    python b3_points.py run   hono 1 def2-svp out_dir   # xTB, PBE and Skala on level 1 (resumable)
    python b3_points.py pack  hono out_dir              # write the JSON that the web page reads
Options by environment variable: B3_GPU=1 (Skala and PBE on the GPU), B3_WORKERS (CPU processes, default 2),
B3_THREADS (threads per process, default 2), B3_MAX_MIN (stop cleanly after this many minutes).
"""
import json
import os
import sys
import time

import numpy as np

BOHR = 0.52917721092
KCAL = 627.509474
WALL = 0.80      # angstrom: closest allowed distance between the moving proton and a frame atom
CAP = 60.0       # kcal/mol above the cheap minimum: the fine level covers everything below this
Z = {"H": 1, "C": 6, "N": 7, "O": 8}


def _frame(center, d, angle_deg, extra=()):
    """Symmetric O-A-O frame in the xy plane. The mirror axis is y. The origin is the centroid of O, A, O."""
    h = np.radians(angle_deg / 2)
    a = np.zeros(3); o1 = np.array([d * np.sin(h), -d * np.cos(h), 0.0]); o2 = o1 * np.array([-1.0, 1.0, 1.0])
    c = (a + o1 + o2) / 3
    return [(center, a - c), ("O", o1 - c), ("O", o2 - c)] + [(s, np.array(p, float) - c) for s, p in extra]


SYSTEMS = {
    # nitrous acid: a proton moving around a frozen nitrite frame. Wells: on N (HNO2), on O outside (trans-HONO), on O inside (cis-HONO).
    "hono": dict(title="Nitrous acid: one proton around a nitrite frame", charge=0,
                 frame=_frame("N", 1.24, 115.0), rho=(1.0, 2.4),
                 # named search windows for the wells (theta range, rho range); checked against the proton-to-atom distances
                 wells=[dict(short="cis", name="cis-HONO: proton on an O, toward the other O", theta=[120, 170], rho=[1.2, 1.8]),
                        dict(short="trans", name="trans-HONO: proton on an O, pointing away", theta=[60, 100], rho=[1.6, 2.2]),
                        dict(short="nitro", name="HNO2: proton on N", theta=[0, 20], rho=[1.2, 1.8])]),
    # formic acid: a proton moving around a frozen formate frame (the C-H stays in place).
    "formic": dict(title="Formic acid: one proton around a formate frame", charge=0,
                   frame=_frame("C", 1.25, 126.0, extra=[("H", (0.0, 1.10, 0.0))]), rho=(1.0, 2.6)),
}


def geometry(system, theta, rho):
    t = np.radians(theta)
    return SYSTEMS[system]["frame"] + [("H", np.array([rho * np.sin(t), rho * np.cos(t), 0.0]))]


def axes(system, level):
    lo, hi = SYSTEMS[system]["rho"]
    dt, dr = (10.0, 0.10) if level == 1 else (5.0, 0.05)
    return np.arange(0.0, 180.0 + 1e-9, dt), np.round(np.arange(lo, hi + 1e-9, dr), 2)


def outside_wall(system, theta, rho):
    g = geometry(system, theta, rho)
    return min(np.linalg.norm(g[-1][1] - p) for _, p in g[:-1]) >= WALL


def xtb_energy(system, theta, rho):
    from tblite.interface import Calculator
    g = geometry(system, theta, rho)
    c = Calculator("GFN2-xTB", np.array([Z[s] for s, _ in g]), np.array([p for _, p in g]) / BOHR, charge=SYSTEMS[system]["charge"])
    c.set("verbosity", 0)
    try:
        return float(c.singlepoint().get("energy"))
    except Exception:
        return float("nan")


def cheap_map(system, level=2):
    """xTB on every node of a level that is outside the wall. Returns theta, rho, E (hartree, nan inside the wall)."""
    th, rh = axes(system, level)
    E = np.array([[xtb_energy(system, t, r) if outside_wall(system, t, r) else np.nan for r in rh] for t in th])
    return th, rh, E


def plan(system, level):
    """The list of (theta, rho) that the expensive method must compute at this level."""
    th, rh = axes(system, level)
    if level == 1:
        return [(float(t), float(r)) for t in th for r in rh if outside_wall(system, t, r)]
    _, _, E = cheap_map(system, 2)
    rel = (E - np.nanmin(E)) * KCAL
    coarse = set(plan(system, 1))
    return [(float(t), float(r)) for i, t in enumerate(th) for j, r in enumerate(rh)
            if np.isfinite(rel[i, j]) and rel[i, j] <= CAP and (float(t), float(r)) not in coarse]


def _key(theta, rho):
    return f"{theta:.1f}_{rho:.2f}"


def _load_done(path):
    done = {}
    if os.path.exists(path):
        for line in open(path):
            try:
                d = json.loads(line); done[_key(d["theta"], d["rho"])] = d
            except Exception:
                pass
    return done


def _worker(args):
    system, basis, points, path, gpu, threads, deadline = args
    os.environ["OMP_NUM_THREADS"] = str(threads)
    import warnings
    warnings.filterwarnings("ignore")
    import torch
    torch.set_num_threads(threads)
    from pyscf import dft, gto, lib
    lib.num_threads(threads)
    if gpu:
        from skala.gpu4pyscf import SkalaKS
    else:
        from skala.pyscf import SkalaKS
    dm_s = dm_p = None
    for theta, rho in points:
        if deadline and time.time() > deadline:
            break
        g = geometry(system, theta, rho)
        mol = gto.M(atom="; ".join(f"{s} {p[0]:.10f} {p[1]:.10f} {p[2]:.10f}" for s, p in g), basis=basis,
                    charge=SYSTEMS[system]["charge"], verbose=0)
        rec = dict(system=system, basis=basis, theta=theta, rho=rho)
        t0 = time.time()
        try:
            mp = dft.RKS(mol); mp.xc = "pbe"; mp.conv_tol = 1e-9
            if gpu:
                mp = mp.to_gpu()
            ep = float(mp.kernel(dm0=dm_p)); okp = bool(mp.converged); dm_p = mp.make_rdm1(); dm_p = dm_p.get() if hasattr(dm_p, "get") else dm_p
        except Exception:
            ep, okp, dm_p = float("nan"), False, None
        rec.update(E_pbe=ep, pbe_converged=okp, pbe_seconds=round(time.time() - t0, 2))
        t0 = time.time()
        try:
            mf = SkalaKS(mol, xc="skala-1.1"); mf.conv_tol = 1e-9; mf.max_cycle = 100
            es = float(mf.kernel(dm0=dm_s)); oks = bool(mf.converged)
            if not oks:                                    # one retry from a fresh guess
                es = float(mf.kernel()); oks = bool(mf.converged)
            dm_s = mf.make_rdm1(); dm_s = dm_s.get() if hasattr(dm_s, "get") else dm_s
        except Exception as ex:
            es, oks, dm_s = float("nan"), False, None
            rec["skala_error"] = repr(ex)[:200]
        rec.update(E_skala=es, skala_converged=oks, skala_seconds=round(time.time() - t0, 2))
        with open(path, "a") as f:
            f.write(json.dumps(rec) + "\n")
    return True


def run(system, level, basis, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{system}_{basis}_points.jsonl")
    done = _load_done(path)
    todo = [p for p in plan(system, level) if _key(*p) not in done]
    gpu = os.environ.get("B3_GPU") == "1"
    workers = 1 if gpu else int(os.environ.get("B3_WORKERS", 2)); threads = int(os.environ.get("B3_THREADS", 2))
    max_min = float(os.environ.get("B3_MAX_MIN", 0)); deadline = time.time() + 60 * max_min if max_min else None
    print(f"{system} level {level} {basis}: {len(done)} points stored, {len(todo)} to compute, {workers} worker(s), gpu={gpu}", flush=True)
    if not todo:
        return
    # each worker walks whole theta rows, so the previous density is a good first guess for the next point
    rows = {}
    for t, r in todo:
        rows.setdefault(t, []).append((t, r))
    chunks = [[] for _ in range(workers)]
    for k, t in enumerate(sorted(rows)):
        row = sorted(rows[t], key=lambda p: p[1], reverse=bool(k % 2))
        chunks[k % workers] += row
    args = [(system, basis, c, path, gpu, threads, deadline) for c in chunks if c]
    if len(args) == 1:
        _worker(args[0])
    else:
        import multiprocessing as mp
        with mp.get_context("spawn").Pool(len(args)) as pool:
            pool.map(_worker, args)
    left = len([p for p in plan(system, level) if _key(*p) not in _load_done(path)])
    print(f"finished this pass: {left} points still to compute", flush=True)


def pack(system, out_dir, basis=None):
    """Write <system>.json for the web page: the cheap map on the fine grid and every stored expensive energy."""
    th, rh, E = cheap_map(system, 2)
    data = dict(system=system, title=SYSTEMS[system]["title"], cheap_method="GFN2-xTB", wall=WALL, cap=CAP,
                frame=[dict(symbol=s, x=round(float(p[0]), 5), y=round(float(p[1]), 5)) for s, p in SYSTEMS[system]["frame"]],
                wells=SYSTEMS[system].get("wells", []),
                theta=[float(t) for t in th], rho=[float(r) for r in rh],
                cheap_hartree=[[None if not np.isfinite(v) else round(float(v), 8) for v in row] for row in E], runs={})
    for name in sorted(os.listdir(out_dir)):
        if name.startswith(system + "_") and name.endswith("_points.jsonl") and (basis is None or f"_{basis}_" in name):
            b = name[len(system) + 1:-len("_points.jsonl")]
            recs = sorted(_load_done(os.path.join(out_dir, name)).values(), key=lambda d: (d["theta"], d["rho"]))
            data["runs"][b] = dict(method="Skala-1.1", basis=b, points=[
                dict(theta=d["theta"], rho=d["rho"], skala=d["E_skala"] if d["skala_converged"] else None,
                     pbe=d["E_pbe"] if d["pbe_converged"] else None, seconds=d["skala_seconds"]) for d in recs])
    out = os.path.join(out_dir, f"{system}.json")
    json.dump(data, open(out, "w"))
    print("wrote", out, {b: len(r["points"]) for b, r in data["runs"].items()})


if __name__ == "__main__":
    cmd, system = sys.argv[1], sys.argv[2]
    if cmd == "plan":
        for level in (1, 2):
            th, rh = axes(system, level)
            print(f"{system} level {level}: grid {len(th)} x {len(rh)} = {len(th) * len(rh)} nodes, {len(plan(system, level))} points to compute")
    elif cmd == "run":
        run(system, int(sys.argv[3]), sys.argv[4], sys.argv[5])
    elif cmd == "pack":
        pack(system, sys.argv[3])
