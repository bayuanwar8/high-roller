// HIGH ROLLER sample cast — 8 original AI-generated photos, medium shots,
// faces hand-tagged (normalized x0,y0,x1,y1, hair to chin). The floor panel
// has no face. Each photo also carries its location + time + micro-story,
// the rank-9 trick from the top-10 dissection.
export const SAMPLES = [
  { file: 'dealer.jpg', tag: 'THE DEALER', place: 'BLACKJACK TABLE', time: '11:47 PM', story: 'DEALS THE NIGHT', face: [0.30, 0.06, 0.66, 0.44], hero: true },
  { file: 'whale.jpg', tag: 'THE WHALE', place: 'HIGH LIMIT ROOM', time: '1:15 AM', story: 'OWNS THE TABLE', face: [0.28, 0.08, 0.70, 0.46] },
  { file: 'pitboss.jpg', tag: 'THE PIT BOSS', place: 'THE FLOOR', time: '12:30 AM', story: 'SEES EVERYTHING', face: [0.32, 0.08, 0.72, 0.48] },
  { file: 'shark.jpg', tag: 'THE CARD SHARK', place: 'THE BAR', time: '2:40 AM', story: 'NEVER BLUFFS', face: [0.20, 0.08, 0.70, 0.50] },
  { file: 'waitress.jpg', tag: 'THE WAITRESS', place: 'THE LOUNGE', time: '10:05 PM', story: 'KNOWS YOUR DRINK', face: [0.36, 0.08, 0.68, 0.42] },
  { file: 'lookout.jpg', tag: 'THE LOOKOUT', place: 'VIP DOOR', time: '3:12 AM', story: 'NO NAMES, NO ENTRY', face: [0.36, 0.06, 0.64, 0.40] },
  { file: 'floor.jpg', tag: 'THE CASINO FLOOR', place: 'THE STRIP', time: '2:00 AM', story: 'NEVER SLEEPS', face: null },
  { file: 'croupier.jpg', tag: 'THE CROUPIER', place: 'ROULETTE', time: '12:05 AM', story: 'SPINS THE WHEEL', face: [0.38, 0.10, 0.62, 0.38] },
];

// Load a sample file into an Image. Returns a photo record the studio owns.
export function loadSample(def) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({
      id: def.file, file: def.file, tag: def.tag, place: def.place, time: def.time,
      story: def.story, face: def.face, hero: !!def.hero, faceKnown: true,
      img, w: img.naturalWidth, h: img.naturalHeight, score: null, user: false,
    });
    img.onerror = () => reject(new Error('sample failed: ' + def.file));
    img.src = 'samples/' + def.file;
  });
}

export async function loadAllSamples() {
  const out = [];
  for (const def of SAMPLES) out.push(await loadSample(def));
  return out;
}
