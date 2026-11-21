// Face finder — dependency-free saliency search tuned for portrait photos.
// Works on a downscaled copy and combines three cues per pixel:
//   * skin likelihood (YCbCr chroma + normalised rg chromaticity, tolerant of
//     warm casino light and magenta/cyan neon spill),
//   * local detail (absolute Laplacian of luminance, blurred): faces carry
//     eyes, brows and a mouth; bokeh, felt and smooth clothing do not,
//   * a prior favouring the upper-middle of the frame where portraits put
//     the head.
// A sliding-window search over integral images scores face-shaped boxes
// (inner saliency against the surrounding ring, plus the priors) and returns
// the best one in source-pixel coordinates. Hand-tagged boxes (photos.js)
// always win over a computed one; the finder runs for user-added photos and
// to rank faces for the hero pick.
const WORK_WIDTH = 120;

export function skinLikelihood(r, g, b, y) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const dcb = (cb - 112) / 16;
  const dcr = (cr - 150) / 15;
  const chroma = Math.exp(-0.5 * (dcb * dcb + dcr * dcr));
  const s = r + g + b + 1;
  const rn = r / s;
  const gn = g / s;
  const drn = (rn - 0.45) / 0.07;
  const dgn = (gn - 0.31) / 0.035;
  const chromaticity = Math.exp(-0.5 * (drn * drn + dgn * dgn));
  // Neon-lit skin: red still leads green, blue may be high (magenta spill).
  const neon = r > g * 1.15 && r > 50 && b < r * 1.25 && g < 170 ? 0.45 : 0;
  let gate = 1;
  if (y < 28) gate = y / 28;
  else if (y > 238) gate = Math.max(0, (255 - y) / 17);
  return Math.max(chroma, chromaticity, neon) * gate;
}

function laplacianMagnitude(lum, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      out[i] = Math.abs(4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - w] - lum[i + w]);
    }
  }
  return out;
}

function blurMap(src, w, h) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, cnt = 0;
      for (let k = -2; k <= 2; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < w) { sum += src[y * w + xx]; cnt++; }
      }
      tmp[y * w + x] = sum / cnt;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, cnt = 0;
      for (let k = -2; k <= 2; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < h) { sum += tmp[yy * w + x]; cnt++; }
      }
      out[y * w + x] = sum / cnt;
    }
  }
  return out;
}

function normaliseByPercentile(map, p) {
  const sorted = Float32Array.from(map).sort();
  const v = sorted[Math.floor(p * (sorted.length - 1))] || 1;
  for (let i = 0; i < map.length; i++) map[i] = Math.min(1, map[i] / v);
}

function integral(map, w, h) {
  const ii = new Float32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += map[y * w + x];
      ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row;
    }
  }
  return ii;
}

function rectSum(ii, w, x0, y0, x1, y1) {
  x0 = Math.max(0, Math.min(w, x0)); x1 = Math.max(0, Math.min(w, x1));
  y0 = Math.max(0, y0); y1 = Math.max(0, y1);
  const W = w + 1;
  return ii[y1 * W + x1] - ii[y0 * W + x1] - ii[y1 * W + x0] + ii[y0 * W + x0];
}

/** Draw the source into a small canvas and return luminance, skin and detail maps. */
export function buildSaliencyMaps(source, srcW, srcH) {
  const w = WORK_WIDTH;
  const h = Math.max(8, Math.round((srcH * w) / srcW));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const n = w * h;
  const lum = new Float32Array(n);
  const skin = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = y;
    skin[i] = skinLikelihood(r, g, b, y);
  }
  const detail = blurMap(blurMap(laplacianMagnitude(lum, w, h), w, h), w, h);
  normaliseByPercentile(detail, 0.96);
  return { w, h, lum, skin, detail, scale: srcW / w };
}

