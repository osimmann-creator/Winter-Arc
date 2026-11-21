#!/usr/bin/env python3
"""Builds the Flexander parts kit from out/parts-kit/_raw.json (made by export-parts.sh):

  sheets/   one sheet per set (SVG with named layers, PNG with guides, clean PNG)
  parts/    every part as its own SVG + transparent PNG (4 px per unit)
  reference/ assembled poses
  manifest.json  pivot + joint positions for every file, so refined art can be put back on the rig
"""
import base64, io, json, os, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out/parts-kit'))
RAW = json.load(open(os.path.join(OUT, '_raw.json')))
ITEMS = RAW['items']

PART_SCALE = 4      # px per unit for single parts
REF_SCALE = 3       # px per unit for the full-body reference
SHEET_MAX = 4096    # long side of sheet PNGs
PAD = 26            # around art inside a cell
LABEL_H = 64        # label strip at the top of a cell
GAP = 26
MIN_CELL_W = 214

INK = '#22162E'
PIVOT = '#F0189A'
JOINT = '#0AA5C8'
PAPER = '#F2F6FA'

def font_b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

FONT_CSS = (
    "@font-face{font-family:'Baloo 2';font-weight:700;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'Baloo 2';font-weight:600;src:url(data:font/woff2;base64,%s) format('woff2')}"
    "@font-face{font-family:'Luckiest Guy';src:url(data:font/woff2;base64,%s) format('woff2')}"
) % (
    font_b64(os.path.join(ROOT, 'node_modules/@fontsource/baloo-2/files/baloo-2-latin-700-normal.woff2')),
    font_b64(os.path.join(ROOT, 'node_modules/@fontsource/baloo-2/files/baloo-2-latin-600-normal.woff2')),
    font_b64(os.path.join(ROOT, 'public/fonts/LuckiestGuy.woff2')),
)
UI = "font-family:'Baloo 2',Arial,sans-serif"
TITLE = "font-family:'Luckiest Guy','Arial Black',sans-serif"

def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def prefix_ids(svg, pfx):
    for i in set(re.findall(r'\bid="([^"]+)"', svg)):
        svg = svg.replace(f'id="{i}"', f'id="{pfx}--{i}"').replace(f'url(#{i})', f'url(#{pfx}--{i})')
    return svg

for it in ITEMS:
    it['svg'] = prefix_ids(it['svg'], it['id'])

# ------------------------------------------------------------------ measure
MEAS = 2400

def measure(page):
    page.set_viewport_size({'width': MEAS, 'height': MEAS})
    page.set_content(
        f'<html><body style="margin:0;background:transparent">'
        f'<svg id="s" xmlns="http://www.w3.org/2000/svg" width="{MEAS}" height="{MEAS}" viewBox="{-MEAS//2} {-MEAS//2} {MEAS} {MEAS}"><g id="g"></g></svg>'
        f'</body></html>'
    )
    for it in ITEMS:
        page.evaluate("h => { document.getElementById('g').innerHTML = h; }", it['svg'])
        im = Image.open(io.BytesIO(page.locator('#s').screenshot(omit_background=True)))
        a = im.split()[-1].point(lambda v: 255 if v > 4 else 0)
        x0, y0, x1, y1 = a.getbbox()
        h = MEAS // 2
        it['art'] = [x0 - h - 2, y0 - h - 2, x1 - h + 2, y1 - h + 2]

