// Mini previews — three live thumbnails (square / portrait / wide) under
// the editor preview, each a real render at small size.
import { renderCoverTo } from './renderCover.js';

const SIZES = [
  { size: 'square', w: 120, h: 120, label: '1:1' },
  { size: 'portrait', w: 96, h: 120, label: '4:5' },
  { size: 'wide', w: 180, h: 101, label: '16:9' },
];

export function renderMiniPreviews(container, state) {
  container.innerHTML = '';
  for (const s of SIZES) {
    const wrap = document.createElement('div');
    wrap.className = 'mini';
    const c = document.createElement('canvas');
    c.width = s.w; c.height = s.h;
    const ctx = c.getContext('2d');
    const saved = state.size;
    state.size = s.size;
    try { renderCoverTo(ctx, s.w, s.h, state); } catch { /* preview only */ }
    state.size = saved;
    const label = document.createElement('span');
    label.textContent = s.label;
    wrap.appendChild(c);
    wrap.appendChild(label);
    wrap.addEventListener('click', () => {
      const ev = new CustomEvent('mini-pick', { detail: s.size });
      container.dispatchEvent(ev);
    });
    container.appendChild(wrap);
  }
}
