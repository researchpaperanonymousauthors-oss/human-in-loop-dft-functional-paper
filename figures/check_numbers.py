"""Compute every number used in the figure captions from the data and compare it with the manuscript draft v1 (values typed below)."""
from common import *
P = load_points(); M = load_maps(); S = load_sim()
th, rh, cheap, sk, pb = P["theta"], P["rho"], P["cheap"], P["sk"], P["pb"]
m40 = np.isfinite(sk) & np.isfinite(cheap) & (sk < 40); off = float(np.mean((sk - cheap)[m40])); mae_x = float(np.mean(np.abs(sk - cheap - off)[m40]))
mp = m40 & np.isfinite(pb); offp = float(np.mean((sk - pb)[mp])); mae_p = float(np.mean(np.abs(sk - pb - offp)[mp]))
rec = [json.loads(l) for l in open(os.path.join(ROOT, "data", "hono_def2-svp_points.jsonl"))]; t = np.array([r["skala_seconds"] for r in rec])
nm = {w["short"]: w["E"] for w in M["namedFull"]}; nc = {w["short"]: w["E"] for w in M["namedCheap"]}
def pbw(w):
    t0, t1 = w["theta"]; r0, r1 = w["rho"]; mk = (th[:, None] >= t0) & (th[:, None] <= t1) & (rh[None, :] >= r0) & (rh[None, :] <= r1); return float(np.nanmin(np.where(mk, pb, np.nan)))
pbv = {w["short"]: pbw(w) for w in P["wells"]}
ref = S["refBar"]; med = lambda n, k: float(np.median([abs(r["bar"][k - 1] - ref) for r in S["runs"][n]]))
checks = [  # (name, computed, manuscript value, tolerance)
 ("all 665 stored", int(np.isfinite(sk).sum()), 665, 0), ("Skala converged", len(rec), 665, 0), ("PBE converged", int(np.isfinite(pb).sum()), 663, 0),
 ("pass, all points", M["barFull"], 43.0, 0.05), ("pass, coarse only", M["barCoarse"], 41.7, 0.05), ("pass, xTB alone", M["barCheap"], 34.4, 0.05),
 ("trans well, Skala", nm["trans"], 4.4, 0.05), ("nitro well, Skala", nm["nitro"], 8.5, 0.05), ("trans well, xTB", nc["trans"], 9.5, 0.05), ("nitro well, xTB", nc["nitro"], 5.2, 0.05),
 ("trans well, PBE", pbv["trans"], 5.4, 0.05), ("nitro well, PBE", pbv["nitro"], 3.7, 0.05),
 ("n below 40", int(m40.sum()), 306, 0), ("xTB mean offset", off, 2.9, 0.05), ("xTB MAE after offset", mae_x, 4.6, 0.05), ("PBE MAE after offset", mae_p, 3.0, 0.05),
 ("median s", float(np.median(t)), 51, 0.5), ("mean s", float(t.mean()), 54, 0.5), ("max s", float(t.max()), 150, 0.5), ("worker-hours", float(t.sum() / 3600), 10.0, 0.05),
 ("cheap map error", abs(S["cheapBar"] - ref), 8.7, 0.05),
 ("random median@10", med("random", 10), 3.3, 0.05), ("pass_only median@10", med("pass_only", 10), 10.5, 0.05), ("uncertain median@10", med("uncertainty_only", 10), 4.2, 0.05), ("wells-first median@10", med("wells_then_pass", 10), 0.9, 0.05),
]
tab = {"random": ([4.0, 3.3, 1.8], [10, 25, 33]), "spread": ([4.4, 3.9, 3.0], [15, 30, 38]), "pass_only": ([9.2, 10.5, 12.8], [2, 2, 5]), "uncertainty_only": ([3.1, 4.2, 3.9], [16, 35, 31]), "wells_then_pass": ([1.4, 0.9, 0.9], [31, 31, 31])}
for n, (meds, oks) in tab.items():
    for k, mv, ov in zip((5, 10, 20), meds, oks):
        checks.append(("Table 2 %s median@%d" % (n, k), med(n, k), mv, 0.05)); checks.append(("Table 2 %s order@%d" % (n, k), sum(r["ok"][k - 1] for r in S["runs"][n]), ov, 0))
bad = 0
for name, val, ms, tol in checks:
    ok = abs(val - ms) <= tol + 1e-9; bad += (not ok); print("%-34s computed %9.3f  manuscript %8.2f  %s" % (name, val, ms, "ok" if ok else "MISMATCH"))
print("\n%d checks, %d mismatches" % (len(checks), bad))
import sys
sys.exit(1 if bad else 0)
