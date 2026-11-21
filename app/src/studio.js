// HIGH ROLLER studio — the editor. Click a panel to select it, drag to pan,
// wheel to zoom, drag a photo's slot number to swap it, drop a photo on the
// preview to add it. Undo/redo, 3 live mini previews, PNG export in 3 sizes.
import { loadFonts } from './fonts.js';
import { loadAllSamples } from './photos.js';
import { LAYOUTS, layoutById, computeLayout } from './layouts.js';
import { GRADES } from './grades.js';
import { renderCoverTo, renderCoverDataURL, faceReport, RENDER_SIZES } from './renderCover.js';
import { drawOverlay, panelAt } from './panelOverlay.js';
import { renderMiniPreviews } from './presetThumbs.js';
import { autoFill } from './autoFill.js';
import { createHistory } from './history.js';
import { exportPng } from './exportPng.js';
import { installTestHook } from './testHook.js';
import { resolveFace } from './smartCrop.js';

const $ = (id) => document.getElementById(id);
const state = {
  photos: [],
  slots: [0, 1, 2, 3, 4, 5, 6],
  layout: 'casinoMosaic',
  grade: 'neonGold',
  size: 'square',
  title: 'HIGH ROLLER',
  script: 'All in.',
  tagline: 'SEVEN SOULS · ONE NIGHT · NO WAY OUT',
  quote: 'The cards never lie',
  source: 'THE NEON LEDGER',
  billing: 'a HIGH ROLLER PICTURES production with GOLDEN PALMS FILMS an C. VOSS film HIGH ROLLER music by VELVET STATIC',
  release: 'COMING SOON',
  tags: ['THE DEALER', 'THE WHALE', 'THE PIT BOSS', 'THE CARD SHARK', 'THE WAITRESS', 'THE LOOKOUT', 'THE CASINO FLOOR'],
  panels: {},
  selected: 0,
};

const history = createHistory();
let lastLayout = null;
let lastFaceBoxes = [];

