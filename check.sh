#!/usr/bin/env bash
# One-command check: pages and data are fresh, every number matches, page tests pass. Run from this folder.
set -e
cd "$(dirname "$0")"
node tools/build_site_data.js --check
node tools/build_pages.js --check
python3 figures/check_numbers.py | tail -2
node figures/replay_wells_first.js > /dev/null && echo "replay analysis of the well order runs"
node tests/run_tests.js
echo "ALL CHECKS PASSED"
