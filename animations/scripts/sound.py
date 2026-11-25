#!/usr/bin/env python3
"""Winter Arc soundtracks.

Every video's sound is mixed from short sound effects placed on frames, then
muxed into the finished mp4 (the picture is copied, never re-encoded).

  python3 scripts/sound.py render-bank            # Earshot -> sound/bank/*.opus (needs earshot)
  python3 scripts/sound.py mix                    # every video in ../assets
  python3 scripts/sound.py mix gym-2 joke-coin    # just these
  python3 scripts/sound.py check                  # loudness and peak of every mixed video
  python3 scripts/sound.py openverse              # which Openverse slots are filled

Sources
  sound/bank/       Sound effects rendered with Earshot (github.com/Leonxlnx/earshot).
                    Free for any use, no credit needed. BANK below says how each was made.
  sound/openverse/  Openly licensed recordings found on openverse.org, one per slot
                    (cheer, laugh, goose, ...). Credits in sound/openverse/credits.json.
                    A cue that names a slot uses the recording when the file is there,
                    and its Earshot stand-in when it isn't.
  sound/cues.py     What plays when, per video, in frames (30 fps).

Needs ffmpeg, numpy, scipy and pyloudnorm (pip install pyloudnorm).
"""
import json, os, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SOUND = os.path.join(ROOT, 'sound')
BANKDIR = os.path.join(SOUND, 'bank')
OVDIR = os.path.join(SOUND, 'openverse')
ASSETS = os.path.normpath(os.path.join(ROOT, '..', 'app', 'assets'))
if not os.path.isdir(ASSETS):
    ASSETS = os.path.normpath(os.path.join(ROOT, '..', 'assets'))
SR = 48000
FPS = 30
TARGET_LUFS = -16.0
CEILING_DB = -2.0
MAX_SECONDS = 6.0   # no video is longer than 5.5 s, so beds and long sounds are cut here

