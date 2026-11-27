import React from 'react';
import { atlasMode } from './clips/atlasMode';
import { beastMode } from './clips/beastMode';
import { boxJump } from './clips/boxJump';
import { gainsShake } from './clips/gainsShake';
import { hammerTime } from './clips/hammerTime';
import { gunShow } from './clips/gunShow';
import { legDay } from './clips/legDay';
import { mirrorCheck } from './clips/mirrorCheck';
import { raiseTheBar } from './clips/raiseTheBar';
import { ropeStorm } from './clips/ropeStorm';
import { makeClip } from './kit/stage';

// The 3D gym celebrations (gym-N-3d), one Remotion component per clip.
export const BeastMode3D = makeClip(beastMode);
export const GunShow3D = makeClip(gunShow);
export const LegDay3D = makeClip(legDay);
export const MirrorCheck3D = makeClip(mirrorCheck);
export const AtlasMode3D = makeClip(atlasMode);
export const RaiseTheBar3D = makeClip(raiseTheBar);
export const BoxJump3D = makeClip(boxJump);
export const RopeStorm3D = makeClip(ropeStorm);
export const GainsShake3D = makeClip(gainsShake);
export const HammerTime3D = makeClip(hammerTime);

export const CLIPS_3D: Record<string, React.FC<{ debug?: string }>> = {
  'gym-1-3d': BeastMode3D,
  'gym-2-3d': GunShow3D,
  'gym-3-3d': LegDay3D,
  'gym-4-3d': AtlasMode3D,
  'gym-5-3d': MirrorCheck3D,
  'gym-6-3d': RaiseTheBar3D,
  'gym-7-3d': BoxJump3D,
  'gym-8-3d': RopeStorm3D,
  'gym-9-3d': GainsShake3D,
  'gym-10-3d': HammerTime3D,
};

/** Half-size preview of any clip: --props='{"clip":"gym-3-3d"}'. */
export const Preview3D: React.FC<{ clip?: string; debug?: string }> = ({ clip = 'gym-1-3d', debug }) => {
  const C = CLIPS_3D[clip];
  return <C debug={debug} />;
};
