'use strict';
/* =====================================================================
   WINTER ARC · roast of the day (the banner at the top of Home)

   183 jokes. Each one roasts whichever crew member it fits right now,
   using the live points, so every roast is earned.

   HOW IT PICKS
   - One joke a day, the same for everyone in the crew. It never shows the
     same joke two days running, and tries not to roast the same person twice
     in a row. As the week runs out, whoever is still short gets the spotlight.
   - A joke only shows when its situation is true (e.g. someone really has
     0 points on a Thursday). Ties rotate, so nobody hogs a category.
   - Tapping the banner shows another one.

   EDITING
   - Each line is [situation, joke]. The situations are described in WHEN.
   - Blanks you can use in a joke:
       {name}     the person being roasted
       {pts}      their points this week        {left}    points they still need
       {total}    their season points           {lastwk}  their points last week
       {strikes}  their strikes                 {elim}    week they were eliminated
       {streak}   days in a row they've logged  {days}    days since they last logged
       {n}        the count the situation is about (beers, dates, caps...)
       {name2} {pts2} {gap}   the person they're compared with, and the difference
       {last}     this week's lowest scorer (in the leader jokes)
       {min} weekly minimum · {day} today's weekday · {week} week number
       {weeks} weeks in the season · {crew} people still in
       {datePts} {gymPts} {readPts}   what those activities are worth
   - Put a word after a colon for "1 point" / "3 points": {pts:point}, {n:date}.
     Irregular plurals use a bar: {n:activity|activities}.
   ===================================================================== */
