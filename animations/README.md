# Winter Arc animations (Remotion)

This is the source for the Winter Arc mascot, the 18 celebration videos, the 3 inside-joke videos, the opening animation and the app art. Everything is drawn in code (React + SVG) with [Remotion](https://www.remotion.dev), so poses, timing and colors can all be edited.

## Setup

Needs Node 20+ and ffmpeg.

```
npm i
npm run dev                      # Remotion Studio: preview every composition
./scripts/build_app_assets.sh    # renders every video + still the app uses into ../app/assets
ONLY="GunShow TheCoin" ./scripts/build_app_assets.sh   # just those compositions
./scripts/export-parts.sh && python3 scripts/build_parts_kit.py   # body-part sheets for refining
```

The art follows the refined "Olympus" kit:

- espresso outlines (`#341720`)
- peach and amber cel shading with highlight shapes
- gold and violet accents
- lavender clouds

The palette lives in `C` at the top of `src/hero/Hero.tsx`.

To render a single video:

```
npx remotion render Gym out/gym.mp4 --codec=h264 --crf=20
```

## What's where

| Path | What it is |
|---|---|
| `src/hero/Hero.tsx` | The mascot rig: body, poses, face, hands and toga. `pose()` builds a pose, and `Hero` draws it. |
| `src/scenes/*.tsx` | The celebrations (1080×1920, 30 fps, 4.5 s): Gym, GunShow, LegDay, Atlas, Mirror; Run, FrostMiles, Torch, NightOwl, GooseChase; Jickle, Volo, Soccer, Date, Beers, Reading |
| `src/scenes/Joke*.tsx` | The inside jokes (about 5.5 s): TheCoin (Dean vs Jake), BlueHair (Connor), TheIron (Ayaad). Names are drawn into these. |
| `src/scenes/kit.tsx`, `RunKit.tsx`, `ik.ts` | Shared props (dumbbell, tickets, steam, snow), the themeable running track and gait, and arm IK (`reach`) for putting a hand on a target |
| `src/fx/` | Shared backgrounds (`Stage`), effects (bursts, speed lines, sparkles), motion helpers and the ribbon end card |
| `src/app/AppArt.tsx` | App art: mascot poses (stills), the app icon, and the `Intro` opening animation |
| `src/sheets/` | Model and style sheets, used for checking the character design |
| `src/Root.tsx` | Registers every composition |
| `src/export/` + `scripts/` | Body-part sheet exporter (SVG/PNG per part + manifest of pivots) and the app asset build |

## Adding a new celebration

1. Copy a scene in `src/scenes/`, for example `GunShow.tsx`. Change the poses and timing, then register it in `src/Root.tsx`.
2. Add a row to `MAP` in `scripts/build_app_assets.sh` (composition : app id : poster second : 0), then run `ONLY="YourScene" ./scripts/build_app_assets.sh`. It writes `<id>.mp4` and `<id>.webp` into the app's `assets/celebrations/`.
3. Add `{ id: 'gym-6', name: '…' }` to `CELEBRATIONS.gym` in the app's `js/config.js`.

The mascot's hair can turn blue: set `hairBlue` (0 to 1) in a pose.

Remotion is free for individuals and small teams. See its license for company use.
