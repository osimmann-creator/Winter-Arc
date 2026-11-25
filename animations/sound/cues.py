"""What every Winter Arc video plays, and when.

Frames are at 30 fps (frame 30 = 1 s). A cue is a dict:
  f   frame the sound lands on: its attack for hits, its loudest point for whooshes,
      its start for beds and crowds (scripts/sound.py ALIGN_* decides; 'a' overrides)
  s   a sound from sound/bank (see BANK in scripts/sound.py) or 'ov:<slot>' for an Openverse recording
  g   gain in dB (0 = as rendered)
  r   playback rate (1.1 = 10% higher and shorter)      d   cut after this many seconds
  fi / fo  fade in / fade out seconds                    p   pan, -1 left .. 1 right
  alt  for 'ov:' cues, what plays while the Openverse file is missing

Frame numbers come from each scene's named beats (CARD, SLAM2, HONK1, ...) in src/scenes,
the stride table for footsteps (RunKit.makeRun: a foot lands at every half cycle) and the
frames where the comic words pop in.
"""


def C(f, s, g=0.0, **kw):
    d = {'f': f, 's': s, 'g': g}
    d.update(kw)
    return d


def OV(f, slot, g, alt=(), **kw):
    """An Openverse recording; `alt` plays until the file is added."""
    return C(f, 'ov:' + slot, g, alt=list(alt), **kw)


def cheer(f, g=-11, d=2.6, **kw):
    return OV(f, 'cheer', g, [C(f, 'cheer', g, d=d, fo=kw.get('fo', 1.2), fi=kw.get('fi', 0.12))], d=d,
              fo=kw.get('fo', 1.2), fi=kw.get('fi', 0.12))


def laugh(f, g=-11, d=2.8):
    return OV(f, 'laugh', g, [C(f, 'laugh', g, d=d, fo=1.1, fi=0.1)], d=d, fo=1.1, fi=0.1)


def applause(f, g=-9, d=2.4):
    return OV(f, 'applause', g, [C(f, 'applause', g, d=d, fo=1.0)], d=d, fo=1.0)


def ring_bell(f, g=-4):
    """Fight bell: ding-ding-ding."""
    return OV(f, 'bell', g, [C(f, 'bell_desk', g, d=0.6), C(f + 6, 'bell_desk', g - 1, d=0.6), C(f + 12, 'bell_desk', g - 1, d=1.2, fo=0.6)])


def goose(f, g=-3, r=1.0):
    return OV(f, 'goose', g, [C(f, 'quack', g, r=0.82 * r, d=0.55)], r=r, d=0.9)


def coo(f, g=-5):
    return OV(f, 'pigeon', g, [C(f, 'owl', g - 2, r=1.4, d=0.7)], d=1.2)


def ooh(f, g=-12):
    """Crowd 'ooh' (Openverse only, nothing plays without it)."""
    return OV(f, 'ooh', g, [], d=1.5, fo=0.6)


def card(c):
    """Celebration end card (fx/EndCard start=c): ribbon flies in, points coin pops, crowd cheers."""
    return [C(c + 3, 'whoosh', -8), C(c + 5, 'slam', -4), C(c + 6, 'fanfare', -9), C(c + 14, 'ding', -5), cheer(c + 2)]


def gym_card(c):
    """GymVictory banner (scenes/GymTheatre, start=c): enters over 11 frames, score at 5-15."""
    return [C(c + 4, 'whoosh', -8), C(c + 8, 'slam', -4), C(c + 8, 'fanfare', -9), C(c + 13, 'ding', -5), cheer(c + 5)]


def joke_card(c):
    """Inside-joke end card: slam, ba-dum-tss, laughter."""
    return [C(c + 3, 'whoosh', -8), C(c + 5, 'slam', -4), C(c + 9, 'tom_hi', -7), C(c + 12, 'tom_mid', -7),
            C(c + 16, 'crash', -12, d=1.6, fo=0.8), C(c + 14, 'ding', -9), laugh(c + 9)]


def impact(f, g=0):
    """Stage impact frame (inverted flash + shake)."""
    return [C(f, 'crit', g - 2), C(f, 'boom', g - 4), C(f + 1, 'sub', g - 7)]


def word(f, g=-12):
    """A comic word popping in (POW!, ZOOOM!)."""
    return C(f, 'pop_in', g)


def opening(g=-10):
    """The camera pull-back most celebrations open with."""
    return C(1, 'whoosh_big', g, a='st')


def steps(frames, kind='step', g=-13, until=999):
    a, b = {'step': ('stepa', 'stepb'), 'snow': ('snowa', 'snowb'), 'sand': ('sanda', 'sandb')}[kind]
    return [C(f, a if i % 2 == 0 else b, g + (0 if i % 2 == 0 else -1.5), p=(-0.15 if i % 2 == 0 else 0.15))
            for i, f in enumerate(frames) if f < until]


def bed(s, g, n=135, fi=0.3, fo=0.9):
    return C(0, s, g, d=n / 30, fi=fi, fo=fo)


def paddle(f, g=0, r=1.0):
    """Pickleball pop."""
    return [C(f, 'racket', g - 1, r=r), C(f, 'pop', g - 7, r=r), C(f, 'tick', g - 11, r=r)]


def F(s):
    return [float(x) for x in s.split()]


# Footfalls from each scene's stride table (see the module docstring).
RUN1 = F('8.0 15.9 23.7 31.2 38.7 44.6 47.6 50.6 53.6 56.6 59.6 62.6 65.6 68.6 71.6 74.6 78.0 84.7')
FROST = F('8.5 17.3 26.7 36.7 46.0 50.0 53.0 56.0 59.0 62.0 65.0 68.0 71.0 74.0 77.0 80.8 87.8')
TORCH = F('8.0 15.9 23.6 31.2 38.6 43.4 46.4 49.4 52.4 55.4 58.4 61.4 64.4 67.4 70.4 75.6 82.9')
OWL = F('8.0 15.9 23.7 31.3 38.8 45.7 48.8 51.8 54.8 57.8 60.8 63.8 66.8 69.8 72.8 75.8 80.4 87.3')
GOOSE = F('8.5 17.0 25.5 33.8 37.4 40.4 43.4 46.4 49.4 52.4 55.4 58.4 61.4 64.4 67.4 70.4 73.4 76.4 82.0')
RUSH = F('7.5 15.0 22.5 30.0 37.5 42.5 45.8 49.0 52.3 55.5 58.8 62.0 65.3 68.5 71.8 75.0')
GREEN = F('5.5 11.0 16.5 22.0 27.5 33.0 37.6 40.7 43.8 46.9 50.0 53.1 56.2 59.3 62.4 65.5 68.6 72.4')
PIGEON = F('6.0 12.0 18.0 23.9 29.8 35.6 41.4 47.0 52.5 58.1 63.6 69.1 74.9')
BRIDGE = F('6.0 12.0 18.0 23.9 29.8 35.7 41.4 47.0 52.6 58.2 63.7 69.2 74.7')
COFFEE = F('6.5 12.6 18.6 24.5 30.3 35.8 41.3 45.0 48.1 51.2 54.3 57.4 60.5 63.6 66.7 69.8 72.9 77.0')

CUES = {}

# ---------------------------------------------------------------- opening animation (84 f)
CUES['intro'] = [
    C(8, 'swish', -6), C(9, 'punch', -6), C(11, 'swish', -7, p=0.3), C(12, 'punch', -7, p=0.3),
    C(20, 'whoosh', -8), C(23, 'punch', -5),
    C(28, 'slam', -2), C(28, 'boom', -6), C(29, 'logo_spark', -8), word(31), C(33, 'sparkle', -12), word(40, -13),
    cheer(30, -15, d=2.0, fo=0.8), C(68, 'whoosh_out', -9),
]