# name: (Earshot design id, extra `earshot make` arguments)
BANK = {
    # air
    'whoosh': ('swoosh/in', []), 'whoosh_out': ('swoosh/out', []), 'whoosh_fast': ('whoosh_fast/whistle', []),
    'whoosh_heavy': ('whoosh/heavy', []), 'whoosh_big': ('pro_whoosh_big/windy', []), 'swish': ('swish/fast', []),
    'spin': ('whoosh/spin', []), 'swipe': ('swipe/hand', []), 'rope': ('whoosh/rope', []), 'steam': ('swell/air', []),
    # hits
    'boom': ('boom/deep', []), 'boom_short': ('boom/short', []), 'sub': ('cut_hit/punch', []), 'crit': ('hit/crit', []),
    'slam': ('slam/title', []), 'land': ('land/heavy', []), 'thud': ('hurt/thud', []), 'drop_sack': ('drop/sack', []),
    'metal_drop': ('metal/drop', []), 'clank': ('brake_drum/hit', []), 'clang': ('hit/metal', []),
    'db_place': ('dumbbell/place', []), 'db_grab': ('dumbbell/grab', []), 'punch': ('hit/punch', []),
    'punch_body': ('punch/body', []), 'slap': ('slapstick/crack', []), 'explosion': ('explosion/small', []),
    'glass_break': ('glass/break', []), 'person_fall': ('person/fall', []), 'land_dirt': ('land/dirt', []),
    'cajon': ('cajon/bass', []), 'pot_clang': ('pot/clang', []), 'car_door': ('car_door/slam', []),
    'door_slam': ('door/slam', []), 'kick': ('ball/kick', []), 'bounce': ('ball/bounce', []), 'racket': ('racket/hit', []),
    # pops, ticks, ui
    'pop': ('pop/soft', []), 'pop_in': ('pro_pop_in/round', []), 'bubble': ('pop/bubble', []), 'pop_pluck': ('pop/pluck', []),
    'tick': ('tick/wood', []), 'click': ('pen/click', []), 'notify': ('notify/pop', []), 'chirp': ('pro_pop/chirp', []),
    'switch': ('switch/power_strip', []), 'latch': ('lock/latch', []), 'key': ('keyboard/laptop', []),
    # music and stings
    'ding': ('coin/bright', []), 'fanfare': ('level_up/fanfare', []), 'triad': ('success/triad', []),
    'sparkle': ('sparkle/burst', []), 'gem': ('gem/sparkle', []), 'twinkle': ('like/twinkle', []),
    'sting_reveal': ('sting/reveal', []), 'sting_soft': ('sting/soft', []), 'braam': ('braam/brass', []),
    'drumroll': ('drum/roll', []), 'stop_tape': ('stop/tape', []), 'power_down': ('power_down/synth', []),
    'logo_spark': ('logo_sting/spark', []), 'magic': ('magic/cast', []), 'pad': ('pad/glass', []),
    'tom_hi': ('tom/high', []), 'tom_mid': ('tom/mid', []), 'crash': ('cymbal/orchestral', []),
    'kick_e': ('kick/electro', []), 'hat_e': ('hat/electro', []), 'clap_e': ('clap/electro', []),
    'bell_desk': ('bell/desk', []), 'bell_shop': ('bell/shop', []), 'bike_bell': ('bell/bike', []),
    'alarm': ('timer/done', []), 'game8bit': ('bed/8bit', []), 'zap': ('zap/laser', []),
    # people and animals
    'cheer': ('crowd/cheer', []), 'applause': ('applause/audience', []), 'laugh': ('laugh/crowd', []),
    'boo': ('crowd/boo', []), 'gasp': ('gasp/breath', []), 'scream': ('scream/person', []), 'burp': ('burp/person', []),
    'kiss': ('kiss/lips', []), 'heartbeat': ('heart/beat', []), 'owl': ('owl/hoot', []), 'wings': ('wings/flap', []),
    'quack': ('duck/quack', []), 'rooster': ('rooster/crow', []), 'growl': ('bear/growl', []),
    # comedy
    'scratch': ('record/scratch', []), 'boing': ('jump/spring', []), 'jump': ('jump/soft', []), 'squeak': ('toy/squeak', []),
    # feet and wheels
    'stepa': ('step/concrete', ['--seed', '1']), 'stepb': ('step/concrete', ['--seed', '2']),
    'snowa': ('step/snow', ['--seed', '1']), 'snowb': ('step/snow', ['--seed', '2']),
    'sanda': ('step/grass', ['--seed', '1']), 'sandb': ('step/grass', ['--seed', '2']),
    'skid': ('tyres/screech', []), 'gravel': ('step/pebbles', []), 'freewheel': ('bicycle/freewheel', []),
    'powder': ('step/powder', []),
    # things
    'fire_whoosh': ('fire/whoosh', []), 'sizzle': ('water/sizzle', []), 'page': ('paper/page', []),
    'book_close': ('book/close', []), 'clink': ('glass/clink', []), 'glass_cheers': ('glass/cheers', []),
    'bottle_clink': ('bottle/clink', []), 'glass_set': ('glass/set', []), 'pour': ('water/pour', []),
    'cork': ('cork/pop', []), 'shutter': ('camera/shutter', []), 'shutter_big': ('complete/shutter', []),
    'card_slap': ('paper/card', []), 'paper_crumple': ('paper/crumple', []), 'pencil': ('pencil/write', []),
    'phone_vibe': ('phone/vibrate', []), 'coin_flip': ('coin/flip', []), 'coin_drop': ('coin/drop', []),
    'coin_soft': ('coin/soft', []), 'cash': ('cash_register/open', []), 'stamp': ('stamp/press', []),
    'clock': ('clock/ticktock', []), 'door_slide': ('door/slide', []), 'doorbell': ('doorbell/ring', []),
    'train': ('train/pass', []), 'rocket': ('rocket/launch', []), 'rumble': ('rumble/quake', []),
    'chain': ('chain/rattle', []), 'splash': ('splash/big', []), 'splash_small': ('splash/small', []),
    'whistle': ('whistle/referee', []), 'car_horn': ('car_horn/honk', []), 'party_pop': ('party_popper/pop', []),
    'cloth': ('cloth/rustle', []), 'cloth_tear': ('cloth/tear', []), 'bulb': ('bulb/burst', []),
    'cabasa': ('cabasa/hit', []),
    # beds (loops)
    'fire_loop': ('fire/small', []), 'fire_big': ('fire/large', []), 'wind': ('wind/mountain', []),
    'wind_soft': ('wind/open', []), 'waves': ('waves/rocks', []), 'city': ('city/street', []), 'bar': ('cafe/busy', []),
    'night': ('wind/trees', []), 'space': ('space_hum/ship', []), 'bed_warm': ('bed/warm', []),
}
# How a sound lines up with its frame: its attack ('on', default), its loudest moment ('pk') or its start ('st').
ALIGN_PEAK = {'whoosh', 'whoosh_out', 'whoosh_fast', 'whoosh_heavy', 'whoosh_big', 'swish', 'swipe', 'rope', 'steam', 'jump'}
ALIGN_START = {'spin', 'cheer', 'applause', 'laugh', 'boo', 'heartbeat', 'clock', 'drumroll', 'pad', 'game8bit', 'train',
               'rocket', 'rumble', 'fire_loop', 'fire_big', 'wind', 'wind_soft', 'waves', 'city', 'bar', 'night', 'space',
               'bed_warm', 'freewheel', 'pour', 'gravel', 'sizzle', 'phone_vibe', 'braam', 'stop_tape', 'power_down', 'skid'}
