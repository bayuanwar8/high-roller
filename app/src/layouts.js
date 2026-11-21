// Layouts — 6 cover layouts, each recomposed per ratio (square / portrait /
// wide), never a crop of another ratio's frame.
//
// FACE-SAFE RULE (learned the hard way): a panel that holds a face photo
// must be at most ~1.45 aspect — a face (hair to chin + headroom) is about
// 0.51 of a portrait photo's height, so a wider crop cannot contain it.
// Every tiling below keeps ALL panels at or under 1.35 aspect. Slot 6 is
// always the bottom-right panel, which autoFill reserves for the landscape
// photo (no face), so the gold seal overlapping that corner is safe.
export const LAYOUTS = [
  { id: 'casinoMosaic', name: 'Casino Mosaic' },
  { id: 'diagonalChips', name: 'Diagonal Chips' },
  { id: 'sixGrid', name: 'Six Grid' },
  { id: 'heroLeft', name: 'Hero Left' },
  { id: 'stripTop', name: 'Strip Top' },
  { id: 'vaultFrame', name: 'Vault Frame' },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

function sizeKind(W, H) {
  if (H > W * 1.1) return 'portrait';
  if (W > H * 1.1) return 'wide';
  return 'square';
}

// Lettering bands as fractions of W / H.
function bandSet(W, H) {
  const kind = sizeKind(W, H);
  const revH = 0.065;
  const titleY = 0.072, titleH = kind === 'wide' ? 0.115 : 0.135;
  const scriptY = titleY + titleH + 0.004, scriptH = 0.038;
  const ribbonY = scriptY + scriptH + 0.006, ribbonH = 0.036;
  const billH = kind === 'portrait' ? 0.088 : 0.105;
  const billY = 1 - billH - 0.008;
  const panelY = ribbonY + ribbonH + 0.012;
  const panelH = billY - panelY - 0.012;
  const titleW = Math.min(0.62, 1200 / W);
  // Gold seal: stamped in the poster's bottom-right corner, BELOW the panel
  // area in the red-carpet zone — never over a cast tag. (An earlier
  // position overlapping the bottom-right panel covered the last panel's
  // tag in portrait.) Radius is capped so the seal clears the tag band.
  const sealR = kind === 'portrait' ? 42 : kind === 'wide' ? 52 : 46;
  const seal = { cx: W - sealR - 8, cy: H - sealR - 8, r: sealR };
  return {
    review: { x: 0, y: 0.008, w: 1, h: revH },
    title: { x: (1 - titleW) / 2, y: titleY, w: titleW, h: titleH },
    script: { x: 0.15, y: scriptY, w: 0.7, h: scriptH },
    ribbon: { x: 0.2, y: ribbonY, w: 0.6, h: ribbonH },
    billing: { x: 0.16, y: billY, w: 0.68, h: billH },
    seal,
    barcode: { x: W * 0.026, y: (billY + 0.012) * H, w: 118 * (W / 1080), h: billH * H * 0.72 },
    panelArea: { x: 0.02, y: panelY, w: 0.96, h: panelH },
    kind,
  };
}

// Grid cell inside an area (fractions), with a gutter.
function cell(area, cols, rows, col, row, colSpan = 1, rowSpan = 1) {
  const g = 0.012;
  const cw = (area.w - g * (cols - 1)) / cols;
  const ch = (area.h - g * (rows - 1)) / rows;
  return {
    x: area.x + col * (cw + g),
    y: area.y + row * (ch + g),
    w: cw * colSpan + g * (colSpan - 1),
    h: ch * rowSpan + g * (rowSpan - 1),
  };
}

function toPx(rects, W, H) {
  return rects.map((r, i) => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H, slot: i }));
}