# ---------------------------------------------------------------- gym
CUES['gym-1'] = [  # Beast Mode: clean and jerk in the gym theatre (BeastMode.tsx GRIP 45, LOCK 76)
    C(2, 'whoosh_big', -9, a='st'), C(16, 'whoosh_heavy', -13),
    C(45, 'db_grab', -4), C(46, 'chain', -17, d=0.6),
    C(57, 'whoosh_heavy', -7), C(66, 'clank', -5), C(66, 'boom_short', -9),
    C(74, 'whoosh_fast', -7), C(76, 'clank', -3), C(76, 'boom', -4), C(77, 'growl', -15, d=1.2, fo=0.4), ooh(78),
    *gym_card(88),
]
CUES['gym-2'] = [  # Gun Show: curls, POW flex at 61, CLONK dumbbells, MWAH, card 98
    opening(), C(20, 'swish', -15), C(32, 'swish', -15), word(44, -13),
    C(50, 'whoosh', -8), *impact(61), word(62, -10), ooh(61),
    C(75, 'db_place', -4), C(78, 'db_place', -6, r=1.06), word(76, -13),
    C(94, 'kiss', -3), *card(98),
]
CUES['gym-3'] = [  # Leg Day: ONE / TWO / THREEE..., bail, CLANG, SPLAT split at 91, card 100
    opening(), C(14, 'whoosh_heavy', -14), C(22, 'pop_pluck', -9),
    C(34, 'whoosh_heavy', -14), C(46, 'pop_pluck', -8, r=1.12),
    C(57, 'pop_pluck', -8, r=1.26), C(58, 'power_down', -11),
    C(70, 'whoosh', -8), C(80, 'metal_drop', -3), C(80, 'clank', -6), word(81),
    C(88, 'whoosh_fast', -8), C(91, 'crit', -3), C(91, 'cloth_tear', -5), C(92, 'boom', -6), ooh(91),
    *card(100),
]
CUES['gym-4'] = [  # Atlas Mode: night sky, heave the globe, press (51), spin it, release (89), banner 105
    C(0, 'pad', -20, d=4.4, fi=0.4, fo=0.8), C(3, 'whoosh_big', -11, a='st'),
    C(25, 'whoosh_heavy', -8), C(26, 'rumble', -17, d=0.8, fo=0.3),
    C(47, 'whoosh_heavy', -9), C(51, 'boom_short', -8),
    C(56, 'spin', -10, d=1.2, fo=0.3),
    C(89, 'whoosh_fast', -7), C(92, 'twinkle', -10), C(104, 'gem', -9),
    *gym_card(105),
]
CUES['gym-5'] = [  # Mirror Check: three selfies (31, 51, 73), the polaroid lands (105)
    C(1, 'whoosh_big', -9, a='st'), C(23, 'swish', -14),
    C(31, 'shutter', -3), C(32, 'twinkle', -15),
    C(51, 'shutter', -3), C(52, 'twinkle', -15),
    C(73, 'shutter_big', -2), C(74, 'whoosh', -8),
    C(84, 'whoosh_out', -10), C(100, 'swish', -12), C(105, 'card_slap', -4),
    *gym_card(105),
]
CUES['gym-6'] = [  # Raise the Bar: reps 13/23/33, kip 40, release 49, HUP 56, land 62, flex 76, card 92
    opening(), C(10, 'swish', -15), C(13, 'pop_pluck', -9), C(20, 'swish', -15), C(23, 'pop_pluck', -9, r=1.12),
    C(30, 'swish', -15), C(33, 'pop_pluck', -9, r=1.26),
    C(44, 'whoosh_heavy', -8), C(50, 'jump', -6), word(56, -11),
    C(62, 'land', -3), C(63, 'thud', -8),
    *impact(76), C(77, 'boing', -6),
    *card(92),
]
CUES['gym-7'] = [  # Box Jump: hops 9/25/41 land 20/36/52, big hop 63, BONK the lamp 73, land 81, STUCK IT 88
    opening(), C(9, 'jump', -9), C(20, 'cajon', -4), C(21, 'thud', -12),
    C(25, 'jump', -9, r=1.06), C(36, 'cajon', -4), C(41, 'jump', -9, r=1.12), C(52, 'cajon', -4),
    C(60, 'whoosh_big', -9), C(63, 'jump', -6, r=1.2),
    C(73, 'pot_clang', -2), C(73, 'boom', -6), C(73, 'boing', -8), word(74, -10),
    C(81, 'land', -3), C(82, 'cajon', -6), C(88, 'stamp', -6), word(88, -10),
    *card(96),
]
CUES['gym-8'] = [  # Rope Storm: waves, storm 46, SLAM 62, KA-WHOOM 70, drop 74, card 94
    opening(), C(8, 'rope', -12), C(20, 'rope', -12, p=0.3), C(32, 'rope', -11, p=-0.3),
    C(46, 'rumble', -13, d=1.0, fo=0.4), C(46, 'rope', -8), C(52, 'rope', -8, p=0.3),
    *impact(62), C(62, 'slam', -6),
    C(70, 'explosion', -5), C(70, 'whoosh_big', -9), word(71, -10),
    C(74, 'drop_sack', -6), C(82, 'cloth', -12),
    *card(94),
]
_shaker = [C(f, 'cabasa', -9 if i % 2 == 0 else -11, p=(0.2 if i % 2 else -0.2)) for i, f in enumerate(range(6, 35, 4))]
CUES['gym-9'] = [  # Gains Shake: shake 6-34, POP the lid 38, chug 45-64, toss 72, flex 82, card 96
    opening(), *_shaker, word(10, -13),
    C(38, 'cork', -3), word(39, -12),
    C(45, 'pour', -13, d=0.9, r=0.85), *[C(f, 'bubble', -9, r=0.8 + 0.05 * i) for i, f in enumerate((47, 52, 57, 62))],
    C(66, 'burp', -7), C(70, 'whoosh', -9), C(72, 'whoosh_fast', -8),
    *impact(82), word(83, -10),
    *card(96),
]
CUES['gym-10'] = [  # Hammer Time: SLAM1 22, SLAM2 40 BWANG, UH OH / CLUNK 58, RINGER 68, flex 80, card 96
    opening(), C(17, 'whoosh_heavy', -8), C(22, 'boom_short', -3), C(22, 'drop_sack', -6),
    C(35, 'whoosh_heavy', -6), *impact(40), C(40, 'clang', -3), C(44, 'boing', -7), C(48, 'spin', -9, d=0.9),
    word(54, -12), C(58, 'car_door', -6),
    C(68, 'clank', -3), C(68, 'bell_desk', -7), word(70, -11), ooh(68),
    C(80, 'whoosh', -10), word(80, -11),
    *card(96),
]