# Openverse slots and the Earshot sound each one stands in for (the recording is matched to its loudness).
OPENVERSE = {'cheer': 'cheer', 'laugh': 'laugh', 'applause': 'applause', 'goose': 'quack', 'pigeon': 'owl',
             'bell': 'bell_desk', 'ooh': 'gasp'}
OV_MAX = {'cheer': 3.0, 'laugh': 3.0, 'applause': 3.0, 'goose': 1.2, 'pigeon': 1.4, 'bell': 1.8, 'ooh': 1.6}


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def decode(path):
    """Any audio file -> float32 (n, 2) at 48 kHz."""
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-']).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def envelope(x, ms=8):
    m = np.abs(x).max(axis=1)
    k = max(1, int(SR * ms / 1000))
    return np.convolve(m, np.ones(k) / k, mode='same')


def landmarks(x):
    e = envelope(x)
    peak = int(np.argmax(e))
    on = int(np.argmax(e > 0.3 * e[peak])) if e[peak] > 0 else 0
    return on, peak


# ------------------------------------------------------------------ bank
def render_bank(names=None):
    os.makedirs(BANKDIR, exist_ok=True)
    index_path = os.path.join(BANKDIR, 'index.json')
    index = json.load(open(index_path)) if os.path.exists(index_path) else {}
    names = names or list(BANK)
    from concurrent.futures import ThreadPoolExecutor
    with tempfile.TemporaryDirectory() as tmp, ThreadPoolExecutor(4) as pool:
        def one(name):
            design, extra = BANK[name]
            wav = os.path.join(tmp, name + '.wav')
            run(['earshot', 'make', '--sound', design, *extra, '-o', wav])
            x = decode(wav)
            # trim the silent tail (keep 60 ms after it drops below -60 dB)
            e = envelope(x, 4)
            loud = np.nonzero(e > 10 ** (-60 / 20))[0]
            end = min(len(x), (loud[-1] if len(loud) else len(x)) + int(0.06 * SR), int(MAX_SECONDS * SR))
            x = x[:end]
            tail = min(len(x), int((0.3 if len(x) >= MAX_SECONDS * SR - 1 else 0.02) * SR))
            x[-tail:] *= np.linspace(1, 0, tail)[:, None]
            out = os.path.join(BANKDIR, name + '.opus')
            run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                 '-c:a', 'libopus', '-b:a', '160k', out], input=x.astype(np.float32).tobytes())
            on, peak = landmarks(x)
            index[name] = {'design': design, 'args': extra, 'seconds': round(len(x) / SR, 3),
                           'onset': round(on / SR, 4), 'peak': round(peak / SR, 4)}
            return f'{name:14} {design:24} {len(x) / SR:5.2f}s'
        for line in pool.map(one, names):
            print(line, flush=True)
    json.dump(index, open(index_path, 'w'), indent=1, sort_keys=True)


