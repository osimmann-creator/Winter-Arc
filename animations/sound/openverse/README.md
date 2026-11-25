# Openverse recordings

Real recordings from [Openverse](https://openverse.org) (openly licensed audio from Freesound, Wikimedia Commons, Jamendo and others) layered into the videos. Each one fills a **slot**. A slot with no file falls back to an Earshot sound, so the videos always have sound.

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
