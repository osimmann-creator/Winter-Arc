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
| `js/app.js` | The screens: sign-in, pick your own password, Home, Feed, Board, Me, Account, the log sheet, inside-joke pop-ups, the stamps, the Naughty or Nice ballot and reveal, toasts and dialogs |
| `js/celebrate.js` | Full-screen celebration videos (with the speaker button) and confetti |
| `server/` | Worker routes for accounts, activity, the feed, and private media |
| `drizzle/` | D1 schema migrations |
| `js/art.js` | Built-in icons, the Hoat and NICE/NAUGHTY stamps, and paths to the art files |
| `assets/celebrations/` | Celebration and inside-joke videos (`<id>.mp4` plus a `<id>.webp` poster) |
| `assets/intro/` | Archived opening animation assets |
| `assets/mascot/` | Mascot poses used around the app; `assets/mascot/<username>/` is that member's own character, which his Home screen shows instead of Flexander (`CHARACTERS` in `js/config.js`; character sheets in `animations/characters/`) |
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
| **The Coin** | Dean and Jake are tied on points this week (above 0). Lands on its edge. In the third week they tie, Best of 40 plays instead. | Yes, with the tied score |
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
| **The Crossing** | Osim is still in and still short of his weekly goal at 6 PM on a Sunday. The canoe drifts toward the island. | Yes, with what he still needs |
| **Final Call** | The post that gets Osim to his weekly goal is dated Sunday. He dives through the gate, then the Hoat stamp lands (his real Hoat Guarantee still fires too). | Yes |
| **#worthit** | Monday, when Osim missed last week's goal by 1.5 points or less. Missed the flight, kept the burger. | Yes, with how much he missed by |
| **My Car, My Rules** | Someone alone in first for the week gets tied or passed by a post dated Sunday. Osim rides along in the video. | Yes, naming who lost first and who caught him |
| **Operation Basement** | Dean logs anything timed between 10 PM and 3:59 AM. Once per post. | Yes, with the time |
| **No Map** | Dylan and Connor are both still in and both 72+ hours without a log. Once per dry spell. | Yes |
| **Grand Theft #1** | A post dated Friday or Saturday takes first place from whoever was alone in first. No names in the video. | Yes, naming who took it from whom |
| **Wanted** | A post from this week gets its 3rd 🧢. Once per post. | Yes, naming whose post |
| **Busted** | The commissioner voids another member’s activity as fraud. Once per post. | Yes |
| **Wasted** | Someone takes his last strike. Once per member. | Yes |
| **Out on Parole** | An eliminated member logs again for the first time. Once per member. | Yes |
| **Partners in Crime** | Two members log the same activity on the same day and tag each other as witnesses. Once per pair per week. | Yes, naming both |
| **Naughty or Nice** | Christmas: everyone votes on Dec 24, the results come out on Dec 25 (below). | Yes, with both lists |
| **New Year's Eve** | Dec 31. A giant kettlebell drops at midnight. | Yes |
| **Groundhog Day** | Feb 2. Phil has spoken: back in 6 weeks. | Yes |
| **Valentine's Day** | Feb 14. Cupid's arrow lands on the couch. | Yes, naming everyone still short (a date is worth 4) |
| **Signal Lost** | Connor is still in and 72+ hours without a log. Once per dry spell. If Dylan has gone quiet too, No Map plays instead. | Yes |
| **3 AM Besties** | Connor logs anything timed between 10 PM and 4:59 AM. Once per post. | Yes, with the time |
| **Locked Out** | Everyone still in has reached his goal this week except Connor, who's still in and short. Anyone on the injury report that week doesn't count. Once per week. | Yes, with what he still needs |
| **The Volcano** | Dean and Dylan are tied on points this week (above 0). | Yes, with the tied score |
| **Best of 40** | Dean and Jake tie for the third week this season (a week counts if they were level above 0 at any point). Plays instead of The Coin that week. | Yes |
| **Retire the Number** | The third week this season Dylan hits exactly 4 points (La4) at any point. Once a season. | Yes |
| **Balanced Diet** | Jake logs Beers with the fellas. Once per post. | Yes |
| **The Pull-Out** | The morning after a Jake beers post: from the next 6 AM in the group's timezone until that night. Once per post. | Yes |
| **Jailbreak** | Jake's first post after 4+ days without one (a dry spell long enough for The Radiator). Once per dry spell. | Yes, with how long he was gone |
| **Mom's Fridge** | Jake's post that gets him to his weekly goal is dated Monday to Friday. Once per week. | Yes, with the day |
| **Cleared to Play** | The commissioner marks Phil recovered, closing his injury report. Once per report. | Yes |
| **Early Spring** | Phil logs something on three days in a row this week. No shadow. Once per week. | Yes |
| **War Hero** | Someone logs the first date after a Scared of Girls drought. No name in the video. Once per drought. | Yes, naming him |