# ------------------------------------------------------------------ markers
def cross(x, y, color, r=10, dashed=False, label=None, side=1, size=13):
    dash = ' stroke-dasharray="4 3"' if dashed else ''
    s = (f'<g><circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#FFFFFF" fill-opacity="0.55" stroke="{color}" stroke-width="3"{dash}/>'
         f'<path d="M{x - r - 6:.1f} {y:.1f}H{x + r + 6:.1f}M{x:.1f} {y - r - 6:.1f}V{y + r + 6:.1f}" stroke="{color}" stroke-width="2.5"/>'
         f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.6" fill="{color}"/>')
    if label:
        anchor = 'start' if side > 0 else 'end'
        s += (f'<text x="{x + side * (r + 9):.1f}" y="{y - r - 2:.1f}" text-anchor="{anchor}" style="{UI};font-weight:700" font-size="{size}" '
              f'fill="{color}" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">{esc(label)}</text>')
    return s + '</g>'

def short(name):
    return name.split(' (')[0]

# ------------------------------------------------------------------ cells
def cell_box(it):
    """Area the cell must show (units, item space): the art, plus pivot/joints that sit near it."""
    x0, y0, x1, y1 = it['art']
    pts = []
    if it['pivot'] != 'ground':
        pts.append((0, 0))
    pts += [(j['x'], j['y']) for j in it.get('joints') or []]
    for (px, py) in pts:
        near = (x0 - 70 <= px <= x1 + 70) and (y0 - 70 <= py <= y1 + 70)
        if near:
            x0, y0, x1, y1 = min(x0, px - 18), min(y0, py - 18), max(x1, px + 18), max(y1, py + 18)
    return [x0, y0, x1, y1]

def size_cell(it):
    bx = cell_box(it)
    it['box'] = bx
    w = max(MIN_CELL_W, bx[2] - bx[0] + 2 * PAD)
    h = LABEL_H + PAD + (bx[3] - bx[1]) + PAD
    it['cw'], it['ch'] = w, h

def layout(items, x0, width, y0, sec_gap=44, header_h=58):
    """Flow cells left→right inside [x0, x0+width], wrapping, grouped by section."""
    y = y0
    headers = []
    sections = []
    for it in items:
        if not sections or sections[-1][0] != it['section']:
            sections.append((it['section'], []))
        sections[-1][1].append(it)
    for name, cells in sections:
        headers.append((name, x0, y))
        y += header_h
        x, row_h = x0, 0
        for c in cells:
            if x + c['cw'] > x0 + width + 0.5 and x > x0:
                x, y, row_h = x0, y + row_h + GAP, 0
            c['cx'], c['cy'] = x, y
            x += c['cw'] + GAP
            row_h = max(row_h, c['ch'])
        y += row_h + sec_gap
    return y, headers

def place(it):
    """Origin of the item's space inside its cell (absolute sheet units)."""
    bx = it['box']
    ox = it['cx'] + (it['cw'] - (bx[2] - bx[0])) / 2 - bx[0]
    oy = it['cy'] + LABEL_H + PAD - bx[1]
    return ox, oy

# ------------------------------------------------------------------ sheet svg
def sheet_svg(spec, items, W, H, headers, guides=True, clean_bg=None):
    L = []
    L.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
    L.append(f'<title>{esc(spec["title"])}</title>')
    if guides:
        L.append(f'<style>{FONT_CSS}</style>')
    L.append(f'<g id="background"><rect width="{W}" height="{H}" fill="{(PAPER if guides else (clean_bg or "#FFFFFF"))}"/></g>')
    if guides:
        # header block
        L.append('<g id="title">')
        L.append(f'<text x="44" y="112" style="{TITLE}" font-size="84" fill="{INK}">{esc(spec["title"])}</text>')
        L.append(f'<text x="46" y="160" style="{UI};font-weight:700" font-size="27" fill="#5A4E6B">{esc(spec["subtitle"])}</text>')
        lx = W - 44
        L.append(cross(lx - 520, 72, PIVOT))
        L.append(f'<text x="{lx - 494}" y="81" style="{UI};font-weight:700" font-size="23" fill="{INK}">Pivot: the joint this part turns around</text>')
        L.append(cross(lx - 520, 124, JOINT, dashed=True))
        L.append(f'<text x="{lx - 494}" y="133" style="{UI};font-weight:700" font-size="23" fill="{INK}">Where the next part attaches</text>')
        L.append('</g>')
        if spec.get('palette'):
            L.append('<g id="palette">')
            px = 46
            for name, hexv in spec['palette']:
                L.append(f'<rect x="{px}" y="190" width="38" height="38" rx="9" fill="{hexv}" stroke="{INK}" stroke-width="3"/>')
                L.append(f'<text x="{px + 48}" y="207" style="{UI};font-weight:700" font-size="17" fill="{INK}">{esc(name)}</text>')
                L.append(f'<text x="{px + 48}" y="226" style="{UI};font-weight:600" font-size="15" fill="#7A6E8B">{hexv}</text>')
                px += 48 + max(len(name), 8) * 9.6 + 26
            L.append('</g>')
        L.append('<g id="sections">')
        for name, hx, hy in headers:
            L.append(f'<text x="{hx}" y="{hy + 40}" style="{TITLE}" font-size="36" fill="{INK}" letter-spacing="1">{esc(name.upper())}</text>')
        L.append('</g>')
        L.append('<g id="cells">')
        for it in items:
            fill = it.get('bg') or ('#EAF5FF' if it.get('kind') == 'reference' else '#FFFFFF')
            L.append(f'<rect x="{it["cx"]:.1f}" y="{it["cy"]:.1f}" width="{it["cw"]:.1f}" height="{it["ch"]:.1f}" rx="18" fill="{fill}" stroke="#C9D3E0" stroke-width="2.5"/>')
        L.append('</g>')
    elif clean_bg is None:
        # clean sheet: keep coloured backdrops only where the art needs them (white clouds)
        L.append('<g id="backdrops">')
        for it in items:
            if it.get('bg'):
                L.append(f'<rect x="{it["cx"]:.1f}" y="{it["cy"]:.1f}" width="{it["cw"]:.1f}" height="{it["ch"]:.1f}" rx="18" fill="{it["bg"]}"/>')
        L.append('</g>')
    L.append('<g id="art">')
    for it in items:
        ox, oy = place(it)
        L.append(f'<g id="{it["id"]}" transform="translate({ox:.1f} {oy:.1f})">{it["svg"]}</g>')
    L.append('</g>')
    if guides:
        L.append('<g id="pivots">')
        for it in items:
            ox, oy = place(it)
            bx = it['box']
            inside = lambda x, y: bx[0] - 1 <= x <= bx[2] + 1 and bx[1] - 1 <= y <= bx[3] + 1
            ref = it.get('kind') == 'reference'
            if it['pivot'] != 'ground' and inside(0, 0):
                L.append(cross(ox, oy, PIVOT, label=short(it['pivot']), side=1))
            for j in it.get('joints') or []:
                if inside(j['x'], j['y']):
                    side = -1 if j['x'] < -20 else 1
                    L.append(cross(ox + j['x'], oy + j['y'], JOINT if not ref else PIVOT, dashed=not ref, label=j['name'] if not ref else j['name'], side=side, size=12 if ref else 13))
        L.append('</g>')
        L.append('<g id="labels">')
        for it in items:
            L.append(f'<text x="{it["cx"] + 18:.1f}" y="{it["cy"] + 32:.1f}" style="{UI};font-weight:700" font-size="22" fill="{INK}">{esc(it["label"])}</text>')
            sub = it.get('sub') or ''
            if it.get('kind') == 'reference':
                sub = ('Reference · ' + sub) if sub else 'Reference'
            if sub:
                L.append(f'<text x="{it["cx"] + 18:.1f}" y="{it["cy"] + 54:.1f}" style="{UI};font-weight:600" font-size="15.5" fill="#7A6E8B">{esc(sub)}</text>')
            L.append(f'<text x="{it["cx"] + it["cw"] - 14:.1f}" y="{it["cy"] + it["ch"] - 12:.1f}" text-anchor="end" style="{UI};font-weight:600" font-size="12" fill="#A8B2C2">{esc(it["id"])}</text>')
        L.append('</g>')
    L.append('</svg>')
    return '\n'.join(L)

# ------------------------------------------------------------------ specs
SKIN_PALETTE = [
    ('Skin', '#F6B486'), ('Skin shade', '#DC8F62'), ('Stubble', '#E2A58A'), ('Hair', '#2F1F1B'), ('Toga', '#FFFBF3'),
    ('Toga shade', '#E6D7C6'), ('Blue', '#2D7BF0'), ('Gold', '#FFC93A'), ('Gold shade', '#E39115'), ('Sandal', '#A0602F'),
    ('Outline', '#22162E'),
]
SHEETS = [
    {
        'key': 'body', 'file': 'flexander-body-parts', 'title': 'FLEXANDER · BODY PARTS',
        'subtitle': 'Every piece of the mascot rig. Limbs are the left side only (the right side is the same art flipped). Outline 7 units.',
        'palette': SKIN_PALETTE, 'width': 2800, 'refcol': 770,
    },
    {
        'key': 'biceps', 'file': 'intro-biceps', 'title': 'INTRO BICEPS',
        'subtitle': 'The flexing arms from the opening animation. Same arm parts as Flexander, drawn bigger. Bicep grows with the flex.',
        'palette': [('Skin', '#F6B486'), ('Skin shade', '#DC8F62'), ('Gold', '#FFC93A'), ('Gold shade', '#E39115'), ('Outline', '#22162E')],
        'width': 2120,
    },
    {
        'key': 'clouds', 'file': 'clouds', 'title': 'CLOUDS',
        'subtitle': 'Video clouds are made from one shape recipe (random bumps per seed). The app background uses one simple cloud.',
        'palette': [('Cloud', '#FFFFFF'), ('Cloud shade', '#D7ECFF'), ('Cloud outline', '#7FB8E6'), ('App outline', '#93CDF2'), ('Sky', '#BFE9FF')],
        'width': 2060,
    },
]

def build():
    os.makedirs(os.path.join(OUT, 'sheets'), exist_ok=True)
    manifest = {'units': '1 unit = 1 px at the size the rig is drawn before scaling (Flexander is about 1,050 units tall)',
                'palette': RAW['palette'], 'outline_width_units': RAW['lineWidth'], 'rig_dimensions_units': RAW['dims'],
                'sheets': {}, 'parts': []}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        page = b.new_page()
        measure(page)
        for it in ITEMS:
            size_cell(it)

        def render(svg, w, h, scale, path, transparent):
            pw, ph = int(round(w * scale)), int(round(h * scale))
            page.set_viewport_size({'width': pw, 'height': ph})
            body = svg.replace(f'width="{w}" height="{h}"', f'width="{pw}" height="{ph}"', 1)
            page.set_content(f'<html><body style="margin:0;background:transparent">{body}</body></html>')
            page.evaluate('document.fonts.ready')
            page.wait_for_timeout(60)
            page.screenshot(path=path, omit_background=transparent, clip={'x': 0, 'y': 0, 'width': pw, 'height': ph})
            return pw, ph

        for spec in SHEETS:
            items = [i for i in ITEMS if i['sheet'] == spec['key']]
            W = spec['width']
            top = 280 if spec.get('palette') else 220
            if spec.get('refcol'):
                refs = [i for i in items if i.get('kind') == 'reference']
                rest = [i for i in items if i.get('kind') != 'reference']
                ry, rh = layout(refs, 44, spec['refcol'] - 44, top)
                y, hdr = layout(rest, spec['refcol'] + 40, W - spec['refcol'] - 84, top)
                hdr = rh + hdr
                y = max(y, ry)
            else:
                y, hdr = layout(items, 44, W - 88, top)
            H = int(y + 10)
            scale = min(2.0, SHEET_MAX / max(W, H))
            base = os.path.join(OUT, 'sheets', spec['file'])
            guided = sheet_svg(spec, items, W, H, hdr, guides=True)
            open(base + '.svg', 'w').write(guided)
            pw, ph = render(guided, W, H, scale, base + '.png', False)
            clean_bg = '#BFE9FF' if spec['key'] == 'clouds' else None
            clean = sheet_svg(spec, items, W, H, hdr, guides=False, clean_bg=clean_bg)
            render(clean, W, H, scale, base + '-clean.png', False)
            manifest['sheets'][spec['key']] = {'svg': f'sheets/{spec["file"]}.svg', 'png': f'sheets/{spec["file"]}.png',
                                               'clean_png': f'sheets/{spec["file"]}-clean.png', 'size_units': [W, H], 'png_px': [pw, ph],
                                               'px_per_unit': round(scale, 4)}
            print(spec['key'], 'sheet', W, 'x', H, 'units →', pw, 'x', ph, 'px')

            # single files
            for it in items:
                ref = it.get('kind') == 'reference'
                folder = 'reference' if ref else os.path.join('parts', spec['key'])
                os.makedirs(os.path.join(OUT, folder), exist_ok=True)
                x0, y0, x1, y1 = it['art']
                x0, y0, x1, y1 = x0 - 12, y0 - 12, x1 + 12, y1 + 12
                w, h = x1 - x0, y1 - y0
                sc = PART_SCALE if not ref else (REF_SCALE if it['id'] == 'assembled' else PART_SCALE)
                pv = ('' if ref else
                      f'<g id="pivot" display="none">{cross(0, 0, PIVOT)}'
                      + ''.join(cross(j["x"], j["y"], JOINT, dashed=True) for j in it.get("joints") or []) + '</g>')
                svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{x0} {y0} {w} {h}">'
                       f'<title>{esc(it["label"])}</title><g id="art">{it["svg"]}</g>{pv}</svg>')
                fbase = os.path.join(OUT, folder, it['id'])
                open(fbase + '.svg', 'w').write(svg)
                pw2, ph2 = render(svg, w, h, sc, fbase + '.png', True)
                manifest['parts'].append({
                    'id': it['id'], 'set': spec['key'], 'section': it['section'], 'label': it['label'],
                    'note': it.get('sub', ''), 'kind': it.get('kind', 'part'),
                    'svg': f'{folder}/{it["id"]}.svg', 'png': f'{folder}/{it["id"]}.png', 'png_px': [pw2, ph2], 'px_per_unit': sc,
                    'pivot': it['pivot'],
                    'pivot_px': None if ref else [round(-x0 * sc, 1), round(-y0 * sc, 1)],
                    'canvas_units': {'x': x0, 'y': y0, 'w': w, 'h': h},
                    'joints_px': [{'name': j['name'], 'x': round((j['x'] - x0) * sc, 1), 'y': round((j['y'] - y0) * sc, 1)} for j in it.get('joints') or []],
                    'placed_on_rig_at': it.get('anchor', ''),
                })
        b.close()
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
    print(len(manifest['parts']), 'files')

build()