class Library:
    def __init__(self):
        self.index = json.load(open(os.path.join(BANKDIR, 'index.json')))
        self.cache = {}
        self.credits = {}
        p = os.path.join(OVDIR, 'credits.json')
        if os.path.exists(p):
            self.credits = json.load(open(p))

    def bank(self, name):
        if name not in self.cache:
            x = decode(os.path.join(BANKDIR, name + '.opus'))
            on, peak = landmarks(x)
            self.cache[name] = (x, on, peak)
        return self.cache[name]

    def ov_file(self, slot):
        for ext in ('wav', 'flac', 'mp3', 'ogg', 'oga', 'opus', 'm4a', 'webm'):
            p = os.path.join(OVDIR, f'{slot}.{ext}')
            if os.path.exists(p):
                return p
        return None

    def openverse(self, slot):
        key = 'ov:' + slot
        if key not in self.cache:
            path = self.ov_file(slot)
            if not path:
                self.cache[key] = None
                return None
            x = decode(path)
            info = self.credits.get(slot, {})
            start = float(info.get('start', 0))
            x = x[int(start * SR):]
            e = envelope(x, 6)
            if e.max() <= 0:
                self.cache[key] = None
                return None
            first = int(np.argmax(e > 10 ** (-24 / 20) * e.max()))   # its first real sound, not the room tone
            x = x[max(0, first - int(0.01 * SR)):]
            x = x[:int(float(info.get('seconds', OV_MAX.get(slot, 2.5))) * SR)]
            n = min(len(x), int(0.25 * SR))
            x[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
            # match the loudness of the Earshot sound it stands in for
            ref, _, _ = self.bank(OPENVERSE[slot])
            def active_rms(y):
                ee = envelope(y, 20)
                m = ee > 0.1 * ee.max()
                return float(np.sqrt(np.mean(y[m] ** 2))) if m.any() else 1e-6
            x *= active_rms(ref) / max(active_rms(x), 1e-6)
            on, peak = landmarks(x)
            self.cache[key] = (x, on, peak)
        return self.cache[key]


# ------------------------------------------------------------------ mixing
def place(buf, lib, cue):
    f, name, g = cue['f'], cue['s'], cue.get('g', 0.0)
    if name.startswith('ov:'):
        got = lib.openverse(name[3:])
        if got is None:
            for alt in cue.get('alt', []):
                place(buf, lib, alt)
            return
        x, on, peak = got
        align = cue.get('a', 'st')
    else:
        x, on, peak = lib.bank(name)
        align = cue.get('a') or ('pk' if name in ALIGN_PEAK else 'st' if name in ALIGN_START else 'on')
    x = x.copy()
    r = cue.get('r', 1.0)
    if r != 1.0:   # pitch/speed change by resampling
        n = int(len(x) / r)
        src = np.arange(n) * r
        x = np.stack([np.interp(src, np.arange(len(x)), x[:, c]) for c in (0, 1)], axis=1).astype(np.float32)
        on, peak = int(on / r), int(peak / r)
    if 'd' in cue:
        x = x[:int(cue['d'] * SR)]
        n = min(len(x), int(0.04 * SR))
        x[-n:] *= np.linspace(1, 0, n)[:, None]
    if cue.get('fi'):
        n = min(len(x), int(cue['fi'] * SR))
        x[:n] *= np.linspace(0, 1, n)[:, None]
    if cue.get('fo'):
        n = min(len(x), int(cue['fo'] * SR))
        x[-n:] *= np.linspace(1, 0, n)[:, None] ** 1.5
    p = cue.get('p', 0.0)
    if p:
        a = (p + 1) * np.pi / 4
        x[:, 0] *= np.cos(a) * np.sqrt(2)
        x[:, 1] *= np.sin(a) * np.sqrt(2)
    x *= 10 ** (g / 20)
    anchor = {'on': on, 'pk': peak, 'st': 0}[align]
    start = int(round(f / FPS * SR)) - anchor
    a0, b0 = max(0, start), min(len(buf), start + len(x))
    if b0 > a0:
        buf[a0:b0] += x[a0 - start:b0 - start]


def limiter(x, ceiling, attack=0.002, release=0.08):
    peak = np.abs(x).max(axis=1)
    k = int(attack * SR) + 1
    # look-ahead: the gain must already be down when the peak arrives
    win = np.lib.stride_tricks.sliding_window_view(np.pad(peak, (0, k - 1)), k).max(axis=1)
    want = np.minimum(1.0, ceiling / np.maximum(win, 1e-9))
    g = np.empty_like(want)
    cur, rel = 1.0, np.exp(-1 / (release * SR))
    for i, w in enumerate(want):
        cur = w if w < cur else w + (cur - w) * rel
        g[i] = cur
    return x * g[:, None]


def master(mix):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR, block_size=0.2)
    ceil = 10 ** (CEILING_DB / 20)
    for _ in range(3):
        lufs = meter.integrated_loudness(mix.astype(np.float64))
        if not np.isfinite(lufs):
            break
        mix = mix * 10 ** ((TARGET_LUFS - lufs) / 20)
        mix = limiter(mix, ceil * 0.97)
    # 4x oversampled true-peak safety
    from scipy.signal import resample_poly
    tp = np.abs(resample_poly(mix, 4, 1, axis=0)).max()
    if tp > ceil:
        mix = mix * (ceil / tp)
    return mix.astype(np.float32)


