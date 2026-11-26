"""Trim mascot stills to their art, size them for the app, and make the icon set.
   python3 scripts/pack_stills.py <app assets>                      Flexander's stills + the icons
   python3 scripts/pack_stills.py <app assets> --members osim,dean  members' Home stills → mascot/<username>/<pose>.webp"""
import sys
import os
from PIL import Image
app = sys.argv[1]


def pack(src, dst, square=False):
    im = Image.open(src).convert('RGBA')
    x0, y0, x1, y1 = im.split()[-1].getbbox()
    pad = 12
    im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    if square:
        s = max(im.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2)); im = sq.resize((360, 360), Image.LANCZOS)
    else:
        im = im.resize((round(im.width * 640 / im.height), 640), Image.LANCZOS)
    im.save(dst, quality=90, method=6)
    return im.size


if '--members' in sys.argv:
    for who in sys.argv[sys.argv.index('--members') + 1].split(','):
        os.makedirs(f'{app}/mascot/{who}', exist_ok=True)
        for pose in ['wave', 'flex', 'thumbs', 'cheer', 'shrug', 'point']:
            print(who, pose, pack(f'out/frames/mascot-{who}-{pose}.png', f'{app}/mascot/{who}/{pose}.webp'))
    sys.exit(0)

for pose in ['wave', 'flex', 'thumbs', 'cheer', 'shrug', 'point', 'head']:
    print(pose, pack(f'out/frames/mascot-{pose}.png', f'{app}/mascot/{pose}.webp', square=(pose == 'head')))
icon = Image.open('out/frames/app-icon.png').convert('RGB')
for name, s in [('icon-512', 512), ('icon-192', 192), ('apple-touch-icon', 180), ('favicon-32', 32)]:
    icon.resize((s, s), Image.LANCZOS).save(f'{app}/icons/{name}.png', optimize=True)
# Android crops "maskable" icons to a circle, so that one uses the smaller art
safe = 'out/frames/app-icon-maskable.png'
(Image.open(safe) if os.path.exists(safe) else icon).convert('RGB').resize((512, 512), Image.LANCZOS).save(f'{app}/icons/maskable-512.png', optimize=True)
print('icons ok')
