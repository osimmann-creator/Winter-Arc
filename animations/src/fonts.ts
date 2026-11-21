import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const TITLE_FONT = 'Luckiest Guy';
export const SFX_FONT = 'Bangers';

loadFont({ family: TITLE_FONT, url: staticFile('fonts/LuckiestGuy.woff2'), weight: '400' });
loadFont({ family: SFX_FONT, url: staticFile('fonts/Bangers.woff2'), weight: '400' });