The GTA clips (Grand Theft #1 through Partners in Crime), War Hero and the holidays can be about anyone, so their videos have no names in them. The same joke can be triggered again after one full intervening game week (Monday through Sunday).

**Naughty or Nice (Christmas):** all day on Dec 24 (group timezone) a ballot is pinned to the top of the feed, with a nudge on Home. Everyone votes 😇 Nice or 😈 Naughty on every other member, eliminated guys included, and can change his votes until 11:59 PM. Until then the ballot only shows how many people have voted and who hasn't. From 12:00 AM on Dec 25 the server saves the results as the `xmas` event, so each phone plays the `joke-xmas` intro once and then stamps every face NICE (gold, a gift) or NAUGHTY (red, coal) with its count, nice list first and the naughtiest last. A results card with both lists stays in the feed; tap it to replay the reveal. The rules are `XMAS` in `js/config.js`: majority decides, ties go naughty, anyone who doesn't vote goes naughty, and the server never sends who voted what. Votes are kept in the `xmas_votes` table (migration 0011).

**Voiding activities.** Members can void their own activity posts to remove that activity’s points. A commissioner voiding another member’s post marks it as fraud and sets that week’s score to zero.

**La4:** while Dylan has exactly 4 points in a week, the app calls him La4 everywhere: the board, the feed, the roasts. It's display only (`ALIASES` in `js/config.js`).

**Hoat Guarantee:** whenever Osim reaches 7 points in a week, a red rubber stamp with a thumbs up slams onto his screen. It then sits on his ring card, and a Hoat Guarantee card goes to the feed for everyone (tap the stamp to replay it).

**The Monday Report:** a weekly recap made of 30 short clips in `assets/celebrations` (`recap-*`): an intro, Player of the Week, a strike for each member who took one (or Everybody Survived if nobody did), Dead Last and an outro. Every clip that shows a name has one version per member, because the standings aren't known until Sunday night. The app doesn't play them yet. It needs to play a list of clips back to back on Monday and record a `recap:<w>` event so each person sees it once. See [animations/README.md](animations/README.md#the-monday-report).

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
- A week that overlaps a recorded injury is exempt from strikes.
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

For a new inside joke, register the clip in `INSIDE_JOKES`, implement the trigger in `Logic.jokes`, and add the server event validation and a D1 migration when the event type is new. The round 2 clips are made with HyperFrames in `animations/hyperframes` (see [animations/README.md](animations/README.md#hyperframes)), and their event types arrive with D1 migration `drizzle/0011_round2_jokes.sql`. **Apply 0011 before publishing the code that records them**: until then the database refuses those event types (the other jokes still get recorded). 0011 rebuilds the events table, so it first copies every table that points at it (seen marks, comments, comment hearts, reactions) and drops the old ones leaves-first. Nothing is lost, even though D1 runs ON DELETE CASCADE during a migration. It also adds the `xmas_votes` table for the Christmas vote, which has to be live before Dec 24. The round 3 clips (Signal Lost through War Hero) arrive with `drizzle/0012_round3_jokes.sql`, which rebuilds the events table the same safe way; **apply 0012 before publishing the code that records them**. 0012 also accepts the event types of the round 3 ideas that aren't made yet (`shoes`, `sleptin`, `refund`, `pressed`, `umbrella`, `wrongguy`, `appedition`, `nexttrain`) and The Monday Report's `recap`, so those won't need another rebuild. Cleared to Play uses the injury report's id, which the server now sends with each injury period. Keep the GitHub and Sites source histories in sync. A GitHub push alone does not publish the Site or upload clips to R2.
