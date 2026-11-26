import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const TITLE_FONT = 'Luckiest Guy';
export const SFX_FONT = 'Bangers';

loadFont({ family: TITLE_FONT, url: staticFile('fonts/LuckiestGuy.woff2'), weight: '400' });
loadFont({ family: SFX_FONT, url: staticFile('fonts/Bangers.woff2'), weight: '400' });
/** The app's body font, for the character sheets' notes. */
export const BODY_FONT = 'Baloo 2';
loadFont({ family: BODY_FONT, url: staticFile('fonts/Baloo2-700.woff2'), weight: '700' });
loadFont({ family: BODY_FONT, url: staticFile('fonts/Baloo2-800.woff2'), weight: '800' });
