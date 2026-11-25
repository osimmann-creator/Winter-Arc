# Handoff: hosting Winter Arc for the group

> This is the original hosting brief. Winter Arc is now hosted with live sign-in, shared records and private media. See [README.md](README.md) for the active build and publishing instructions.

The app is finished: screens, rules engine, 34 full-screen videos (17 celebrations, 16 inside jokes and the intro), the Hoat Guarantee stamp and all the sign-in and account screens. It's members only. Everyone's account is made ahead of time, so there is no sign-up page.

Only one piece is missing: **`js/store.js` still uses sample data**. It needs to be replaced with a version backed by real sign-in, a shared database and photo storage. Every screen already calls the `Store` methods described below, so no UI work is needed.

## Steps

1. The code is on GitHub: **osimmann-creator/Winter-Arc**. The site is the repo root. `animations/` is only the source for the videos.
2. Open ChatGPT (Codex), connect that repo, and paste the prompt below.
3. As part of setup it creates the nine accounts and gives **Osim** (the commissioner) everyone's username and temporary password **once, privately**. They never go into the repo.
4. Osim sends each friend the site link plus their username and temporary password. The first time each person signs in, the app makes them pick their own password.
5. On iPhone: open the link in Safari, tap Share, then Add to Home Screen.

Forgotten password later? Osim opens Account → Members, taps the person, and chooses **Reset password**. That gives a new temporary password to send them. **Add a friend** works the same way if someone joins later.

To look around before hosting, open the preview. It fakes all of this in your browser: sign in as `osim` with the password `winterarc`, or tap **Or just pick someone**.

---

## Prompt to paste

