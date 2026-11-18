# Schematic plan (new Figure 1)

**1. Message.** One click on the cheap xTB map reveals one stored Skala energy; the page then updates its estimate, suggests next points and logs the choice.

**2. Canvas.** `make_fig0.py` writes `fig0_concept.png/.pdf`. `from common import *; style()`. Figure 7.09 x 3.80 in; one axes `[0,0,1,1]`, xlim 0-7.09, ylim 0-3.80, axis off, so coordinates are inches. Boxes: `FancyBboxPatch`, `round,pad=0,rounding_size=0.06`, edge INK2 0.8. Titles 7 pt bold INK; body 6.3 pt INK2; labels 6 pt. Text left-aligned, va center, at box x+0.12; badged titles (Suggest, Update, Reveal, Log): badge at x+0.185, title at x+0.33.

Boxes (x,y,w,h; fill; title (y); body (y)):
**Map** 0.10,1.02,3.90,2.70; white; "Energy map: xTB, corrected where Skala is revealed" (3.58).  
**Suggest** 4.26,2.50,2.73,1.22; #e7f1fb; "Suggest: next points, up to four" (3.58); 6 pt note (2.71, 2.59): "Simple rules. You may ignore them"; "and click the map instead."  
**Update** 4.26,1.64,2.73,0.68; #e5f4e4; "Update: estimate so far" (2.19); (2.03, 1.895, 1.76): "Map = xTB + GP fit of (Skala − xTB)"; "Barrier = lowest pass between two named wells"; "Skala energies revealed: 5 of 40".  
**Controls** 4.26,1.02,2.73,0.50; white; "Controls" (1.40); (1.26, 1.125): "Mode: Click a point | Zoom box (up to 12 points)"; "Show every stored Skala point | Start again".  
**Reveal** 0.10,0.08,2.20,0.72; #fbeed4; "Reveal: replay mode" (0.66); (0.47, 0.32): "665 Skala-1.1/def2-SVP energies"; "stored in advance; a click reveals one".  
**Log** 2.50,0.08,4.49,0.72; GRID; "Log: session log, downloadable (JSON)" (0.66); (0.47, 0.32): "Each revealed point: number, seconds, how it was chosen (free click,"; "suggestion, zoom box), angle, distance, energy, barrier estimate, suggestions on offer."  

Suggest rows (y 3.36, 3.195, 3.03, 2.865): numbered #ffb000 square (0.13, from x 4.38), bold INK tag at x 4.58 (verbatim), INK2 reason 0.05 after it:
1 **Pass guess** top of the lowest path
2 **Unmeasured well: nitro** no energy there yet
3 **Most uncertain** estimate least certain
4 **Lowest unmeasured** lowest estimate left

**3. Map sketch (patches only, no raster).**
Axes: polyline (0.48,3.40)-(0.48,1.36)-(3.86,1.36), INK2 0.6, no ticks; "proton angle" (0.50,1.25); "proton distance" rotated, centred (0.36,2.38).  
Wells: three concentric `Ellipse` each (scales 1, 2/3, 1/3; fills #f4f3f0, GRID, #cfcec7; edge MUTED 0.5). nitro (0.95,2.00), 0.84x0.80, label (0.95,1.50); trans (1.90,2.72), 0.92x0.72, label (1.72,3.18); cis (3.20,2.05), 1.04x0.86, label (3.48,1.56). Labels 6.8 pt bold, WELL colours.  
Path: `PathPatch`, quadratic Bezier (3.20,2.05), control (2.75,3.45), (1.90,2.72); INK 0.9, dashes (3,2).  
Zoom box: Rectangle (2.18,2.76), 0.52x0.42, blue dashed 0.8; blue "zoom box" right-aligned (2.72,3.25).  
Revealed: white circles r 0.05, INK edge 0.8: (3.20,2.05), (3.06,2.42), (2.98,1.86), (3.60,3.02).  
Suggestions: #ffb000 squares 0.13, INK edge 0.6, numeral 5.5 pt bold: 1 (2.44,2.97); 2 (0.95,2.00); 3 (0.85,3.05); 4 (3.40,1.90).  
Click: white circle r 0.075, blue edge 1.4, (1.90,2.72). Cursor: INK polygon, white edge 0.5, tip (1.915,2.705), offsets (0,0),(0,-.17),(.04,-.13),(.07,-.195),(.097,-.182),(.067,-.118),(.12,-.118). Badge 1 (2.16,2.40); "Click" 7 pt bold blue (2.27,2.40).  
Legend (y 1.19): circle 1.84, "revealed" 1.93; square from 2.40, "suggested" 2.58; dashes 3.08-3.28, "lowest path" 3.32.  

**4. Loop.** Badges 1 Click, 2 Reveal, 3 Update, 4 Suggest, 5 Log: blue circles r 0.085, white 6.5 pt bold numerals. Arrows `-|>`, mutation_scale 7, INK 0.9:
Reveal to click: (1.60,0.80)-(1.81,2.63); "one Skala energy" 6 pt italic (1.82,1.75); Map to Update: (4.00,1.98)-(4.26,1.98); Update to Suggest: (5.62,2.32)-(5.62,2.50); Suggest to map: (4.26,3.11)-(4.00,3.11), blue 1.1; blue "repeat, up to 40" rotated (4.13,2.545); Map to Log: (3.30,1.02)-(3.30,0.80).

**5. Wording.** "replay mode": Reveal title; "stored in advance": its body.

**6. Colours.** `common.py`: INK, INK2, MUTED, GRID, WELL; blue = WELL["cis"]. Box tints from `make_fig1.py`; #ffb000 from the page.

**7. Relation.** New Figure 1; `fig1_tool` unchanged becomes Figure 2. Order: 1 `fig0_concept`, 2 `fig1_tool`, 3 `fig2_system_and_plan`, 4 `fig3_skala_vs_cheap`, 5 `fig4_snapshots`, 6 `fig5_strategies`. File names stay; caption numbers shift by one. `fig1_tool` (a) repeats the loop: caption it "the loop of Figure 1 as a flow chart". If six is too many, `fig4_snapshots` goes to the SI.

**8. Acceptance checks.**
1. No text touches a box edge, marker or other text.
2. Menu tags match the list above; map squares 1-4 match the menu.
3. Badges 1-5 read click, reveal, update, suggest, log; one blue arrow returns to the map.
4. "replay mode" and "stored in advance" are in the amber box; "language model", "AI", "chooser", "Route B", "participant" appear nowhere.
5. PDF is vector only; four white circles plus the click agree with "5 of 40".
