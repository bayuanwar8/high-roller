// PNG export — renders the cover offscreen at export size and downloads it.
import { renderCoverDataURL } from './renderCover.js';

export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1:1 · 1080×1080' },
  portrait: { w: 1080, h: 1350, label: '4:5 · 1080×1350' },
  wide: { w: 1920, h: 1080, label: '16:9 · 1920×1080' },
};

export async function exportPng(state, size) {
  const url = await renderCoverDataURL(state, size);
  const a = document.createElement('a');
  a.href = url;
  a.download = `high-roller-${size}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}