function snapshot() {
  const { photos, selected, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
}
function restore(snap) {
  const sel = state.selected;
  Object.assign(state, JSON.parse(JSON.stringify(snap)));
  state.selected = sel;
  syncInputs();
  render();
}
function commit() {
  history.push(snapshot());
  $('undoBtn').disabled = !history.canUndo();
  $('redoBtn').disabled = !history.canRedo();
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function previewDims() {
  if (state.size === 'portrait') return { w: 576, h: 720 };
  if (state.size === 'wide') return { w: 720, h: 405 };
  return { w: 720, h: 720 };
}

function syncTagsFromSlots() {
  state.tags = state.slots.map((i, s) => (state.photos[i] ? state.photos[i].tag : state.tags[s] || ''));
}

function render() {
  const { w, h } = previewDims();
  const pc = $('previewCanvas'), oc = $('overlayCanvas');
  if (pc.width !== w) { pc.width = w; pc.height = h; oc.width = w; oc.height = h; }
  const ctx = pc.getContext('2d');
  const out = renderCoverTo(ctx, w, h, state);
  lastLayout = out;
  lastFaceBoxes = out.faceBoxes;
  drawOverlay(oc.getContext('2d'), w, h, { panels: out.panels }, state.selected, out.faceBoxes);
  const rep = faceReport(state);
  $('faceReport').textContent = `Faces cut: ${rep.facesCut} · covered: ${rep.facesCovered} · tags touching: ${rep.tagsTouching}`;
  $('faceReport').classList.toggle('bad', rep.facesCut + rep.facesCovered + rep.tagsTouching > 0);
  renderMiniPreviews($('miniPreviews'), state);
  updateToolbar();
}

function updateToolbar() {
  const sel = state.selected;
  const photo = state.photos[state.slots[sel]];
  const adj = state.panels[sel] || {};
  $('panelToolbar').innerHTML = '';
  const mk = (label, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => { commit(); fn(); render(); });
    $('panelToolbar').appendChild(b);
    return b;
  };
  const info = document.createElement('span');
  info.textContent = `Panel ${sel + 1} · ${photo ? photo.tag : '—'} · zoom ${(adj.zoom || 1).toFixed(2)}`;
  $('panelToolbar').appendChild(info);
  mk('Zoom +', () => { state.panels[sel] = { ...adj, zoom: Math.min(2.5, (adj.zoom || 1) * 1.15) }; });
  mk('Zoom −', () => { state.panels[sel] = { ...adj, zoom: Math.max(1, (adj.zoom || 1) / 1.15) }; });
  mk('Flip', () => { state.panels[sel] = { ...adj, flip: !adj.flip }; });
  mk('Reset', () => { state.panels[sel] = {}; });
  mk('Remove photo', () => {
    if (state.photos.length <= 1) return;
    const idx = state.slots[sel];
    state.photos.splice(idx, 1);
    state.slots = state.slots.map((s) => (s > idx ? s - 1 : s));
    autoFill(state);
    syncTagsFromSlots();
  });
}

function renderPhotoList() {
  const list = $('photoList');
  list.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const item = document.createElement('div');
    item.className = 'photo-item';
    const thumb = document.createElement('img');
    thumb.src = photo.img.src;
    thumb.alt = photo.tag;
    const meta = document.createElement('div');
    meta.className = 'photo-meta';
    const name = document.createElement('span');
    name.className = 'photo-name';
    name.textContent = photo.tag;
    const sub = document.createElement('span');
    sub.className = 'photo-sub';
    sub.textContent = `${photo.place} · ${photo.time}`;
    meta.appendChild(name);
    meta.appendChild(sub);
    // Slot chip: draggable — drop it on another chip to swap slots.
    const chip = document.createElement('input');
    chip.className = 'slot-chip';
    chip.type = 'text';
    chip.inputMode = 'numeric';
    chip.value = String(state.slots.indexOf(i) + 1 || 0);
    chip.title = 'Slot number — drag onto another slot to swap';
    chip.draggable = true;
    chip.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', String(i)); });
    chip.addEventListener('dragover', (ev) => ev.preventDefault());
    chip.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const from = Number(ev.dataTransfer.getData('text/plain'));
      const a = state.slots.indexOf(from), b = state.slots.indexOf(i);
      if (a >= 0 && b >= 0 && a !== b) {
        commit();
        [state.slots[a], state.slots[b]] = [state.slots[b], state.slots[a]];
        [state.tags[a], state.tags[b]] = [state.tags[b], state.tags[a]];
        render();
      }
    });
    chip.addEventListener('change', () => {
      const n = Number(chip.value) - 1;
      if (n >= 0 && n < 7) {
        commit();
        const cur = state.slots.indexOf(i);
        if (cur >= 0) state.slots[cur] = state.slots[n];
        state.slots[n] = i;
        if (cur >= 0) [state.tags[cur], state.tags[n]] = [state.tags[n], state.tags[cur]];
        render();
      } else { chip.value = String(state.slots.indexOf(i) + 1 || 0); }
    });
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'use-btn';
    use.textContent = 'Use in selected';
    use.addEventListener('click', () => {
      commit();
      state.slots[state.selected] = i;
      state.tags[state.selected] = photo.tag;
      render();
    });
    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(chip);
    item.appendChild(use);
    list.appendChild(item);
  });
}

function renderPresets() {
  const lp = $('layoutPresets');
  lp.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = l.name;
    b.classList.toggle('active', state.layout === l.id);
    b.addEventListener('click', () => { commit(); state.layout = l.id; syncInputs(); render(); });
    lp.appendChild(b);
  }
  const gp = $('gradePresets');
  gp.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = g.name;
    b.classList.toggle('active', state.grade === g.id);
    b.addEventListener('click', () => { commit(); state.grade = g.id; syncInputs(); render(); });
    gp.appendChild(b);
  }
  const sp = $('sizeSwitch');
  sp.innerHTML = '';
  for (const [id, s] of Object.entries(RENDER_SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.w + '×' + s.h;
    b.classList.toggle('active', state.size === id);
    b.addEventListener('click', () => { commit(); state.size = id; syncInputs(); render(); });
    sp.appendChild(b);
  }
}

function syncInputs() {
  $('titleInput').value = state.title;
  $('scriptInput').value = state.script;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('sourceInput').value = state.source;
  $('billingInput').value = state.billing;
  $('releaseInput').value = state.release;
  document.querySelectorAll('#tagInputs input').forEach((el) => {
    el.value = state.tags[Number(el.dataset.slot)] || '';
  });
  renderPresets();
  renderPhotoList();
}

