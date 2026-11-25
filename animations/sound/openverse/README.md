# Openverse recordings

Real recordings layered into the videos, from [Openverse](https://openverse.org) or the sites it searches (Freesound, Wikimedia Commons, Jamendo and others). Each one fills a **slot**. A slot with no file falls back to an Earshot sound, so the videos always have sound.

## In use now

All seven slots are filled with public-domain (CC0) recordings from [Freesound](https://freesound.org), the main audio source Openverse searches. openverse.org itself was down when they were picked (Nov 24, 2026). CC0 needs no credit, but here it is anyway:

| Slot | Recording | By | Part used |
|---|---|---|---|
| `cheer` | [Crowd Cheer](https://freesound.org/people/FoolBoyMedia/sounds/397434/) | FoolBoyMedia | 3 s from 1.7 s |
| `laugh` | [Sitcom Laughter 9x, Small Audience](https://freesound.org/people/Kinoton/sounds/383207/) | Kinoton | the first laugh |
| `applause` | [Applause.wav](https://freesound.org/people/ZyryTSounds/sounds/219241/) | ZyryTSounds | 3 s from 0.6 s |
| `goose` | [goose honk](https://freesound.org/people/jahjahjahjah/sounds/805297/) | jahjahjahjah | all of it |
| `pigeon` | [Pigeon cooing](https://freesound.org/people/Fsu2001/sounds/795558/) | Fsu2001 | the coo at 7 s |
| `bell` | [Boxing Bell Signals](https://freesound.org/people/Mateusz_Chenc/sounds/520998/) | Mateusz_Chenc | the triple ring at 17.75 s |
| `ooh` | [Crowd Ooohs and Ahhhs in Excitement](https://freesound.org/people/noah0189/sounds/264499/) | noah0189 | the big "ooh" at 6 s |

The files are Freesound's high-quality previews (MP3). Downloading the originals needs a Freesound account.

| Slot | What it should be | Used in | Stand-in until it's added |
|---|---|---|---|
| `cheer` | A crowd cheering, a few seconds | Every celebration's end card, plus big moments (goal, K.O., summit) | Earshot `crowd/cheer` |
| `laugh` | An audience laughing | Every inside joke's end card | Earshot `laugh/crowd` |
| `applause` | Applause | Quick Hands (the bow) | Earshot `applause/audience` |
| `goose` | One goose honk | Goose Chase | Earshot duck quack, pitched down |
| `pigeon` | Pigeons cooing | Pigeon Panic | Earshot owl hoot, pitched up |
| `bell` | A boxing ring bell (ding-ding-ding) | MMA 1, 3, 4 | Earshot desk bell, three times |
| `ooh` | A crowd going "ooooh" | Big lifts and stunts | Nothing |

## Adding one

1. On openverse.org, search Audio and filter **Use → Modify or adapt**. That excludes ND (no-derivatives) licences, which can't be used here because syncing a sound to video counts as adapting it. CC0, CC BY and CC BY-SA all work. Short clips are best.
2. Save the file here as `<slot>.<ext>`: `cheer.mp3`, `goose.wav`, `laugh.ogg` and so on.
3. Add its credit to `credits.json` (copy Openverse's "Attribution" text into these fields):

```json
{
  "cheer": {
    "title": "Crowd cheering",
    "creator": "someone",
    "license": "CC BY 4.0",
    "url": "https://openverse.org/audio/<id>",
    "start": 0.0,
    "seconds": 3.0
  }
}
```

`start` (seconds to skip at the beginning) and `seconds` (how much to use) are optional. The recording is trimmed to its first sound and matched to the loudness of its stand-in.

4. Re-mix: `python3 scripts/sound.py mix` (or just the videos that use it), then check with `python3 scripts/sound.py openverse`.

Credits for every file in this folder are listed in `credits.json` and repeated in the main README.
