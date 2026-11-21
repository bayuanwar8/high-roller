// Panel overlay — selection handles, slot numbers and the face box drawn
// over the preview, plus hit-testing a point against the current panels.
export function drawOverlay(ctx, W, H, layout, selectedSlot, faceBoxes) {
  ctx.clearRect(0, 0, W, H);
  const u = W / 1080;
  for (const panel of layout.panels) {
    const sel = panel.slot === selectedSlot;
    ctx.save();
    ctx.strokeStyle = sel ? '#f5d76e' : 'rgba(245,215,110,0.45)';
    ctx.lineWidth = sel ? 3 * u : 1.5 * u;
    ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
    // Slot number chip, top-left.
    ctx.fillStyle = sel ? '#f5d76e' : 'rgba(4,6,12,0.75)';
    ctx.fillRect(panel.x + 6 * u, panel.y + 6 * u, 26 * u, 26 * u);
    ctx.fillStyle = sel ? '#241303' : '#f5d76e';
    ctx.font = `700 ${16 * u}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(panel.slot + 1), panel.x + 19 * u, panel.y + 20 * u);
    ctx.restore();
  }
  // Face boxes (dashed green) so the user sees the protected zone.
  ctx.save();
  ctx.strokeStyle = 'rgba(126,231,200,0.9)';
  ctx.lineWidth = 1.5 * u;
  ctx.setLineDash([6 * u, 4 * u]);
  for (const fb of faceBoxes || []) {
    ctx.strokeRect(fb.rect.x, fb.rect.y, fb.rect.w, fb.rect.h);
    ctx.fillStyle = 'rgba(126,231,200,0.9)';
    ctx.font = `600 ${12 * u}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('FACE', fb.rect.x + 2, fb.rect.y - 4 * u);
  }
  ctx.restore();
}

export function panelAt(layout, x, y) {
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p.slot;
  }
  return null;
}