```
This repo is "Winter Arc": a phone-first static web app (plain HTML/CSS/JS, no build step) where one closed group of friends logs workouts for points. Please host it with real sign-in, a shared database and photo storage.

WHAT EXISTS (don't redesign it)
- index.html, css/, js/, assets/ at the repo root are the finished site, including the sign-in, "pick your own password" and account screens.
- Ignore animations/: it's the Remotion project that made the videos and icons. It's not part of the site. Don't build, deploy or serve it.
- Every read and write goes through one global object, `Store`, in js/store.js. The current file is a demo that fakes everything in localStorage. Its header comment is the contract: the data model, every method, and what each returns or throws.
- Scoring (weeks, strikes, eliminations, streaks, badges, leaderboards), inside-joke detection, the Hoat Guarantee stamp and the roast-of-the-day banner (js/jokes.js) all run in the browser. The backend stores data and enforces the security rules below.
- It is members only. There must be NO way to create an account from the site.

BUILD
1. Replace js/store.js with a live implementation that has the same methods and return shapes. Set `mode = 'live'`. The preview-only methods (demoRoster, demoSignInAs, resetDemo) are only called in demo mode, so leave them out. If you use an SDK, load it with a script tag in index.html before js/store.js.

2. Sign-in: username + password only.
   - Turn off self sign-up in whatever auth you use. Accounts are only created by the one-time seed (step 3) or by the commissioner's addFriend.
   - signIn(username, password): usernames are lowercase and trimmed (the app may send "Osim "). On any failure throw Error('That username and password don’t match.'). Don't reveal whether the username exists.
   - If your auth provider needs an email, map each username to a placeholder address you control (e.g. osim@users.winter-arc.invalid) behind the scenes. People never see or type an email.
   - Rate-limit sign-in: e.g. 5 failed tries per username per 15 minutes, then throw Error('Too many tries. Wait a few minutes or ask Osim.').
   - getAuth() returns { signedIn, user: { id, username } | null, mustChangePassword }.
   - Accounts with a temporary password have must_change_password = true. The app then shows "Pick your own password" and calls setPassword(pw): at least 8 characters, must differ from the temporary one, clears the flag. setPassword is also used from Account to change a password.
   - Store only password hashes (bcrypt or argon2, or the auth provider's own). Never log passwords.
   - Sessions survive reloads and Add to Home Screen. signOut() ends the session.

3. One-time seed:
   - The group row: name "Winter Arc", season_start 2026-11-02, season_weeks 17, weekly_min 7, strikes_out 2, timezone "America/New_York" (these match CONFIG in js/config.js).
   - One account + member per entry in ROSTER in js/config.js (username, name, colour; osim is the commissioner, everyone else is a member, joined_week 0).
   - Give each account a random temporary password (three short words and a number is fine), must_change_password = true.
   - Show Osim the list of usernames and temporary passwords ONE time in this chat or your terminal. Do NOT commit it, write it to a file in the repo, or put it in logs.

4. Tables (names can differ; the shapes returned to the app must match the store.js header):
   - group_settings (one row): name, season_start (date, a Monday), season_weeks, weekly_min, strikes_out, timezone (IANA)
   - accounts: id, username (unique, lowercase), password hash (or your auth provider's user), must_change_password, created_at
   - members: id, user_id (unique), username, name, color, photo_url, role ('member'|'commissioner'), joined_week, created_at
   - posts: id, member_id, cat, at (timestamptz), minutes, miles, caption, photo_url, witnesses (member ids), voided, fraud, created_at
   - reactions: post_id, member_id, emoji. Primary key on all three, so two people reacting at once never overwrite each other. Assemble { emoji: [memberIds] } when returning posts.
   - events (inside jokes + Hoat Guarantee): id, type (a key of INSIDE_JOKES in js/config.js, or 'hoat'), key (UNIQUE), at (timestamptz), data (json), created_at
   - event_seen: user_id, event_id (primary key on both)
   - prefs: user_id, sunday_reminder (default true), cap_alerts (default true)
   - Storage for proof photos and profile photos. The app sends data URLs already shrunk to ≤1100 px (avatars ≤480 px). Only signed-in members can read them. Signed URLs are fine; refresh them in listPosts/listMembers.

5. Profile, group and commissioner:
   - getMe() returns the caller's member record. getGroup() returns the group row. config() merges the group's seasonStart, seasonWeeks, weeklyMin and strikesOut over CONFIG; it's synchronous, so cache the group after loading it.
   - updateProfile({ name?, color?, photo? }): photo null removes it. getPrefs() / updatePrefs(patch).
   - Commissioner only (check on the server):
     - updateGroup(patch), validated like checkSettings() in the demo store.js
     - addFriend({ name, username }): username 2–20 of a-z 0-9 . _ - and unused. Creates the account (temporary password, must_change_password = true) and the member (joined_week = the current week index if the season is live, else 0, so a late joiner gets no strikes for earlier weeks). Returns { username, tempPassword } so the app can show it once.
     - resetPassword(memberId): new temporary password, must_change_password = true, sign them out everywhere. Returns { username, tempPassword }.
     - removeMember(id): deletes their sign-in, member record, posts, reactions and photos. The commissioner can't remove themselves.
     - makeCommissioner(id): hands the role over. There is always exactly one commissioner.
     - voidPost(id): sets voided = fraud = true (rule 9: a 0-point week).

6. Inside jokes (config.js INSIDE_JOKES):
   - The browser notices them (Logic.jokes in js/logic.js) and calls recordEvent({ type, key, data, at }). Make it insert-or-ignore on the unique key, because two phones can notice the same tie at the same moment, and return the stored row.
   - listEvents() returns every event plus `seen` (true if the caller has a row in event_seen). markSeen(eventId) adds that row. That's what makes each video pop up once per person.
   - The Hoat Guarantee is recorded the same way (type 'hoat', key "hoat:<week>") when Osim reaches the weekly minimum, so it shows up as a feed card for everyone.
   - Server checks: only signed-in members; type is one of the 16 INSIDE_JOKES keys or 'hoat'; data is small JSON; the key has the type's format (<w> = week index from 0, <pts> = points like 6.5, <post> = a post id):
     coin:<w>:<pts>  bluehair:<w>  iron:<w>  liquor:<w>  bag:<w>:<pts>  fight:<w>:<pts>  crashout:<post>  satellite:<post>
     puke:<w>:<n>  mma:<w>  radiator:<post> or radiator:start  mom:<w>  nets:<w>  phil:<post>  scared:<YYYY-MM-DD>:<n>  timesheet:<w>  hoat:<w>
   - Recommended extra: run the same rules on the server after every new post, reaction or void, and every hour on the hour, so an event is recorded even if nobody has the app open right then (several rules depend on the clock). Use the exact rules in Logic.jokes. "This week" = the current Monday–Sunday week in the group's timezone; "still in" = not eliminated; voided posts never count:
     - coin: Dean and Jake both have more than 0 points this week and exactly the same points. One event per week per tied score.
     - bluehair: Connor has more points this week than everyone else. One per week.
     - iron: Saturday from 6:00 to 11:59 AM in the group's timezone, Ayaad (still in) has the fewest points among the people still in, and at least one of them has more. One per week.
     - liquor: the same as iron, for Gaurav. One per week.
     - bag: Dean, Connor and Dylan all have more than 0 points this week and exactly the same points. One per week per tied score.
     - fight: Dylan has more than 0 points, nobody has more than him this week, and at least one other person has exactly the same. One per week per tied score.
     - crashout: Connor has a 🧢 reaction on someone else's post dated this week. One per post.
     - satellite: Connor has a beers post dated this week. One per post.
     - puke: Amaan (still in) is alone in last: everyone else still in has more points than him this week. It fires again each separate time he drops back into last in the same week: replay the week's posts in time order and count how many times he goes from not-alone-in-last to alone-in-last; that count is <n>.
     - mma: Amaan has 4 or more MMA posts dated this week. One per week.
     - radiator: Jake (still in) hasn't posted for 4 days (96 hours) since his latest post, or since the start of his first week if he has none. One per dry spell, keyed by that latest post.
     - mom: Sunday from 6:00 PM to 11:59 PM in the group's timezone, Jake (still in) is under the weekly minimum this week. One per week.
     - nets: Jake or Gaurav took a strike in the week that just ended (<w> is that week). One per week; data.who lists who missed.
     - phil: Philip posts something dated this week at least 3 days (72 hours) after his previous post, or after the start of his first week if it's his first. One per post.
     - scared: nobody has a date post in the last 30 days, counting from the later of the season start and the most recent date post (that day is the YYYY-MM-DD). <n> = whole 30-day stretches so far, so it fires again every 30 days the drought goes on.
     - timesheet: the post that takes Jake from under the weekly minimum to at least the minimum this week is dated Saturday or Sunday in the group's timezone. Not in a week where one of his posts was voided as fraud (that week is worth 0). One per week.
     - hoat: Osim has at least the weekly minimum this week. One per week.
   - People are matched by username, so renaming someone in the app doesn't break them.

7. Hoat Guarantee: the stamp animation and ring-card stamp are drawn in the browser. The only thing stored is its 'hoat' event (step 6), which puts the card in the feed.

8. Rules to enforce on the server (database policies or server functions, never only the UI):
   - Nothing is readable without signing in. The sign-in screen needs no data.
   - Members can only edit their own name, colour and photo. Role, username and joined_week are server-controlled.
   - addPost: member_id = the caller; cat in gym, run, mma, jickle, volo, soccer, date, beers, reading; a photo or at least one witness who is a member; gym minutes >= 45, run miles >= 2; caption ≤ 140 characters; voided = fraud = false; `at` no later than now + 5 minutes and no earlier than Monday 00:00 of the current week in the group's timezone.
   - deletePost: only the author.
   - toggleReaction: only as yourself; emoji in 🔥 💪 👏 😂 🧢; return the updated post.
   - Everything under "Commissioner only" above: only the current commissioner.

9. Live updates: subscribe(fn) returns an unsubscribe function. Call fn when anyone posts, deletes, reacts, gets voided, changes their profile, or an event is recorded. Use realtime if available, otherwise poll every 20 seconds while the page is visible.

10. Reminders (optional): there are no emails now, so the Sunday 6 PM nudge and cap alerts need Web Push (works for home-screen web apps on iPhone with iOS 16.4+). If you skip push, remove the Reminders card from vAccount() in js/app.js.

11. Hosting:
   - HTTPS, served from the repo root as static files.
   - .mp4 files need byte-range support (needed on iPhone).
   - Keep manifest.webmanifest and assets/icons.

DONE WHEN
- The site is live on an https URL and looks exactly like the preview, without the "Sample data" chip, the preview hints, "Or just pick someone", "Switch person" or "Reset sample data" (they hide automatically when mode isn't 'demo').
- There is no way to make an account from the site, and the server rejects any attempt.
- Each of the nine people can sign in with their username and temporary password, is made to pick their own password, and stays signed in after reloading or opening from the home screen.
- Wrong passwords show the friendly message, and repeated failures are throttled.
- Two phones see each other's posts and reactions within a few seconds.
- When Dean and Jake are tied above 0, The Coin pops up once on each phone and the feed shows the card with the tied points. When Connor leads the week, Blue Hair does the same. On Saturday morning with Ayaad in last, The Iron does the same. The other 13 inside jokes in INSIDE_JOKES work the same way, each with its own rule (step 6).
- MMA is an activity worth 1.5 points, and the server accepts it.
- While Dylan has exactly 4 points in the week, the app shows him as "La4" (display only; his real name stays in the database).
- When Osim reaches 7 points in a week, the red HOAT GUARANTEE stamp slams onto his screen, stays on his ring card, and a Hoat Guarantee card appears in everyone's feed.
- Only the commissioner sees and can use Void, season settings, Members (reset password, make commissioner, remove) and Add a friend; the server rejects those calls from anyone else.
```

