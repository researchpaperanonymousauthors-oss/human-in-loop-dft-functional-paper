# Skala map explorer (replay mode)

An interactive web explorer for human-steered sampling of Skala energy maps, with the code, the stored energies and the scripts that reproduce the numbers of the paper "An interactive web explorer for human-steered sampling of Skala energy maps".

**Replay mode.** All 665 Skala-1.1 / def2-SVP energies of the example (one proton around a nitrite frame) were computed in advance and are stored here. A click reveals one stored value. No quantum-chemistry calculation runs in the browser. The clickers on the demo and comparison pages are simulated by fixed rules, not people.

## What is in this folder

| Folder or file | What it is |
|---|---|
| `index.html` | opens `site/index.html` (so that GitHub Pages works from the repository root) |
| `site/` | the web pages: landing, auto-play demo, two explorer pages, comparison, reproduce |
| `compute/b3_points.py` | point plan and the Skala, PBE and xTB run that produced the energies |
| `data/` | the 665 stored records (one JSON line each) |
| `figures/` | scripts and outputs of the paper's figures, and `check_numbers.py` |
| `tools/` | builds the data scripts and pages, and this package |
| `tests/` | page tests (Playwright) |
| `LICENSE`, `LICENSE-DATA`, `CITATION.cff`, `requirements.txt`, `check.sh` | licences, citation, versions, one-command check |

## Publish it as a web page (GitHub Pages), no command line needed

1. On github.com, create a **new public repository** (any name, for example `skala-map-explorer`). Leave it empty.
2. On its page click **uploading an existing file**.
3. Unzip this package on your computer and drag **the contents of the folder** (not the folder itself) into the browser window. GitHub accepts up to 100 files per upload; this package has fewer.
4. Click **Commit changes**.
5. Open **Settings**, then **Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and Save.
6. After a minute or two the page is at `https://<your-user-name>.github.io/<repository-name>/`. It opens the landing page automatically.

The site uses only relative links and no external services, so it also works from a sub-folder, and by double-clicking `site/index.html` on your own computer.

## Search engines

Every page carries `<meta name="robots" content="noindex, nofollow, noarchive">`, and `robots.txt` asks crawlers to stay away. This asks search engines not to list the site; it does not make it private. Anyone with the link can open it. (`robots.txt` is only read by crawlers when it sits at the top of a web address, so on a project page such as `user.github.io/repository/` the meta tag does the work. To remove both, delete the tag in `tools/build_pages.js` and run `node tools/build_pages.js`.)

## Reproduce

```
bash check.sh                          # fresh pages and data, 0 mismatches in check_numbers.py, page tests
node tools/build_site_data.js          # rebuild site/data/*.js (needs figures/data/simulation.json)
node tools/build_pages.js              # rebuild the six pages from tools/src
python3 figures/check_numbers.py       # every number of the paper
```
Re-running the Skala energies themselves needs Skala 2026.9 and PySCF 2.14.0 (`requirements.txt`) and about 10 worker-hours on a CPU: see the header of `compute/b3_points.py`.

## Licences

Code: MIT (`LICENSE`; the bundled Plotly.js keeps its own MIT notice). Data and figures: CC BY 4.0 (`LICENSE-DATA`).

## Cite

See `CITATION.cff`. The paper: AUTHORS, "An interactive web explorer for human-steered sampling of Skala energy maps", Croatica Chemica Acta (in preparation).
