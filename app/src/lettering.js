// Lettering in code — striped chrome title (auto-fit, gradient, outline,
// light rim, extrude, stripe cuts, gloss, sparkles), neon script, review
// bar, tagline ribbon, gold starburst seal, billing block, barcode and cast
// tags. The billing wrapper keeps "C. VOSS" as one token and never leaves a
// lone word on the last line (anti-orphan guard, with a font-size fallback).
import { gradeById } from './grades.js';

function fitFont(ctx, text, fontFamily, weight, maxW, startPx) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW) return px;
    px -= 2;
  }
  return px;
}

function star(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

/** The giant chrome title. Returns the drawn rect (for the face report). */
export function drawChromeTitle(ctx, W, H, text, band) {
  const { x, y, w, h } = band;
  const cx = x + w / 2;
  const px = fitFont(ctx, text, 'Anton, sans-serif', '400', w * 0.98, h * 0.92);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${px}px Anton, sans-serif`;
  const ty = y + h / 2;
  // Extrude: dark offset copies below.
  ctx.fillStyle = '#12060a';
  for (let d = px * 0.055; d > 0; d -= 2) ctx.fillText(text, cx, ty + d);
  // Gradient fill + stripe cuts + gloss, rendered on an offscreen canvas
  // so the stripes and gloss land ONLY inside the glyphs. The previous
  // version used 'source-atop' on the MAIN canvas, but the background is
  // already painted opaque there, so source-atop leaked the stripe rects
  // across the whole title band as full-width lines (and the gloss rect as
  // a grey band behind the title). The offscreen canvas is transparent
  // everywhere except the glyphs, so source-atop cannot leak.
  const offH = Math.ceil(px * 1.3);
  const off = document.createElement('canvas');
  off.width = Math.ceil(w);
  off.height = offH;
  const o = off.getContext('2d');
  o.textAlign = 'center';
  o.textBaseline = 'middle';
  o.font = `400 ${px}px Anton, sans-serif`;
  const oy = offH / 2;
  const grad = o.createLinearGradient(0, oy - px * 0.5, 0, oy + px * 0.55);
  grad.addColorStop(0, '#fbe98a');
  grad.addColorStop(0.35, '#fff7d6');
  grad.addColorStop(0.55, '#e8b64c');
  grad.addColorStop(0.8, '#f5d76e');
  grad.addColorStop(1, '#ff2e88');
  o.fillStyle = grad;
  o.fillText(text, w / 2, oy);
  // Stripe cuts + gloss, clipped to the glyphs.
  o.globalCompositeOperation = 'source-atop';
  o.fillStyle = 'rgba(20,8,4,0.55)';
  for (let sy = oy - px * 0.42; sy < oy + px * 0.5; sy += px * 0.17) {
    o.fillRect(0, sy, w, Math.max(1.5, px * 0.02));
  }
  const gloss = o.createLinearGradient(w * 0.2, oy - px * 0.5, w * 0.7, oy + px * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.34)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = gloss;
  o.fillRect(0, oy - px * 0.55, w, px * 1.1);
  o.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, cx - w / 2, ty - offH / 2);
  // Outline + light rim.
  ctx.lineWidth = Math.max(2, px * 0.045);
  ctx.strokeStyle = '#1a0b12';
  ctx.strokeText(text, cx, ty);
  ctx.lineWidth = Math.max(1, px * 0.012);
  ctx.strokeStyle = 'rgba(255,247,214,0.9)';
  ctx.strokeText(text, cx - 1, ty - 1);
  // Title glow + sparkles.
  ctx.shadowColor = 'rgba(245,215,110,0.8)';
  ctx.shadowBlur = px * 0.25;
  ctx.fillStyle = 'rgba(245,215,110,0.001)';
  ctx.fillText(text, cx, ty);
  ctx.shadowBlur = 0;
  star(ctx, x + w * 0.06, ty - px * 0.42, px * 0.07, '#fff7d6', 0.95);
  star(ctx, x + w * 0.94, ty + px * 0.30, px * 0.06, '#ff2e88', 0.9);
  star(ctx, x + w * 0.88, ty - px * 0.45, px * 0.05, '#22d3ee', 0.9);
  ctx.restore();
  return { x: cx - w / 2, y: ty - px * 0.55, w, h: px * 1.1 };
}

/** Neon script subtitle under the title. */
export function drawScript(ctx, W, H, text, band) {
  const { x, y, w, h } = band;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = fitFont(ctx, text, 'Caveat, cursive', '700', w * 0.9, h * 0.85);
  ctx.font = `700 ${px}px Caveat, cursive`;
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = px * 0.45;
  ctx.fillStyle = '#ff5fa8';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd7ea';
  ctx.fillText(text, x + w / 2, y + h / 2 - 1);
  ctx.restore();
  return { x, y, w, h };
}

/** Top review bar: 5 gold stars + quote + source, VOL. 1 badge at right. */
export function drawReviewBar(ctx, W, H, quote, source, band) {
  const { x, y, w, h } = band;
  const u = W / 1080;
  ctx.save();
  // Stars.
  let sx = x + 10 * u;
  const sy = y + h / 2;
  for (let i = 0; i < 5; i++) {
    star(ctx, sx, sy, 13 * u, '#f5c542', 1);
    sx += 30 * u;
  }
  // Quote + source.
  const qx = sx + 14 * u;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const qp = fitFont(ctx, `"${quote}"`, '"Barlow Condensed", sans-serif', '600', w * 0.52, h * 0.52);
  ctx.font = `600 ${qp}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#f3ead2';
  ctx.fillText(`"${quote}"`, qx, sy);
  const qw = ctx.measureText(`"${quote}"`).width;
  const sp = fitFont(ctx, `— ${source}`, '"Barlow Condensed", sans-serif', '600', w * 0.2, h * 0.44);
  ctx.font = `600 ${sp}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#7ee7c8';
  ctx.fillText(`— ${source}`, qx + qw + 12 * u, sy);
  // VOL. 1 badge.
  const bw = 92 * u, bh = h * 0.72;
  const bx = x + w - bw - 8 * u, by = y + (h - bh) / 2;
  ctx.fillStyle = '#0e2f23';
  ctx.strokeStyle = '#f5d76e';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 16 * u);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f5d76e';
  ctx.textAlign = 'center';
  const bp = fitFont(ctx, 'VOL. 1', '"Barlow Condensed", sans-serif', '600', bw * 0.8, bh * 0.6);
  ctx.font = `600 ${bp}px "Barlow Condensed", sans-serif`;
  ctx.fillText('VOL. 1', bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
  return { x, y, w, h };
}

/** Tagline ribbon: gold band with folded ends, dark text. */
export function drawRibbon(ctx, W, H, text, band) {
  const { x, y, w, h } = band;
  ctx.save();
  const u = W / 1080;
  const fold = h * 0.5;
  ctx.beginPath();
  ctx.moveTo(x + fold, y);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w - fold, y + h);
  ctx.lineTo(x + fold, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, '#c9962e');
  g.addColorStop(0.5, '#f5d76e');
  g.addColorStop(1, '#c9962e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + fold, y);
  ctx.lineTo(x + fold, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w, y + h / 2);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w - fold, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const px = fitFont(ctx, text, 'Anton, sans-serif', '400', w * 0.92, h * 0.62);
  ctx.font = `400 ${px}px Anton, sans-serif`;
  ctx.fillStyle = '#241303';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return { x, y, w, h };
}

/** Gold starburst seal with the casino name and BEST CAST. */
export function drawSeal(ctx, cx, cy, r, lines) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.82;
    const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffe9a8');
  g.addColorStop(0.6, '#e8b64c');
  g.addColorStop(1, '#a97b1e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.strokeStyle = '#5e3d05';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, r * 0.02);
  ctx.strokeStyle = 'rgba(94,61,5,0.8)';
  ctx.stroke();
  ctx.fillStyle = '#241303';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lh = r * 0.34;
  lines.forEach((line, i) => {
    const px = fitFont(ctx, line, 'Anton, sans-serif', '400', r * 1.15, lh * 0.8);
    ctx.font = `400 ${px}px Anton, sans-serif`;
    ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lh);
  });
  star(ctx, -r * 0.42, -r * 0.42, r * 0.07, '#241303', 1);
  star(ctx, r * 0.42, -r * 0.42, r * 0.07, '#241303', 1);
  ctx.restore();
}

// --- Billing wrap: "C. VOSS" is one token (non-breaking space), and the
// last line never holds a single word (anti-orphan guard). ---
function tokenize(text) {
  return text.replace(/([A-Z])\. ([A-Z][a-z]+)/g, '$1.\u00A0$2').split(/\s+/);
}

export function wrapBilling(ctx, text, maxW, fontPx) {
  const words = tokenize(text);
  ctx.font = `600 ${fontPx}px "Barlow Condensed", sans-serif`;
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? cur + ' ' + word : word;
    if (ctx.measureText(test).width <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  // Anti-orphan: a lone word on the last line pulls the previous line's
  // last word down, if it still fits.
  if (lines.length >= 2) {
    const last = lines[lines.length - 1].split(/\s+/);
    if (last.length === 1) {
      const prev = lines[lines.length - 2].split(/\s+/);
      if (prev.length > 1) {
        const moved = prev.pop();
        const candidate = moved + ' ' + lines[lines.length - 1];
        if (ctx.measureText(candidate).width <= maxW) {
          lines[lines.length - 2] = prev.join(' ');
          lines[lines.length - 1] = candidate;
        }
      }
    }
  }
  return lines;
}

/** Billing block: COMING SOON above, billing lines below, centred. */
export function drawBilling(ctx, W, H, billing, release, band) {
  const { x, y, w, h } = band;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const u = W / 1080;
  // Release line.
  const rp = fitFont(ctx, release, 'Anton, sans-serif', '400', w * 0.6, h * 0.30);
  ctx.font = `400 ${rp}px Anton, sans-serif`;
  ctx.fillStyle = '#f3ead2';
  const relY = y + h * 0.17;
  ctx.fillText(release, x + w / 2, relY);
  // Billing lines: shrink the font until the wrap has no orphan word.
  let bp = Math.round(h * 0.17);
  let lines = [];
  while (bp > 10) {
    lines = wrapBilling(ctx, billing, w * 0.92, bp);
    const lastWords = lines[lines.length - 1].split(/\s+/).length;
    if (lines.length <= 2 && lastWords > 1) break;
    if (lines.length <= 2 && lastWords === 1 && lines.length === 1) break;
    bp -= 1;
  }
  ctx.font = `600 ${bp}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#e8dcc0';
  const lh = bp * 1.25;
  const startY = relY + h * 0.20 + lh / 2;
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, startY + i * lh));
  ctx.restore();
  return { x, y, w, h };
}