/** Score one face-shaped box: inner saliency vs the ring around it. */
function scoreBox(skinII, detII, maps, x, y, bw, bh) {
  const { w, h } = maps;
  const innerSkin = rectSum(skinII, w, x, y, x + bw, y + bh) / (bw * bh);
  const innerDet = rectSum(detII, w, x, y, x + bw, y + bh) / (bw * bh);
  const ring = 6;
  const rx0 = Math.max(0, x - ring), ry0 = Math.max(0, y - ring);
  const rx1 = Math.min(w, x + bw + ring), ry1 = Math.min(h, y + bh + ring);
  const ringArea = Math.max(1, (rx1 - rx0) * (ry1 - ry0) - bw * bh);
  const ringSkin = (rectSum(skinII, w, rx0, ry0, rx1, ry1) - innerSkin * bw * bh) / ringArea;
  const ringDet = (rectSum(detII, w, rx0, ry0, rx1, ry1) - innerDet * bw * bh) / ringArea;
  // Upper-middle prior: portraits put the head high and near the centre.
  const cx = (x + bw / 2) / w;
  const cy = (y + bh / 2) / h;
  const prior = Math.exp(-0.5 * Math.pow((cx - 0.5) / 0.28, 2)) * Math.exp(-0.5 * Math.pow((cy - 0.28) / 0.30, 2));
  return (innerSkin * 0.62 + innerDet * 0.38 - ringSkin * 0.30 - ringDet * 0.12) * (0.55 + 0.45 * prior);
}

/** Find the best face box in a photo. Returns [x0,y0,x1,y1] in 0..1, or null. */
export function findFace(source, srcW, srcH) {
  const maps = buildSaliencyMaps(source, srcW, srcH);
  const skinII = integral(maps.skin, maps.w, maps.h);
  const detII = integral(maps.detail, maps.w, maps.h);
  let best = null, bestScore = -Infinity;
  // Faces are roughly square, between 18% and 55% of the frame width.
  for (let bw = Math.round(maps.w * 0.18); bw <= maps.w * 0.55; bw += 3) {
    const bh = Math.round(bw * 1.25);
    if (bh > maps.h * 0.7) continue;
    for (let y = 0; y + bh <= maps.h; y += 3) {
      for (let x = 0; x + bw <= maps.w; x += 3) {
        const s = scoreBox(skinII, detII, maps, x, y, bw, bh);
        if (s > bestScore) { bestScore = s; best = { x, y, bw, bh }; }
      }
    }
  }
  if (!best || bestScore < 0.10) return null;
  return fitFaceBoxToSkin(maps, best);
}

/** Tighten a found box to the skin cluster inside it (hair-to-chin). */
function fitFaceBoxToSkin(maps, box) {
  const { w, h, skin, scale } = maps;
  let x0 = box.x, x1 = box.x + box.bw, y0 = box.y, y1 = box.y + box.bh;
  // Shrink each edge while the edge row/column holds almost no skin.
  const colSkin = (x) => { let s = 0; for (let y = y0; y < y1; y++) s += skin[y * w + x]; return s / Math.max(1, y1 - y0); };
  const rowSkin = (y) => { let s = 0; for (let x = x0; x < x1; x++) s += skin[y * w + x]; return s / Math.max(1, x1 - x0); };
  while (x1 - x0 > 8 && colSkin(x0) < 0.12) x0++;
  while (x1 - x0 > 8 && colSkin(x1 - 1) < 0.12) x1--;
  while (y1 - y0 > 8 && rowSkin(y0) < 0.10) y0++;
  while (y1 - y0 > 8 && rowSkin(y1 - 1) < 0.10) y1--;
  // Headroom: keep a little hair above the skin top.
  y0 = Math.max(0, y0 - Math.round((y1 - y0) * 0.12));
  // Normalised 0..1 coordinates (small-map pixels divided by map size).
  return [x0 / w, y0 / h, x1 / w, y1 / h];
}

/** Quality score 0..1 for a face box: brightness, contrast, sharpness, size. */
export function scoreFaceQuality(source, srcW, srcH, face) {
  if (!face) return 0;
  const maps = buildSaliencyMaps(source, srcW, srcH);
  const { w, h, lum, detail, scale } = maps;
  const x0 = Math.floor(face[0] * srcW / scale), x1 = Math.ceil(face[2] * srcW / scale);
  const y0 = Math.floor(face[1] * srcH / scale), y1 = Math.ceil(face[3] * srcH / scale);
  let sum = 0, sum2 = 0, det = 0, n = 0;
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const v = lum[y * w + x];
      sum += v; sum2 += v * v; det += detail[y * w + x]; n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sum2 / n - mean * mean)) / 128;
  const bright = 1 - Math.abs(mean - 150) / 150;
  const sharp = Math.min(1, (det / n) * 4);
  const size = Math.min(1, ((face[2] - face[0]) * srcW) / 260);
  return Math.max(0, Math.min(1, bright * 0.3 + contrast * 0.25 + sharp * 0.25 + size * 0.2));
}
