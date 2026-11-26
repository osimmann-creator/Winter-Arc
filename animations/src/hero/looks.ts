/* Looks: who the hero rig draws. Every member shares Flexander's body, toga, sash, belt, cuffs and sandals;
   a look changes only the person: skin and hair colours, hairstyle, beard, glasses and the face (eyes, brows,
   nose, mouth, head shape, freckles). FLEXANDER reproduces the mascot exactly, so it's the default everywhere.

   Use: <Hero look={LOOKS.osim} … /> or wrap a scene in <LookCtx.Provider value={LOOKS.osim}>.
   The character sheets (src/sheets/CharacterSheet.tsx → characters/) show each one. */
import React from 'react';

export type SkinPal = {
  skin: string; face: string; limb: string; sh: string; hi: string; mid: string; deep: string; warm: string;
  cheek: string; stub: string; line: string; fistSh: string; neckHi: string; chestHi: string; freckle: string;
};
export type HairPal = { hair: string; mid: string; lite: string; curl: string; dark: string };
export type HairStyle =
  | 'flex'      // Flexander's curls under the laurel
  | 'swept'     // short sides, top swept up and back (Osim)
  | 'curtain'   // middle part, bangs falling to both sides (Phil)
  | 'fringe'    // soft fringe swept across the forehead (Dylan)
  | 'quiff'     // short sides, tall front swept up (Connor)
  | 'shaggy'    // messy medium length, locks over the forehead (Gaurav)
  | 'tousled'   // short and scruffy, pushed up at the front (Dean)
  | 'curls'     // tight curls piled on top, faded sides (Amaan)
  | 'wave'      // short, wavy, combed up (Jake)
  | 'flow';     // medium length, swept back, falling past the temples (Ayaad)
export type Beard = {
  /** short/full: a band along the jaw that wraps the chin and the mouth, drawn as dots over a light wash.
      stubble: only a light shadow of dots over the lower cheeks, with a faint chin patch. */
  style: 'full' | 'short' | 'stubble';
  mustache: 'full' | 'thin';
  /** width of the beard up the sides of the face (head units: ~8 trimmed … 20 full) */
  band: number;
  /** opacity of the stubble shadow over the lower cheeks (0 = none) */
  shadow: number;
  /** opacity of the wash under the dots (the skin shows through it) */
  alpha?: number;
  color: string;
};
export type Look = {
  id: string;
  name: string;
  skin: SkinPal;
  hair: HairPal & { style: HairStyle };
  /** flex = Flexander's big cartoon eyes and ink brows; person = smaller eyes with iris, lash line and shaped brows */
  face: 'flex' | 'person';
  eye: { rx: number; ry: number; gap: number; y: number; iris: string; lid: number; tilt?: number };
  brow: { color: string; w: number; arch: number; y: number; len: number; tilt: number; raise: [number, number] };
  nose: { w: number; top: number; tip: number; bridge: number };
  /** rest = the closed mouth when a pose doesn't open it. grin = teeth showing · big = huge toothy grin ·
      smile = closed lips · flat = deadpan · smirk = one corner up */
  mouth: { w: number; rest: 'grin' | 'big' | 'smile' | 'flat' | 'smirk'; y: number };
  head: { w: number; jaw: number; chin: number; cheek: number };
  beard?: Beard;
  glasses?: { frame: string; lens: string; w: number; h: number; r: number; y: number };
  freckles: number;
  laurel: boolean;
  /** the member's app colour (ROSTER in js/config.js), for name tags; the toga stays the same for everyone */
  tag: string;
};

