// Smart crop — the whole head (hair to chin) stays inside the panel's
// face-safe zone with headroom. One photo yields a different crop per panel
// (close-up, mid, wide, mirrored): the crop is chosen per panel aspect,
// never a crop of another ratio's frame.
import { findFace } from './faceFinder.js';

/**
 * Compute the source rectangle (in source pixels) to draw into a panel.
 * @param photo {img, w, h, face} — face is [x0,y0,x1,y1] in 0..1, or null.
 * @param aspect panel width / height.
 * @param zoom 1 = fit the crop exactly; >1 zooms into the face.
 * @param ox, oy pan in -1..1 (fractions of the slack room).
 * @returns {sx, sy, sw, sh} source rect.
 */
export function smartCrop(photo, aspect, zoom = 1, ox = 0, oy = 0) {
  const { w, h } = photo;
  let cw, ch;
  if (w / h > aspect) { ch = h; cw = h * aspect; }
  else { cw = w; ch = w / aspect; }
  // Face-safe zone: the face box plus headroom, in source pixels.
  let cx = cw / 2, cy = ch / 2, fw = cw, fh = ch;
  if (photo.face) {
    const [fx0, fy0, fx1, fy1] = photo.face;
    const fpx0 = fx0 * w, fpy0 = fy0 * h, fpx1 = fx1 * w, fpy1 = fy1 * h;
    const headroom = (fpy1 - fpy0) * 0.35;
    fw = fpx1 - fpx0; fh = (fpy1 - fpy0) + headroom;
    cx = (fpx0 + fpx1) / 2;
    cy = (fpy0 + fpy1) / 2 - headroom / 2;
  }
  // Zoom into the face: shrink the crop toward the face centre.
  const z = Math.max(1, zoom);
  cw = Math.max(fw * 1.15, cw / z);
  ch = cw / aspect;
  if (ch > h) { ch = h; cw = ch * aspect; }
  if (cw > w) { cw = w; ch = cw / aspect; }
  // Never let the face leave the crop: clamp the centre so the whole face
  // box (plus headroom) stays inside.
  if (photo.face) {
    const [fx0, fy0, fx1, fy1] = photo.face;
    const pad = 0.02 * w;
    const fx0p = fx0 * w - pad, fx1p = fx1 * w + pad;
    const fy0p = fy0 * h - (fy1 - fy0) * h * 0.35 - pad, fy1p = fy1 * h + pad;
    const minCx = fx0p + cw / 2, maxCx = fx1p - cw / 2;
    const minCy = fy0p + ch / 2, maxCy = fy1p - ch / 2;
    if (minCx <= maxCx) cx = Math.max(minCx, Math.min(maxCx, cx));
    if (minCy <= maxCy) cy = Math.max(minCy, Math.min(maxCy, cy));
  }
  // Pan inside the slack room.
  const slackX = Math.max(0, (w - cw) / 2);
  const slackY = Math.max(0, (h - ch) / 2);
  cx += ox * slackX;
  cy += oy * slackY;
  const sx = Math.max(0, Math.min(w - cw, cx - cw / 2));
  let sy = Math.max(0, Math.min(h - ch, cy - ch / 2));
  // Tag-safe zone: the cast tag sits at the panel's bottom ~20%, so the
  // chin must end above 78% of the crop height — otherwise the tag chip
  // touches the face. Only applied when the face still fits (hair inside).
  if (photo.face) {
    const fy0p = photo.face[1] * h, fy1p = photo.face[3] * h;
    const need = fy1p - 0.78 * ch; // sy must reach this for the chin to clear
    const cap = fy0p + 0.02 * h; // sy must stay under this to keep the hair
    if (need > sy && need <= cap) sy = need;
    sy = Math.max(0, Math.min(h - ch, sy));
  }
  return { sx, sy, sw: cw, sh: ch };
}

/** Resolve a photo's face: hand-tagged wins; a sample hand-tagged as faceless
 * (faceKnown, e.g. the landscape) never runs the finder — the finder can
 * hallucinate a face in slot machines and distant figures. */
export function resolveFace(photo) {
  if (photo.face) return photo.face;
  if (photo._faceTried) return photo.face;
  photo._faceTried = true;
  if (photo.faceKnown) return null;
  try {
    photo.face = findFace(photo.img, photo.w, photo.h);
  } catch { photo.face = null; }
  return photo.face;
}

/** Is the face fully inside the cropped source rect? (0 = cut) */
export function faceInsideCrop(photo, crop) {
  if (!photo.face) return true;
  const [fx0, fy0, fx1, fy1] = photo.face;
  const x0 = fx0 * photo.w, y0 = fy0 * photo.h, x1 = fx1 * photo.w, y1 = fy1 * photo.h;
  return x0 >= crop.sx - 1 && x1 <= crop.sx + crop.sw + 1 && y0 >= crop.sy - 1 && y1 <= crop.sy + crop.sh + 1;
}