---

## Notes

- **Names are baked into the inside-joke videos** (DEAN, JAKE, CONNOR, AYAAD, DYLAN, AMAAN, GAURAV and PHIL). The rules and feed cards use whatever names people have in the app.
- **La4:** while Dylan is on exactly 4 points in a week, the app calls him La4 everywhere (board, feed, roasts). It's display only; `ALIASES` in js/config.js.
- **Roast of the day (100 roasts):** the server picks one roast a day with `Jokes.today` from js/jokes.js and saves it in the `roasts` table (day in the group's timezone, data `{ joke, key, who, text, bold, n, rerun? }`, migration 0010). listEvents returns each one as an event of type `roast` with the key `roast:YYYY-MM-DD`. recordEvent for a roast ignores the phone's data and saves the server's own pick, once per day. Migration 0007 is a no-op. Details are in README.md.
- **Already hosted before the new jokes?** Paste this into Codex: "Update the server for the new Winter Arc version: accept event types bag, fight, crashout, satellite, puke, mma, radiator, mom, nets, liquor, phil, scared and timesheet with the key formats in HANDOFF.md step 6, add mma to the allowed post categories, and add the new rules to the server-side joke runner (run it after every post, reaction or void and every hour)."
- **Season settings** live in `js/config.js` and in the group row. They're 17 weeks from Monday Nov 2, 2026, 7 points a week and 2 strikes. Osim can change them in Account → Commissioner. Weeks run Monday 00:00 to Sunday 11:59 PM (New York time).
- **Temporary passwords** only ever appear once: in the setup chat for the first nine, or on Osim's screen after Reset password or Add a friend.
- **No money is shown anywhere.**
- **The videos are silent** so they can autoplay on phones. They're drawn to the iPhone 18 Pro's shape (1080×2348, app copies 720×1566) with extra sky and ground above and below, so they fill the screen. On wider screens the app shows the whole frame instead. Nothing on the server depends on the size.
- If ChatGPT's hosting can't do sign-in and a database, the same prompt works with Supabase or Firebase (both have free tiers) plus any static host.