# ---------------------------------------------------------------- run
CUES['run-1'] = [  # Speed Demon: run in, ZOOOM turbo 42-46, burst 84, SKRRT, card 100
    C(1, 'whoosh_big', -11, a='st'), *steps(RUN1),
    C(42, 'whoosh_fast', -6), word(46, -11), C(44, 'steam', -15, d=1.3, fo=0.4),
    C(84, 'whoosh', -7), C(85, 'boom', -7), C(85, 'sparkle', -10),
    C(90, 'skid', -7, d=0.6, fo=0.25), word(96),
    *card(100),
]
CUES['run-2'] = [  # Frost Miles: BRRR 19, HEAT CHECK 44, SSSSS steam, card 102
    bed('wind', -17), *steps(FROST, 'snow', -12, until=90),
    C(18, 'chirp', -16, r=0.6), word(19, -12),
    C(40, 'whoosh', -8), *impact(44), C(44, 'fire_whoosh', -4), word(45, -10),
    C(94, 'steam', -8, d=1.4, fo=0.5), C(95, 'sizzle', -14, d=0.8),
    *card(102),
]
CUES['run-3'] = [  # Torch Bearer: ZOOOM 44, cauldron IGNITE 98 (FWOOSH), card 106
    bed('fire_loop', -18, n=100), *steps(TORCH),
    C(43, 'whoosh_fast', -7), word(45, -12),
    C(80, 'whoosh', -9), C(92, 'whoosh_heavy', -8),
    *impact(98), C(98, 'fire_whoosh', -2), word(99, -10), C(100, 'fire_big', -14, d=1.2, fo=0.5),
    *card(106),
]
CUES['run-4'] = [  # Night Owl: HOO HOO 19, OH IT'S ON / TURBO 44, HOO?! and the owl flaps off, card 102
    bed('night', -21), C(14, 'owl', -4), word(19, -13), *steps(OWL),
    word(40, -12), C(44, 'whoosh_fast', -6), C(50, 'owl', -8, r=1.15), word(51, -12), C(52, 'wings', -9, d=1.2),
    *card(102),
]
CUES['run-5'] = [  # Goose Chase: HONK 22, AAAAH panic 32, HONK HONK, stop 80, goose hops on 86, plop 95, card 104
    *steps(GOOSE), goose(22), word(23),
    C(32, 'whoosh_fast', -6), word(33, -11),
    goose(44, -5, 1.05), goose(48, -6, 0.97), C(60, 'wings', -12, d=1.0),
    C(80, 'skid', -9, d=0.45, fo=0.2), C(86, 'jump', -8), C(86, 'wings', -10, d=0.8),
    C(95, 'pop', -3, r=0.8), word(96), goose(100, -7, 1.1),
    *card(104),
]
CUES['run-6'] = [  # Rush Hour: BEEP BEEP taxi, BOOST 38, ZOOOM, SKRRT 74, card 94
    bed('city', -18), *steps(RUSH),
    C(24, 'car_horn', -5), C(29, 'car_horn', -7, r=1.03), word(27),
    C(34, 'whoosh', -8), *impact(38), C(38, 'whoosh_fast', -6), word(54),
    C(74, 'skid', -5, d=0.6, fo=0.2), word(76), C(82, 'whoosh', -11),
    *card(94),
]
CUES['run-7'] = [  # Green Light: wait ticks, WALK chirps at GO 32, impact 34, SKRRT 70, card 92
    bed('city', -19), C(2, 'tick', -12), C(17, 'tick', -12),
    C(30, 'chirp', -6), C(32, 'chirp', -7), C(34, 'chirp', -8),
    *steps(GREEN), *impact(34), C(34, 'whoosh_fast', -6),
    C(70, 'skid', -5, d=0.6, fo=0.2), word(72), C(78, 'whoosh', -11),
    *card(92),
]
CUES['run-8'] = [  # Pigeon Panic: scatter 28, one lands on his head 46, SKRRT 72, COO, card 94
    bed('city', -19), coo(4, -9), *steps(PIGEON),
    C(26, 'wings', -4), C(28, 'wings', -6, r=1.1, p=0.4), C(30, 'wings', -8, r=0.92, p=-0.4), word(28),
    C(46, 'wings', -9, d=0.6), C(47, 'pop', -8, r=0.85),
    C(72, 'skid', -5, d=0.6, fo=0.2), word(74), coo(88, -4), word(90),
    *card(94),
]
CUES['run-9'] = [  # Sunrise Miles over the bridge: rooster, fist pump 56, SKRRT 74, card 96
    bed('wind_soft', -20), *steps(BRIDGE), C(46, 'rooster', -8, d=1.6, fo=0.4),
    C(56, 'whoosh', -9), word(56), C(74, 'skid', -5, d=0.6, fo=0.2), word(76), C(82, 'whoosh', -11),
    *card(96),
]
CUES['run-10'] = [  # Coffee Run: cart bell, ONE ESPRESSO 22, SNATCH 27, ZING 36, BOOST 40, SKRRT 74, card 96
    bed('city', -19), *steps(COFFEE),
    C(14, 'bell_shop', -10), word(22), C(24, 'swipe', -6), word(27, -11),
    C(30, 'pour', -14, d=0.35, r=1.3), C(36, 'zap', -6), C(36, 'sparkle', -8), word(37, -11),
    *impact(40), C(40, 'whoosh_fast', -5),
    C(74, 'skid', -5, d=0.6, fo=0.2), word(76), C(82, 'whoosh', -11),
    *card(96),
]

# ---------------------------------------------------------------- MMA
CUES['mma-1'] = [  # Knockout: jab 18, cross 30, KICK 46, K.O. 62, card 84
    C(16, 'swish', -9), C(18, 'punch_body', -3), C(18, 'drop_sack', -12),
    C(28, 'swish', -8), C(30, 'punch_body', -2), C(30, 'drop_sack', -11),
    C(42, 'whoosh_heavy', -6), *impact(46), C(46, 'punch_body', 0), C(47, 'chain', -12, d=0.8),
    ring_bell(62), word(62, -10), cheer(64, -8, d=2.2, fo=0.8),
    *card(84),
]
CUES['mma-2'] = [  # Main Event: walkout through the smoke, TAP gloves 50, pyro 62, LET'S GOOO 76, card 94
    cheer(0, -18, d=1.6, fi=0.5), C(2, 'whoosh_big', -12, a='st'), C(4, 'steam', -12),
    C(10, 'braam', -10, d=2.0, fo=0.6), *[C(f, 'stepa' if i % 2 == 0 else 'stepb', -14) for i, f in enumerate((14, 24, 34, 44))],
    C(44, 'boom_short', -8), *impact(50), C(50, 'punch', -2),
    C(62, 'fire_whoosh', -4, p=-0.5), C(63, 'fire_whoosh', -6, r=0.9, p=0.5),
    cheer(76, -6, d=2.4, fo=0.9), word(76),
    *card(94),
]
CUES['mma-3'] = [  # Flying Knee: crouch 28, take off 32, HIT 44, cut 60, land 65, pyro 71, card 100
    C(10, 'stepa', -14), C(18, 'stepb', -14), C(28, 'cloth', -12), C(32, 'whoosh_heavy', -6), C(38, 'whoosh_fast', -6),
    *impact(44), C(44, 'punch_body', 0),
    C(60, 'whoosh_big', -8), C(60, 'sting_reveal', -9), C(65, 'land', -5),
    C(71, 'fire_whoosh', -5, p=-0.5), C(72, 'fire_whoosh', -7, r=0.9, p=0.5), ring_bell(71, -6),
    C(80, 'boom', -8), C(80, 'sparkle', -10), cheer(91, -8, d=1.6),
    *card(100),
]
CUES['mma-4'] = [  # New Champ: WINNER, belt SNAP 38, VICTORY 62 pyro, wink 90, card 100
    cheer(2, -14, d=1.2, fi=0.2), C(12, 'whoosh', -10), word(14),
    C(24, 'whoosh', -8), C(30, 'swish', -10), C(38, 'latch', -2), C(38, 'slap', -6), word(39, -11), C(44, 'sparkle', -10),
    *impact(62), C(62, 'fire_whoosh', -4, p=-0.5), C(63, 'fire_whoosh', -6, r=0.9, p=0.5), ring_bell(62, -6),
    cheer(64, -6, d=2.4, fo=0.9), C(78, 'whoosh', -11), C(90, 'twinkle', -8),
    *card(100),
]

# ---------------------------------------------------------------- jickle
CUES['jickle-1'] = [  # Jickle King: toss, serve, dark beat, POP 40, CRACK 50, card 84
    C(1, 'whoosh_big', -11, a='st'), C(17, 'swish', -12), C(19, 'bounce', -10),
    C(28, 'whoosh_heavy', -7), C(30, 'whoosh_fast', -6), C(34, 'sting_reveal', -10),
    *paddle(40, 1), C(40, 'boom', -5), word(41, -11), C(42, 'crit', -6),
    C(50, 'slap', -3), word(51, -11), C(56, 'whoosh_out', -12),
    *card(84),
]
CUES['jickle-2'] = [  # Chef's Kiss: hat 10, dinks 20/40/60, DEAD BALL drop 82, MWAH 90, card 104
    word(10, -10), C(10, 'sparkle', -13),
    *paddle(20, -6), C(26, 'bounce', -12), *paddle(40, -6, 1.04), C(46, 'bounce', -12), *paddle(60, -6, 0.97), C(66, 'bounce', -12),
    C(68, 'whoosh', -9),
    *paddle(82, -8, 1.08), C(85, 'bounce', -10), C(89, 'bounce', -15, r=1.2), word(84, -12),
    C(90, 'kiss', -2), word(91), C(96, 'sting_soft', -12),
    *card(104),
]
CUES['jickle-3'] = [  # The Erne: run 4, leap 24, BAM 33, land in the sand 42, slide 54, card 98
    bed('waves', -18), *steps([6, 12, 18], 'sand', -12),
    C(24, 'whoosh_heavy', -6), C(28, 'whoosh_fast', -7),
    *paddle(33, 1), C(33, 'boom_short', -7), word(34, -11),
    C(42, 'land_dirt', -4), word(43, -11), C(54, 'gravel', -8, d=0.9, fo=0.3),
    C(62, 'whoosh', -12), C(62, 'twinkle', -11), C(76, 'whoosh', -12),
    *card(98),
]
CUES['jickle-4'] = [  # Jickled: serve ACE 16, scoreboard flips 31, JICKLED 39, catch 60, bite 70, card 98
    C(9, 'bounce', -10), *paddle(16, 1), C(17, 'whoosh_fast', -8), word(19, -11),
    C(27, 'whoosh', -8), C(29, 'bounce', -9),
    C(31, 'card_slap', -5), C(31, 'click', -9), C(33, 'card_slap', -7, r=1.1),
    C(39, 'party_pop', -4), word(40, -10), cheer(41, -10, d=1.8),
    C(58, 'swish', -10), C(60, 'pop', -6), C(70, 'squeak', -4),
    *card(98),
]
_rally = [x for i, h in enumerate((16, 25, 33, 40, 46, 51, 55)) for x in paddle(h, -4, 1 + 0.02 * i)]
CUES['jickle-5'] = [  # Quick Hands: the rally speeds up, POP POP lights out 59, spotlight CLUNK 67, twirl, bow 84
    *_rally, C(59, 'bulb', -3), C(61, 'bulb', -5, r=0.9), word(60, -11), C(62, 'power_down', -9),
    C(67, 'car_door', -3), C(67, 'switch', -8), word(68, -12),
    C(71, 'spin', -9, d=0.9), C(84, 'cloth', -12), applause(84),
    *card(98),
]