const Jokes = (() => {
  const LIST = [
    /* ---------- 0 points this week, Wednesday to Saturday */
    ['zero', "It's {day} and {name} has 0 points. Bold strategy. Let's see if it pays off."],
    ['zero', "{name}'s ring this week is just a zero with extra steps."],
    ['zero', "{name} has 0 points this week. The mascot's toga has done more lifting."],
    ['zero', "Search party for {name} is heading to the gym. Kidding. He'd never be there. 0 points."],
    ['zero', "{name}: 0 points. Not a slow start. Not a start at all."],
    ['zero', "It's {day}. {name} has 0 points and a lot of confidence about the weekend."],
    ['zero', "{name} has 0 points this week. That's not a cold streak, that's hibernation."],
    ['zero', "{name} is at 0 points. The Log button thinks it's decorative now."],
    ['zero', "0 points for {name} so far. Zeus has seen statues move more."],
    ['zero', "Scientists are studying {name}'s week. 0 points, 0 activity, somehow still tired."],

    /* ---------- last place this week */
    ['last', "{name} is in last place with {pts:point}. Somebody had to be. He volunteered."],
    ['last', "{name} is number {crew} of {crew} this week. Every leaderboard needs a foundation."],
    ['last', "{name} has {pts:point} this week. {name2} has {pts2}. Same app, different universe."],
    ['last', "{name} is dead last with {pts:point}. The comeback story writes itself. Any day now."],
    ['last', "{name} isn't in last place. Last place is in {name}."],
    ['last', "{name} is last this week. Not losing, just helping everyone else feel good about themselves."],
    ['last', "Bottom of the board: {name}. Close enough to the floor to do pushups. Hasn't."],
    ['last', "{name} is last with {pts:point}. Even the clouds in the background are moving faster."],
    ['last', "{name} is carrying this week's leaderboard. From underneath."],
    ['last', "Rock bottom has a new tenant: {name}, with {pts:point} this week."],
    ['last', "{name} is last this week. Somewhere, a dumbbell is collecting dust in his honor."],
    ['last', "{name} is {gap:point} behind {name2}. Bring snacks, it's a long walk."],

    /* ---------- still short on Friday or Saturday */
    ['behind', "It's {day} and {name} still needs {left:point}. Thoughts and prayers."],
    ['behind', "{name} needs {left:point} by Sunday night. Doctors say it's possible. Doctors haven't met {name}."],
    ['behind', "{name} is {left:point} short with the weekend left. Cue the panic montage."],
    ['behind', "Weekend forecast for {name}: {left:point} needed, 100% chance of excuses."],
    ['behind', "{name} has {pts:point} on a {day}. The math isn't mathing, but the panic is."],
    ['behind', "A strike is stretching in the parking lot. {name} still needs {left:point}."],
    ['behind', "{name} needs {left:point} this weekend. Gym staff have been warned."],
    ['behind', "{name} needs {left:point}. Reminder: the gym is open on weekends. It's not a rumor."],

    /* ---------- still short on Sunday */
    ['sunday', "It's Sunday and {name} needs {left:point}. Midnight is coming. So is the strike."],
    ['sunday', "{name} needs {left:point} before 11:59 tonight. Somebody get this man a treadmill and a miracle."],
    ['sunday', "Sunday scaries, starring {name}: {left:point} to go and the clock won't stop."],
    ['sunday', "{name} has until 11:59 PM to find {left:point}. Check the couch cushions."],
    ['sunday', "Tonight's main event: {name} vs. the clock. He needs {left:point}. Vegas likes the clock."],

    /* ---------- one gym trip or run from safe */
    ['close', "{name} is {left:point} from safe. So close. Yet so on the couch."],
    ['close', "{name} needs just {left:point}. One gym trip. He's treating it like Everest."],
    ['close', "{name} is sitting at {pts:point}. That's not safe, that's a cliffhanger."],
    ['close', "{name} is {left:point} from safety and has decided to enjoy the suspense."],
    ['close', "{pts} out of {min} for {name}. Close only counts in horseshoes, and that's not a category."],
    ['close', "{name} needs {left:point}. One run. Two miles. He's acting like it's a marathon."],

    /* ---------- already safe this week */
    ['safe', "{name} is already safe this week and has mentioned it 14 times."],
    ['safe', "{name} hit {pts:point} and is now unbearable. Somebody please pass him."],
    ['safe', "{name} is safe this week. Do not ask him about it. He'll tell you anyway."],
    ['safe', "{name} is safe with {pts:point}. Suspicious. Commissioner, check the photos."],
    ['safe', "{name} is safe this week. Enjoy it, champ. Monday resets everything."],
    ['safe', "{name} is safe and acting like he won the whole Winter Arc. It's week {week}."],
    ['safe', "{name} already has {pts:point}. That's not working out, that's farming."],

    /* ---------- leading the week */
    ['leader', "{name} leads the week with {pts:point}. The rest of you should be embarrassed. Mostly you, {last}."],
    ['leader', "{name} is first with {pts:point}. That's not a Winter Arc, that's a Winter Montage."],
    ['leader', "{name} is #1 this week. Either he's locked in or he found a cheat code. Investigating."],
    ['leader', "{name} leads with {pts:point}. Somebody tell him it's a {weeks}-week season, not a sprint."],
    ['leader', "First place this week: {name}. Second place: everyone pretending they're not jealous."],
    ['leader', "{name} is on top with {pts:point}. The mascot just asked for his autograph."],
    ['leader', "{name} is {gap:point} clear in first. The group chat is quiet for a reason."],

    /* ---------- double the minimum */
    ['double', "{name} has {pts:point}. That's double the minimum. Leave some workouts for the rest of us."],
    ['double', "{name} is at {pts:point} this week. Hercules called. He wants his whole deal back."],
    ['double', "{name} has {pts:point} this week. The gym is thinking about charging him rent."],

    /* ---------- one strike from elimination, not safe yet */
    ['strike', "{name} is one strike from elimination and needs {left:point}. No pressure. Actually, all the pressure."],
    ['strike', "{name} is running on {strikes:strike} and a prayer. {left:point} to go this week."],
    ['strike', "One more strike and {name} becomes a ghost story the fellas tell over beers."],
    ['strike', "{name} is one strike from out. The big red X is stretching next to his name."],
    ['strike', "{name}: {strikes:strike} down, {left:point} to go, zero chill."],
    ['strike', "Eliminations aren't personal. Unless you're {name}, who's one strike away."],
    ['strike', "{name} is one strike from done. The commissioner has started drafting the eulogy."],

    /* ---------- longest streak */
    ['streak', "{name} is on a {streak}-day streak. Somebody check on him. Blink twice if you need help."],
    ['streak', "{name} has logged something {streak:day} straight. The flame icon is asking for overtime."],
    ['streak', "{name}'s streak is at {streak:day}. Meanwhile, some of you can't find the gym on a map."],
    ['streak', "{streak:day} in a row for {name}. The streak has its own streak now."],

    /* ---------- longest since logging anything */
    ['idle', "{name} hasn't logged anything in {days:day}. Last seen somewhere warm, probably horizontal."],
    ['idle', "It's been {days:day} since {name} logged anything. Milk lasts longer than his motivation."],
    ['idle', "{name}'s last activity was {days:day} ago. Send a search party or a gym membership?"],
    ['idle', "{name} has gone {days:day} without logging. That's not a rest day, that's a sabbatical."],
    ['idle', "Missing: {name}. Last seen {days:day} ago. Answers to 'bro' and 'tomorrow, I swear.'"],
    ['idle', "{days:day} since {name} logged anything. His sneakers have started a support group."],
    ['idle', "{name} hasn't logged in {days:day}. Even hibernating bears get up to stretch."],

    /* ---------- nothing logged all season */
    ['ghost', "{name} has logged nothing all season. Is he in the Winter Arc or just in the group chat?"],
    ['ghost', "{name} has 0 posts this season. His profile picture is doing all the work."],
    ['ghost', "{name} joined the Winter Arc and then entered witness protection. 0 posts."],

    /* ---------- lowest score last week */
    ['lastWeekLow', "Last week {name} scored {lastwk:point}. Even his rest days were tired."],
    ['lastWeekLow', "{name} finished last week with {lastwk:point}. Historians are calling it the quiet week."],
    ['lastWeekLow', "Last week's lowest score belongs to {name}: {lastwk:point}. New week, same energy?"],
    ['lastWeekLow', "{name} put up {lastwk:point} last week. The bar is on the floor. Don't trip over it."],

    /* ---------- half this week's points are beers */
    ['beerWeek', "{name} has {pts:point} this week and {n} came from beers. That's not a Winter Arc, that's a pub crawl."],
    ['beerWeek', "{name}'s split this week: beers, beers, and a strong opinion about leg day."],
    ['beerWeek', "{n} of {name}'s {pts:point} this week came from beers. Cheers to the grind, I guess."],

    /* ---------- hands out the most reactions, not safe yet */
    ['hype', "{name} has handed out {n} reactions and earned {pts:point} this week. All hype, no reps."],
    ['hype', "{name} is the crew's number one hype man. {n} reactions given. Now do a pushup."],
    ['hype', "{name} reacts to everyone's workouts like it's his job. {n} reactions. His own points: {pts}."],

    /* ---------- bottom half of the week */
    ['bottomHalf', "{name}'s workout plan: open the app, stare at the ring, close the app."],
    ['bottomHalf', "{name} is the reason the weekly minimum isn't higher."],
    ['bottomHalf', "{name} is saving his energy for the weekend. Which weekend? Nobody knows."],
    ['bottomHalf', "{name} treats the Log button like a museum exhibit. Look, don't touch."],
    ['bottomHalf', "{name} has {pts:point}. The mascot wears a toga in winter and is still more committed."],
    ['bottomHalf', "{name}'s Winter Arc is less of an arc and more of a gentle slope."],
    ['bottomHalf', "{name}'s rest days have rest days."],
    ['bottomHalf', "{name} is one good week away from being a threat. He's been one good week away for a while."],
    ['bottomHalf', "{name} has the energy of a phone at 2%. {pts:point} this week."],
    ['bottomHalf', "{name} is still warming up. He's been warming up since the season started."],

    /* ---------- leading the season */
    ['seasonLeader', "{name} leads the whole season with {total:point}. Statues are being commissioned."],
    ['seasonLeader', "{name} is first all-time with {total:point}. Zeus has started following him back."],
    ['seasonLeader', "{name} has {total:point} this season. The rest of the crew is basically his warm-up."],
    ['seasonLeader', "{name} leads the season by {gap:point}. Everyone else is fighting for second."],

    /* ---------- last in season points */
    ['seasonLast', "{name} is last in season points with {total:point}. Less Winter Arc, more Winter Nap."],
    ['seasonLast', "{name} has {total:point} all season. The mascot did more in one celebration video."],
    ['seasonLast', "Season standings, bottom row: {name}, {total:point}. Rent's cheap down there."],
    ['seasonLast', "{name} is last on the all-time board. Bold of him to call this an arc."],
    ['seasonLast', "{name} has {total:point}, {week:week} in. That's not an arc. That's a flat line."],

    /* ---------- eliminated */
    ['out', "{name} is eliminated and still checking the leaderboard. That's the spirit. Wrong spirit, but still."],
    ['out', "{name} is out of the Winter Arc and into his Winter Couch era."],
    ['out', "RIP {name}'s Winter Arc. Cause of death: {strikes:strike}."],
    ['out', "{name} got eliminated in week {elim}. Gone, but not forgotten. Mostly gone."],
    ['out', "{name} is out, but all-time points still count. Delusion is a form of cardio."],

    /* ---------- the commissioner */
    ['commish', "{name} is the commissioner with {pts:point} this week. Rules are for the little people."],
    ['commish', "Commissioner {name} can void anyone's post. Must be nice."],
    ['commish', "{name} runs this crew with an iron fist and {pts:point}. Mostly the fist."],
    ['commish', "Reminder: Commissioner {name} has the void button and a long memory. Be nice."],

    /* ---------- one badge or fewer */
    ['badgeless', "{name} has {n:badge} this season. The trophy case is mostly air."],
    ['badgeless', "{name} has {n:badge}. The Me tab has never looked so peaceful."],

    /* ---------- most beers with the fellas */
    ['beers', "{name} has logged beers with the fellas {n:time}. Hydration counts if you believe hard enough."],
    ['beers', "{name} has {n:beer night} on the board. Elite reps. Wrong kind."],
    ['beers', "{name}'s most trained muscle this season: the elbow. {n:beer night} logged."],
    ['beers', "{name} leads the crew in beers with the fellas: {n}. Somebody has to keep the culture alive."],
    ['beers', "{name} has logged {n:beer night}. His liver is requesting a rest day."],

    /* ---------- most dates */
    ['dater', "{name} has logged {n:date}. Lover Boy is farming the {datePts}-pointers."],
    ['dater', "{name} found the cheat code: dates are worth {datePts:point}. {n:date} logged. Romance is cardio now."],
    ['dater', "{name} has {n:date} on the board. Real one-on-one, in person. Allegedly."],
    ['dater', "{name} leads the crew in dates with {n}. The rest of the fellas lead in excuses."],

    /* ---------- no dates all season */
    ['nodate', "Dates are worth {datePts:point} and {name} has logged zero. Leaving money on the table."],
    ['nodate', "{name} has 0 dates logged. The Lover Boy badge is starting to feel like a rumor."],
    ['nodate', "{name} hasn't logged a single date. {datePts:point} on the table every week, and he chooses violence."],
    ['nodate', "0 dates for {name} this season. He's treating the date category like a side quest."],

    /* ---------- most reading */
    ['reader', "{name} has logged reading {n:time}. Big Brain energy. Medium everything else."],
    ['reader', "{name} has read {n:time} this season. The only guy getting points for sitting still."],
    ['reader', "{name} has {n:reading session}. Building the one muscle the rest of you skip."],

    /* ---------- no reading all season */
    ['nobook', "{name} has zero reading logs. It's the easiest point in the app and he's dodging it."],
    ['nobook', "{name} hasn't read a page all season. The Big Brain badge filed a missing person report."],
    ['nobook', "Reading is {readPts:point} for sitting down. {name} still hasn't done it. Incredible commitment."],

    /* ---------- most gym sessions */
    ['gymrat', "{name} has {n:gym session} this season. The front desk knows his name and his playlist."],
    ['gymrat', "{name} has been to the gym {n:time}. That's not a membership, that's a lease."],
    ['gymrat', "{name} leads the crew with {n:gym session}. The squat rack has his initials carved in it."],

    /* ---------- no gym all season */
    ['nogym', "Gym is worth {gymPts:point} and {name} has logged zero. Allergic to a good deal."],
    ['nogym', "{name} has 0 gym sessions this season. His gym bag is legally a time capsule."],
    ['nogym', "{name} hasn't touched the gym all season. The dumbbells stopped asking about him."],
    ['nogym', "Gym sessions logged by {name}: 0. Gym sessions talked about: countless."],

    /* ---------- most runs */
    ['runner', "{name} has logged {n:run}. Not running for fitness, running from his responsibilities."],
    ['runner', "{name} has {n:run} this season. His shoes are trying to unionize."],

    /* ---------- no runs all season */
    ['norun', "{name} has 0 runs this season. Apparently 2 miles is unconstitutional."],
    ['norun', "{name} hasn't logged a single run. The only thing he runs is his mouth in the group chat."],
    ['norun', "Runs logged by {name}: 0. The treadmill thinks he's a myth."],

    /* ---------- most jickle, Volo and soccer */
    ['sports', "{name} has played {n} half-point games. Building a Winter Arc half a point at a time."],
    ['sports', "{name} has {n} games of jickle, Volo and soccer logged. Half-points add up. Slowly. Very slowly."],
    ['sports', "{name} is grinding the half-pointers: {n} games. Like paying rent in pennies."],

    /* ---------- every gym session 50 minutes or less */
    ['minGym', "{name}'s gym sessions never go past 50 minutes. Not one second of unpaid overtime."],
    ['minGym', "{name} does exactly as much gym as the rules require. Lawyer energy."],
    ['minGym', "{name} leaves the gym the second it counts. The Cinderella of the squat rack."],

    /* ---------- every run barely over 2 miles */
    ['minRun', "{name}'s runs stop right after 2 miles. Not a step further. A man who respects a minimum."],
    ['minRun', "{name} runs 2 miles and stops like the sidewalk ended. Every single time."],

    /* ---------- most caps on their posts */
    ['capped', "{name} has been capped {n:time} this season. The fellas don't trust him. Fair."],
    ['capped', "{name}'s posts have earned {n} \u{1F9E2}. The jury is out. The jury is laughing."],
    ['capped', "{name} has {n:cap} on his posts. Somewhere a lie detector just sighed."],
    ['capped', "{n} caps for {name} this season. His captions come with a disclaimer now."],

    /* ---------- had a post voided */
    ['voided', "{name} got a post voided. Commissioner justice is swift, cold and very funny."],
    ['voided', "{name} has {n:voided post}. The commissioner has seen enough, and so have we."],
    ['voided', "Fraud alert: {name} got voided this season. Allegedly. Definitely."],

    /* ---------- witnessed more than they've logged */
    ['witness', "{name} has witnessed {n:workout} for other people. Great at watching. Less great at doing."],
    ['witness', "{name} has been tagged as a witness {n:time}. Professional spectator. Amateur athlete."],

    /* ---------- most posts without a photo */
    ['noPhoto', "{name} has {n:post} with no photo. Witnesses only. Very 'trust me bro' of him."],
    ['noPhoto', "{name} has posted {n:time} without a photo. Camera shy or evidence shy?"],

    /* ---------- hands out the most caps */
    ['capper', "{name} has thrown {n:cap} at the crew. Self-appointed fraud police. Badge not included."],
    ['capper', "{name} has handed out {n} \u{1F9E2} this season. Trust issues, but make it fitness."],

    /* ---------- logs after 10 PM */
    ['late', "{name} has logged {n:activity|activities} after 10 PM. Vampire arc."],
    ['late', "{name} has {n:late-night log}. The gym closes, but his Winter Arc never sleeps."],

    /* ---------- logs before 7 AM */
    ['early', "{name} has logged {n:activity|activities} before 7 AM. Who hurt him?"],
    ['early', "{name} is up before the sun logging points. The roosters filed a complaint."],

    /* ---------- before the season starts */
    ['pre', "The Winter Arc hasn't even started and {name} is already behind. Impressive, honestly."],
    ['pre', "{name} has been getting ready for the Winter Arc since summer. It shows. Nowhere."],
    ['pre', "Preseason power rankings: {name} at the bottom, out of respect for tradition."],
    ['pre', "{name} is stretching for the Winter Arc. He'll finish stretching in March."],

    /* ---------- season over */
    ['champ', "{name} survived the Winter Arc. Zeus is clearing a spot on Mount Olympus."],
    ['champ', "{name} is a Winter Arc champion. The rest of you can start your Spring Arc now."],
    ['overLast', "{name} finished the Winter Arc with {total:point}. There's always the Summer Arc."],
    ['overLast', "Final standings, last place: {name}. A legend, in the opposite direction."],
  ];

  /* When each situation is true. Everything except pre/champ/overLast needs a live season. */
  const WHEN = {
    zero: 'someone has 0 points this week (Wednesday to Saturday)',
    last: 'someone is last this week (from Tuesday)',
    behind: 'someone is still short of the weekly minimum on Friday or Saturday',
    sunday: 'someone is still short of the weekly minimum on Sunday',
    close: 'someone is one gym trip or run away from safe',
    safe: 'someone is already safe this week',
    leader: 'someone leads the week on their own',
    double: 'someone has double the weekly minimum',
    seasonLeader: 'someone leads the season on their own (from week 2)',
    seasonLast: 'someone is last in season points (from week 2)',
    strike: 'someone is one strike from elimination and not safe yet this week',
    out: 'someone is eliminated',
    streak: 'someone has the longest current streak (3+ days)',
    idle: 'someone has gone the longest without logging (3+ days)',
    ghost: 'someone hasn\u2019t logged anything all season (after 4 days)',
    lastWeekLow: 'someone had the lowest score last week, under the minimum',
    beers: 'someone has the most beers with the fellas (2+)',
    beerWeek: 'someone got at least half of this week\u2019s points from beers',
    dater: 'someone has the most dates (1+)',
    nodate: 'someone has no dates all season (from week 2)',
    reader: 'someone has the most reading (2+)',
    nobook: 'someone has no reading all season (from week 2)',
    gymrat: 'someone has the most gym sessions (3+)',
    nogym: 'someone has no gym all season (from week 2)',
    runner: 'someone has the most runs (2+)',
    norun: 'someone has no runs all season (from week 2)',
    sports: 'someone has the most jickle, Volo and soccer games (3+)',
    minGym: 'someone never goes past 50 minutes at the gym (2+ sessions)',
    minRun: 'someone never runs past 2.3 miles (2+ runs)',
    capped: 'someone has the most \u{1F9E2} on their posts (2+)',
    voided: 'someone had a post voided',
    witness: 'someone has witnessed more workouts than they\u2019ve logged (3+)',
    noPhoto: 'someone has the most posts without a photo (2+)',
    hype: 'someone hands out the most reactions (5+) and isn\u2019t safe this week',
    capper: 'someone hands out the most \u{1F9E2} (2+)',
    late: 'someone has the most logs after 10 PM (2+)',
    early: 'someone has the most logs before 7 AM (2+)',
    commish: 'it\u2019s about the commissioner',
    bottomHalf: 'someone is in the bottom half this week (from Tuesday)',
    badgeless: 'someone has one badge or fewer (from week 2)',
    pre: 'the season hasn\u2019t started yet (anyone)',
    champ: 'the season is over (the winners)',
    overLast: 'the season is over (last place)',
  };


  /* ------------------------------------------------------------ helpers */
  const DAY = 864e5;
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const HYPE = ['\u{1F525}', '\u{1F4AA}', '\u{1F44F}'];          // fire, flex, clap
  const CLOSE = Math.max(CATS.gym.pts, CATS.run.pts);           // "one gym trip or one run away"
  const NAMES = new Set(['name', 'name2', 'last']);
  const POINTS = new Set(['pts', 'left', 'total', 'min', 'lastwk', 'pts2', 'gap', 'datePts', 'gymPts', 'readPts']);
  const mod = (a, n) => ((a % n) + n) % n;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const curly = s => s.replace(/(^|[\s(])'/g, '$1‘').replace(/'/g, '’');
  const midnight = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY);
  const byName = (a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const rx = (p, e) => ((p.reactions || {})[e] || []).length;
  const cat = (o, k) => o.cat[k] || 0;
  const every = list => list.map(o => ({ o, s: 0 }));                 // all equally fit: rotate
  const most = (list, f, atLeast) => list.filter(o => f(o) >= atLeast).map(o => ({ o, s: f(o) }));
  const lows = (list, f) => {                                          // lowest value, only if someone is higher
    if (list.length < 2) return [];
    const v = list.map(f), lo = Math.min(...v), hi = Math.max(...v);
    return lo < hi ? list.filter(o => f(o) === lo) : [];
  };
  const rotate = (list, k) => { const s = [...list].sort(byName); return s.length ? s[mod(k, s.length)] : null; };

  /* Fixed order with the situations spread out, so neighbouring days differ. */
  const ORDER = (() => {
    let seed = 183;
    const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const pool = LIST.map((_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const out = [];
    while (pool.length) {
      const recent = out.slice(-4).map(i => LIST[i][0]);
      const k = Math.max(0, pool.findIndex(i => !recent.includes(LIST[i][0])));
      out.push(pool.splice(k, 1)[0]);
    }
    return out;
  })();

  /* ------------------------------------------------------------ the crew, right now */
  function build(members, posts, cfg, now) {
    if (!members || !members.length) return null;
    const calc = Logic.compute(members, posts, cfg, now), se = calc.season;
    const P = members.map(m => {
      const R = calc.by[m.id], wk = {}, joinedWeek = Math.max(0, m.joinedWeek || 0);
      const o = {
        id: m.id, name: m.name, role: m.role, pts: R.thisWeek, total: R.total, strikes: R.strikes, out: R.eliminated,
        elim: R.elimWeek != null ? R.elimWeek + 1 : null, streak: R.streak, cat: R.cat, wk, badges: R.badges.length,
        witnessed: R.witnessed, logs: R.counted.length, caps: 0, voided: 0, noPhoto: 0, late: 0, early: 0, given: 0, capsGiven: 0,
        gymMins: [], runMiles: [], lastAt: null,
        lastwk: se.lastComplete >= joinedWeek ? R.weekPts[se.lastComplete] : null,
        inFor: daysBetween(Logic.addDays(se.start, 7 * joinedWeek), now),
      };
      for (const p of R.posts) { o.caps += rx(p, CAP); if (p.voided) o.voided++; }
      for (const p of R.counted) {
        const at = new Date(p.at), h = at.getHours();
        if (Logic.weekIdx(at, se.start) === se.idx) wk[p.cat] = (wk[p.cat] || 0) + 1;
        if (!o.lastAt || at > o.lastAt) o.lastAt = at;
        if (!p.photo) o.noPhoto++;
        if (h >= 22 || h < 4) o.late++; else if (h < 7) o.early++;
        if (p.cat === 'gym' && p.minutes) o.gymMins.push(p.minutes);
        if (p.cat === 'run' && p.miles) o.runMiles.push(p.miles);
      }
      o.days = o.lastAt ? daysBetween(o.lastAt, now) : null;
      o.sports = cat(o, 'jickle') + cat(o, 'volo') + cat(o, 'soccer');
      return o;
    });
    const byId = {}; P.forEach(o => { byId[o.id] = o; });
    for (const m of members) {
      for (const p of calc.by[m.id].posts) {
        for (const [e, who] of Object.entries(p.reactions || {})) {
          for (const id of who) {
            const o = byId[id]; if (!o || id === p.memberId) continue;
            if (e === CAP) o.capsGiven++; else if (HYPE.includes(e)) o.given++;
          }
        }
      }
    }
    const dow = (now.getDay() + 6) % 7;
    return {
      se, P, byId, alive: P.filter(o => !o.out), winners: calc.winners.map(id => byId[id]).filter(Boolean),
      live: se.status === 'live', min: cfg.weeklyMin, outN: cfg.strikesOut,
      dow, dayName: WEEKDAYS[dow], day: daysBetween(se.start, now), week: se.idx + 1, weeks: se.weeks,
    };
  }

  const weekTop = c => [...c.alive].sort((a, b) => b.pts - a.pts || b.total - a.total || byName(a, b));
  const lowestOther = (c, o) => { const rest = c.alive.filter(x => x.id !== o.id); if (!rest.length) return null; const lo = Math.min(...rest.map(x => x.pts)); return rotate(rest.filter(x => x.pts === lo), c.day); };
  const short = c => { const s = c.alive.filter(o => o.pts < c.min), far = s.filter(o => c.min - o.pts >= 2); return every(far.length ? far : s); };
  const fromWeek2 = c => c.live && c.se.idx >= 1;

  /* ------------------------------------------------------------ situations */
  const C = {
    zero: { when: c => c.live && c.dow >= 2 && c.dow <= 5, pick: c => every(c.alive.filter(o => o.pts === 0)) },
    last: {
      when: c => c.live && c.dow >= 1,
      pick: c => every(lows(c.alive, o => o.pts).filter(o => o.pts < c.min)),
      vars: (c, o) => { const t = weekTop(c)[0]; return { name2: t.name, pts2: t.pts, gap: t.pts - o.pts }; },
    },
    behind: { when: c => c.live && (c.dow === 4 || c.dow === 5), pick: short },
    sunday: { when: c => c.live && c.dow === 6, pick: short },
    close: { pick: c => every(c.alive.filter(o => o.pts < c.min && c.min - o.pts <= CLOSE)) },
    safe: { pick: c => every(c.alive.filter(o => o.pts >= c.min)) },
    leader: {
      pick: c => { const t = weekTop(c); return t.length >= 2 && t[0].pts > 0 && t[0].pts > t[1].pts ? [{ o: t[0], s: 0 }] : []; },
      vars: (c, o) => { const t = weekTop(c), lo = lowestOther(c, o); return { gap: o.pts - t[1].pts, last: lo && lo.pts < o.pts ? lo.name : null }; },
    },
    double: { pick: c => most(c.alive, o => o.pts, c.min * 2) },
    seasonLeader: {
      when: fromWeek2,
      pick: c => { const t = [...c.P].sort((a, b) => b.total - a.total); return t.length >= 2 && t[0].total > 0 && t[0].total > t[1].total ? [{ o: t[0], s: 0 }] : []; },
      vars: (c, o) => ({ gap: o.total - Math.max(...c.P.filter(x => x.id !== o.id).map(x => x.total)) }),
    },
    seasonLast: { when: fromWeek2, pick: c => every(lows(c.alive, o => o.total)) },
    strike: { pick: c => every(c.alive.filter(o => o.strikes >= 1 && o.strikes === c.outN - 1 && o.pts < c.min)) },
    out: { pick: c => every(c.P.filter(o => o.out)) },
    streak: { pick: c => most(c.alive, o => o.streak, 3) },
    idle: { pick: c => most(c.alive.filter(o => o.days != null), o => o.days, 3) },
    ghost: { pick: c => every(c.alive.filter(o => o.logs === 0 && o.inFor >= 4)) },
    lastWeekLow: {
      when: c => c.live && c.se.lastComplete >= 0,
      pick: c => every(lows(c.alive.filter(o => o.lastwk != null), o => o.lastwk).filter(o => o.lastwk < c.min)),
    },
    beers: { pick: c => most(c.P, o => cat(o, 'beers'), 2), n: o => cat(o, 'beers') },
    beerWeek: {
      pick: c => c.alive.filter(o => (o.wk.beers || 0) >= 2 && o.wk.beers * CATS.beers.pts >= o.pts / 2).map(o => ({ o, s: o.wk.beers })),
      n: o => o.wk.beers,
    },
    dater: { pick: c => most(c.P, o => cat(o, 'date'), 1), n: o => cat(o, 'date') },
    nodate: { when: fromWeek2, pick: c => every(c.alive.filter(o => !cat(o, 'date'))) },
    reader: { pick: c => most(c.P, o => cat(o, 'reading'), 2), n: o => cat(o, 'reading') },
    nobook: { when: fromWeek2, pick: c => every(c.alive.filter(o => !cat(o, 'reading'))) },
    gymrat: { pick: c => most(c.P, o => cat(o, 'gym'), 3), n: o => cat(o, 'gym') },
    nogym: { when: fromWeek2, pick: c => every(c.alive.filter(o => !cat(o, 'gym'))) },
    runner: { pick: c => most(c.P, o => cat(o, 'run'), 2), n: o => cat(o, 'run') },
    norun: { when: fromWeek2, pick: c => every(c.alive.filter(o => !cat(o, 'run'))) },
    sports: { pick: c => most(c.P, o => o.sports, 3), n: o => o.sports },
    minGym: { pick: c => most(c.P.filter(o => o.gymMins.length && Math.max(...o.gymMins) <= 50), o => o.gymMins.length, 2) },
    minRun: { pick: c => most(c.P.filter(o => o.runMiles.length && Math.max(...o.runMiles) < 2.3), o => o.runMiles.length, 2) },
    capped: { pick: c => most(c.P, o => o.caps, 2), n: o => o.caps },
    voided: { pick: c => most(c.P, o => o.voided, 1), n: o => o.voided },
    witness: { pick: c => most(c.P.filter(o => o.witnessed > o.logs), o => o.witnessed, 3), n: o => o.witnessed },
    noPhoto: { pick: c => most(c.P, o => o.noPhoto, 2), n: o => o.noPhoto },
    hype: { pick: c => most(c.alive.filter(o => o.pts < c.min), o => o.given, 5), n: o => o.given },
    capper: { pick: c => most(c.P, o => o.capsGiven, 2), n: o => o.capsGiven },
    late: { pick: c => most(c.P, o => o.late, 2), n: o => o.late },
    early: { pick: c => most(c.P, o => o.early, 2), n: o => o.early },
    commish: { pick: c => every(c.P.filter(o => o.role === 'commissioner')) },
    bottomHalf: {
      when: c => c.live && c.dow >= 1,
      pick: c => {
        const s = [...c.alive].sort((a, b) => a.pts - b.pts || byName(a, b)), hi = s.length ? s[s.length - 1].pts : 0;
        return every(s.slice(0, Math.floor(s.length / 2)).filter(o => o.pts < c.min && o.pts < hi));
      },
    },
    badgeless: { when: fromWeek2, pick: c => c.alive.filter(o => o.badges <= 1).map(o => ({ o, s: -o.badges })), n: o => o.badges },
    pre: { when: c => c.se.status === 'pre', pick: c => every(c.P) },
    champ: { when: c => c.se.status === 'over', pick: c => every(c.winners) },
    overLast: { when: c => c.se.status === 'over', pick: c => every(lows(c.P, o => o.total)) },
  };

  /* ------------------------------------------------------------ filling in the blanks */
  function fill(tpl, v) {
    let ok = true, text = '', html = '', at = 0;
    const lit = s => { text += s; html += esc(s); };
    tpl = curly(tpl);
    tpl.replace(/\{(\w+)(?::([^}|]+)(?:\|([^}]+))?)?\}/g, (m, k, one, many, i) => {
      lit(tpl.slice(at, i)); at = i + m.length;
      const val = v[k];
      if (val == null || (typeof val === 'number' && !Number.isFinite(val))) { ok = false; return m; }
      let s = typeof val === 'number' ? (POINTS.has(k) ? fmtPts(val) : String(val)) : String(val);
      if (one) s += ' ' + (val === 1 ? one : many || one + 's');
      text += s; html += NAMES.has(k) ? `<b${k === 'name' ? ' class="t"' : ''}>${esc(s)}</b>` : esc(s);
      return m;
    });
    lit(tpl.slice(at));
    return ok ? { text, html } : null;
  }

  function resolve(c, i) {
    const [key, tpl] = LIST[i], W = C[key];
    if (!W || !(W.when ? W.when(c) : c.live)) return null;
    const cands = W.pick(c);
    if (!cands || !cands.length) return null;
    const best = Math.max(...cands.map(x => x.s));
    const o = rotate(cands.filter(x => x.s === best).map(x => x.o), c.day * 7 + i);
    const v = {
      name: o.name, pts: o.pts, left: Math.max(0, c.min - o.pts), total: o.total, min: c.min, strikes: o.strikes,
      streak: o.streak, days: o.days, lastwk: o.lastwk, elim: o.elim, day: c.dayName, week: c.week, weeks: c.weeks,
      crew: c.alive.length, datePts: CATS.date.pts, gymPts: CATS.gym.pts, readPts: CATS.reading.pts,
    };
    if (W.n) v.n = W.n(o, c);
    if (W.vars) Object.assign(v, W.vars(c, o));
    const out = fill(tpl, v);
    return out ? { i, key, target: o.id, text: out.text, html: out.html } : null;
  }

  /* ------------------------------------------------------------ choosing */
  /* Each day first picks a kind of roast, then a situation within it.
     'week' is this week's points, 'season' the standings, 'habit' how they log.
     The week gets more of the spotlight as Sunday gets closer. */
  const SEASON = ['seasonLeader', 'seasonLast', 'out', 'commish', 'badgeless'];
  const HABIT = ['beers', 'dater', 'nodate', 'reader', 'nobook', 'gymrat', 'nogym', 'runner', 'norun', 'sports', 'minGym', 'minRun', 'capped', 'voided', 'witness', 'noPhoto', 'capper', 'late', 'early'];
  const kindOf = k => (SEASON.includes(k) ? 'season' : HABIT.includes(k) ? 'habit' : 'week');
  const WEEK_SHARE = [0.45, 0.5, 0.55, 0.55, 0.65, 0.7, 0.8];   // Monday ... Sunday
  /* Within a kind, how likely each situation is when it's true (default 1). */
  const WEIGHT = {
    sunday: 6, behind: 4, zero: 5, strike: 4, last: 4, close: 2, leader: 2, double: 2, idle: 2, ghost: 2, bottomHalf: 2,
    lastWeekLow: 2, seasonLast: 2, seasonLeader: 2, out: 2,
  };
  /* Weekend headline: whoever's still short gets roasted most Fridays to Sundays. */
  const HEADLINE = { 4: ['behind', 0.35], 5: ['behind', 0.5], 6: ['sunday', 0.75] };
  const KEYS = [...new Set(LIST.map(x => x[0]))];
  const GROUP = {}; LIST.forEach(([k], i) => { (GROUP[k] = GROUP[k] || []).push(i); });
  const random = seed => {                                   // mulberry32: same day, same numbers, every phone
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  const withPos = r => r && Object.assign(r, { pos: ORDER.indexOf(r.i) });
  /* Tiers: different joke, person and situation from `prev`, then relax in that order. */
  const tiers = prev => (prev ? [r => r.key !== prev.key && r.target !== prev.target, r => r.target !== prev.target && r.i !== prev.i, r => r.i !== prev.i, () => true] : [() => true]);

  /* One day's pick: each true situation offers its joke of the day, then a weighted draw. */
  function choose(c, prev) {
    const offers = [];
    for (const k of KEYS) {
      const ids = GROUP[k];
      for (let t = 0; t < ids.length; t++) { const r = resolve(c, ids[mod(c.day + t, ids.length)]); if (r) { offers.push(r); break; } }
    }
    const [hk, odds] = HEADLINE[c.dow] || [];
    const h = hk && offers.find(r => r.key === hk && (!prev || r.i !== prev.i));
    if (h && random(c.day * 104729 + 7)() < odds) return withPos(h);
    for (const ok of tiers(prev)) {
      const pool = offers.filter(ok); if (pool.length) return withPos(draw(pool, c));
    }
    return null;
  }
  function draw(pool, c) {
    const R = random(c.day * 7919 + 2026), wk = WEEK_SHARE[c.dow];
    const share = { week: wk, season: (1 - wk) * 0.3, habit: (1 - wk) * 0.7 };
    const kinds = Object.keys(share).filter(k => pool.some(r => kindOf(r.key) === k));
    let x = R() * kinds.reduce((a, k) => a + share[k], 0), kind = kinds[kinds.length - 1];
    for (const k of kinds) if ((x -= share[k]) < 0) { kind = k; break; }
    const items = pool.filter(r => kindOf(r.key) === kind);
    const w = items.map(r => (WEIGHT[r.key] || 1) * (r.key === 'lastWeekLow' && c.dow <= 1 ? 2 : 1));
    let y = R() * w.reduce((a, b) => a + b, 0);
    for (let j = 0; j < items.length; j++) if ((y -= w[j]) < 0) return items[j];
    return items[items.length - 1];
  }

  /** Today's roast: the same for the whole crew. Replays the last few days so it
      doesn't repeat yesterday's joke, person or situation. */
  function daily(members, posts, cfg, now = new Date()) {
    let prev = null;
    for (let back = 4; back >= 1; back--) {
      const end = new Date(Logic.addDays(midnight(now), 1 - back).getTime() - 1);
      const c = build(members, posts.filter(p => new Date(p.at) <= end), cfg, end);
      if (c) prev = choose(c, prev) || prev;
    }
    const c = build(members, posts, cfg, now);
    return c ? choose(c, prev) : null;
  }
  /** The same joke again with fresh numbers (after a new post), or null if it no longer fits. */
  function again(members, posts, cfg, now, i) { const c = build(members, posts, cfg, now || new Date()); return c && LIST[i] ? withPos(resolve(c, i)) : null; }
  /** The next joke after `cur` (tapping the banner): walks the shuffled order, preferring someone else. */
  function next(members, posts, cfg, now, cur) {
    const c = build(members, posts, cfg, now || new Date()); if (!c || !cur) return null;
    const start = ORDER.indexOf(cur.i) + 1;
    for (const ok of tiers(cur)) {
      for (let k = 0; k < ORDER.length; k++) {
        const pos = mod(start + k, ORDER.length), r = resolve(c, ORDER[pos]);
        if (r && r.i !== cur.i && ok(r)) return Object.assign(r, { pos });
      }
    }
    return null;
  }
  /** Every joke that fits right now, with its target (for testing). */
  function all(members, posts, cfg, now) { const c = build(members, posts, cfg, now || new Date()); return c ? LIST.map((_, i) => resolve(c, i)) : []; }

  return { LIST, WHEN, ORDER, daily, again, next, all };
})();
