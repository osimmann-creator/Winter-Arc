"""Trim mascot stills to their art, size them for the app, and make the icon set."""
import sys
import os
from PIL import Image
app = sys.argv[1]
for pose in ['wave', 'flex', 'thumbs', 'cheer', 'shrug', 'point', 'head']:
    im = Image.open(f'out/frames/mascot-{pose}.png').convert('RGBA')
    x0, y0, x1, y1 = im.split()[-1].getbbox()
    pad = 12
    im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    if pose == 'head':
        s = max(im.size); sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2)); im = sq.resize((360, 360), Image.LANCZOS)
    else:
        im = im.resize((round(im.width * 640 / im.height), 640), Image.LANCZOS)
    im.save(f'{app}/mascot/{pose}.webp', quality=90, method=6)
    print(pose, im.size)
icon = Image.open('out/frames/app-icon.png').convert('RGB')
for name, s in [('icon-512', 512), ('icon-192', 192), ('apple-touch-icon', 180), ('favicon-32', 32)]:
    icon.resize((s, s), Image.LANCZOS).save(f'{app}/icons/{name}.png', optimize=True)
# Android crops "maskable" icons to a circle, so that one uses the smaller art
safe = 'out/frames/app-icon-maskable.png'
(Image.open(safe) if os.path.exists(safe) else icon).convert('RGB').resize((512, 512), Image.LANCZOS).save(f'{app}/icons/maskable-512.png', optimize=True)
print('icons ok')