/** Deterministic barcode with a number line under it. */
export function drawBarcode(ctx, x, y, w, h, number) {
  ctx.save();
  ctx.fillStyle = '#f3ead2';
  let seed = 20260721;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let cx = x;
  while (cx < x + w - 2) {
    const bw = 1 + Math.floor(rnd() * 4);
    const gap = 1 + Math.floor(rnd() * 3);
    if (rnd() > 0.35) ctx.fillRect(cx, y, bw, h * 0.72);
    cx += bw + gap;
  }
  ctx.font = `600 ${Math.max(9, h * 0.16)}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(number, x + w / 2, y + h * 0.76);
  ctx.restore();
}

/** Cast tag chip + location/time micro-line at a panel's bottom-left. */
export function drawCastTag(ctx, panel, tag, sub, u) {
  const { x, y, w, h } = panel;
  const pad = 8 * u;
  const tagH = Math.max(18 * u, h * 0.085);
  const ty = y + h - tagH - pad - (sub ? tagH * 0.72 : 0);
  ctx.save();
  // Tag chip.
  const tp = fitFont(ctx, tag, 'Anton, sans-serif', '400', w * 0.9, tagH * 0.62);
  ctx.font = `400 ${tp}px Anton, sans-serif`;
  const tw = ctx.measureText(tag).width + 18 * u;
  ctx.fillStyle = 'rgba(4,6,12,0.78)';
  ctx.fillRect(x + pad, ty, tw, tagH);
  ctx.fillStyle = '#f5d76e';
  ctx.fillRect(x + pad, ty, 4 * u, tagH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, x + pad + 11 * u, ty + tagH / 2 + 1);
  // Micro-story line under the tag, on its own dark scrim so it stays
  // readable over bright photo content (card fans, chip stacks).
  if (sub) {
    const sp = fitFont(ctx, sub, '"Barlow Condensed", sans-serif', '600', w * 0.92, tagH * 0.5);
    ctx.font = `600 ${sp}px "Barlow Condensed", sans-serif`;
    const sw = ctx.measureText(sub).width;
    ctx.fillStyle = 'rgba(4,6,12,0.78)';
    ctx.fillRect(x + pad, ty + tagH, sw + 10 * u, tagH * 0.72);
    ctx.fillStyle = 'rgba(243,234,210,0.92)';
    ctx.fillText(sub, x + pad + 2 * u, ty + tagH + tagH * 0.36);
  }
  ctx.restore();
  return { x: x + pad, y: ty, w: tw, h: tagH + (sub ? tagH * 0.72 : 0) };
}
