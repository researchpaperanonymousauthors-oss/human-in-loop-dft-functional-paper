"""Figure 5: click strategies compared (simulated clickers)."""
from common import *
style()
S = load_sim(); ref = S["refBar"]; cheap_err = abs(S["cheapBar"] - ref)
order_names = ["wells_then_pass", "uncertainty_only", "random", "spread", "pass_only"]
ks = np.arange(1, 31)
fig, (ax, bx) = plt.subplots(1, 2, figsize=(7.09, 3.1), gridspec_kw=dict(width_ratios=[1.35, 1], wspace=0.28))
res = {}
for name in order_names:
    lab, col, ls, mk = STRAT[name]; runs = S["runs"][name]
    err = np.array([[abs(b - ref) for b in r["bar"]] for r in runs]); ok = np.array([r["ok"] for r in runs], float)
    q25, med, q75 = np.percentile(err, [25, 50, 75], axis=0); res[name] = (med, ok.mean(axis=0))
    focus = name in ("wells_then_pass", "pass_only")
    if focus: ax.fill_between(ks, q25, q75, color=col, alpha=0.16, lw=0, zorder=1)
    ax.plot(ks, med, color=col, ls=ls, lw=1.8 if focus else 1.2, marker=mk, ms=3.6, markevery=[4, 9, 19, 29], mfc=col if mk != "x" else None, zorder=3 if focus else 2, label=lab)
    bx.plot(ks, ok.mean(axis=0) * 100, color=col, ls=ls, lw=1.8 if focus else 1.2, marker=mk, ms=3.6, markevery=[4, 9, 19, 29], zorder=3 if focus else 2)
ax.axhspan(0, 1, color="#e5f4e4", zorder=0); ax.text(29.6, 0.5, "within 1 kcal/mol", fontsize=6.5, va="center", ha="right", color=INK2)
ax.axhline(cheap_err, color=INK, lw=0.9, ls=(0, (2, 2))); ax.text(29.6, cheap_err + 0.35, "cheap map alone, %.1f" % cheap_err, fontsize=6.5, va="bottom", ha="right", color=INK)
for k in (5, 10, 20): ax.axvline(k, color=GRID, lw=0.6, zorder=0)
ax.set_xlim(1, 30); ax.set_ylim(0, 15); ax.set_xlabel("number of clicks"); ax.set_ylabel("|error| of the cis to trans pass (kcal/mol)")
ax.set_title("Error of the barrier estimate", loc="left", pad=3); panel(ax, "a", dx=-0.1)
h, l = ax.get_legend_handles_labels(); fig.legend(h, l, loc="lower center", ncol=5, frameon=False, fontsize=6.8, handlelength=2.6, columnspacing=1.3, bbox_to_anchor=(0.5, -0.07))
bx.set_xlim(1, 30); bx.set_ylim(0, 100); bx.set_xlabel("number of clicks"); bx.set_ylabel("starts with the right well order (%)")
for k in (5, 10, 20): bx.axvline(k, color=GRID, lw=0.6, zorder=0)
bx.set_title("Well order cis < trans < nitro, as with all points", loc="left", pad=3); panel(bx, "b", dx=-0.17)
fig.text(0.5, 1.0, "Simulated clickers, 40 seeded starts per click rule; line = median, band = 25th to 75th percentile (two focus strategies)", ha="center", va="bottom", fontsize=7, color=INK2)
save(fig, "fig5_strategies")
# numbers for the caption / check against Table 1
for n in order_names:
    med, okf = res[n]; print(n, [round(float(med[k - 1]), 1) for k in (5, 10, 20)], [int(round(okf[k - 1] * 40)) for k in (5, 10, 20)])
