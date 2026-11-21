// Photo finishing — per-panel auto-exposure on pixel data, then one shared
// film grain over the whole poster (drawn by renderCover, not here).
// Steps: levels stretch (1–99 percentile) + face-weighted gamma + dehaze
// (lift the shadows), then a mild unsharp pass on the face area only.
// Skin-tone protection lives in the grade step (grades.js): saturation moves
// are damped inside the skin mask so warm skin never goes grey or magenta.
import { skinLikelihood } from './faceFinder.js';

/** Finish a panel's pixels in place. img is an ImageData, face is [x0..x1] 0..1 in panel space (or null). */
export function finishPanel(img, face) {
  const d = img.data;
  const n = d.length / 4;
  // Percentile levels from luminance.
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const sorted = Float32Array.from(lum).sort();
  const lo = sorted[Math.floor(n * 0.01)] || 0;
  const hi = sorted[Math.floor(n * 0.99)] || 255;
  const span = Math.max(1, hi - lo);
  // Face-weighted gamma: measure the face area's mean luminance.
  let faceMean = 128, faceN = 0;
  if (face) {
    const w = img.width, h = img.height;
    const x0 = Math.floor(face[0] * w), x1 = Math.ceil(face[2] * w);
    const y0 = Math.floor(face[1] * h), y1 = Math.ceil(face[3] * h);
    let s = 0;
    for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) { s += lum[y * w + x]; faceN++; }
    }
    if (faceN) faceMean = s / faceN;
  }
  const gamma = faceMean < 110 ? 0.82 : faceMean > 175 ? 1.18 : 1.0;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      let v = (d[i * 4 + c] - lo) / span;
      v = Math.max(0, Math.min(1, v));
      // Dehaze: lift the shadows a touch, keep the highlights.
      v = v + (1 - v) * 0.045 * (1 - v);
      v = Math.pow(v, gamma);
      d[i * 4 + c] = Math.round(v * 255);
    }
  }
  // Mild unsharp on the face area only (3x3 kernel, alpha 0.35).
  if (face && faceN) {
    const w = img.width, h = img.height;
    const x0 = Math.max(1, Math.floor(face[0] * w)), x1 = Math.min(w - 2, Math.ceil(face[2] * w));
    const y0 = Math.max(1, Math.floor(face[1] * h)), y1 = Math.min(h - 2, Math.ceil(face[3] * h));
    const src = new Uint8ClampedArray(d);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        for (let c = 0; c < 3; c++) {
          const i = (y * w + x) * 4 + c;
          const lap = 4 * src[i] - src[i - 4] - src[i + 4] - src[i - w * 4] - src[i + w * 4];
          d[i] = Math.max(0, Math.min(255, src[i] + lap * 0.35));
        }
      }
    }
  }
}

/** Skin mask for a panel (0..1 per pixel) — used by grades to protect skin. */
export function skinMask(img) {
  const d = img.data;
  const n = d.length / 4;
  const mask = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    mask[i] = skinLikelihood(r, g, b, y);
  }
  return mask;
}