# ---------------------------------------------------------------- bike
CUES['bike-1'] = [  # King of the Mountain: SUMMIT 44, fist 50, no hands, flex 78, wink 90, card 98
    bed('wind_soft', -20), C(0, 'freewheel', -15, d=1.4, fo=0.5),
    C(38, 'whoosh', -8), *impact(44), C(44, 'braam', -8, d=1.6, fo=0.5), word(45, -10), cheer(46, -9, d=2.0, fo=0.8),
    C(50, 'whoosh', -11), C(52, 'bike_bell', -7), C(78, 'whoosh', -11), C(90, 'twinkle', -8),
    *card(98),
]
CUES['bike-2'] = [  # Send It: WHEE downhill 16, take off 40, land 58 STUCK IT, card 98
    C(0, 'freewheel', -14, d=2.0, fo=0.6), C(10, 'steam', -12, d=1.2), word(16, -12),
    C(40, 'whoosh_heavy', -6), C(42, 'jump', -9), C(50, 'whoosh_fast', -8),
    *impact(58), C(58, 'land', -2), word(59, -10), cheer(60, -9, d=2.0),
    C(68, 'whoosh', -11), C(80, 'whoosh', -12),
    *card(98),
]
CUES['bike-3'] = [  # Sprint Finish: throw the bike 35, the line 40, photo-finish CLICK 46, card 98
    C(0, 'freewheel', -15, d=1.2), cheer(0, -18, d=1.6, fi=0.4),
    C(30, 'whoosh_heavy', -7), C(35, 'whoosh_fast', -5), C(40, 'whoosh_big', -6), C(40, 'boom_short', -8),
    C(46, 'shutter_big', -3), word(47, -11), cheer(48, -7, d=2.4, fo=0.9),
    C(52, 'bike_bell', -8), C(70, 'whoosh', -11), C(84, 'whoosh', -12),
    *card(98),
]

# ---------------------------------------------------------------- the rest of the activities
CUES['volo-1'] = [  # Sky Spike: launch 16, in the sky, SPIKE 37 BOOM, ball hits the sand 44, lands, card 84
    bed('waves', -18), C(12, 'whoosh_heavy', -6), C(16, 'jump', -6), C(18, 'whoosh_big', -6),
    C(30, 'whoosh', -10), C(37, 'kick', -1), C(37, 'slap', -6), C(37, 'crit', -6), C(38, 'boom', -4), word(39, -10),
    C(44, 'land_dirt', -3), C(44, 'boom_short', -8), C(46, 'whistle', -7),
    C(50, 'whoosh', -9), C(56, 'land_dirt', -5), cheer(58, -9, d=2.0),
    *card(84),
]
CUES['soccer-1'] = [  # Golazo: bicycle kick WHAM 26, GOOOOAL, card 80
    cheer(0, -20, d=1.0, fi=0.5), C(8, 'whistle', -9),
    C(19, 'whoosh', -9), C(23, 'whoosh_heavy', -6),
    C(26, 'kick', -1), C(26, 'boom', -5), word(27, -10), C(34, 'land', -6), C(36, 'cloth', -6, r=1.3),
    cheer(38, -4, d=3.0, fo=1.2), word(42, -10), C(46, 'whistle', -8),
    *card(80),
]
CUES['date-1'] = [  # Date Night: rose, BA-DUM BA-DUM, fireworks, card 96
    C(0, 'bed_warm', -17, d=5.0, fi=0.5, fo=1.0),
    C(14, 'swish', -12), C(19, 'sparkle', -11),
    C(36, 'heartbeat', -3, d=0.9), word(38), C(55, 'heartbeat', -2, d=0.9, r=1.08), word(57),
    C(65, 'kiss', -6),
    C(70, 'explosion', -9, r=1.3), C(70, 'sparkle', -9), C(74, 'explosion', -10, r=1.1, p=-0.4), C(78, 'explosion', -11, r=1.4, p=0.4),
    *card(96),
]
CUES['beers-1'] = [  # Cheers Fellas: mugs in, CHEERS 32, chug, GLUG, slam it down, AHHH, card 88
    bed('bar', -19), C(17, 'swish', -10), C(20, 'swish', -11, p=0.4),
    C(32, 'clink', -1), C(32, 'glass_cheers', -4), word(33, -10), cheer(34, -10, d=1.6),
    C(42, 'whoosh', -11), C(46, 'pour', -14, d=1.2, r=0.8), *[C(f, 'bubble', -10, r=0.75) for f in (50, 55, 60, 65)], word(66),
    C(75, 'glass_set', -2), C(75, 'boom_short', -8), C(80, 'burp', -5),
    *card(88),
]
CUES['reading-1'] = [  # Big Brain: FWIP page flips, book shut, DING idea, THUD books, glint, card 92
    C(5, 'whoosh', -11), *[C(f, 'page', -6 if i % 2 == 0 else -8, p=(0.2 if i % 2 else -0.2)) for i, f in enumerate((14, 19, 24, 29, 34))],
    word(17, -13), C(39, 'book_close', -3),
    C(48, 'bell_desk', -3), C(48, 'sparkle', -10), word(49, -11),
    C(61, 'thud', -3), C(63, 'drop_sack', -5), C(63, 'book_close', -6), C(65, 'book_close', -8, r=1.1), word(67, -11),
    C(84, 'twinkle', -9),
    *card(92),
]

