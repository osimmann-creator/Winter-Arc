# Winter Arc animations (Remotion + HyperFrames)

This is the source for the Winter Arc mascot, the 37 celebration videos, the inside-joke videos, the opening animation and the app art. Everything is drawn in code, so poses, timing and colors can all be edited: the mascot, the celebrations and the first 16 inside jokes in React + SVG with [Remotion](https://www.remotion.dev), and the round 2 inside jokes in HTML + GSAP with [HyperFrames](#hyperframes).

## Setup

Needs Node 20+ and ffmpeg. The sound step also needs Python 3 with numpy, scipy and pyloudnorm.

```
npm i
npm run dev                      # Remotion Studio: preview every composition
./scripts/build_app_assets.sh    # renders every video + still the app uses into ../app/assets
python3 scripts/sound.py mix     # (re)mixes every video's soundtrack (see Sound below)
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
| `src/hero/Hero.tsx` | The mascot rig: body, poses, face, hands and toga. `pose()` builds a pose, and `Hero` draws it. `<Hero look={LOOKS.osim} …>` draws a member instead of Flexander. |
| `src/hero/looks.ts`, `heads.tsx` | The crew's characters (see [Characters](#characters)): one look per member (skin, hair, beard, glasses, face) and the code that draws their heads. |
| `src/scenes/*.tsx` | The celebrations (1080×2348, 30 fps, 4.5 s): Gym, GunShow, LegDay, Atlas, Mirror; Run, FrostMiles, Torch, NightOwl, GooseChase; Jickle, Volo, Soccer, Date, Beers, Reading |
| `src/scenes/PullUp.tsx`, `BoxJump`, `RopeStorm`, `GainsShake`, `HammerTime` | Gym 6 to 10, in the new gym room (`GymRoom.tsx`) |
| `src/scenes/RushHour.tsx`, `GreenLight`, `PigeonPanic`, `BridgeRun`, `CoffeeRun` | Run 6 to 10, down a city street and over the bridge (`CityKit.tsx`) |
| `src/scenes/MMA.tsx` | The MMA celebration, Knockout (mma-1) |
| `src/scenes/MMAMainEvent.tsx`, `MMAFlyingKnee`, `MMAChamp` | MMA 2 to 4, Amaan's, in the fight-night arena (`MMAKit.tsx`). His name is drawn in. |
| `src/scenes/JickleChef.tsx`, `JickleErne`, `JickleJickled`, `JickleQuick` | Jickle 2 to 5 on a perspective court with day, beach-sunset and night looks (`JickleKit.tsx`) |
| `src/scenes/BikeKOM.tsx`, `BikeSendIt`, `BikeSprint` | Bike 1 to 3: a head-on bicycle he pedals, the helmet and the road world (`BikeKit.tsx`) |
| `src/scenes/Joke*.tsx` | The inside jokes (about 5.5 s): TheCoin (Dean flips, Jake watches), BlueHair (Connor), TheIron (Ayaad), TheBag (Dean, Connor, Dylan), DylanFights, CrashOut and SatelliteHouse (Connor), PukedOn and MMAGuy (Amaan), TheRadiator and JakesMom (Jake), NetsGame (Jake and Gaurav), LiquorRun (Gaurav), PunxsutawneyPhil (Phil, popping out of his burrow), ScaredOfGirls (everyone), TimeSheet (Jake). Names are drawn into these. The ones without Osim, Gaurav or Amaan draw each member as his own character (`look={LOOKS.…}`); the rest still use Flexander until those three characters are final. |
| `src/scenes/jokekit.tsx` | Shared bits for the newer jokes: name tags, text bubbles, rooms, clocks, calendars, the cap and the post card |
| `src/scenes/kit.tsx`, `RunKit.tsx`, `ik.ts` | Shared props (dumbbell, tickets, steam, snow), the themeable running track and gait, and arm IK (`reach`) for putting a hand on a target |
| `src/fx/` | Shared backgrounds (`Stage`), effects (bursts, speed lines, sparkles), motion helpers and the ribbon end card |
| `src/app/AppArt.tsx` | App art: mascot poses (stills), the app icon, and the `Intro` opening animation |
| `src/sheets/` | Model and style sheets, used for checking the character design, and the crew's character sheets (`CharacterSheet.tsx`) |
| `characters/` | The character sheets as PNGs: one per member plus `crew.png` |
| `src/Root.tsx` | Registers every composition |
| `src/export/` + `scripts/` | Body-part sheet exporter (SVG/PNG per part + manifest of pivots) and the app asset build |

## Adding a new celebration

1. Copy a scene in `src/scenes/`, for example `GunShow.tsx`. Change the poses and timing, then register it in `src/Root.tsx`.
2. Give it sound: add an entry for its app id to `sound/cues.py`. Copy a similar video's entry and move the frames to your scene's beats; end with `*card(CARD)` (or `*joke_card(CARD)` for an inside joke) so it gets the crowd or the laugh.
3. Add a row to `MAP` in `scripts/build_app_assets.sh` (composition : app id : poster second : 0), then run `ONLY="YourScene" ./scripts/build_app_assets.sh`. It writes `<id>.mp4` (with its soundtrack) and `<id>.webp` into the app's `assets/celebrations/`.
4. Add `{ id: 'gym-11', name: '…' }` to `CELEBRATIONS.gym` in the app's `js/config.js`.

The mascot's hair can turn blue: set `hairBlue` (0 to 1) in a pose.

## Characters

Everyone in the group has his own character: Flexander's body, toga, sash, belt, cuffs and sandals, with his own face. The sheets in `characters/` (one per member, plus `crew.png`) show each one's full body, a head turnaround, six expressions, his Home poses, his palette and what to keep when drawing him. Use them as the reference for any new animation.

- **Looks** live in `src/hero/looks.ts` (`LOOKS`, keyed by username): skin and hair colours, hairstyle, beard (a light wash with dots, so the skin shows through), glasses, eyes, brows, nose, mouth and head shape. `FLEXANDER` is the default look, so every existing scene still draws the mascot.
- **Drawing one:** `<Hero look={LOOKS.dean} p={pose({...})} … />` in Remotion, or `flex-<pose>-dean.svg` in HyperFrames (add the username to the pose's `members` in `src/export/cast-poses.tsx` and run `./scripts/export-cast.sh`).
- **His Home screen** shows his character in the app's six mascot poses: `assets/mascot/<username>/<pose>.webp` in the app, listed in `CHARACTERS` in the app's `js/config.js`.
- **After changing a look**, run `node scripts/render-characters.mjs` to redraw the sheets and the Home stills (or `… sheets` / `… home osim` for part of it), then `./scripts/export-cast.sh` for the HyperFrames poses.
- **A new member** needs a look in `LOOKS`, his username in `MEMBERS` in `scripts/render-characters.mjs` and in `CHARACTERS` in `js/config.js`, and notes and a signature face in `CREW` in `src/sheets/CharacterSheet.tsx`.
- **Arm layers.** By default (`armZL`/`armZR` = `'auto'`) an arm is drawn between the body and the head while it's down, and in front of the head once the hand or elbow comes up past the chin, so a raised arm never disappears behind the head. Set `'back'`, `'mid'` or `'top'` in a pose to pin it (a hand scratching the back of the head wants `'mid'`).
- **Groups.** When several people stand close and their arms reach across each other's faces (TheBag), draw everyone with `layer="body"` first and then everyone with `layer="head"`: every face stays in front of the other guys' arms, and each guy's own raised arm still shows in front of his own face.

## HyperFrames

The round 2 inside jokes are made with [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP rendered to video) in `hyperframes/`, in the same look: flat shapes, espresso outlines, Luckiest Guy titles and Bangers sound words, 1080×2348 at 30 fps, about 5.5 s, the same ribbon end card.

There are 17: `joke-thanksgiving`, Osim's four (`joke-crossing`, `joke-mycar`, `joke-finalcall`, `joke-worthit`), the crew's two (`joke-basement`, `joke-nomap`), the GTA six (`joke-grandtheft`, `joke-wanted`, `joke-busted`, `joke-wasted`, `joke-parole`, `joke-partners`) and the holidays (`joke-xmas`, `joke-nye`, `joke-groundhog`, `joke-valentine`). `joke-xmas` is only the intro to the Naughty or Nice reveal; the app draws the NICE and NAUGHTY stamps itself, because the clip is made before anyone votes.

```
cd hyperframes && npm i
node render.mjs joke-thanksgiving        # master -> app copy (720x1566) -> soundtrack -> poster, into ../../assets/celebrations
DRAFT=1 node render.mjs joke-thanksgiving  # quick draft master only, in ../out/videos
npx hyperframes preview                  # live preview in the browser
```

HyperFrames needs a Chrome. If it can't find one, point `PUPPETEER_EXECUTABLE_PATH` at Chrome or chrome-headless-shell; the headless shell renders much faster.

| Path | What it is |
|---|---|
| `hyperframes/joke-<name>.html` | One file per clip: the scene, its GSAP timeline and the end card. The beats (in frames) are listed at the top. |
| `hyperframes/compositions/endcard.html` | The ribbon end card (TITLE · COIN · CAPTION), mounted over the last 1.5 s with its words and colours as variables. |
| `hyperframes/assets/kit.js`, `kit.css` | Shared helpers: shake, hop, squash, pose swaps, pop-ins, sound words, tosses, confetti, name tags. `kit.js` also lists the two GSAP rules every clip follows so it survives HyperFrames seeking back and forth. |
| `hyperframes/assets/cast/` | Flexander's poses as SVG, exported from the Remotion rig by `scripts/export-cast.sh` (poses in `src/export/cast-poses.tsx`, hand/head anchors in `cast.tsx`). A pose's `members` also get `flex-<pose>-<username>.svg`, that member's own character in the pose. The clips swap whole poses rather than animating limbs. |
| `hyperframes/assets/buddy.js` | Buddy, the second character: friends and drivers who aren't in the app (no name tag), the cop, the guy at the table. One SVG with outfits, faces and props as options. |
| `hyperframes/assets/props.js` | Cars (doors, wheels, police lights), stars and the other shared props. |
| `hyperframes/render.mjs` | The build: `CLIPS` lists each clip and its poster second. |

Sound works exactly as for the Remotion videos: each clip has an entry in `sound/cues.py`, under "round 2", and `render.mjs` runs `scripts/sound.py mix` on it.

### The Monday Report

The weekly recap is 30 short clips (2.2 to 2.7 s each) that the app plays back to back on Mondays. They're made ahead of time because the standings aren't known until Sunday night, so every clip that shows a name has one version per member:

| Clip | Versions | Scene |
|---|---|---|
| `recap-intro` | 1 | the logo spins in, Flexander presents LAST WEEK from the news desk over a drumroll |
| `recap-mvp-<member>` | 9 | Player of the Week: he lands on the top step, a gold medal drops onto him, fists up into the confetti |
| `recap-strike-<member>` | 9 | Strike: he stands on the pin deck, the ball knocks him flat, STRIKE! and an X on the scoreboard |
| `recap-allsafe` | 1 | Everybody Survived (instead of strikes): all nine in a self-timer team photo that turns into a polaroid |
| `recap-last-<member>` | 9 | Dead Last: slumped on a crate under the bottom row of the board, in the rain, while a snail zooms past |
| `recap-outro` | 1 | sunrise, LAST WEEK tears off the calendar, end card NEW WEEK · 7 PTS · SAME GOAL |

```
node render.mjs recap                    # all 30
node render.mjs recap-mvp-dean           # one
```

- The three per-member scenes are one html each (`recap-mvp.html`, `recap-strike.html`, `recap-last.html`). `VARIANTS` in `render.mjs` renders each once per member, passing who it's about as HyperFrames variables (`member`, `name`, `color`, `dark`), which `WA.recap.member()` reads. A new member needs a row in `CREW` there, his colourway in `MEMBERS` (`src/export/cast.tsx`) and in `CREW` (`src/export/cast-poses.tsx`), then `./scripts/export-cast.sh` and `node render.mjs recap`.
- `hyperframes/assets/recap.js` and `recap.css` hold the WINTER ARC WEEKLY banner every segment opens with, so the clips read as one show.
- Their sound cues are at the end of `sound/cues.py` (`RECAP_*`, shared by the nine versions of each scene).
- The clips have no numbers in them. The app's recap card shows last week's points.

## Sound

Each video's soundtrack is built from short sound effects placed on frames, then muxed into the finished mp4. The picture is copied, not re-encoded.

| Path | What it is |
|---|---|
| `sound/cues.py` | What each video plays and when, in frames (30 fps). Helpers cover the shared parts: `card()` (ribbon, points coin, crowd cheer), `gym_card()` (the gym theatre banner), `joke_card()` (slam, ba-dum-tss, laughter), `impact()`, `steps()` and `word()` (a comic word popping in). |
| `sound/bank/` | About 150 sound effects rendered with [Earshot](https://github.com/Leonxlnx/earshot), stored as Opus. `BANK` in `scripts/sound.py` lists the Earshot design behind each one. |
| `sound/openverse/` | Real recordings, one per slot (`cheer`, `laugh`, `applause`, `goose`, `pigeon`, `bell`, `ooh`), from [Openverse](https://openverse.org) or the sites it searches. All seven slots are filled now with CC0 recordings from Freesound. `credits.json` has their credits and the part of each recording used. [Its README](sound/openverse/README.md) says how to swap one. A slot with no file uses its Earshot stand-in. |
| `scripts/sound.py` | `mix` (every video, or the ids you name), `check` (loudness and peaks), `openverse` (which slots are filled), `render-bank` (re-render the bank; needs Earshot). |

- **Levels.** Mixing sets each video to −16 LUFS with peaks under −2 dBFS, so every clip plays at the same volume.
- **Timing.** A hit lands on its attack, a whoosh on its loudest point, and a crowd or ambience starts on its frame.
- **Footsteps.** These follow the run cycle: in `RunKit.makeRun` a foot touches down at every half stride, so the footstep frames in `cues.py` come from each scene's stride table. Recompute them if you change a run's speed or stride.
- **Installing Earshot.** Install it from GitHub (`pip install "earshot @ git+https://github.com/Leonxlnx/earshot"`, Python 3.10+). The PyPI name `earshot` belongs to a different project. `earshot sounds` lists its catalogue.
- **Licences.** Sounds Earshot makes are free for any use with no credit needed. Openverse recordings keep their own licences: use CC0, CC BY or CC BY-SA, never ND. Their credits are in `sound/openverse/credits.json`.

Remotion is free for individuals and small teams. See its license for company use.
