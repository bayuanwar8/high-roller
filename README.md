# HIGH ROLLER — Cinematic Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bayuanwar8/high-roller/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bayuanwar8/high-roller/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Make a GTA 6-style cover poster on a casino floor at 2 AM: seven souls, one
night, no way out. Pick a layout, pick a grade, drop in your own photos —
the studio finds faces, frames them, grades the whole poster and letters it
like a movie poster.

## What it does

- **6 layouts** — Casino Mosaic, Diagonal Chips, Six Grid, Hero Left, Strip
  Top, Vault Frame — each recomposed for **3 sizes** (1:1 square, 4:5
  portrait, 16:9 wide), never a crop of another ratio.
- **6 casino grades** — Neon Gold, Felt Green, Smoke & Gold, Midnight Blue,
  Velvet Red, Champagne — tone curve, split toning, S-curve, vignette,
  grain, all on pixel data, with skin-tone protection under every grade.
- **Face finder** — skin-likelihood + local detail + upper-frame priors on a
  downscaled copy, with a face-quality score (brightness, contrast,
  sharpness, size, resolution). The best face becomes the hero.
- **Smart crop** — the whole head (hair to chin) stays inside the panel's
  face-safe zone with headroom; one photo yields a different crop per panel.
- **Photo finishing** — per-panel auto-exposure (levels + face-weighted gamma
  + dehaze), unsharp mask on the face area, skin-tone protection, one shared
  film grain over the whole poster.
- **Lettering in code** — striped chrome title (auto-fit, gradient, outline,
  light rim, extrude, stripe cuts, gloss, sparkles), neon script, review bar
  with five stars and a fictional paper, tagline ribbon, gold starburst seal,
  billing block with an anti-orphan guard, barcode, and a cast tag with a
  location + time micro-line on every panel.
- **Editor** — click to select, drag to pan, wheel to zoom, drag a slot
  number to swap, drop a photo to add it, undo/redo, 3 live mini previews,
  PNG export in 3 sizes (1080×1080, 1080×1350, 1920×1080).

## Samples

8 original AI-generated photos: THE DEALER (hero), THE WHALE, THE PIT BOSS,
THE CARD SHARK, THE WAITRESS, THE LOOKOUT, THE CASINO FLOOR and THE
CROUPIER — medium shots, faces hand-tagged.

## Run it

```sh
node serve.ts --port 8084   # then open http://127.0.0.1:8084
```