# ---------------------------------------------------------------- inside jokes (5.5 s)
CUES['joke-coin'] = [  # The Coin: DEAN vs JAKE, FLICK 26, drum roll, lands 68-70, on its edge 80, STILL TIED stamps, $1
    C(8, 'slam', -5), word(8, -10),
    C(26, 'coin_flip', -1), word(27), C(32, 'drumroll', -11, d=1.2, fo=0.2),
    C(68, 'coin_drop', -1), C(80, 'coin_soft', -8),
    C(89, 'stamp', -2), word(90, -11), C(96, 'stamp', -2, r=0.95), word(97, -11), ooh(98),
    *joke_card(118), C(120, 'cash', -8, d=1.4),
]
CUES['joke-bluehair'] = [  # Blue Hair: amphora swings in, POUR 28 SPLOOSH, head SHAKE 50, mirror 66, OBSESSED, card 112
    C(14, 'whoosh', -9), word(19, -13),
    C(26, 'pour', -5, d=1.0, fo=0.3), C(31, 'splash', -2), word(32, -10),
    C(50, 'swish', -8), C(53, 'swish', -9, p=0.5), C(56, 'swish', -9, p=-0.5), C(52, 'splash_small', -8),
    C(66, 'magic', -6), C(67, 'twinkle', -8), word(95, -11), C(95, 'sparkle', -9),
    *joke_card(112),
]
CUES['joke-iron'] = [  # The Iron: clock ticking, HONK at the window, LIFT the shirt 66, close-up 84, 9:58 LATE, card 118
    C(0, 'clock', -14, d=4.0, fo=0.4), C(4, 'steam', -14),
    C(15, 'car_horn', -4), word(16),
    C(33, 'car_horn', -4), C(37, 'car_horn', -5, r=1.03), word(34),
    C(50, 'steam', -9, d=1.2), C(66, 'whoosh', -9), C(68, 'cloth', -8),
    C(78, 'whoosh_big', -9), C(84, 'sting_reveal', -8),
    C(95, 'alarm', -8), C(97, 'car_horn', -3, d=0.8), word(98), C(100, 'twinkle', -10),
    *joke_card(118),
]
CUES['joke-crashout'] = [  # Crash Out: the post, CAP 36, RAGE 50, CRASH OUT 66, phone thrown 74, THAT'S CAP, card 120
    C(20, 'notify', -6), word(22),
    C(36, 'stamp', -3), word(37, -10),
    C(44, 'whoosh', -9), C(50, 'heartbeat', -6, d=0.8), C(50, 'rumble', -12, d=1.0),
    C(66, 'explosion', -2), C(66, 'boom', -4), word(67, -10), C(66, 'rumble', -10, d=3.2, fo=0.8),
    C(74, 'whoosh_fast', -5), C(80, 'glass_break', -6),
    word(98, -10), C(98, 'slap', -6),
    *joke_card(120),
]
CUES['joke-radiator'] = [  # The Radiator: day 1 to 4, LUNGE 26 / SNAP 40, LUNGE 62 SO CLOSE / SNAP 84 CLANK, BUZZ 92
    C(6, 'card_slap', -10), C(10, 'card_slap', -10, r=1.06), C(14, 'card_slap', -10, r=1.12), C(18, 'pencil', -12, d=0.6),
    C(22, 'chain', -6), C(26, 'whoosh', -8),
    C(40, 'chain', -3), C(40, 'clank', -6), C(41, 'thud', -8),
    C(57, 'chain', -5), C(60, 'whoosh_heavy', -7), word(62, -11),
    C(84, 'chain', -2), C(84, 'clank', -3), word(85, -10),
    C(92, 'phone_vibe', -4, d=1.0), C(94, 'notify', -9), word(104),
    *joke_card(120),
]
CUES['joke-mom'] = [  # Jake's Mom: video games, DOOR 28 BANG, JAAAAKE, ON A SUNDAY?!, he RUNS 96, card 120
    C(0, 'game8bit', -15, d=0.93),
    C(28, 'door_slam', 0), C(28, 'boom', -5), word(29, -10), C(29, 'scratch', -5),
    C(31, 'braam', -8, d=1.6, fo=0.5), word(33, -9), word(45), word(52), word(66),
    C(92, 'whoosh_fast', -5), *[C(f, 'stepa' if i % 2 == 0 else 'stepb', -8) for i, f in enumerate((96, 98, 100, 102))],
    C(100, 'whoosh_out', -6),
    *joke_card(120),
]
CUES['joke-liquor'] = [  # The Liquor Run: shop bell, PICK 14, BACK 38, PICK 48, an hour LATER 64, FOUND IT 91
    C(2, 'bell_shop', -10),
    C(14, 'bottle_clink', -5), word(16), C(38, 'bottle_clink', -6, r=0.95), word(40), C(48, 'bottle_clink', -5, r=1.05), word(52),
    C(64, 'clock', -9, r=1.6, d=0.85, fo=0.2), C(64, 'spin', -12, d=0.9),
    C(91, 'sparkle', -5), C(91, 'triad', -6), word(92, -10), C(96, 'bottle_clink', -4),
    *joke_card(120),
]
CUES['joke-mma'] = [  # MMA Guy: I DO MMA, punch the air 26, SPIN 50, falls THUD 66, gets up, I'M BETTER THAN ALL OF U
    word(4, -11), C(24, 'swish', -5), C(26, 'whoosh_fast', -6),
    C(50, 'spin', -5, d=1.0), word(52, -11),
    C(66, 'person_fall', -2), C(67, 'thud', -3), word(68, -10),
    C(88, 'cloth', -10), word(100, -11), C(102, 'boo', -12, d=1.5, fo=0.6),
    *joke_card(122),
]
CUES['joke-puke'] = [  # Puked On: HURK 26, BLAAARGH 40, SPLAT on Amaan 46, SORRY BRO, card 120
    bed('city', -24, n=165), C(26, 'burp', -6, r=0.85), word(27),
    C(38, 'pour', -6, d=0.6, r=0.7), C(40, 'bubble', -8, r=0.6), word(41, -10),
    C(46, 'splash', -2), C(46, 'slap', -10), C(47, 'gasp', -6),
    word(98), word(100),
    *joke_card(120),
]
_brawl = [C(f, 'punch' if i % 2 == 0 else 'slap', -6 - (i % 3), p=((i * 0.37) % 1.2) - 0.6) for i, f in enumerate((56, 59, 62, 65, 68, 72, 75, 79, 83, 87, 91))]
CUES['joke-fight'] = [  # Dylan Starts Fights: lands on the podium 24, TIED / OH IT'S ON, dust-cloud brawl 54-98, WHACK, BONK
    C(20, 'whoosh', -8), C(24, 'land', -4), word(25, -11),
    word(34, -10), C(34, 'sting_reveal', -10), word(40),
    C(50, 'whoosh_big', -6), C(54, 'steam', -12, d=1.5), *_brawl, C(70, 'boing', -10),
    C(82, 'slap', -3), word(82, -10),
    word(98, -10), C(98, 'boing', -6), C(100, 'thud', -6), C(104, 'whoosh_out', -9), C(110, 'thud', -10),
    *joke_card(122),
]
CUES['joke-bag'] = [  # The Bag: the bag drops 22, three heads pop out, the bow is tied 80, card 120
    C(16, 'whoosh_heavy', -6), C(22, 'drop_sack', 0), C(22, 'paper_crumple', -8, d=0.6), C(23, 'boom_short', -6), word(30),
    C(32, 'pop', -6), C(49, 'pop', -6, r=1.1), C(75, 'pop', -6, r=1.2),
    C(80, 'cloth', -6), C(80, 'sparkle', -8), word(81, -10), cheer(84, -10, d=1.6),
    *joke_card(120),
]
CUES['joke-nets'] = [  # The Nets Game: DING DONG 30, doors shut 40, NOOO 50, the train leaves 58, next train 47 MIN
    C(30, 'doorbell', -3, d=1.3), word(31),
    C(38, 'door_slide', -4), C(40, 'door_slam', -5, r=1.2),
    *[C(f, 'stepa' if i % 2 == 0 else 'stepb', -9) for i, f in enumerate((42, 45, 48))], word(50, -10), C(50, 'whoosh_fast', -6),
    C(58, 'train', -4, d=2.2, fo=1.0), C(58, 'whoosh_big', -8),
    C(92, 'stop_tape', -4), word(93), word(94),
    *joke_card(122),
]
CUES['joke-satellite'] = [  # Satellite House: CLINK 10, checks his watch 32, IGNITE 46, WHOOSH 50, lands at home 96
    C(0, 'bar', -18, d=1.6, fo=0.5), C(10, 'glass_cheers', -3), C(10, 'bottle_clink', -6), word(11),
    C(32, 'tick', -8), word(34),
    C(46, 'rocket', -3, d=2.4, fo=0.8), C(46, 'boom', -6), word(48, -10), C(50, 'whoosh_big', -5), word(52, -11),
    C(60, 'space', -14, d=3.5, fi=0.5, fo=0.6), C(76, 'whoosh', -9),
    C(96, 'land', -4), C(96, 'sting_soft', -10), word(104),
    *joke_card(122),
]
CUES['joke-phil'] = [  # Punxsutawney Phil: RUMBLE 8, POP out 22, the sun 48, GASP at his shadow 58, FWOOP 68, 6 MORE WEEKS
    bed('wind', -20, n=165), C(8, 'rumble', -6, d=0.9, fo=0.3),
    C(22, 'pop', -2), C(22, 'jump', -6), C(24, 'powder', -8),
    C(48, 'magic', -8), C(48, 'twinkle', -10),
    C(57, 'gasp', -3), word(58, -11), C(58, 'sting_reveal', -8),
    C(68, 'whoosh_out', -3), C(69, 'powder', -6), word(70, -11),
    C(82, 'braam', -6, d=1.8, fo=0.6), C(84, 'slam', -4),
    *joke_card(122),
]
CUES['joke-scared'] = [  # Scared of Girls: BUZZ new message 18, FREEZE 26, AAAAH 32, hides 46, SHOOK
    C(18, 'phone_vibe', -3, d=0.8), C(19, 'notify', -6), word(20, -11),
    C(26, 'scratch', -5), C(32, 'scream', -4, d=1.1, fo=0.3), word(33, -10), C(32, 'whoosh_fast', -7),
    C(46, 'whoosh_out', -6), C(48, 'thud', -8), C(60, 'heartbeat', -9, d=1.4), word(82),
    *joke_card(122),
]
_club = ([C(f, 'kick_e', -11) for f in range(0, 165, 15)] + [C(f + 7.5, 'hat_e', -17) for f in range(0, 160, 15)]
         + [C(f, 'clap_e', -15) for f in range(15, 165, 30)])
