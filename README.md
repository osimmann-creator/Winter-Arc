# Winter Arc 🥶

A phone-first web app for the group's Winter Arc: Osim, Amaan, Ayaad, Connor, Dean, Dylan, Gaurav, Jake and Philip. You need 7 points a week, and two strikes knock you out. Log an activity with proof and a cartoon Greek strongman celebrates it.

Right now it runs in **preview mode**: accounts and posts are faked in your browser. To use it for real, see **HANDOFF.md**. It has a ready-to-paste prompt that hooks up real sign-in, a shared database and the nine accounts.

**Trying the preview:** sign in as `osim` with the password `winterarc`. Everyone else's preview password is also `winterarc`, and signing in as them shows the "pick your own password" step. **Or just pick someone** skips the password.

## Run it on your computer

It's plain HTML, CSS and JavaScript, so there's no build step.

```
cd winter-arc        # the folder with index.html
python3 -m http.server 8000
```

Then open http://localhost:8000. To try it on your phone, join the same Wi-Fi and open `http://<your-computer's-IP>:8000`.

> Opening `index.html` by double-clicking it won't work well, because browsers block some features on `file://`. Use a local server like the one above.

## What's in here

The site is the top level of this folder (no build step). `animations/` holds the Remotion project that draws the videos and the app icon. It isn't part of the site (see `animations/README.md`).

| Path | What it is |
|---|---|
| `index.html` | App shell: the top bar, tab bar, overlays and script tags |
| `css/app.css` | All styling (the cartoon look, layout and animations) |
| `js/config.js` | **Settings to edit**: points per activity, season defaults, the roster, celebration videos, inside jokes and the Hoat Guarantee |
| `js/logic.js` | Rules engine: weeks, strikes, elimination, streaks, badges, leaderboards and the inside-joke rules (pure functions) |
| `js/jokes.js` | Roast of the day: 183 jokes and how one is picked each day |
| `js/store.js` | **Data layer**: a sample-data version today, which gets replaced for hosting. Its header lists every method (see HANDOFF.md) |
| `js/app.js` | The screens: sign-in, pick your own password, Home, Feed, Board, Me, Account, the log sheet, inside-joke pop-ups, the stamp, toasts and dialogs |
| `js/celebrate.js` | Full-screen celebration videos and confetti |
| `js/intro.js` | The opening animation (biceps, mascot, then the doors open onto Home) |
| `js/art.js` | Built-in icons and paths to the art files |
| `assets/celebrations/` | Celebration and inside-joke videos (`<id>.mp4` plus a `<id>.webp` poster) |
| `assets/intro/` | Opening animation |
| `assets/mascot/` | Mascot poses used around the app |
| `assets/demo/` | Sample proof photos (preview mode only) |
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

Each one pops up full screen once for everyone, the moment it happens:

| | When | Feed card |
|---|---|---|
| **The Coin** | Dean and Jake are tied on points this week (above 0). Lands on its edge. | Yes, with the tied score |
| **Blue Hair** | Connor has the most points this week. | Yes |
| **The Iron** | Saturday 6 AM to noon (New York time) and Ayaad is in last. | Yes |
| **The Liquor Run** | Same as The Iron, but Gaurav is in last. He takes an hour to pick a bottle. | Yes |
| **The Bag** | Dean, Connor and Dylan are all tied this week (above 0). | Yes |
| **Dylan Starts Fights** | Dylan is tied for first this week. | Yes |
| **Crash Out KNR** | Connor calls cap (🧢) on someone's post from this week. Once per post. | Yes |
| **Satellite House** | Connor logs beers with the boys, then flies home to his house in orbit. Once per post. | Yes |
| **Puked On** | Amaan is alone in last this week. Again each time he drops back into last. | Yes |
| **MMA Guy** | Amaan logs his 4th MMA session of the week. It is not cool. | Yes |
| **The Radiator** | Jake hasn't logged anything for 4 days. Once per dry spell. | Yes |
| **Jake's Mom** | Sunday from 6 PM and Jake is still under 7. | Yes |
| **The Nets Game** | Jake or Gaurav missed 7 last week. Plays on Monday. | Yes, naming who missed |
| **Punxsutawney Phil** | Philip logs something after 3+ days without a log. He sees his shadow. Once per post. | Yes |
| **Scared of Girls** | Nobody has logged a date in 30 days. Again every 30 days it goes on. | Yes |

If a few of the same joke are waiting (say Connor capped three posts overnight), it plays once.

**La4:** while Dylan has exactly 4 points in a week, the app calls him La4 everywhere: the board, the feed, the roasts. It's display only (`ALIASES` in `js/config.js`).

**Hoat Guarantee:** whenever Osim reaches 7 points in a week, a red rubber stamp with a thumbs up slams onto his screen. It then sits on his ring card, and a Hoat Guarantee card goes to the feed for everyone (tap the stamp to replay it).

The settings live in `INSIDE_JOKES` and `HOAT` in `js/config.js` and match people by username; the exact rules are in `Logic.jokes` in `js/logic.js`. All 15 videos are in the Me tab gallery too.

**Roast of the day:** the banner at the top of Home roasts whoever a joke fits right now, using live points (183 jokes in `js/jokes.js`). Everyone sees the same one each day. Tap it for another.

## Changing the rules

The commissioner sets the season in Account → Commissioner:

- the Monday week 1 starts
- the number of weeks
- points needed each week
- strikes before you're out

`js/config.js` holds the defaults (starts Monday Nov 2, 2026, 17 weeks, 7 points, 2 strikes), plus `CATS`, the activities and their points. MMA is worth 1.5, like gym and run.

Rules the app enforces when you log:

- Every post needs proof: a photo, or at least one tagged witness.
- Gym needs 45+ minutes and you confirm you actually lifted.
- Runs need 2+ miles.
- Date needs both date rules confirmed.
- Beers needs the in-person confirmation.
- One activity per post.
- The commissioner can void a post as fraud, which gives that person a 0-point week.
- Survivors at the end win. If nobody survives, the most all-time points wins.

## Celebration videos

Gym and Run have five each:

- Gym: Beast Mode, Gun Show, Leg Day, Atlas Mode, Mirror Check
- Run: Speed Demon, Frost Miles, Torch Bearer, Night Owl, Goose Chase

Everything else has one (MMA's is Knockout). Each log picks one at random and never repeats the last one.

To add another:

1. Put `gym-6.mp4` (720×1280, H.264, muted) and a `gym-6.webp` poster in `assets/celebrations/`.
2. Add `{ id: 'gym-6', name: 'Your Name' }` to the `gym` list in `CELEBRATIONS` in `js/config.js`.

They all show in the gallery on the Me tab.

## Preview mode vs. live

`Store.mode` is `'demo'` in the preview. That shows the "Sample data" chip, the preview hint and "Or just pick someone" on the sign-in screen, "Switch person" and "Reset sample data". In live mode all of those disappear and the same screens talk to the real backend.

The sample week is set up so the extras show straight away: Dean and Jake are tied at 6.5, Connor leads with 9.5, Ayaad is last, Dylan is on 4 (so he shows as La4), and Osim sits at 5.5, so logging one gym session gets him his stamp. The feed also has Satellite House, Crash Out KNR and The Nets Game cards (Jake missed 7 last week). To set off others, use Switch person: as Connor, call cap on a post; as Amaan, log MMA until it's your 4th this week.