def video_path(vid):
    return os.path.join(ASSETS, 'intro', 'intro.mp4') if vid == 'intro' else os.path.join(ASSETS, 'celebrations', vid + '.mp4')


def frames_of(path):
    out = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
               'stream=nb_read_packets', '-of', 'csv=p=0', path]).stdout.decode().strip()
    return int(out.split(',')[0])


def mix_video(vid, lib, cues):
    path = video_path(vid)
    n = frames_of(path)
    buf = np.zeros((int(round(n / FPS * SR)), 2), np.float32)
    for cue in cues:
        place(buf, lib, cue)
    tail = int(0.06 * SR)
    buf[-tail:] *= np.linspace(1, 0, tail)[:, None]
    buf = master(buf)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'mix.wav')
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', wav],
            input=buf.tobytes())
        out = os.path.join(tmp, 'out.mp4')
        run(['ffmpeg', '-y', '-v', 'error', '-i', path, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
             '-c:a', 'aac', '-b:a', '128k', '-ar', str(SR), '-ac', '2', '-movflags', '+faststart', out])
        os.replace(out, path)
    return n


def all_videos():
    vids = sorted(f[:-4] for f in os.listdir(os.path.join(ASSETS, 'celebrations')) if f.endswith('.mp4'))
    if os.path.exists(video_path('intro')):
        vids.append('intro')
    return vids


def main():
    sys.path.insert(0, SOUND)
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'mix'
    args = sys.argv[2:]
    if cmd == 'render-bank':
        render_bank(args or None)
    elif cmd == 'mix':
        from cues import CUES
        lib = Library()
        vids = args or all_videos()
        missing = [v for v in vids if v not in CUES]
        if missing:
            sys.exit('No cues for: ' + ', '.join(missing) + ' (add them to sound/cues.py)')
        for v in vids:
            n = mix_video(v, lib, CUES[v])
            print(f'{v:16} {n} frames, {len(CUES[v])} cues')
        used = [s for s in OPENVERSE if lib.cache.get('ov:' + s)]
        print('Openverse recordings used:', ', '.join(used) or 'none yet (Earshot stand-ins)')
    elif cmd == 'check':
        import pyloudnorm as pyln
        meter = pyln.Meter(SR, block_size=0.2)
        for v in args or all_videos():
            try:
                x = decode(video_path(v))
            except subprocess.CalledProcessError:
                print(f'{v:16} no audio'); continue
            peak = 20 * np.log10(np.abs(x).max() + 1e-9)
            print(f'{v:16} {meter.integrated_loudness(x.astype(np.float64)):6.1f} LUFS  peak {peak:5.1f} dBFS  {len(x) / SR:.2f}s')
    elif cmd == 'openverse':
        lib = Library()
        for slot, stand_in in OPENVERSE.items():
            p = lib.ov_file(slot)
            c = lib.credits.get(slot)
            print(f'{slot:9} {"file: " + os.path.basename(p) if p else "missing (uses Earshot " + stand_in + ")"}'
                  f'{"  credit: " + c.get("title", "?") + " by " + c.get("creator", "?") + ", " + c.get("license", "?") if c else ""}')
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