function bindInputs() {
  const bind = (id, key) => {
    $(id).addEventListener('input', () => { state[key] = $(id).value; render(); });
    $(id).addEventListener('change', () => commit());
  };
  bind('titleInput', 'title');
  bind('scriptInput', 'script');
  bind('taglineInput', 'tagline');
  bind('quoteInput', 'quote');
  bind('sourceInput', 'source');
  bind('billingInput', 'billing');
  bind('releaseInput', 'release');
  document.querySelectorAll('#tagInputs input').forEach((el) => {
    el.addEventListener('input', () => {
      state.tags[Number(el.dataset.slot)] = el.value;
      render();
    });
    el.addEventListener('change', () => commit());
  });
  $('undoBtn').addEventListener('click', () => {
    const snap = history.undo(snapshot());
    if (snap) { restore(snap); $('undoBtn').disabled = !history.canUndo(); $('redoBtn').disabled = !history.canRedo(); }
  });
  $('redoBtn').addEventListener('click', () => {
    const snap = history.redo(snapshot());
    if (snap) { restore(snap); $('undoBtn').disabled = !history.canUndo(); $('redoBtn').disabled = !history.canRedo(); }
  });
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); $('undoBtn').click(); }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) { ev.preventDefault(); $('redoBtn').click(); }
  });
  $('samplesBtn').addEventListener('click', async () => {
    commit();
    state.photos = await loadAllSamples();
    autoFill(state);
    syncTagsFromSlots();
    renderPhotoList();
    render();
    toast('Samples loaded');
  });
  $('fileInput').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    for (const file of files) await addUserPhoto(file);
    ev.target.value = '';
  });
  document.querySelectorAll('#exportCard button').forEach((b) => {
    b.addEventListener('click', async () => {
      await exportPng(state, b.dataset.export);
      toast('Exported ' + b.dataset.export);
    });
  });
  $('miniPreviews').addEventListener('mini-pick', (ev) => {
    commit();
    state.size = ev.detail;
    syncInputs();
    render();
  });
  bindPreviewGestures();
}

async function addUserPhoto(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const photo = {
    id: 'user-' + Date.now(), file: file.name, tag: file.name.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 18) || 'GUEST',
    place: 'THE FLOOR', time: '—', story: '', face: null, img, w: img.naturalWidth, h: img.naturalHeight, score: null, user: true,
  };
  resolveFace(photo);
  commit();
  state.photos.push(photo);
  renderPhotoList();
  render();
  toast('Photo added — face ' + (photo.face ? 'found' : 'not found'));
}

function bindPreviewGestures() {
  const pc = $('previewCanvas');
  let drag = null;
  const toLocal = (ev) => {
    const r = pc.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (pc.width / r.width), y: (ev.clientY - r.top) * (pc.height / r.height) };
  };
  pc.addEventListener('pointerdown', (ev) => {
    const p = toLocal(ev);
    const slot = lastLayout ? panelAt({ panels: lastLayout.panels }, p.x, p.y) : null;
    if (slot == null) return;
    state.selected = slot;
    pc.setPointerCapture(ev.pointerId);
    drag = { slot, x: p.x, y: p.y, moved: false };
    render();
  });
  pc.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = toLocal(ev);
    const dx = p.x - drag.x, dy = p.y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const panel = lastLayout.panels[drag.slot];
    const adj = state.panels[drag.slot] || {};
    const nx = Math.max(-1, Math.min(1, (adj.ox || 0) + dx / (panel.w * 0.4)));
    const ny = Math.max(-1, Math.min(1, (adj.oy || 0) + dy / (panel.h * 0.4)));
    state.panels[drag.slot] = { ...adj, ox: nx, oy: ny };
    drag.x = p.x; drag.y = p.y;
    render();
  });
  pc.addEventListener('pointerup', () => {
    if (drag && drag.moved) commit();
    drag = null;
  });
  pc.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const adj = state.panels[state.selected] || {};
    const k = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    state.panels[state.selected] = { ...adj, zoom: Math.max(1, Math.min(2.5, (adj.zoom || 1) * k)) };
    render();
  }, { passive: false });
  pc.addEventListener('dblclick', () => {
    commit();
    state.panels[state.selected] = {};
    render();
  });
  // Drop a photo on the preview to add it.
  pc.addEventListener('dragover', (ev) => ev.preventDefault());
  pc.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    for (const file of [...ev.dataTransfer.files]) {
      if (file.type.startsWith('image/')) await addUserPhoto(file);
    }
  });
}

async function init() {
  const hook = installTestHook(
    () => state,
    (name) => { state.grade = name; syncInputs(); render(); },
    (name) => { state.layout = name; syncInputs(); render(); },
  );
  await loadFonts();
  state.photos = await loadAllSamples();
  autoFill(state);
  syncTagsFromSlots();
  bindInputs();
  syncInputs();
  render();
  hook._resolveReady(true);
}

init().catch((err) => {
  console.error(err);
  document.getElementById('toast').textContent = 'Studio failed: ' + err.message;
});
