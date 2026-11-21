// Grades — 6 casino looks, all on pixel data: tone curve, split toning,
// saturation / vibrance, S-curve contrast, vignette, grain. Skin-tone
// protection: saturation and hue moves are damped inside the skin mask, so
// warm skin stays warm under every grade and never goes grey or magenta.
export const GRADES = [
  { id: 'neonGold', name: 'Neon Gold', lift: 0.02, gamma: 0.95, gain: 1.04, contrast: 0.16, sat: 1.18, warm: 0.10, shadow: [8, 2, -14], high: [26, 10, -6], vig: 0.22, grain: 0.020 },
  { id: 'feltGreen', name: 'Felt Green', lift: 0.03, gamma: 1.00, gain: 1.02, contrast: 0.12, sat: 1.10, warm: -0.04, shadow: [-6, 14, 4], high: [6, 16, 2], vig: 0.20, grain: 0.018 },
  { id: 'smokeGold', name: 'Smoke & Gold', lift: 0.08, gamma: 1.08, gain: 0.98, contrast: 0.08, sat: 0.88, warm: 0.06, shadow: [10, 6, -4], high: [18, 8, -2], vig: 0.30, grain: 0.026 },
  { id: 'midnightBlue', name: 'Midnight Blue', lift: 0.02, gamma: 1.02, gain: 1.00, contrast: 0.14, sat: 1.06, warm: -0.12, shadow: [-10, -2, 18], high: [-4, 6, 22], vig: 0.26, grain: 0.018 },
  { id: 'velvetRed', name: 'Velvet Red', lift: 0.03, gamma: 0.98, gain: 1.02, contrast: 0.15, sat: 1.12, warm: 0.08, shadow: [16, -4, -2], high: [20, 2, -6], vig: 0.28, grain: 0.022 },
  { id: 'champagne', name: 'Champagne', lift: 0.06, gamma: 0.92, gain: 1.06, contrast: 0.06, sat: 1.05, warm: 0.12, shadow: [8, 4, -8], high: [24, 12, 0], vig: 0.14, grain: 0.014 },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Deterministic per-pixel grain (hash of x,y) so two renders are identical.
function grainAt(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 974634211) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return (h / 4294967295) - 0.5;
}

/** Apply a grade to an ImageData in place. mask is the skin mask (Float32Array) or null. */
export function applyGrade(img, gradeId, mask) {
  const g = gradeById(gradeId);
  const d = img.data;
  const w = img.width, h = img.height;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const seed = g.id.length * 7919 + 13;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
      const skin = mask ? mask[y * w + x] : 0;
      // Tone curve: lift + gamma + gain.
      r = Math.pow(Math.max(0, (r - g.lift) / (1 - g.lift)), g.gamma) * g.gain;
      gg = Math.pow(Math.max(0, (gg - g.lift) / (1 - g.lift)), g.gamma) * g.gain;
      b = Math.pow(Math.max(0, (b - g.lift) / (1 - g.lift)), g.gamma) * g.gain;
      // S-curve contrast around 0.5.
      const sc = (v) => { const t = Math.max(0, Math.min(1, v)); return t + g.contrast * Math.sin(Math.PI * (t - 0.5)) * 0.5; };
      r = sc(r); gg = sc(gg); b = sc(b);
      // Saturation (damped inside skin) + warm shift (also damped in skin).
      const luma = 0.299 * r + 0.587 * gg + 0.114 * b;
      const satK = 1 + (g.sat - 1) * (1 - skin * 0.75);
      r = luma + (r - luma) * satK;
      gg = luma + (gg - luma) * satK;
      b = luma + (b - luma) * satK;
      const warmK = g.warm * (1 - skin * 0.6);
      r += warmK * 0.10; b -= warmK * 0.10;
      // Split toning: shadows and highlights tinted, damped in skin.
      const toneK = 1 - skin * 0.7;
      r += ((g.shadow[0] * (1 - luma) + g.high[0] * luma) / 255) * toneK;
      gg += ((g.shadow[1] * (1 - luma) + g.high[1] * luma) / 255) * toneK;
      b += ((g.shadow[2] * (1 - luma) + g.high[2] * luma) / 255) * toneK;
      // Vignette.
      const dx = (x - cx) / maxR, dy = (y - cy) / maxR;
      const v = 1 - g.vig * (dx * dx + dy * dy) * 1.6;
      r *= v; gg *= v; b *= v;
      // Grain.
      const gr = grainAt(x, y, seed) * g.grain;
      r += gr; gg += gr; b += gr;
      d[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round(gg * 255)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    }
  }
}