// Square panel area is 0.96 x 0.572 of the poster — grid 4 cols x 3 rows.
// Portrait panel area is 0.96 x 0.645 — grid 5 cols x 4 rows.
// Wide panel area is 0.97 x 0.60 — grid 5 cols x 2 rows.
function panelsFor(id, W, H) {
  const bands = bandSet(W, H);
  const A = bands.panelArea;
  const kind = bands.kind;
  let f;
  if (kind === 'portrait') {
    // 5x4 grid: cell 0.182 x 0.152 (aspect ~0.95 at 1080x1350).
    const G = [5, 4];
    if (id === 'casinoMosaic') {
      f = [
        cell(A, ...G, 0, 0, 2, 2), cell(A, ...G, 2, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2), cell(A, ...G, 4, 0, 1, 2),
        cell(A, ...G, 0, 2, 2, 2), cell(A, ...G, 2, 2, 2, 2), cell(A, ...G, 4, 2, 1, 2),
      ];
    } else if (id === 'diagonalChips') {
      const base = panelsFor('casinoMosaic', W, H);
      f = base.panels.map((q, i) => ({ ...q, y: q.y + i * 7 * (H / 1080), x: q.x + (i % 2) * 4 * (W / 1080) }));
      return { panels: f, bands: base.bands };
    } else if (id === 'sixGrid') {
      f = [
        cell(A, ...G, 1, 0, 2, 2), cell(A, ...G, 0, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2), cell(A, ...G, 4, 0, 1, 2),
        cell(A, ...G, 0, 2, 2, 2), cell(A, ...G, 2, 2, 2, 2), cell(A, ...G, 4, 2, 1, 2),
      ];
    } else if (id === 'heroLeft') {
      f = [
        cell(A, ...G, 0, 0, 2, 4),
        cell(A, ...G, 2, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2), cell(A, ...G, 4, 0, 1, 2),
        cell(A, ...G, 2, 2, 1, 2), cell(A, ...G, 3, 2, 1, 2), cell(A, ...G, 4, 2, 1, 2),
      ];
    } else if (id === 'stripTop') {
      f = [
        cell(A, ...G, 2, 0, 2, 4),
        cell(A, ...G, 0, 0, 1, 2), cell(A, ...G, 1, 0, 1, 2), cell(A, ...G, 4, 0, 1, 2),
        cell(A, ...G, 0, 2, 1, 2), cell(A, ...G, 1, 2, 1, 2), cell(A, ...G, 4, 2, 1, 2),
      ];
    } else { // vaultFrame
      f = [
        cell(A, ...G, 1, 1, 2, 2),
        cell(A, ...G, 0, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2), cell(A, ...G, 4, 0, 1, 2),
        cell(A, ...G, 0, 2, 2, 2), cell(A, ...G, 2, 2, 2, 2), cell(A, ...G, 4, 2, 1, 2),
      ];
    }
  } else if (kind === 'wide') {
    // 5x2 grid: cell 0.182 x 0.294 (aspect ~1.12 at 1920x1080).
    const G = [5, 2];
    if (id === 'casinoMosaic') {
      f = [
        cell(A, ...G, 0, 0, 2, 2),
        cell(A, ...G, 2, 0), cell(A, ...G, 3, 0), cell(A, ...G, 4, 0),
        cell(A, ...G, 2, 1), cell(A, ...G, 3, 1), cell(A, ...G, 4, 1),
      ];
    } else if (id === 'diagonalChips') {
      const base = panelsFor('casinoMosaic', W, H);
      f = base.panels.map((q, i) => ({ ...q, y: q.y + i * 7 * (H / 1080), x: q.x + (i % 2) * 4 * (W / 1080) }));
      return { panels: f, bands: base.bands };
    } else if (id === 'sixGrid') {
      f = [
        cell(A, ...G, 2, 0, 2, 2),
        cell(A, ...G, 0, 0), cell(A, ...G, 1, 0), cell(A, ...G, 4, 0),
        cell(A, ...G, 0, 1), cell(A, ...G, 1, 1), cell(A, ...G, 4, 1),
      ];
    } else if (id === 'heroLeft') {
      f = [
        cell(A, ...G, 3, 0, 2, 2),
        cell(A, ...G, 0, 0), cell(A, ...G, 1, 0), cell(A, ...G, 2, 0),
        cell(A, ...G, 0, 1), cell(A, ...G, 1, 1), cell(A, ...G, 2, 1),
      ];
    } else if (id === 'stripTop') {
      f = [
        cell(A, ...G, 2, 0, 1, 2),
        cell(A, ...G, 0, 0), cell(A, ...G, 1, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2), cell(A, ...G, 4, 0),
        cell(A, ...G, 0, 1), cell(A, ...G, 4, 1),
      ];
    } else { // vaultFrame
      f = [
        cell(A, ...G, 1, 0, 2, 2),
        cell(A, ...G, 0, 0), cell(A, ...G, 3, 0), cell(A, ...G, 4, 0),
        cell(A, ...G, 0, 1), cell(A, ...G, 3, 1), cell(A, ...G, 4, 1),
      ];
    }
  } else {
    // Square: 4x3 grid: cell 0.231 x 0.183 (aspect ~1.27 at 1080x1080).
    const G = [4, 3];
    if (id === 'casinoMosaic') {
      f = [
        cell(A, ...G, 0, 0, 2, 2), cell(A, ...G, 2, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2),
        cell(A, ...G, 0, 2), cell(A, ...G, 1, 2), cell(A, ...G, 2, 2), cell(A, ...G, 3, 2),
      ];
    } else if (id === 'diagonalChips') {
      const base = panelsFor('casinoMosaic', W, H);
      f = base.panels.map((q, i) => ({ ...q, y: q.y + i * 7 * (H / 1080), x: q.x + (i % 2) * 4 * (W / 1080) }));
      return { panels: f, bands: base.bands };
    } else if (id === 'sixGrid') {
      f = [
        cell(A, ...G, 1, 0, 2, 2),
        cell(A, ...G, 0, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2),
        cell(A, ...G, 0, 2), cell(A, ...G, 1, 2), cell(A, ...G, 2, 2), cell(A, ...G, 3, 2),
      ];
    } else if (id === 'heroLeft') {
      f = [
        cell(A, ...G, 0, 0, 2, 3),
        cell(A, ...G, 2, 0), cell(A, ...G, 3, 0),
        cell(A, ...G, 2, 1), cell(A, ...G, 3, 1),
        cell(A, ...G, 2, 2), cell(A, ...G, 3, 2),
      ];
    } else if (id === 'stripTop') {
      f = [
        cell(A, ...G, 1, 0, 2, 3),
        cell(A, ...G, 0, 0), cell(A, ...G, 3, 0),
        cell(A, ...G, 0, 1), cell(A, ...G, 3, 1),
        cell(A, ...G, 0, 2), cell(A, ...G, 3, 2),
      ];
    } else { // vaultFrame
      f = [
        cell(A, ...G, 1, 0, 2, 2),
        cell(A, ...G, 0, 0, 1, 2), cell(A, ...G, 3, 0, 1, 2),
        cell(A, ...G, 0, 2), cell(A, ...G, 1, 2), cell(A, ...G, 2, 2), cell(A, ...G, 3, 2),
      ];
    }
  }
  return { panels: toPx(f, W, H), bands };
}

export function computeLayout(id, W, H) {
  const { panels, bands } = panelsFor(layoutById(id).id, W, H);
  const px = (r) => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H });
  return {
    panels,
    bands: {
      review: px(bands.review),
      title: px(bands.title),
      script: px(bands.script),
      ribbon: px(bands.ribbon),
      billing: px(bands.billing),
      seal: bands.seal,
      barcode: bands.barcode,
      kind: bands.kind,
    },
  };
}