/* ------------------------------------------------------------------ colour helpers */
const hex2rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
const rgb2hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
export function toHsl(c: string): [number, number, number] {
  const [r, g, b] = hex2rgb(c);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function fromHsl(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360 / 360;
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  if (s === 0) return rgb2hex(l, l, l);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return rgb2hex(f(h + 1 / 3), f(h), f(h - 1 / 3));
}
/** shift a colour: dl = lightness, sk = saturation factor, dh = hue degrees */
export const tone = (c: string, dl: number, sk = 1, dh = 0) => {
  const [h, s, l] = toHsl(c);
  return fromHsl(h + dh, s * sk, l + dl);
};

/** A skin palette from one base tone, shaded the way Flexander's is (warmer and redder in the shadows). */
export function skinPal(base: string, o: Partial<SkinPal> = {}): SkinPal {
  const [, , l] = toHsl(base);
  const k = l < 0.55 ? 0.8 : 1; // darker skin: slightly smaller steps so shadows don't go muddy
  return {
    skin: base,
    face: tone(base, 0.012),
    limb: tone(base, 0.022),
    sh: tone(base, -0.15 * k, 0.92, -5),
    hi: tone(base, 0.1, 1.0, 9),
    mid: tone(base, -0.1 * k, 0.95, -4),
    deep: tone(base, -0.21 * k, 0.86, -8),
    warm: tone(base, -0.07 * k, 1, -3),
    cheek: tone(base, -0.09 * k, 1.12, -13),
    stub: tone(base, -0.06 * k),
    line: tone(base, -0.42 * k, 0.62, -12),
    fistSh: tone(base, -0.075 * k, 1, -3),
    neckHi: tone(base, -0.065 * k, 1, -3),
    chestHi: tone(base, 0.055, 1, 5),
    freckle: tone(base, -0.2, 1.05, -8),
    ...o,
  };
}
/** A hair palette from its base colour: mid and curl for the lit masses, lite for the shine, dark for the strands. */
export function hairPal(base: string, o: Partial<HairPal> = {}): HairPal {
  const [, , l] = toHsl(base);
  const dark = l < 0.15; // black hair shines cool, not brown
  return {
    hair: base,
    mid: dark ? tone(base, 0.07, 1.1, 8) : tone(base, 0.07, 1.05),
    lite: dark ? tone(base, 0.25, 0.7, 30) : tone(base, 0.2, 1.05, 6),
    curl: dark ? tone(base, 0.15, 0.8, 20) : tone(base, 0.13, 1.05, 3),
    dark: dark ? tone(base, -0.04) : tone(base, -0.08, 1.05, -4),
    ...o,
  };
}

/* ------------------------------------------------------------------ Flexander (the mascot) */
export const FLEXANDER: Look = {
  id: 'flexander',
  name: 'Flexander',
  skin: {
    skin: '#FFB784', face: '#FFBC88', limb: '#FFC08A', sh: '#D87D50', hi: '#FFE3B7', mid: '#EA8B59', deep: '#CA6C46',
    warm: '#ED9567', cheek: '#E77960', stub: '#EE9A73', line: '#783B2B', fistSh: '#EE936A', neckHi: '#EA9B70',
    chestHi: '#FFD1A1', freckle: '#C8714C',
  },
  hair: { style: 'flex', hair: '#462728', mid: '#623735', lite: '#C27C5E', curl: '#A3614F', dark: '#844D45' },
  face: 'flex',
  eye: { rx: 40, ry: 52, gap: 39, y: -176, iris: '#8F513D', lid: 0 },
  brow: { color: '#341720', w: 16, arch: 12, y: -238, len: 70, tilt: 0, raise: [0, 0] },
  nose: { w: 30, top: -166, tip: -100, bridge: 9 },
  mouth: { w: 1, rest: 'grin', y: 0 },
  head: { w: 1, jaw: 0, chin: 0, cheek: 0 },
  freckles: 0,
  laurel: true,
  tag: '#7254DC',
};

export const LookCtx = React.createContext<Look>(FLEXANDER);
export const useLook = () => React.useContext(LookCtx);

/* ------------------------------------------------------------------ the group (one look per ROSTER username) */
const person = (o: Partial<Look> & Pick<Look, 'id' | 'name' | 'skin' | 'hair' | 'tag'>): Look => ({
  face: 'person',
  eye: { rx: 25, ry: 19, gap: 47, y: -166, iris: '#4A2E22', lid: 0 },
  brow: { color: o.hair.dark, w: 13, arch: 8, y: -214, len: 62, tilt: 0, raise: [0, 0] },
  nose: { w: 20, top: -150, tip: -110, bridge: 6 },
  mouth: { w: 1, rest: 'grin', y: 0 },
  head: { w: 0.97, jaw: 0, chin: 2, cheek: 0 },
  freckles: 0,
  laurel: false,
  ...o,
});

export const LOOKS: Record<string, Look> = {
  osim: person({
    id: 'osim', name: 'Osim', tag: '#7254DC',
    skin: skinPal('#E2A67C'),
    hair: { style: 'swept', ...hairPal('#2A1C19') },
    eye: { rx: 24, ry: 18, gap: 47, y: -166, iris: '#4A2C1E', lid: 0.08 },
    brow: { color: '#2A1C19', w: 15, arch: 6, y: -212, len: 64, tilt: -0.1, raise: [0, 0] },
    nose: { w: 22, top: -150, tip: -108, bridge: 6 },
    beard: { style: 'short', mustache: 'full', band: 8, shadow: 0, color: '#35261F', alpha: 0.3 },
    head: { w: 0.99, jaw: 0, chin: 2, cheek: 0.1 },
    glasses: { frame: '#221A1E', lens: '#BFE3FF', w: 70, h: 52, r: 12, y: 2 },
  }),
  phil: person({
    id: 'phil', name: 'Phil', tag: '#D9644F',
    skin: skinPal('#F1C59C'),
    hair: { style: 'curtain', ...hairPal('#1F1A19') },
    eye: { rx: 24, ry: 14, gap: 49, y: -164, iris: '#33221A', lid: 0.1, tilt: 2 },
    brow: { color: '#1C1A21', w: 12, arch: 7, y: -208, len: 60, tilt: 0, raise: [0, 0] },
    nose: { w: 22, top: -138, tip: -110, bridge: 5 },
    mouth: { w: 1.08, rest: 'grin', y: 0 },
    head: { w: 0.97, jaw: 0.04, chin: 0, cheek: 0.15 },
  }),
  dylan: person({
    id: 'dylan', name: 'Dylan', tag: '#1FA3A0',
    skin: skinPal('#F3C29D'),
    hair: { style: 'fringe', ...hairPal('#8A5C3B', { lite: '#D8A878' }) },
    eye: { rx: 24, ry: 17, gap: 46, y: -166, iris: '#5B7A86', lid: 0.12 },
    brow: { color: '#6B4429', w: 12, arch: 7, y: -212, len: 60, tilt: 0, raise: [0, 0] },
    nose: { w: 19, top: -150, tip: -110, bridge: 6 },
    mouth: { w: 1.12, rest: 'big', y: 2 },
    head: { w: 0.93, jaw: -0.03, chin: 10, cheek: 0 },
  }),
  connor: person({
    id: 'connor', name: 'Connor', tag: '#2F66E6',
    skin: skinPal('#F4C39E'),
    hair: { style: 'quiff', ...hairPal('#4A2D1D') },
    eye: { rx: 24, ry: 18, gap: 47, y: -166, iris: '#4F3424', lid: 0.04 },
    brow: { color: '#2E1C13', w: 14, arch: 5, y: -214, len: 64, tilt: 0, raise: [0, 0] },
    nose: { w: 19, top: -152, tip: -110, bridge: 6 },
    mouth: { w: 1.08, rest: 'grin', y: 0 },
    head: { w: 0.95, jaw: 0.07, chin: 8, cheek: -0.1 },
  }),
  gaurav: person({
    id: 'gaurav', name: 'Gaurav', tag: '#B45AC8',
    skin: skinPal('#A86F4B'),
    hair: { style: 'shaggy', ...hairPal('#16120F') },
    eye: { rx: 25, ry: 18, gap: 48, y: -166, iris: '#2C1C14', lid: 0.4 },
    brow: { color: '#16120F', w: 15, arch: 3, y: -210, len: 64, tilt: 0.1, raise: [0, 0] },
    nose: { w: 24, top: -150, tip: -106, bridge: 7 },
    mouth: { w: 0.95, rest: 'flat', y: 2 },
    head: { w: 0.98, jaw: 0.02, chin: 6, cheek: 0.1 },
    beard: { style: 'full', mustache: 'full', band: 12, shadow: 0.06, color: '#1C1714', alpha: 0.38 },
  }),
  dean: person({
    id: 'dean', name: 'Dean', tag: '#EE5982',
    skin: skinPal('#F5C4A2'),
    hair: { style: 'tousled', ...hairPal('#6A4329') },
    eye: { rx: 24, ry: 17, gap: 46, y: -166, iris: '#6D8BA6', lid: 0.12 },
    brow: { color: '#4E2F1C', w: 14, arch: 6, y: -212, len: 62, tilt: -0.25, raise: [0, 1] },
    nose: { w: 20, top: -156, tip: -102, bridge: 7 },
    mouth: { w: 1, rest: 'smirk', y: 4 },
    head: { w: 0.94, jaw: 0, chin: 10, cheek: -0.1 },
    freckles: 0.5,
  }),
  amaan: person({
    id: 'amaan', name: 'Amaan', tag: '#F2853A',
    skin: skinPal('#B07651'),
    hair: { style: 'curls', ...hairPal('#15110F') },
    eye: { rx: 24, ry: 18, gap: 47, y: -166, iris: '#2E1D15', lid: 0.14 },
    brow: { color: '#15110F', w: 15, arch: 6, y: -212, len: 64, tilt: 0, raise: [0, 0] },
    nose: { w: 21, top: -152, tip: -104, bridge: 6 },
    mouth: { w: 0.95, rest: 'smile', y: 2 },
    head: { w: 0.94, jaw: -0.02, chin: 10, cheek: 0 },
    beard: { style: 'full', mustache: 'full', band: 13, shadow: 0.07, color: '#1A1512', alpha: 0.42 },
  }),
  jake: person({
    id: 'jake', name: 'Jake', tag: '#E39A2E',
    skin: skinPal('#F9CDB2', { cheek: '#F08A82' }),
    hair: { style: 'wave', ...hairPal('#C0602B', { lite: '#F2A466', curl: '#E0864A' }) },
    eye: { rx: 24, ry: 18, gap: 47, y: -166, iris: '#4F86C4', lid: 0.06 },
    brow: { color: '#A65428', w: 12, arch: 7, y: -212, len: 60, tilt: 0, raise: [0, 0] },
    nose: { w: 20, top: -148, tip: -110, bridge: 6 },
    mouth: { w: 1.12, rest: 'grin', y: 0 },
    head: { w: 0.98, jaw: 0.05, chin: 2, cheek: 0.2 },
    freckles: 0.3,
  }),
  ayaad: person({
    id: 'ayaad', name: 'Ayaad', tag: '#2FA36B',
    skin: skinPal('#C48B63'),
    hair: { style: 'flow', ...hairPal('#17130F') },
    eye: { rx: 24, ry: 18, gap: 46, y: -166, iris: '#2E1D15', lid: 0.06 },
    brow: { color: '#17130F', w: 13, arch: 8, y: -212, len: 60, tilt: 0, raise: [0, 0] },
    nose: { w: 20, top: -152, tip: -108, bridge: 6 },
    mouth: { w: 1, rest: 'grin', y: 0 },
    head: { w: 0.93, jaw: -0.04, chin: 10, cheek: 0 },
    beard: { style: 'stubble', mustache: 'thin', band: 0, shadow: 0.1, color: '#17130F' },
  }),
};
/** The look for a username (falls back to Flexander for anyone without one). */
export const lookFor = (username?: string | null) => (username && LOOKS[username.toLowerCase()]) || FLEXANDER;
