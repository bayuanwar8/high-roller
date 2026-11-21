// Font loader — Anton (display), Caveat (script), Barlow Condensed SemiBold
// (captions / billing). All SIL OFL, shipped under app/fonts/.
const FONTS = [
  { family: 'Anton', weight: '400', file: 'Anton-Regular.ttf' },
  { family: 'Caveat', weight: '700', file: 'Caveat-Variable.ttf' },
  { family: 'Barlow Condensed', weight: '600', file: 'BarlowCondensed-SemiBold.ttf' },
];

export async function loadFonts() {
  const jobs = FONTS.map(async (f) => {
    const face = new FontFace(f.family, `url(fonts/${f.file})`, { weight: f.weight });
    const loaded = await face.load();
    document.fonts.add(loaded);
    return f.family;
  });
  await Promise.all(jobs);
  // Let the layout engine settle on the real metrics before first render.
  await document.fonts.ready;
}
