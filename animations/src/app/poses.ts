/* The mascot's poses in the app UI (Home, sign-in, toasts). Shared by the app stills (AppArt.tsx) and the
   character sheets, which show each member in the same poses. */
import { Pose } from '../hero/Hero';

export const APP_POSES: Record<string, Partial<Pose>> = {
  wave: {
    shR: 150, elR: 34, wrR: -10, handR: 'open', shL: 42, elL: -104, wrL: 30, handL: 'fist',
    turn: 0.15, lookX: 0.2, smile: 1, mouthOpen: 0.55, brow: 0.6, flexL: 0.5,
  },
  flex: {
    shL: 96, elL: 104, wrL: -14, flexL: 1, shR: 96, elR: 104, wrR: -14, flexR: 1, chestS: 1.04,
    hipL: 9, hipR: 9, knL: -8, knR: -8, brow: 0.5, mouthOpen: 0.15,
  },
  thumbs: {
    shR: 24, elR: 142, wrR: -64, handR: 'thumb', shL: 40, elL: -104, wrL: 30, lookX: 0.3, turn: 0.2, brow: 0.5, wink: 1, mouthSkew: 0.4,
  },
  cheer: {
    shL: 158, elL: -16, handL: 'open', shR: 158, elR: -16, handR: 'open', mouthOpen: 1, eyes: 1, hipL: 8, hipR: 8, brow: 0.8,
  },
  shrug: {
    shL: 52, elL: -96, wrL: -40, handL: 'open', shR: 52, elR: -96, wrR: -40, handR: 'open',
    browTilt: 1, brow: 0.6, smile: 0.25, mouthSkew: 0.6, mouthOpen: 0, lookX: -0.3, turn: -0.12, head: -6, sweat: 0.4,
  },
  point: {
    shR: 36, elR: 8, wrR: -6, handR: 'point', shL: 42, elL: -104, wrL: 30, handL: 'fist',
    turn: 0.18, lookX: 0.45, lookY: 0.55, smile: 1, mouthOpen: 0.35, brow: 0.7, head: 5,
  },
  head: {},
};

