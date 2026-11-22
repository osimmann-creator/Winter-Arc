# Winter Arc animations (Remotion)

This is the source for the Winter Arc mascot, the 37 celebration videos, the 16 inside-joke videos, the opening animation and the app art. Everything is drawn in code (React + SVG) with [Remotion](https://www.remotion.dev), so poses, timing and colors can all be edited.

## Setup

Needs Node 20+ and ffmpeg.

```
npm i
npm run dev                      # Remotion Studio: preview every composition
./scripts/build_app_assets.sh    # renders every video + still the app uses into ../app/assets
ONLY="GunShow TheCoin" ./scripts/build_app_assets.sh   # just those compositions
CONCURRENCY=2 ./scripts/build_app_assets.sh            # render more frames in parallel
./scripts/export-parts.sh && python3 scripts/build_parts_kit.py   # body-part sheets for refining
```

The art follows the refined "Olympus" kit:

- espresso outlines (`#341720`)
- peach and amber cel shading with highlight shapes
- gold and violet accents
- lavender clouds

The palette lives in `C` at the top of `src/hero/Hero.tsx`.

**Full screen.** Every video is 1080×2348, the iPhone 18 Pro's shape (2622×1206), so it fills the phone. Scenes are still drawn for a 1080×1920 design frame: `Stage` (in `src/fx/Stage.tsx`) widens the view by `PAD` = 214 px above and below, which shows more sky and more ground. Keep anything important inside the design frame. Anything drawn fixed to the screen (flashes, tints, streaks) should run from `TOP` to `BOT` rather than 0 to 1920. The app copies are 720×1566 and the posters 360×782.

To render a single video:

```
npx remotion render Gym out/gym.mp4 --codec=h264 --crf=20
```

## What's where

| Path | What it is |
|---|---|
| `src/hero/Hero.tsx` | The mascot rig: body, poses, face, hands and toga. `pose()` builds a pose, and `Hero` draws it. |
| `src/scenes/*.tsx` | The celebrations (1080×2348, 30 fps, 4.5 s): Gym, GunShow, LegDay, Atlas, Mirror; Run, FrostMiles, Torch, NightOwl, GooseChase; Jickle, Volo, Soccer, Date, Beers, Reading |
| `src/scenes/PullUp.tsx`, `BoxJump`, `RopeStorm`, `GainsShake`, `HammerTime` | Gym 6 to 10, in the new gym room (`GymRoom.tsx`) |
| `src/scenes/RushHour.tsx`, `GreenLight`, `PigeonPanic`, `BridgeRun`, `CoffeeRun` | Run 6 to 10, down a city street and over the bridge (`CityKit.tsx`) |
| `src/scenes/MMA.tsx` | The MMA celebration, Knockout (mma-1) |
| `src/scenes/MMAMainEvent.tsx`, `MMAFlyingKnee`, `MMAChamp` | MMA 2 to 4, Amaan's, in the fight-night arena (`MMAKit.tsx`). His name is drawn in. |
| `src/scenes/JickleChef.tsx`, `JickleErne`, `JickleJickled`, `JickleQuick` | Jickle 2 to 5 on a perspective court with day, beach-sunset and night looks (`JickleKit.tsx`) |
| `src/scenes/BikeKOM.tsx`, `BikeSendIt`, `BikeSprint` | Bike 1 to 3: a head-on bicycle he pedals, the helmet and the road world (`BikeKit.tsx`) |
| `src/scenes/Joke*.tsx` | The inside jokes (about 5.5 s): TheCoin (Dean vs Jake), BlueHair (Connor), TheIron (Ayaad), TheBag (Dean, Connor, Dylan), DylanFights, CrashOut and SatelliteHouse (Connor), PukedOn and MMAGuy (Amaan), TheRadiator and JakesMom (Jake), NetsGame (Jake and Gaurav), LiquorRun (Gaurav), PunxsutawneyPhil (Philip), ScaredOfGirls (everyone), TimeSheet (Jake). Names are drawn into these. |
| `src/scenes/jokekit.tsx` | Shared bits for the newer jokes: name tags, text bubbles, rooms, clocks, calendars, the cap and the post card |
| `src/scenes/kit.tsx`, `RunKit.tsx`, `ik.ts` | Shared props (dumbbell, tickets, steam, snow), the themeable running track and gait, and arm IK (`reach`) for putting a hand on a target |
| `src/fx/` | Shared backgrounds (`Stage`), effects (bursts, speed lines, sparkles), motion helpers and the ribbon end card |
| `src/app/AppArt.tsx` | App art: mascot poses (stills), the app icon, and the `Intro` opening animation |
| `src/sheets/` | Model and style sheets, used for checking the character design |
| `src/Root.tsx` | Registers every composition |
| `src/export/` + `scripts/` | Body-part sheet exporter (SVG/PNG per part + manifest of pivots) and the app asset build |

## Adding a new celebration

1. Copy a scene in `src/scenes/`, for example `GunShow.tsx`. Change the poses and timing, then register it in `src/Root.tsx`.
2. Add a row to `MAP` in `scripts/build_app_assets.sh` (composition : app id : poster second : 0), then run `ONLY="YourScene" ./scripts/build_app_assets.sh`. It writes `<id>.mp4` and `<id>.webp` into the app's `assets/celebrations/`.
3. Add `{ id: 'gym-11', name: '…' }` to `CELEBRATIONS.gym` in the app's `js/config.js`.

The mascot's hair can turn blue: set `hairBlue` (0 to 1) in a pose.

Remotion is free for individuals and small teams. See its license for company use.
