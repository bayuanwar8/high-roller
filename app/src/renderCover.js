// Render pipeline — decor ground → panels (smart crop + finish + grade +
// framed stills) → lettering (review bar, chrome title, script, ribbon,
// seal, billing, barcode) → cast tags → one shared film grain over the
// whole poster. Framing (shadow + keyline) is drawn AFTER the grade so the
// panels stay sharp.
import { computeLayout } from './layouts.js';
import { drawDecor } from './decor.js';
import { drawChromeTitle, drawScript, drawReviewBar, drawRibbon, drawSeal, drawBilling, drawBarcode, drawCastTag } from './lettering.js';
import { smartCrop, resolveFace, faceInsideCrop } from './smartCrop.js';
import { finishPanel, skinMask } from './photoFinish.js';
import { applyGrade } from './grades.js';

export const RENDER_SIZES = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  wide: { w: 1920, h: 1080 },
};

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawPanel(ctx, photo, panel, state, u) {
  const { x, y, w, h } = panel;
  const adj = state.panels[panel.slot] || {};
  const zoom = adj.zoom || 1, ox = adj.ox || 0, oy = adj.oy || 0, flip = !!adj.flip;
  const aspect = w / h;
  const crop = smartCrop(photo, aspect, zoom, ox, oy);
  // Offscreen panel canvas at panel resolution (capped for speed).
  const pw = Math.min(720, Math.max(160, Math.round(w)));
  const ph = Math.max(90, Math.round(pw / aspect));
  const off = document.createElement('canvas');
  off.width = pw; off.height = ph;
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.imageSmoothingQuality = 'high';
  if (flip) {
    octx.save();
    octx.translate(pw, 0);
    octx.scale(-1, 1);
    octx.drawImage(photo.img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
    octx.restore();
  } else {
    octx.drawImage(photo.img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
  }
  // Face box in panel space (for finishing + the report).
  let facePanel = null;
  if (photo.face) {
    const [fx0, fy0, fx1, fy1] = photo.face;
    const fx = flip
      ? [1 - fx1, fy0, 1 - fx0, fy1]
      : [fx0, fy0, fx1, fy1];
    facePanel = [
      ((fx[0] * photo.w - crop.sx) / crop.sw),
      ((fx[1] * photo.h - crop.sy) / crop.sh),
      ((fx[2] * photo.w - crop.sx) / crop.sw),
      ((fx[3] * photo.h - crop.sy) / crop.sh),
    ];
  }
  const img = octx.getImageData(0, 0, pw, ph);
  finishPanel(img, facePanel);
  const mask = skinMask(img);
  applyGrade(img, state.grade, mask);
  octx.putImageData(img, 0, 0);
  // Framed still: soft drop shadow first, then the graded photo, then the
  // warm keyline on top.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 14 * u;
  ctx.shadowOffsetY = 6 * u;
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.drawImage(off, x, y, w, h);
  ctx.save();
  ctx.strokeStyle = 'rgba(245,231,196,0.9)';
  ctx.lineWidth = Math.max(1.5, 2 * u);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
  return { crop, facePanel };
}

function drawGrain(ctx, W, H) {
  const rnd = seededRand(90210);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const n = Math.floor((W * H) / 260);
  for (let i = 0; i < n; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1, 1);
  }
  ctx.fillStyle = '#000000';
  for (let i = 0; i < n / 2; i++) {
    ctx.fillRect(rnd() * W, rnd() * H, 1, 1);
  }
  ctx.restore();
}

/** Draw the whole cover into ctx at W×H. Returns { panels, bands, faceBoxes }. */
export function renderCoverTo(ctx, W, H, state) {
  const u = W / 1080;
  const { panels, bands } = computeLayout(state.layout, W, H);
  drawDecor(ctx, W, H, bands.kind);
  const faceBoxes = [];
  const tagRects = [];
  for (const panel of panels) {
    const photo = state.photos[state.slots[panel.slot]];
    if (!photo || !photo.img) continue;
    resolveFace(photo);
    const { crop, facePanel } = drawPanel(ctx, photo, panel, state, u);
    const tag = state.tags[panel.slot] || photo.tag;
    const sub = photo.face
      ? `${photo.place} · ${photo.time}`
      : `${photo.place} · ${photo.time}`;
    const tagRect = drawCastTag(ctx, panel, tag, sub, u);
    tagRects.push({ ...tagRect, slot: panel.slot });
    if (facePanel) {
      faceBoxes.push({
        slot: panel.slot,
        rect: {
          x: panel.x + facePanel[0] * panel.w,
          y: panel.y + facePanel[1] * panel.h,
          w: (facePanel[2] - facePanel[0]) * panel.w,
          h: (facePanel[3] - facePanel[1]) * panel.h,
        },
        cut: !faceInsideCrop(photo, crop),
      });
    }
  }
  const titleRect = drawChromeTitle(ctx, W, H, state.title, bands.title);
  drawScript(ctx, W, H, state.script, bands.script);
  drawReviewBar(ctx, W, H, state.quote, state.source, bands.review);
  drawRibbon(ctx, W, H, state.tagline, bands.ribbon);
  drawSeal(ctx, bands.seal.cx, bands.seal.cy, bands.seal.r, ['GOLDEN PALMS', 'CASINO', 'BEST CAST']);
  drawBilling(ctx, W, H, state.billing, state.release, bands.billing);
  drawBarcode(ctx, bands.barcode.x, bands.barcode.y, bands.barcode.w, bands.barcode.h, '0 12345 67890 1');
  drawGrain(ctx, W, H);
  return { panels, bands, faceBoxes, tagRects, titleRect };
}

export function renderCoverDataURL(state, size) {
  const { w, h } = RENDER_SIZES[size] || RENDER_SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  renderCoverTo(ctx, w, h, state);
  return canvas.toDataURL('image/png');
}

/** Per-panel diagnostics: crop rect, face cut, face rect, lettering hits. */
export function panelDiagnostics(state) {
  const W = 1080, H = 1080;
  const { panels, bands } = computeLayout(state.layout, W, H);
  const letters = {
    review: bands.review, title: bands.title, script: bands.script,
    ribbon: bands.ribbon, billing: bands.billing,
    seal: { x: bands.seal.cx - bands.seal.r, y: bands.seal.cy - bands.seal.r, w: bands.seal.r * 2, h: bands.seal.r * 2 },
    barcode: bands.barcode,
  };
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  return panels.map((panel) => {
    const photo = state.photos[state.slots[panel.slot]];
    if (!photo) return { slot: panel.slot, tag: null, note: 'no photo' };
    resolveFace(photo);
    const adj = state.panels[panel.slot] || {};
    const crop = smartCrop(photo, panel.w / panel.h, adj.zoom || 1, adj.ox || 0, adj.oy || 0);
    const cut = photo.face ? !faceInsideCrop(photo, crop) : false;
    let faceRect = null, hits = [];
    if (photo.face) {
      const [fx0, fy0, fx1, fy1] = photo.face;
      faceRect = {
        x: panel.x + ((fx0 * photo.w - crop.sx) / crop.sw) * panel.w,
        y: panel.y + ((fy0 * photo.h - crop.sy) / crop.sh) * panel.h,
        w: ((fx1 - fx0) * photo.w / crop.sw) * panel.w,
        h: ((fy1 - fy0) * photo.h / crop.sh) * panel.h,
      };
      hits = Object.entries(letters).filter(([, r]) => hit(faceRect, r)).map(([k]) => k);
    }
    return {
      slot: panel.slot, tag: photo.tag, photo: photo.file,
      panel: { x: Math.round(panel.x), y: Math.round(panel.y), w: Math.round(panel.w), h: Math.round(panel.h), aspect: +(panel.w / panel.h).toFixed(2) },
      crop: { sx: Math.round(crop.sx), sy: Math.round(crop.sy), sw: Math.round(crop.sw), sh: Math.round(crop.sh) },
      face: photo.face, cut, faceRect: faceRect ? { x: Math.round(faceRect.x), y: Math.round(faceRect.y), w: Math.round(faceRect.w), h: Math.round(faceRect.h) } : null,
      hits,
      tagRect: null,
    };
  });
}

/** Tag diagnostics: which cast tags touch a face (needs a real render). */
export function tagDiagnostics(state) {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const { faceBoxes, tagRects } = renderCoverTo(ctx, W, H, state);
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  return tagRects.map((t) => {
    const fb = faceBoxes.find((f) => f.slot === t.slot);
    return {
      slot: t.slot,
      tagRect: { x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) },
      faceRect: fb ? { x: Math.round(fb.rect.x), y: Math.round(fb.rect.y), w: Math.round(fb.rect.w), h: Math.round(fb.rect.h) } : null,
      touches: fb ? hit(fb.rect, t) : false,
    };
  });
}

/** Face report for the current state (square render): cut faces, faces
 * covered by lettering, cast tags touching a face. All must be 0. */
export function faceReport(state) {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const { bands, faceBoxes, tagRects } = renderCoverTo(ctx, W, H, state);
  const letters = [
    bands.review, bands.title, bands.script, bands.ribbon, bands.billing,
    { x: bands.seal.cx - bands.seal.r, y: bands.seal.cy - bands.seal.r, w: bands.seal.r * 2, h: bands.seal.r * 2 },
    bands.barcode,
  ];
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  let facesCut = 0, facesCovered = 0, tagsTouching = 0;
  for (const fb of faceBoxes) {
    if (fb.cut) facesCut++;
    if (letters.some((l) => hit(fb.rect, l))) facesCovered++;
    const tag = tagRects.find((t) => t.slot === fb.slot);
    if (tag && hit(fb.rect, tag)) tagsTouching++;
  }
  return { facesCut, facesCovered, tagsTouching };
}