_typing = [C(f, 'key', -9 - (i * 7 % 4), r=0.95 + (i * 0.13 % 0.15)) for i, f in enumerate(range(42, 91, 2))]
CUES['joke-timesheet'] = [  # Time Sheet: last call at the club, BUZZ 16, !!! 31, SLAM the laptop 36, types, CLICK 92, MADE IT
    *_club, C(16, 'phone_vibe', -4, d=0.7), C(17, 'notify', -7), word(24),
    word(31, -9), C(31, 'boing', -10), C(36, 'boom_short', -3), C(36, 'slap', -6), *_typing,
    C(92, 'click', -2), word(93, -10), C(102, 'triad', -4), cheer(102, -7, d=2.2), word(103, -10),
    *joke_card(122),
]

# ---------------------------------------------------------------- round 2 (HyperFrames: animations/hyperframes/<id>.html)
# Frame numbers are the beats listed at the top of each clip's html file.
CUES['joke-thanksgiving'] = [  # Thanksgiving: board drops 2-13, strain 4-58 (NNNGH 12, HNNNG 36, sweat 14/26/38/50),
    # halfway hop 58, PRESS 82, NEW PR! + confetti 86, three white lights 88/91/94, sparkle 95, card 120
    bed('bed_warm', -24, n=118, fo=0.8), C(0, 'bar', -27, d=3.6, fi=0.4, fo=1.2),
    C(6, 'whoosh', -10), C(13, 'clank', -9), C(14, 'notify', -13),
    C(4, 'heartbeat', -9, d=1.85, fo=0.3), C(8, 'rumble', -17, d=1.7, fi=0.4, fo=0.3),
    word(12, -10), C(12, 'squeak', -17, r=0.7),
    C(14, 'bubble', -15), C(18, 'clink', -18), C(24, 'clink', -17, r=1.1), C(26, 'bubble', -15, r=1.1),
    C(31, 'clink', -16), word(36, -9), C(38, 'bubble', -14, r=0.95), C(40, 'clink', -15, r=0.95),
    C(46, 'bottle_clink', -16), C(50, 'bubble', -14, r=1.15), C(53, 'clink', -14, r=1.05),
    C(56, 'whoosh_heavy', -12), C(58, 'jump', -12), ooh(60, -13), C(70, 'clink', -15), C(76, 'bottle_clink', -15, r=1.1),
    C(80, 'whoosh_heavy', -7), C(82, 'slam', -5), C(82, 'boom_short', -8), C(83, 'powder', -9), C(85, 'clank', -12),
    C(86, 'stamp', -6), C(86, 'fanfare', -8), C(87, 'party_pop', -8), word(86, -11), applause(88, -9, d=2.6),
    C(88, 'ding', -9), C(91, 'ding', -9, r=1.06), C(94, 'ding', -8, r=1.12), cheer(92, -13, d=2.0),
    C(96, 'sparkle', -12), C(105, 'whoosh_out', -12),
    *joke_card(120),
]
CUES['joke-crossing'] = [  # The Crossing: the slow drift 0-86, thunder 84, FLASH 88 + 99, terror 92, fade 104-118, card 120
    C(0, 'wind', -14, d=4.0, fi=0.5, fo=0.8), C(0, 'waves', -19, d=3.9, fi=0.4, fo=0.8), C(6, 'pad', -24, d=3.2, fi=1.4, fo=0.6),
    C(28, 'owl', -24, r=0.9), C(44, 'heartbeat', -15, d=1.6, fi=0.4, fo=0.3),
    C(82, 'rumble', -9, d=1.6, fo=0.6), C(88, 'boom', -4), C(88, 'slap', -12, r=0.7), C(89, 'sub', -8), word(88, -13),
    C(92, 'gasp', -7), C(93, 'scream', -15, d=0.9, fo=0.4), C(93, 'pop_in', -14), C(95, 'pop_in', -14, r=1.1), C(97, 'pop_in', -14, r=1.2),
    C(99, 'boom_short', -9), C(104, 'power_down', -13), C(106, 'braam', -8),
    *joke_card(120),
]
CUES['joke-mycar'] = [  # My Car, My Rules: rolls in 0-40, MY CAR. MY RULES. 18, drifts 40-78, BONK 78, airbags 80-81, dazed 86, stars 94, roof snow 100, card 120
    C(0, 'wind_soft', -22, d=3.8, fi=0.3, fo=1.0), C(0, 'rumble', -21, d=2.6, fi=0.3, fo=0.6, r=1.4), C(4, 'whoosh', -12),
    C(18, 'pop_in', -10), C(19, 'card_slap', -15), C(30, 'heartbeat', -16, d=1.4, fo=0.3),
    C(64, 'skid', -10, d=0.9, fo=0.3), C(78, 'crash', -9, d=1.1, fo=0.5), C(78, 'thud', -6), C(78, 'boing', -11), word(78, -11), C(79, 'powder', -8),
    C(80, 'pop', -4), C(80, 'whoosh_fast', -12), C(81, 'pop', -5, r=1.1),
    C(90, 'twinkle', -13), C(94, 'chirp', -15), C(100, 'chirp', -16, r=1.2), C(100, 'drop_sack', -14), C(106, 'chirp', -17, r=1.1),
    *joke_card(120),
]
CUES['joke-finalcall'] = [  # Final Call: FINAL CALL! 2, doors 6-62, run 6-46 (steps every 4), ZOOM 16, DIVE 46, SHUNK 62, STAMP 82, card 120
    C(0, 'city', -24, d=2.6, fi=0.2, fo=0.8), C(1, 'notify', -10), C(2, 'pop_in', -11), C(3, 'bell_desk', -14),
    C(6, 'door_slide', -12, d=1.8, fo=0.4), C(8, 'whoosh_fast', -11), word(16, -12),
    *steps(list(range(8, 46, 4)), g=-14), *[C(f, 'click', -20, r=1.4) for f in range(10, 46, 8)],
    C(44, 'whoosh_heavy', -9), C(46, 'jump', -11), C(50, 'swish', -10), C(56, 'whoosh_out', -12),
    C(62, 'door_slam', -4), C(62, 'clank', -9), word(62, -11),
    C(74, 'whoosh', -10), C(82, 'stamp', -3), C(82, 'boom_short', -9), C(83, 'sub', -10), C(86, 'fanfare', -9), cheer(86, -12, d=2.2),
    *joke_card(120),
]
CUES['joke-worthit'] = [  # #worthit: chewing 2-36, MMM 8, hearts 6-20, plane 26-100 (overhead ~60), looks up 40, shrug 68, CHOMP 88, card 120
    C(0, 'bed_warm', -23, d=4.0, fi=0.3, fo=1.0), C(3, 'chirp', -21), C(19, 'chirp', -22, r=1.15),
    word(8, -12), C(6, 'twinkle', -16), C(13, 'twinkle', -17, r=1.1), C(20, 'twinkle', -17, r=1.2),
    *[C(f, 'pop_pluck', -19, r=0.8) for f in (2, 9, 16, 23, 30)],
    C(28, 'wind', -19, d=2.6, fi=0.8, fo=0.9), C(42, 'whoosh_big', -7, r=0.55), C(40, 'pop_pluck', -13),
    C(68, 'squeak', -13), C(70, 'boing', -17, r=1.3),
    C(88, 'paper_crumple', -8, d=0.45, fo=0.15), C(88, 'pop', -10), word(88, -11),
    *[C(f, 'pop_pluck', -19, r=0.8) for f in (92, 99, 106, 113)], C(96, 'sting_soft', -13),
    *joke_card(120),
]
CUES['joke-basement'] = [  # Operation Basement: lights out 6, CREAK 12-26, rises 24, stuck 36-66 (HNNG 42), POP 68, lands 82, tiptoe 84+ (every 6), cat blinks 60, looks away 104, card 120
    C(0, 'night', -18, d=4.0, fi=0.3, fo=1.0), C(6, 'switch', -10), C(12, 'squeak', -10, r=0.55, d=0.9, fo=0.3), word(12, -16),
    C(26, 'cloth', -14), C(30, 'pop_pluck', -14), C(36, 'cloth_tear', -16, d=0.5),
    *[C(f, 'squeak', -16, r=1.3 + 0.1 * (i % 3)) for i, f in enumerate(range(38, 66, 7))], word(42, -12), C(44, 'heartbeat', -15, d=0.8),
    C(62, 'whoosh', -12), C(68, 'pop', -2), C(68, 'cork', -6), word(68, -12), C(69, 'powder', -12), C(70, 'spin', -12),
    C(82, 'land', -10), C(60, 'owl', -22, r=1.5),
    *[C(f, 'tick', -16, r=1.6) for f in range(84, 120, 6)], C(104, 'switch', -20, r=1.6),
    *joke_card(120),
]
CUES['joke-nomap'] = [  # No Map: lap 1 0-30, lap 2 32-62, lap 3 64-90 (steps every 5), LAP pops 8/40/72, snowman frowns 72, point 92, ? 96/99, card 120
    C(0, 'wind_soft', -18, d=4.0, fi=0.3, fo=1.0),
    *steps(list(range(2, 90, 5)), kind='snow', g=-14),
    C(8, 'pop_in', -11), C(9, 'tom_hi', -15), C(40, 'pop_in', -11, r=1.1), C(41, 'tom_mid', -14), C(72, 'pop_in', -10, r=1.2), C(73, 'tom_hi', -13, r=0.9),
    C(72, 'scratch', -18, d=0.5), C(92, 'whoosh_fast', -13), C(93, 'swish', -14),
    C(96, 'boing', -12), C(99, 'boing', -12, r=1.15), C(104, 'owl', -24, r=1.3),
    *joke_card(120),
]
CUES['joke-grandtheft'] = [  # Grand Theft #1: run in 4-30 (every 4), YOINK 30, door 36, driver lands 46, VROOOM 48-66, HEY!! 84, card 120
    C(0, 'city', -19, d=4.0, fi=0.2, fo=1.0), *steps(list(range(6, 31, 4)), g=-12),
    C(30, 'whoosh_fast', -8), C(30, 'cloth_tear', -12, d=0.4), word(30, -11), C(31, 'scream', -13, d=0.8, fo=0.3), C(36, 'car_door', -6),
    C(46, 'thud', -6), C(46, 'person_fall', -11), C(46, 'rumble', -9, d=1.2, r=1.6, fo=0.4),
    C(48, 'skid', -8, d=0.8, fo=0.3), C(50, 'whoosh_big', -7), word(48, -11), C(60, 'car_horn', -15, d=0.4),
    C(84, 'slap', -13), word(84, -10), C(86, 'gasp', -14, r=0.85),
    *joke_card(120),
]
CUES['joke-wanted'] = [  # Wanted: caps fall 4/28/52, land 14/38/62 (CAP! words), stars 15/39/63, sirens 66-118, hands up 72, card 120
    C(0, 'night', -20, d=4.0, fi=0.3, fo=1.0),
    *[x for f, r in ((14, 1.0), (38, 1.1), (62, 1.2)) for x in (C(f - 8, 'whoosh_fast', -15, r=r), C(f, 'thud', -9, r=r), C(f, 'pop_in', -12, r=r), C(f + 1, 'gem', -9, r=r))],
    word(14, -13), word(38, -12), word(62, -11),
    *[C(f, 'alarm', -12, d=0.32) for f in range(66, 118, 8)], C(66, 'whistle', -12), C(72, 'gasp', -9), C(73, 'boing', -16),
    *joke_card(120),
]
CUES['joke-busted'] = [  # Busted: siren in 6, car slides in 12-32 (SKRRT 26), hands up 36, phone lands ~66, BUSTED 51, card 120
    C(0, 'city', -21, d=3.6, fi=0.2, fo=1.0), *[C(f, 'tick', -21, r=1.8) for f in (2, 6, 10)],
    *[C(f, 'alarm', -13, d=0.32, r=1.15) for f in range(6, 112, 8)], C(12, 'whoosh_big', -9),
    C(24, 'skid', -6, d=1.0, fo=0.3), word(26, -12), C(32, 'car_door', -10),
    C(36, 'gasp', -8), C(36, 'jump', -13), C(66, 'clank', -16, r=1.6),
    C(44, 'whoosh', -9), C(51, 'stamp', -2), C(51, 'slam', -6), C(52, 'sub', -9), C(54, 'sting_reveal', -12), ooh(56, -12),
    *joke_card(120),
]
CUES['joke-wasted'] = [  # Wasted: strut 0-40 (every 6), slip 40 (WHOA), THUD 54, stars 58+, gray 60-78, WASTED 72, card 120
    C(0, 'wind_soft', -20, d=4.0, fi=0.3, fo=1.0), C(4, 'whistle', -15), *steps(list(range(3, 40, 6)), g=-13),
    C(40, 'squeak', -7, r=0.8), C(41, 'gasp', -11), word(40, -12), C(43, 'whoosh', -10),
    C(54, 'thud', -3), C(54, 'land', -8), C(55, 'sub', -9), C(55, 'crash', -18, d=0.6, fo=0.3), word(54, -11),
    C(60, 'chirp', -17), C(68, 'chirp', -18, r=1.2), C(60, 'power_down', -10), C(72, 'braam', -8),
    *joke_card(120),
]
CUES['joke-parole'] = [  # Out on Parole: behind bars 0-26, BZZZT 26, bars slide 30-44, walks out 46+ (every 7), FREE! 56, BEEP 70/96 (+ blink every 12), card 120
    C(0, 'wind_soft', -24, d=1.6, fo=0.6), C(4, 'tick', -20, r=0.7), C(16, 'tick', -21, r=0.7),
    C(26, 'zap', -8), C(26, 'alarm', -14, d=0.45), word(26, -12), C(30, 'chain', -9, d=1.0, fo=0.3), C(32, 'door_slide', -9, d=0.9), C(44, 'clang', -8),
    C(46, 'bed_warm', -20, d=2.6, fi=0.4, fo=1.0), C(46, 'sparkle', -12), *steps(list(range(48, 118, 7)), g=-14),
    word(56, -11), C(56, 'chirp', -15), C(66, 'chirp', -16, r=1.15), C(84, 'chirp', -16, r=0.9),
    C(70, 'notify', -10, r=1.6), C(96, 'notify', -10, r=1.6), *[C(f, 'tick', -22, r=2.2) for f in range(48, 118, 12)],
    *joke_card(120),
]
CUES['joke-partners'] = [  # Partners in Crime: doors 2, alarm light spins (WEE-OOO 4), slow-mo strut 8-118 (steps every 12), SLO-MO 14, coins 40-96 (every 8), card 120
    *[C(f, 'alarm', -15, d=0.28, r=(1.0 if (f // 9) % 2 == 0 else 0.84)) for f in range(0, 118, 9)], word(4, -14),
    C(2, 'door_slide', -12, r=0.8), C(8, 'whoosh_heavy', -8, r=0.5), C(8, 'braam', -10), C(10, 'pad', -20, d=3.4, fi=0.6, fo=1.0),
    *[C(f, 'land_dirt', -13, r=0.55) for f in range(12, 118, 12)], C(14, 'pop_in', -16),
    *[C(40 + i * 8 + 40, 'coin_drop', -15, r=0.7) for i in range(8) if 40 + i * 8 + 40 < 118],
    *joke_card(120),
]
CUES['joke-xmas'] = [  # Naughty or Nice intro: drop 6-20, wobble 22-36, SNAP 40, unroll 46-74, confetti 76, scroll moves aside 108, card 120
    C(0, 'bed_warm', -22, d=4.0, fi=0.3, fo=1.0), *[C(f, 'bell_shop', -20, r=1.3 + 0.1 * (i % 3)) for i, f in enumerate((2, 14, 30))],
    C(8, 'whoosh', -9), C(20, 'book_close', -5), C(20, 'thud', -12), *[C(f, 'squeak', -19, r=1.4) for f in (24, 30)],
    C(40, 'slap', -7), C(40, 'cloth_tear', -9, d=0.4), word(40, -11), C(42, 'pop', -12),
    C(46, 'page', -5), C(48, 'swipe', -10), C(62, 'page', -9, r=1.1), C(70, 'twinkle', -12),
    C(76, 'fanfare', -8), C(76, 'party_pop', -9), C(77, 'sparkle', -11), cheer(78, -12, d=2.0), C(108, 'whoosh_out', -12),
    *joke_card(120),
]
CUES['joke-nye'] = [  # New Year's Eve: 3 at 8, 2 at 28, 1 at 48, drop 60-72, THUD 72, confetti 74, fireworks 80/88/96/104, card 120
    C(0, 'bar', -20, d=2.6, fi=0.3, fo=0.6), C(6, 'drumroll', -15, d=1.8, fi=0.2, fo=0.2),
    C(8, 'tom_hi', -6), word(8, -14), C(28, 'tom_mid', -6), word(28, -14), C(48, 'tom_mid', -4, r=0.8), word(48, -13),
    C(58, 'whoosh_heavy', -6, r=0.7), C(62, 'whoosh_big', -8),
    C(72, 'boom', -2), C(72, 'thud', -3), C(72, 'crash', -10, d=1.0, fo=0.4), C(73, 'sub', -6), C(74, 'rumble', -10, d=0.9, fo=0.4), word(72, -11),
    C(74, 'party_pop', -6), C(75, 'party_pop', -9, r=1.1), cheer(76, -7, d=2.5), applause(80, -12, d=2.2),
    *[C(f, 'explosion', -15, r=r) for f, r in ((80, 1.2), (88, 1.3), (96, 1.1), (104, 1.4))], C(82, 'sparkle', -14), C(98, 'sparkle', -15),
    *joke_card(120),
]
CUES['joke-groundhog'] = [  # Groundhog Day: waiting 0-62 (. . . at 20/30/40, lean in 18), sign pokes out 64-74, WHAT?! 76, card 120
    C(0, 'wind_soft', -16, d=4.0, fi=0.4, fo=1.0), C(8, 'owl', -26, r=1.6),
    C(20, 'pop_pluck', -15), C(30, 'pop_pluck', -15, r=1.1), C(40, 'pop_pluck', -15, r=1.2), C(52, 'tick', -20), C(58, 'tick', -20),
    C(64, 'land_dirt', -10), C(64, 'pop', -9), C(68, 'boing', -12), C(74, 'squeak', -18, r=1.4),
    C(76, 'gasp', -6), ooh(76, -8), word(77, -11), C(77, 'sting_reveal', -12),
    *joke_card(120),
]
CUES['joke-valentine'] = [  # Valentine's Day: scrolling 0-28, arrow 22-30 (THUNK 30), startle 34, hearts 36-54, jumps up 62, runs 64-86, door opens 74, SLAM 92, card 120
    C(0, 'pad', -21, d=1.0, fi=0.2, fo=0.4), *[C(f, 'click', -19, r=1.2) for f in (4, 11, 18, 25)],
    C(22, 'whoosh_fast', -7), C(30, 'thud', -6), C(30, 'boing', -9), word(30, -11), C(34, 'gasp', -7),
    *[C(36 + i * 3, 'pop_in', -14, r=1 + 0.05 * i) for i in range(7)], C(38, 'kiss', -11), C(40, 'twinkle', -13), C(42, 'bed_warm', -21, d=2.2, fi=0.3, fo=0.8),
    C(62, 'jump', -10), *steps(list(range(64, 88, 4)), g=-12), C(74, 'door_slide', -12, d=0.5),
    C(92, 'door_slam', -4), word(92, -11), C(96, 'sparkle', -14),
    *joke_card(120),
]

# ---------------------------------------------------------------- The Monday Report (HyperFrames: hyperframes/recap-*.html)
# The weekly recap the app plays back to back on Mondays. Every segment opens on the WINTER ARC WEEKLY banner
# (assets/recap.js: plate pops at its start, tab 5 frames later). The per-member clips share one cue list each.
def recap_banner(at=0):
    return [C(at, 'whoosh', -10), C(at + 3, 'slam', -8), C(at + 6, 'pop', -13)]


CUES['recap-intro'] = [  # intro: logo spins in 2-14, banner 8, desk 6-16, Flexander up 14-24, PRESENT 30, monitor 32, drumroll 44-75, push-in 62
    opening(-12), C(3, 'whoosh', -9), C(13, 'logo_spark', -8), C(10, 'fanfare', -9), cheer(12, -16, d=1.4),
    *recap_banner(8), C(8, 'whoosh_heavy', -13), C(16, 'thud', -12),
    C(15, 'whoosh_fast', -13), C(24, 'pop_pluck', -12), C(30, 'swish', -12),
    C(32, 'pop_in', -10), C(34, 'notify', -12), C(42, 'tick', -16),
    C(44, 'drumroll', -8, d=1.03, fi=0.15), C(64, 'whoosh_big', -13, r=1.2),
]
RECAP_MVP = [  # player of the week: lands 9, medal falls 12-22, hits 22, CHAMP 25, confetti 25/29, glints 30/44/58, hops 34/50
    *recap_banner(0), C(2, 'whoosh_fast', -11), C(9, 'land', -6), C(9, 'thud', -10), C(10, 'powder', -14),
    C(13, 'whoosh', -12, r=1.2), C(22, 'ding', -5), C(22, 'coin_drop', -11), C(23, 'gem', -12),
    C(25, 'fanfare', -6), C(25, 'party_pop', -8), C(29, 'party_pop', -9, r=1.1), cheer(25, -9, d=1.7), applause(27, -12, d=1.6),
    C(30, 'sparkle', -12), C(44, 'twinkle', -14), C(58, 'twinkle', -15, r=1.1), C(34, 'jump', -15), C(50, 'jump', -16),
]
RECAP_STRIKE = [  # strike: ball rolls 2-28, panic 16, HIT + STRIKE! 28, pins 29/30, X 31, airborne 28-46, lands 46, tag 48, stars 50
    *recap_banner(0), C(2, 'rumble', -10, d=0.95, fi=0.15, fo=0.1, r=1.3), C(4, 'heartbeat', -14, d=0.8),
    C(16, 'gasp', -8), C(17, 'pop_pluck', -14),
    C(28, 'crash', -5, d=1.1, fo=0.5), C(28, 'thud', -6), C(28, 'boom_short', -9), C(29, 'clank', -10), C(30, 'clang', -12), word(28, -10),
    ooh(30, -11), C(31, 'stamp', -7), C(32, 'game8bit', -15), C(30, 'whoosh_heavy', -10), C(38, 'whoosh', -12),
    C(46, 'land', -7), C(46, 'person_fall', -9), C(47, 'powder', -13), C(48, 'pop_in', -12), C(50, 'twinkle', -13), C(54, 'chirp', -17, r=1.2),
]
RECAP_LAST = [  # dead last: rain all along, snail 4-74 (passes ~38), looks 22, follows it 38, SIGH 56
    *recap_banner(0), C(0, 'pad', -22, d=2.5, fi=0.3, fo=0.4), C(0, 'wind_soft', -24, d=2.5, fi=0.2, fo=0.4),
    *[C(f, 'tick', -25, r=1.7 + 0.1 * (i % 3)) for i, f in enumerate(range(2, 75, 5))],
    *[C(f, 'squeak', -21, r=1.8) for f in range(6, 74, 12)], C(36, 'whoosh_fast', -11),
    C(22, 'pop_pluck', -16), C(38, 'swish', -15), C(56, 'power_down', -9), word(57, -14), C(64, 'sting_soft', -15),
]
CUES['recap-allsafe'] = [  # everybody survived: crew hops 2-20, 3/2/1 at 16/28/40, FLASH 50, polaroid 50-62, confetti 56/58, caption 58
    *recap_banner(0), *[C(7 + 2 * i, 'pop_pluck', -16, r=0.9 + 0.05 * i) for i in range(9)],
    C(16, 'tick', -6), C(16, 'click', -12), C(28, 'tick', -6, r=1.1), C(40, 'tick', -6, r=1.25), C(40, 'heartbeat', -14, d=0.35),
    C(49, 'whoosh_fast', -14), C(50, 'shutter_big', -3), C(50, 'sparkle', -10), cheer(51, -8, d=1.0), C(52, 'fanfare', -9),
    C(52, 'whoosh', -12), C(56, 'party_pop', -9), C(58, 'party_pop', -10, r=1.1), applause(54, -11, d=0.9),
    C(58, 'pop_in', -11), C(60, 'card_slap', -10), C(66, 'twinkle', -15),
]
CUES['recap-outro'] = [  # outro: sunrise 0-40, rooster 2, calendar drops 0-10, tear 16, NEW WEEK 20, thumbs 24, card 30, hop 40
    C(0, 'bed_warm', -22, d=2.5, fi=0.3, fo=0.8), C(2, 'rooster', -8), C(2, 'whoosh', -12), C(10, 'thud', -12),
    C(16, 'paper_crumple', -9, d=0.4, fo=0.15), C(17, 'swipe', -10), C(20, 'pop', -11), C(24, 'pop_pluck', -12), C(24, 'ding', -13),
    *card(30), C(40, 'jump', -16),
]
for _m in ('osim', 'amaan', 'ayaad', 'connor', 'dean', 'dylan', 'gaurav', 'jake', 'phil'):
    CUES['recap-mvp-' + _m] = RECAP_MVP
    CUES['recap-strike-' + _m] = RECAP_STRIKE
    CUES['recap-last-' + _m] = RECAP_LAST
