// Decor — the casino night the panels sit on: deep navy ground, gold glow
// from above, chandelier sparkles, gold column silhouettes at the edges,
// slot-machine glow, a red-carpet band behind the billing, neon edge lines
// and one lens flare by the title. Drawn BEFORE the panels; the lettering
// glow is drawn with the title in lettering.js.
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sparkle(ctx, x, y, r, color, alpha) {
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

/** Paint the poster ground for a W×H canvas. size is 'square' | 'portrait' | 'wide'. */
export function drawDecor(ctx, W, H, size) {
  const u = W / 1080; // unit scale off the square master
  // Ground: navy top fading to near-black at the bottom.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#101a33');
  g.addColorStop(0.45, '#0a0f22');
  g.addColorStop(1, '#05070f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Gold glow from the chandelier above the title.
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.10, 0, W * 0.5, H * 0.10, W * 0.62);
  glow.addColorStop(0, 'rgba(245, 215, 110, 0.30)');
  glow.addColorStop(0.5, 'rgba(212, 175, 55, 0.10)');
  glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Felt-green glow low on the poster (the tables below).
  const felt = ctx.createRadialGradient(W * 0.5, H * 1.02, 0, W * 0.5, H * 1.02, W * 0.7);
  felt.addColorStop(0, 'rgba(11, 93, 59, 0.34)');
  felt.addColorStop(1, 'rgba(11, 93, 59, 0)');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, W, H);
  // Gold columns at the left and right edges.
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (const cx of [W * 0.015, W * 0.985]) {
    const cg = ctx.createLinearGradient(cx - 14 * u, 0, cx + 14 * u, 0);
    cg.addColorStop(0, 'rgba(212,175,55,0)');
    cg.addColorStop(0.5, 'rgba(212,175,55,0.55)');
    cg.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(cx - 14 * u, 0, 28 * u, H);
  }
  ctx.restore();
  // Slot-machine glow: soft magenta / cyan rectangles behind the panels.
  const rnd = seededRand(777);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W, y = H * (0.28 + rnd() * 0.55), w = (60 + rnd() * 90) * u, h = (90 + rnd() * 130) * u;
    const sg = ctx.createLinearGradient(x, y, x, y + h);
    const mag = rnd() > 0.5;
    sg.addColorStop(0, mag ? 'rgba(255,46,136,0.16)' : 'rgba(34,211,238,0.14)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
  }
  // Red carpet: a diagonal band behind the billing area.
  ctx.save();
  ctx.translate(W / 2, H * 0.965);
  ctx.rotate(-0.03);
  ctx.fillStyle = '#5e1220';
  ctx.fillRect(-W * 0.62, -H * 0.035, W * 1.24, H * 0.075);
  ctx.fillStyle = 'rgba(212,175,55,0.85)';
  ctx.fillRect(-W * 0.62, -H * 0.035, W * 1.24, 2 * u);
  ctx.fillRect(-W * 0.62, H * 0.035 - 2 * u, W * 1.24, 2 * u);
  ctx.restore();
  // Neon edge lines: thin magenta top, thin cyan bottom.
  ctx.fillStyle = 'rgba(255,46,136,0.55)';
  ctx.fillRect(0, 0, W, 2 * u);
  ctx.fillStyle = 'rgba(34,211,238,0.45)';
  ctx.fillRect(0, H - 2 * u, W, 2 * u);
  // Chandelier sparkles scattered on the ground.
  const sp = seededRand(4242);
  for (let i = 0; i < 26; i++) {
    const x = sp() * W, y = sp() * H * 0.9;
    const r = (1.5 + sp() * 3.5) * u;
    sparkle(ctx, x, y, r, sp() > 0.5 ? '#f5d76e' : '#ffffff', 0.25 + sp() * 0.5);
  }
  // Lens flare by the title: a bright core with a soft halo.
  const fx = W * 0.12, fy = H * 0.055;
  const flare = ctx.createRadialGradient(fx, fy, 0, fx, fy, 90 * u);
  flare.addColorStop(0, 'rgba(255,255,255,0.55)');
  flare.addColorStop(0.25, 'rgba(245,215,110,0.22)');
  flare.addColorStop(1, 'rgba(245,215,110,0)');
  ctx.fillStyle = flare;
  ctx.beginPath();
  ctx.arc(fx, fy, 90 * u, 0, Math.PI * 2);
  ctx.fill();
  sparkle(ctx, fx, fy, 10 * u, '#ffffff', 0.9);
  // Felt vignette: darken the corners a touch.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
