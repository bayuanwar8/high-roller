// Auto-fill — the best face becomes the hero (slot 0); the rest of the
// cast fills the remaining slots by face-quality score. Landscape photos
// (no face) go to the landscape slot. Re-run after new photos arrive.
import { resolveFace } from './smartCrop.js';
import { scoreFaceQuality } from './faceFinder.js';

export function autoFill(state) {
  const photos = state.photos;
  for (const p of photos) {
    resolveFace(p);
    if (p.score == null) {
      try { p.score = scoreFaceQuality(p.img, p.w, p.h, p.face); }
      catch { p.score = 0; }
    }
  }
  const faces = photos.filter((p) => p.face).sort((a, b) => (b.score || 0) - (a.score || 0));
  // The flagged hero (THE DEALER) always takes slot 0, by design.
  const heroIdx = faces.findIndex((p) => p.hero);
  if (heroIdx > 0) faces.unshift(faces.splice(heroIdx, 1)[0]);
  const landscapes = photos.filter((p) => !p.face);
  const slots = [];
  if (faces.length) slots.push(photos.indexOf(faces[0]));
  for (const p of faces.slice(1)) slots.push(photos.indexOf(p));
  // Slot 6 is the bottom-right panel under the gold seal: reserve it for the
  // landscape photo (no face), so no face is ever cut by a wide panel or
  // covered by the seal. Extra faces stay in the photo list as alternates.
  const withLandscape = slots.slice(0, 6);
  if (landscapes.length) withLandscape.push(photos.indexOf(landscapes[0]));
  for (let i = 0; i < photos.length && withLandscape.length < 7; i++) {
    if (!withLandscape.includes(i)) withLandscape.push(i);
  }
  state.slots = withLandscape.slice(0, 7);
  return state.slots;
}
