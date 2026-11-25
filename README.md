# Winter Arc 🥶

A phone-first, members-only web app for the group’s Winter Arc. Log activities with proof, track points and strikes, and keep up with the group feed.

[Open the hosted app](https://winter-arc.osimmann.chatgpt.site). The production Worker handles sign-in, stores shared records in D1, and serves members’ photos and videos from R2. The public repository contains source code and rendered animation assets.

## Build

Run `npm run build` from the repository root. The deployable output is in `dist/`. A working installation needs the Worker and its D1 and R2 bindings. `HANDOFF.md` records the original brief.

## What's in here

`animations/` holds the Remotion source. See [its README](animations/README.md) to render new clips.

| Path | What it is |
|---|---|
| `index.html` | App shell: the top bar, tab bar, overlays and script tags |
| `css/app.css` | All styling (the cartoon look, layout and animations) |
| `js/config.js` | **Settings to edit**: points per activity, season defaults, the roster, celebration videos, inside jokes and the Hoat Guarantee |
| `js/logic.js` | Rules engine: weeks, strikes, elimination, streaks, badges, leaderboards and the inside-joke rules (pure functions) |
| `js/jokes.js` | Roast of the day: the 100 roasts and how the day's one is picked |
| `js/store.js` | Browser client for the hosted Worker API |
| `js/app.js` | The screens: sign-in, pick your own password, Home, Feed, Board, Me, Account, the log sheet, inside-joke pop-ups, the stamp, toasts and dialogs |
| `js/celebrate.js` | Full-screen celebration videos (with the speaker button) and confetti |
| `server/` | Worker routes for accounts, activity, the feed, and private media |
| `drizzle/` | D1 schema migrations |
| `js/art.js` | Built-in icons and paths to the art files |
| `assets/celebrations/` | Celebration and inside-joke videos (`<id>.mp4` plus a `<id>.webp` poster) |
| `assets/intro/` | Archived opening animation assets |
| `assets/mascot/` | Mascot poses used around the app |
| `assets/demo/` | Sample proof photos from the original preview |
| `assets/icons/` | Home-screen and browser icons (the marble thinker) |
| `assets/fonts/` | Luckiest Guy, Bangers and Baloo 2 (open-source fonts, licences included) |

## Accounts

- **Members only.** There's no sign-up page. Each person gets a username (their first name) and a temporary password from Osim, and picks their own password the first time they sign in.
- **Account** (tap your avatar in the top bar, or the gear on Me) has your profile (name, colour, photo), your username and a password change, Sunday reminders and cap alerts, the season's rules, and sign out.
- **The commissioner (Osim)** also gets:
  - season settings: start date, weeks, points a week, strikes
  - Members: tap someone to reset their password (you get a temporary one to send them), hand over commissioner, or remove them
  - Add a friend, which makes their account and a temporary password
  - the Void button on posts

## Inside jokes

Inside-joke videos can pop up once per member when the trigger fires. Members can also replay them from the feed.

| | When | Feed card |
|---|---|---|
| **The Coin** | Dean and Jake are tied on points this week (above 0). Lands on its edge. | Yes, with the tied score |
| **Blue Hair** | Connor has the most points this week. | Yes |
| **The Iron** | Ayaad first reaches his weekly points goal with an activity dated Sunday. | Yes |
| **The Liquor Run** | Gaurav first reaches his weekly points goal with an activity dated Sunday. | Yes |
| **The Bag** | Dean, Connor and Dylan are all tied this week (above 0). | Yes |
| **Dylan Starts Fights** | Dylan logs Beers with the fellas after a gym session from the same day or the day before. | Yes |
| **Crash Out KNR** | Connor calls cap (🧢) on someone's post from this week. Once per post. | Yes |
| **Satellite House** | Connor logs beers with the boys, then flies home to his house in orbit. Once per post. | Yes |
| **Puked On** | Amaan is alone in last this week. Each trip into last can trigger it, subject to cooldown. | Yes |
| **MMA Guy** | Amaan logs his 4th MMA session of the week. It is not cool. | Yes |
| **The Radiator** | Jake hasn't logged anything for 4 days. Once per dry spell. | Yes |
| **Jake's Mom** | Sunday from noon in the group’s timezone, while Jake is still below his weekly goal. | Yes |
| **The Nets Game** | Jake or Gaurav missed his goal last week. Plays on Monday. | Yes, naming who missed |
| **Punxsutawney Phil** | Phil logs something after 3+ days without a log. He sees his shadow. Once per post. | Yes |
| **Scared of Girls** | Nobody has logged a date in 30 days. Again every 30 days it goes on. | Yes |
| **The Time Sheet** | Jake's post that gets him to his weekly goal lands on a Saturday or Sunday. Big night out, so he files his work time sheet from the club at 11:59. | Yes |
| **Thanksgiving** | Thanksgiving Day (the 4th Thursday of November). A guy at the dinner table maxes out on a fork: NEW PR! No name in the video. | Yes, naming the week's lowest scorer |

The same joke can be triggered again after one full intervening game week (Monday through Sunday).

**La4:** while Dylan has exactly 4 points in a week, the app calls him La4 everywhere: the board, the feed, the roasts. It's display only (`ALIASES` in `js/config.js`).

**Hoat Guarantee:** whenever Osim reaches 7 points in a week, a red rubber stamp with a thumbs up slams onto his screen. It then sits on his ring card, and a Hoat Guarantee card goes to the feed for everyone (tap the stamp to replay it).

The settings live in `INSIDE_JOKES` and `HOAT` in `js/config.js` and match people by username; the exact rules are in `Logic.jokes` in `js/logic.js`. Joke replays are attached to their feed posts.

**Roast of the day:** the banner at the top of Home. There are 100 roasts in `js/jokes.js` and one airs a day, the same one for everyone. There's nothing to tap.

- The Worker picks it the first time anyone opens the app that day (or on its scheduled run), from the points as they stood at midnight in the group's timezone. It saves it in the `roasts` table, one row per day, and the app gets it with the events as type `roast`, key `roast:YYYY-MM-DD`. Every phone shows that saved roast. Until it arrives, a phone shows its own pick, which comes out the same.
- Each roast fits a situation (0 points on a Thursday, short on Sunday, a strike on Monday, a holiday...) and names whoever it fits. Roasts written for one person (Jake's mom, Ayaad's ironing, Gaurav's liquor runs, the Hoat Guarantee) go first when they fit. Special days win their day: the first roast, Thanksgiving, Black Friday, Christmas, New Year's Eve and Day, Groundhog Day, Valentine's Day and the last day.
- Each roast airs once, numbered #1 to #100. The season has 119 days, so once nothing unused fits, the one that aired longest ago comes back, about someone new if possible, with a "Rerun" pill.
- Members on an open injury report are left out. Weekly goals are per person (`weeklyGoalOverrides`), and La4 shows up as La4.
- To edit, change `LIST` at the top of `js/jokes.js`. `WHEN` says when each situation is true. Changed words count as a new roast.
- Publishing this needs D1 migration `drizzle/0010_roasts.sql`, which only adds the `roasts` table. `0007_roast_of_the_day` does nothing now: it used to rebuild the events table, which would wipe comment hearts and event reactions if it ran after 0008 and 0009.

## Changing the rules

The commissioner sets the season in Account → Commissioner:

- the Monday week 1 starts
- the number of weeks
- points needed each week
- strikes before you're out

`js/config.js` holds the defaults (starts Monday Nov 23, 2026, 17 weeks, 7 points, 2 strikes), plus `CATS`, the activities and their points. MMA, Gym, Run, and Bike Ride each earn 1.5 points.

Rules the app enforces when you log:

- Every post needs proof: a photo, or at least one tagged witness.
- Gym needs 45+ minutes and you confirm you actually lifted.
- Runs need at least 2 miles. Bike rides need at least 8 miles.
- Date needs both date rules confirmed.
- Beers needs the in-person confirmation. Beers and Reading are each capped at one per member per game week.
- One activity per post.
- The commissioner can void a post as fraud, which gives that person a 0-point week.
- Survivors at the end win. If nobody survives, the most all-time points wins.

## Celebration videos

- Gym (10): Beast Mode, Gun Show, Leg Day, Atlas Mode, Mirror Check, Raise the Bar, Box Jump, Rope Storm, Gains Shake, Hammer Time
- Run (10): Speed Demon, Frost Miles, Torch Bearer, Night Owl, Goose Chase, Rush Hour, Green Light, Pigeon Panic, Sunrise Miles, Coffee Run
- Bike Ride (3): King of the Mountain, Send It, Sprint Finish
- MMA (4): Knockout, plus Main Event, Flying Knee and The Champ, which have Amaan's name in them and only play when he logs MMA
- Jickle (5): Jickle King, Chef's Kiss, The Erne, Jickled!, Quick Hands

Everything else has one. A logged activity picks at random from the clips assigned to its category and never repeats the last one. An entry with `users: ['amaan']` only plays for those usernames, though everyone sees it in the gallery.

**Sound.** Every celebration and inside-joke video has a soundtrack: sound effects made with [Earshot](https://github.com/Leonxlnx/earshot), timed to each clip's hits, footsteps and comic words, plus real recordings of a crowd cheering, sitcom laughter, applause, a goose, pigeons, a boxing ring bell and a crowd "ooh". The recordings are public domain (CC0), from Freesound, one of the sites [Openverse](https://openverse.org) searches. Credits are in [animations/sound/openverse](animations/sound/openverse/README.md). Phones only allow a video's sound right after a tap. So a clip starts with sound when the phone allows it, and otherwise plays muted with a **Tap for sound** button. The speaker button in the top corner turns sound on or off, and each phone remembers the choice. How the soundtracks are made is in [animations/README.md](animations/README.md#sound).

To add another:

1. Put `gym-11.mp4` (720×1566, H.264, with its soundtrack) and a `gym-11.webp` poster (360×782) in `assets/celebrations/`. Videos are drawn to the iPhone 18 Pro's shape so they fill the screen; on wider screens the app shows the whole frame. `animations/scripts/build_app_assets.sh` renders both and mixes the sound in from `animations/sound/cues.py`.
2. Add `{ id: 'gym-11', name: 'Your Name' }` to the `gym` list in `CELEBRATIONS` in `js/config.js`.

3. Publish the matching Site source and upload the new files to the private media bucket using `scripts/upload-media.mjs`. Set `MEDIA_UPLOAD_SECRET` in the shell that runs the uploader and as a Sites runtime secret. For example:

   ```sh
   node scripts/upload-media.mjs https://winter-arc.osimmann.chatgpt.site celebrations/gym-11.mp4 celebrations/gym-11.webp
   ```

   With no file names it uploads every clip in `assets/celebrations/` and `assets/intro/`. Do that after remixing the sound, because that changes every video.

For a new inside joke, register the clip in `INSIDE_JOKES`, implement the trigger in `Logic.jokes`, and add the server event validation and a D1 migration when the event type is new. The round 2 clips are made with HyperFrames in `animations/hyperframes` (see [animations/README.md](animations/README.md#hyperframes)), and their event types arrive with D1 migration `drizzle/0011_round2_jokes.sql`. **Apply 0011 before publishing the code that records them**: until then the database refuses those event types (the other jokes still get recorded). 0011 rebuilds the events table, so it first copies every table that points at it (seen marks, comments, comment hearts, reactions) and drops the old ones leaves-first. Nothing is lost, even though D1 runs ON DELETE CASCADE during a migration. It also adds the `xmas_votes` table for the Christmas vote. Keep the GitHub and Sites source histories in sync. A GitHub push alone does not publish the Site or upload clips to R2.
