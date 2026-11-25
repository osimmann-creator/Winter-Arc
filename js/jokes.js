'use strict';
/* =====================================================================
   WINTER ARC · Roast of the Day (the banner at the top of Home)

   100 roasts. One a day, the same one for everyone. Each airs once
   until nothing unused fits (see reruns below).

   HOW IT PICKS
   - Every roast fits a situation ("someone has 0 points on a Thursday").
     It only shows on a day that situation is true, using the points as
     they stood at midnight, and it names whoever it fits.
   - Some roasts are written for one person (the third item, e.g. 'jake').
     When theirs fits, they get it first. They're the funniest ones.
   - Special days win their day: the first roast, Thanksgiving, Black Friday,
     Christmas, New Year's Eve and Day, Groundhog Day, Valentine's Day and
     the last day of the season.
   - The server picks the day's roast the first time anyone opens the app
     that day (or on its scheduled run) and saves it (the roasts table; the
     app sees it as an event: type 'roast', key 'roast:YYYY-MM-DD' in the
     group's time zone). Everyone gets that saved one, so the whole crew sees
     the same roast all day. The saved roasts are also how it knows which
     ones are used up.
   - Nobody on the injury report gets roasted until he's marked recovered.
   - Goals are per person: Jake's 8-point weeks count as 8.
   - Each roast gets a number (#1-#100) the day it first airs. A 17-week
     season has 119 days, so once nothing unused fits, the one that aired
     longest ago comes back (about someone new if possible) as a rerun.

   EDITING
   - Each line is [situation, roast] or [situation, roast, username].
     WHEN below says when each situation is true.
   - Changing a roast's words makes it a new roast (it can show again).
   - Blanks you can use:
       {name}    who's being roasted        {pts}     their points this week
       {left}    points they still need     {total}   their season points
       {lastwk}  their points last week     {strikes} their strikes
       {streak}  days in a row              {days}    days since they last logged
       {elim}    week they were eliminated  {n}       the count the situation is about
       {name2} {pts2}  the week's leader (last place) or the other guy (coin flip)
       {last}    this week's lowest scorer  {gap}     the lead
       {act} {time}  what they logged late on Sunday night, and when
       {min} their weekly goal · {day} today's weekday · {week} week number · {year}
       {datePts} {gymPts}  what a date and a gym session are worth
   - A word after a colon gives "1 point" / "3 points": {pts:point}, {n:date}.
     Irregular plurals use a bar: {n:activity|activities}.
   ===================================================================== */
const Jokes = (() => {
  const LIST = [
    /* ---------- special days (each wins its day) */
    ['first', "Welcome to Roast of the Day. One roast a day till the Winter Arc ends. {name} volunteered to go first by doing the least."],
    ['thanksgiving', "Happy Thanksgiving. {name} has {pts:point} this week, so the heaviest thing he'll lift today is a fork."],
    ['blackFriday', "Black Friday deal: gym sessions are still {gymPts:point} each. {name} still isn't buying."],
    ['holiday', "Happy holidays. Most gyms are closed today, so {name}'s excuse is finally legit."],
    ['nye', "Last day of {year}. {name} is leaving all his workouts in it."],
    ['newYear', "New year, new {name}? Sources say same guy, different calendar."],
    ['groundhog', "It's Groundhog Day, a national holiday for {name}. He came out, saw the leaderboard and went right back in.", 'phil'],
    ['valentine', "Happy Valentine's Day. Dates are worth {datePts:point} and {name} has {n:date} all season. Tonight's the night, champ."],
    ['finale', "Last day of the Winter Arc. {name}, this is your final chance to do literally anything."],

    /* ---------- 0 points, Wednesday to Saturday */
    ['zero', "It's {day} and {name} has 0 points. That's not a slow start, that's a parked car."],
    ['zero', "{name} has 0 points this week. If he moved any less, he'd legally be furniture."],
    ['zero', "{name} has 0 points this week. Even his Apple Watch stopped telling him to stand up."],
    ['zero', "{name} has 0 points this week but still found time to mention he does MMA.", 'amaan'],
    ['zero', "{name} has 0 points this week. The fellas have been honking outside since Monday.", 'ayaad'],

    /* ---------- last place this week */
    ['last', "{name} is in last with {pts:point}. {name2} has {pts2}. Same app, same week, different species."],
    ['last', "{name} isn't in last place. Last place is in {name}."],
    ['last', "{name}'s position on the leaderboard: last. His position in real life: horizontal."],
    ['last', "If this week were a group project, {name} made the title slide. Last place, {pts:point}."],
    ['last', "{name} is in last with {pts:point}, which is wild for a guy who does MMA. He'll tell you.", 'amaan'],
    ['last', "{name} is in last with {pts:point}. In his defense, the shirt wasn't going to iron itself.", 'ayaad'],
    ['last', "{name} is in last place. Hard to make it to the gym when you live in orbit.", 'connor'],
    ['last', "{name} is in last place. Nobody tell him. He'll try to start a fight with the leaderboard.", 'dylan'],
    ['last', "The commissioner is in last place. {name} will be investigating himself and expects to find no wrongdoing.", 'osim'],

    /* ---------- still short on Friday or Saturday */
    ['behind', "Weekend forecast for {name}: {left:point} needed, 100% chance of excuses, heavy panic Sunday night."],
    ['behind', "{name} is {left:point} short with the weekend left. He's about to discover the date category real quick."],
    ['behind', "It's {day} and {name} still needs {left:point}. Thoughts and prayers to the treadmill."],
    ['behind', "{name} needs {left:point} by Sunday. The Hoat Guarantee is starting to look like a Hoat Suggestion.", 'osim'],
    ['behind', "{name} needs {left:point} by Sunday. It's a time crunch, {name}. You know what that means: no liquor runs.", 'gaurav'],
    ['behind', "{name} needs {left:point} by Sunday. The car's running. Everyone's outside. He's ironing.", 'ayaad'],
    ['behind', "{name} needs {left:point} by Sunday. Time to put that MMA training to use and fight for his life.", 'amaan'],

    /* ---------- still short on Sunday */
    ['sunday', "It's Sunday and {name} needs {left:point}. Not saying he's cooked, but the oven timer just went off."],
    ['sunday', "Tonight's main event: {name} vs. the clock. He needs {left:point}. Vegas has the clock at -400."],
    ['sunday', "If you see {name} sprinting down the street tonight, don't worry. Nobody's chasing him. He needs {left:point}."],
    ['sunday', "{name} needs {left:point} today. Expect a 2-mile run at 11:41 PM and a very blurry photo."],
    ['sunday', "{name} needs {left:point} today. Fix it before 6 PM or his mom finds out.", 'jake'],
    ['sunday', "{name} has until midnight to find {left:point}. Plenty of time. He's done a whole liquor run in an hour.", 'gaurav'],
    ['sunday', "{name} needs {left:point} today. If he misses, the Hoat Guarantee owes everyone a refund.", 'osim'],

    /* ---------- one gym trip from safe */
    ['close', "{name} needs {left:point}. One gym trip. He's treating it like Everest."],
    ['close', "{pts} out of {min} for {name}. Close only counts in horseshoes, and horseshoes isn't a category."],

    /* ---------- already safe, Tuesday to Friday */
    ['safe', "{name} is already safe and it's only {day}. Is that dedication or does he just not have a job?"],
    ['safe', "{name} hit {pts:point} by {day} and is walking around like he invented cardio."],
    ['safe', "{name} is safe with {pts:point}. Suspicious. Commissioner, check the photos."],
    ['safe', "{name} is safe and it's only {day}. Hoat Guarantee delivered, as promised. Insufferable, as expected.", 'osim'],

    /* ---------- leading the week */
    ['leader', "{name} leads the week with {pts:point}. The rest of you should be embarrassed. Mostly you, {last}."],
    ['leader', "{name} leads with {pts:point}. That's not a Winter Arc, that's a Winter Montage."],
    ['leader', "{name} is #1 this week. Either he's locked in or he found a cheat code. Investigating."],
    ['leader', "{name} leads the week with {pts:point}. Turns out blue hair is a performance enhancer.", 'connor'],
    ['double', "{name} is at {pts:point} this week. Hercules called. He wants his whole deal back."],

    /* ---------- one strike from elimination, not safe yet */
    ['strike', "One more strike and {name} becomes a ghost story the fellas tell over beers. {left:point} to go."],
    ['strike', "{name} is one strike from elimination. The commissioner has started drafting the eulogy."],
    ['streak', "{name} is on a {streak}-day streak. Somebody check on him. Blink twice if you need help."],

    /* ---------- gone quiet, 4+ days */
    ['idle', "MISSING: {name}. Last logged {days:day} ago. Answers to 'bro.' If found, do not feed."],
    ['idle', "It's been {days:day} since {name} logged anything. Milk lasts longer than his motivation."],
    ['idle', "{name} hasn't logged in {days:day}. His sneakers have started a support group."],
    ['idle', "{name} hasn't logged in {days:day}. Nobody's saying he's chained to the radiator again. Nobody's ruling it out.", 'jake'],
    ['idle', "{name} hasn't logged in {days:day}. Punxsutawney Phil is back in his hole. Six more weeks of nothing.", 'phil'],
    ['idle', "{name} hasn't logged in {days:day}. We're outside, {name}. We've been outside for {days:day}.", 'ayaad'],

    /* ---------- bottom half of the week */
    ['bottom', "{name}'s workout plan: open the app, stare at the ring, close the app."],
    ['bottom', "{name}'s rest days have rest days."],
    ['bottom', "{name} has the energy of a phone at 2%. {pts:point} this week."],
    ['bottom', "{name} is one good week away from being a threat. He's been one good week away since week 1."],

    /* ---------- the crew's own bits */
    ['coinTie', "{name} and {name2} are tied at {pts:point}. Flip a coin to see who's worse. It'll land on its edge."],
    ['la4', "{name} is on exactly {pts:point} again. At this point it's not a score, it's a brand."],

    /* ---------- Monday: how last week went */
    ['struck', "{name} got a strike last week. In bowling that's a good thing. This is not bowling."],
    ['struck', "{name} finished last week with {lastwk:point} and a brand-new strike. Disappointed, not surprised."],
    ['struck', "{name} got a strike last week. Missed {min} points like he missed the train to the Nets game.", 'jake'],
    ['struck', "{name} got a strike last week. That's what happens when you spend an hour on a liquor run.", 'gaurav'],
    ['elimLW', "RIP {name}'s Winter Arc. Cause of death: {strikes:strike}. He is survived by his couch."],
    ['elimLW', "{name} has been eliminated. His couch released a statement: 'We're thrilled to have him back full time.'"],
    ['lwLow', "Last week {name} put up {lastwk:point}. The bar was on the floor and he still tripped over it."],
    ['lwHigh', "{name} put up {lastwk:point} last week. Somebody drug test this man."],
    ['allSafe', "Everyone survived last week. {name} made it with {lastwk:point}, the fitness version of submitting at 11:59."],
    ['buzzer', "Buzzer beater: {name} logged {act} at {time} on Sunday night. Clutch or cap? \u{1F9E2}"],

    /* ---------- the season */
    ['seasonLeader', "{name} leads the season with {total:point}. The rest of the crew is basically his warm-up."],
    ['seasonLeader', "{name} leads the season by {gap:point}. Everyone else is fighting for second, and losing."],
    ['seasonLast', "{name} is last in the season with {total:point}. Less Winter Arc, more Winter Nap."],
    ['seasonLast', "{name} has {total:point}, {week:week} in. That's not an arc, that's a flat line."],
    ['out', "{name} is out of the Winter Arc and fully into his Winter Couch era."],
    ['out', "{name} got eliminated in week {elim}. Gone, but not forgotten. Mostly gone."],
    ['commish', "Commissioner {name} can void anyone's post. Must be nice being above the law."],

    /* ---------- how they log */
    ['beers', "{name} has logged {n:beer night}. His most trained muscle is the elbow."],
    ['beers', "{name} has logged beers {n:time}. That's a lot of jetpack rides home to the satellite house.", 'connor'],
    ['beerRun', "{name} has had beers with the fellas {n:week} straight. That's not a Winter Arc, that's a pub crawl."],
    ['dater', "{name} has logged {n:date}. Lover Boy is farming the {datePts}-pointers like a side hustle."],
    ['nodate', "Dates are worth {datePts:point} and {name} still has zero. 'Scared of girls' is not a valid excuse."],
    ['nodate', "{name} has 0 dates logged. The Lover Boy badge is starting to feel like a rumor."],
    ['reader', "{name} has read {n:time} this season. The only guy getting points for sitting still."],
    ['gymrat', "{name} has been to the gym {n:time}. That's not a membership, that's a lease."],
    ['nogym', "{name} hasn't been to the gym in {gymDays:day}. His gym bag is legally a time capsule."],
    ['norun', "{name} hasn't logged a run in {runDays:day}. The only thing he runs is his mouth in the group chat."],
    ['sports', "{name} has {n} games of jickle, Volo and soccer. Half a point at a time, like paying rent in pennies."],
    ['minGym', "{name} leaves the gym the second it counts. The Cinderella of the squat rack."],
    ['minRun', "{name} runs 2 miles and stops like the sidewalk ended. Every. Single. Time."],
    ['capped', "{name}'s posts have collected {n} \u{1F9E2}. At this point he's a hat store."],
    ['voided', "{name} got a post voided. Commissioner justice is swift, cold and very funny."],
    ['noPhoto', "{name} has {n:post} with no photo. Very 'trust me bro' of him."],
    ['hype', "{name} has handed out {n} reactions and earned {pts:point} this week. All hype, no reps."],
    ['late', "{name} has logged {n:activity|activities} after 10 PM. Vampire arc."],
    ['mma', "{name} has logged MMA {n:time}. Nobody asked. He told us anyway.", 'amaan'],
    ['capper', "{name} has called cap on {n:post}. Crash Out KNR isn't a nickname, it's a job title.", 'connor'],
  ];

  /* When each situation is true (points as of midnight). */
  const WHEN = {
    first: 'it’s the very first roast (this week’s lowest scorer)',
    thanksgiving: 'it’s Thanksgiving (this week’s lowest scorer)',
    blackFriday: 'it’s Black Friday (fewest gym sessions)',
    holiday: 'it’s December 25 (longest gap since logging)',
    nye: 'it’s December 31 (lowest season points)',
    newYear: 'it’s January 1 (this week’s lowest scorer)',
    groundhog: 'it’s Groundhog Day, February 2',
    valentine: 'it’s Valentine’s Day (someone with no dates)',
    finale: 'it’s the last day of the season (lowest season points)',
    zero: 'someone has 0 points this week (Wednesday to Saturday)',
    last: 'someone is last this week (from Tuesday)',
    behind: 'someone is 2+ points short on Friday or Saturday',
    sunday: 'someone is 1.5+ points short on Sunday',
    close: 'someone is one gym trip from safe',
    safe: 'someone is already safe (Tuesday to Friday)',
    leader: 'someone leads the week on their own',
    double: 'someone has double the weekly minimum',
    strike: 'someone is one strike from elimination and not safe yet',
    streak: 'someone has logged 5+ days in a row (the longest streak)',
    idle: 'someone hasn’t logged anything in 4+ days',
    bottom: 'someone is in the bottom half this week',
    struck: 'it’s Monday and someone got a strike last week',
    elimLW: 'it’s Monday and someone got eliminated last week',
    lwLow: 'it’s Monday or Tuesday and someone had last week’s lowest score',
    lwHigh: 'it’s Monday and someone had last week’s top score, 1.5× the minimum or more',
    allSafe: 'it’s Monday, everyone survived last week and someone only just made it',
    buzzer: 'it’s Monday or Tuesday and someone logged after 10 PM last Sunday',
    coinTie: 'two people are tied below the minimum this week (Dean and Jake first)',
    la4: 'Dylan is on exactly 4 points (so he’s La4)',
    seasonLeader: 'someone leads the season on their own (from week 2)',
    seasonLast: 'someone has the fewest season points (from week 2)',
    out: 'someone is eliminated',
    commish: 'it’s about the commissioner (any day)',
    beers: 'someone has the most beers with the fellas (3+)',
    beerRun: 'someone has had beers with the fellas 3+ weeks in a row',
    dater: 'someone has the most dates (2+)',
    nodate: 'someone has no dates all season (from week 3)',
    reader: 'someone has the most reading (3+)',
    gymrat: 'someone has the most gym sessions (10+)',
    nogym: 'someone hasn’t been to the gym in 10+ days',
    norun: 'someone hasn’t logged a run in 14+ days',
    sports: 'someone has the most jickle, Volo and soccer games (4+)',
    minGym: 'someone’s usual gym session is 50 minutes or less (3+ sessions)',
    minRun: 'someone’s usual run is under 2.3 miles (2+ runs)',
    capped: 'someone has the most \u{1F9E2} on their posts (3+)',
    voided: 'someone had a post voided',
    noPhoto: 'someone has the most posts without a photo (3+)',
    hype: 'someone hands out the most reactions (8+) and isn’t safe',
    late: 'someone has the most logs after 10 PM (3+)',
    mma: 'Amaan has logged MMA 3+ times',
    capper: 'Connor has called cap 2+ times',
  };

  /* Special days win their day, in this order. */
  const SPECIAL = ['first', 'finale', 'thanksgiving', 'blackFriday', 'holiday', 'nye', 'newYear', 'groundhog', 'valentine'];
  /* How likely each situation is to get the day when it's true. Timely ones are
     high. The ones that stay true for weeks (habits, standings) are low, so
     they're saved for later in the season when fewer people are left.
     A roast written for one person counts 3 times as much. */
  const WEIGHT = {
    sunday: 10, behind: 6, zero: 5, last: 4, strike: 4, close: 3, safe: 3, leader: 3, double: 3, idle: 3, streak: 2, bottom: 1,
    struck: 8, elimLW: 12, lwLow: 3, lwHigh: 3, allSafe: 4, buzzer: 6, coinTie: 6, la4: 6, beerRun: 1.5, hype: 1.5,
    seasonLeader: 0.6, seasonLast: 0.6, out: 0.6, commish: 0.4,
  };
  const HABIT_WEIGHT = 0.7;
  const PERSONAL = 3;

  /* ------------------------------------------------------------ helpers */
  const DAY = 864e5;
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const HYPE = ['\u{1F525}', '\u{1F4AA}', '\u{1F44F}'];           // fire, flex, clap
  const CLOSE = Math.max(CATS.gym.pts, CATS.run.pts);            // "one gym trip away"
  const ACT = { gym: 'a gym session', run: 'a run', bike: 'a bike ride', mma: 'an MMA session', jickle: 'jickle', volo: 'Volo', soccer: 'soccer', date: 'a date', beers: 'beers with the fellas', reading: 'reading' };
  const NAMES = ['name', 'name2', 'last'];
  const POINTS = new Set(['pts', 'left', 'total', 'min', 'lastwk', 'pts2', 'gap', 'datePts', 'gymPts']);
  const mod = (a, n) => ((a % n) + n) % n;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const curly = s => s.replace(/(^|[\s(])'/g, '$1‘').replace(/'/g, '’');
  /* Days, weekdays and clock times are all in the group's time zone (cfg.timezone),
     so the server and every phone agree on when a day starts. */
  const startOf = (d, tz) => Logic.parseDay(Logic.dayKey(d, tz), tz);           // midnight that day
  const clocks = new Map(), seen = new Map();
  /* The clock on the wall in that time zone: { ord: day number (days since 1970-01-01), day: 0 = Sunday, hour, minute }.
     Remembered per instant, since the same posts come up every day. */
  function wall(d, tz) {
    const ms = +new Date(d), id = tz + '|' + ms;
    let w = seen.get(id);
    if (w) return w;
    if (!clocks.has(tz)) clocks.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }));
    const p = {};
    for (const x of clocks.get(tz).formatToParts(ms)) p[x.type] = x.value;
    const ord = Math.floor(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / DAY);
    w = { ord, day: mod(ord + 4, 7), hour: Number(p.hour) % 24, minute: Number(p.minute) };   // 1970-01-01 was a Thursday
    if (seen.size > 20000) seen.clear();
    seen.set(id, w);
    return w;
  }
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const ID = LIST.map(([k, t, who]) => `${k}.${hash((who || '') + '|' + t)}`);
  const byName = (a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const rx = (p, e) => ((p.reactions || {})[e] || []).length;
  const cat = (o, k) => o.cat[k] || 0;
  const every = list => list.map(o => ({ o, s: 0 }));                       // all equally fit: rotate
  const most = (list, f, atLeast) => list.filter(o => f(o) >= atLeast).map(o => ({ o, s: f(o) }));
  const lows = (list, f) => {                                                // the lowest, if someone is higher
    if (list.length < 2) return [];
    const v = list.map(f), lo = Math.min(...v), hi = Math.max(...v);
    return lo < hi ? list.filter(o => f(o) === lo) : [];
  };
  const rotate = (list, k) => { const s = [...list].sort(byName); return s.length ? s[mod(k, s.length)] : null; };
  const fmtTime = (d, tz) => { const { hour: h, minute } = wall(d, tz); return `${h % 12 || 12}:${String(minute).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  const random = seed => {                                                   // mulberry32: same day, same draw, on every phone
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  /* ------------------------------------------------------------ the crew as of midnight */
  /* Anyone in `excluded` (a Set of member ids: the injury report) is left out entirely. */
  function build(members, posts, cfg, now, excluded) {
    const tz = cfg.timezone || CONFIG.timezone;
    members = (members || []).filter(m => !(excluded && excluded.has(m.id)));
    if (!members.length) return null;
    const mid = startOf(now, tz), before = (posts || []).filter(p => new Date(p.at) < mid);
    const calc = Logic.compute(members, before, cfg, mid), se = calc.season;
    const startOrd = wall(se.start, tz).ord, midOrd = wall(mid, tz).ord, weekOf = at => Math.floor((wall(at, tz).ord - startOrd) / 7);
    const P = members.map(m => {
      const R = calc.by[m.id], wk = {}, joinedWeek = Math.max(0, m.joinedWeek || 0), shown = Logic.displayName(m, calc);
      const counts = se.lastComplete >= 0 && se.lastComplete >= joinedWeek;
      const o = {
        id: m.id, username: String(m.username || '').toLowerCase(), name: shown, aliased: shown !== m.name, role: m.role,
        pts: R.thisWeek, goal: R.goal, total: R.total, strikes: R.strikes, out: R.eliminated, elimIdx: R.elimWeek,
        elim: R.elimWeek != null ? R.elimWeek + 1 : null, streak: R.streak, cat: R.cat, wk, witnessed: R.witnessed,
        caps: 0, voided: 0, noPhoto: 0, late: 0, given: 0, capsGiven: 0, gymMins: [], runMiles: [], lastAt: null, sunLate: null,
        lastwk: counts ? R.weekPts[se.lastComplete] : null, lastGoal: counts ? R.weekGoals[se.lastComplete] : null,
      };
      for (const p of R.posts) { o.caps += rx(p, CAP); if (p.voided) o.voided++; }
      for (const p of R.counted) {
        const at = new Date(p.at), t = wall(at, tz), w = weekOf(at);
        if (w === se.idx) wk[p.cat] = (wk[p.cat] || 0) + 1;
        if (!o.lastAt || at > o.lastAt) o.lastAt = at;
        if (!p.photo) o.noPhoto++;
        if (t.hour >= 22 || t.hour < 4) o.late++;
        if (p.cat === 'gym' && p.minutes) o.gymMins.push(p.minutes);
        if (p.cat === 'run' && p.miles) o.runMiles.push(p.miles);
        if (w === se.lastComplete && t.day === 0 && t.hour >= 22 && (!o.sunLate || at > o.sunLate.at)) o.sunLate = { at, cat: p.cat };
      }
      o.days = o.lastAt ? midOrd - wall(o.lastAt, tz).ord : null;
      const since = k => { const l = R.counted.filter(p => p.cat === k).reduce((a, p) => Math.max(a, +new Date(p.at)), 0); return midOrd - (l ? wall(l, tz).ord : startOrd + 7 * joinedWeek); };
      o.gymDays = since('gym'); o.runDays = since('run');
      const beerWks = new Set(R.counted.filter(p => p.cat === 'beers').map(p => weekOf(p.at)));
      o.beerRun = 0; for (let w = beerWks.has(se.idx) ? se.idx : se.idx - 1; w >= 0 && beerWks.has(w); w--) o.beerRun++;
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
    const dow = (wall(mid, tz).day + 6) % 7, key = Logic.dayKey(mid, tz);
    return {
      se, P, byId, tz, alive: P.filter(o => !o.out), active: P.filter(o => !o.out || (o.days != null && o.days <= 14)), live: se.status === 'live', outN: cfg.strikesOut,
      dow, dayName: WEEKDAYS[dow], day: midOrd - startOrd, week: se.idx + 1, weeks: se.weeks,
      year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) - 1, dom: Number(key.slice(8, 10)), first: false,
    };
  }

  const byUser = (c, u) => c.P.find(o => o.username === u);
  const weekTop = c => [...c.active].sort((a, b) => b.pts - a.pts || b.total - a.total || byName(a, b));
  const weekLow = c => { const l = lows(c.active, o => o.pts); return every(l.length ? l : c.active); };
  const seasonLow = c => { const l = lows(c.P, o => o.total); return every(l.length ? l : c.P); };
  const short = c => every(c.alive.filter(o => o.goal - o.pts >= 2));
  const uniqueTop = (list, f) => { const t = [...list].sort((a, b) => f(b) - f(a)); return t.length >= 2 && f(t[0]) > 0 && f(t[0]) > f(t[1]) ? [{ o: t[0], s: 0 }] : []; };
  const live = c => c.live;
  const fromWeek = n => c => c.live && c.se.idx >= n - 1;
  const monday = c => c.live && c.dow === 0 && c.se.lastComplete >= 0;
  const coinPair = () => ((typeof INSIDE_JOKES !== 'undefined' && INSIDE_JOKES.coin && INSIDE_JOKES.coin.users) || ['dean', 'jake']);
  /* Two people tied below the minimum: The Coin pair (Dean and Jake) if they are, otherwise the lowest tie. */
  const tiedPair = c => {
    const [a, b] = coinPair().map(u => byUser(c, u)), ok = o => o && c.active.includes(o) && o.pts < o.goal;
    if (ok(a) && ok(b) && a.pts === b.pts) return [a, b];
    const by = {}; c.active.filter(ok).forEach(o => { (by[o.pts] = by[o.pts] || []).push(o); });
    const k = Object.keys(by).map(Number).filter(v => by[v].length === 2).sort((x, y) => x - y)[0];
    return k == null ? [] : by[k];
  };
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : Infinity; };

  /* ------------------------------------------------------------ situations */
  const C = {
    first: { when: c => c.first && c.live, pick: c => { const l = lows(c.active, o => o.pts); return l.length ? every(l) : seasonLow(c); } },
    thanksgiving: { when: c => c.live && c.month === 10 && c.dow === 3 && c.dom >= 22 && c.dom <= 28, pick: weekLow },
    blackFriday: { when: c => c.live && c.month === 10 && c.dow === 4 && c.dom >= 23 && c.dom <= 29, pick: c => { const l = lows(c.alive, o => cat(o, 'gym')); return every(l.length ? l : c.alive); } },
    holiday: { when: c => c.live && c.month === 11 && c.dom === 25, pick: c => { const q = most(c.alive.filter(o => o.days != null), o => o.days, 1); return q.length ? q : weekLow(c); } },
    nye: { when: c => c.live && c.month === 11 && c.dom === 31, pick: seasonLow },
    newYear: { when: c => c.live && c.month === 0 && c.dom === 1, pick: weekLow },
    groundhog: { when: c => c.live && c.month === 1 && c.dom === 2, pick: c => every(c.P) },
    valentine: {
      when: c => c.live && c.month === 1 && c.dom === 14,
      pick: c => { const lo = Math.min(...c.active.map(o => cat(o, 'date'))); return every(c.active.filter(o => cat(o, 'date') === lo)); },
      n: o => cat(o, 'date'),
    },
    finale: { when: c => c.live && c.se.idx === c.se.weeks - 1 && c.dow === 6, pick: seasonLow },

    zero: { when: c => c.live && c.dow >= 2 && c.dow <= 5, pick: c => every(c.active.filter(o => o.pts === 0)) },
    last: {
      when: c => c.live && c.dow >= 1,
      pick: c => every(lows(c.active, o => o.pts).filter(o => o.pts < o.goal)),
      vars: c => { const t = weekTop(c)[0]; return { name2: t.name, pts2: t.pts }; },
    },
    behind: { when: c => c.live && (c.dow === 4 || c.dow === 5), pick: short },
    sunday: { when: c => c.live && c.dow === 6, pick: c => every(c.alive.filter(o => o.goal - o.pts >= CLOSE)) },
    close: { when: c => c.live && c.dow >= 2, pick: c => every(c.alive.filter(o => o.pts < o.goal && o.goal - o.pts <= CLOSE)) },
    safe: { when: c => c.live && c.dow >= 1 && c.dow <= 4, pick: c => every(c.alive.filter(o => o.pts >= o.goal)) },
    leader: {
      when: c => c.live && c.dow >= 2,
      pick: c => uniqueTop(c.active, o => o.pts),
      vars: (c, o) => { const rest = c.active.filter(x => x.id !== o.id), lo = Math.min(...rest.map(x => x.pts)); return { last: rotate(rest.filter(x => x.pts === lo), c.day).name }; },
    },
    double: { when: c => c.live && c.dow >= 1, pick: c => c.active.filter(o => o.pts >= o.goal * 2).map(o => ({ o, s: o.pts })) },
    strike: { when: c => c.live && c.dow >= 1, pick: c => every(c.alive.filter(o => o.strikes >= 1 && o.strikes === c.outN - 1 && o.pts < o.goal)) },
    streak: { when: live, pick: c => most(c.active, o => o.streak, 5) },
    idle: { when: live, pick: c => most(c.active.filter(o => o.days != null), o => o.days, 4) },
    bottom: {
      when: c => c.live && c.dow >= 1,
      pick: c => {
        const s = [...c.active].sort((a, b) => a.pts - b.pts || byName(a, b)), hi = s.length ? s[s.length - 1].pts : 0;
        return every(s.slice(0, Math.floor(s.length / 2)).filter(o => o.pts < o.goal && o.pts < hi));
      },
    },

    struck: { when: monday, pick: c => every(c.alive.filter(o => o.lastwk != null && o.lastwk < o.lastGoal)), vars: (c, o) => ({ min: o.lastGoal }) },
    elimLW: { when: monday, pick: c => every(c.P.filter(o => o.out && o.elimIdx === c.se.lastComplete)) },
    lwLow: { when: c => c.live && c.dow <= 1 && c.se.lastComplete >= 0, pick: c => every(lows(c.alive.filter(o => o.lastwk != null), o => o.lastwk).filter(o => o.lastwk < o.lastGoal)) },
    lwHigh: { when: monday, pick: c => uniqueTop(c.P.filter(o => o.lastwk != null && o.lastwk >= o.lastGoal * 1.5), o => o.lastwk) },
    allSafe: {
      when: monday,
      pick: c => {
        const L = c.alive.filter(o => o.lastwk != null);
        if (L.length < 2 || L.some(o => o.lastwk < o.lastGoal) || c.P.some(o => o.out && o.elimIdx === c.se.lastComplete)) return [];
        const spare = o => o.lastwk - o.lastGoal, lo = Math.min(...L.map(spare));
        return lo <= 1 ? every(L.filter(o => spare(o) === lo)) : [];
      },
    },
    buzzer: {
      when: c => c.live && c.dow <= 1 && c.se.lastComplete >= 0,
      pick: c => { const t = c.P.filter(o => o.sunLate).sort((a, b) => b.sunLate.at - a.sunLate.at)[0]; return t ? [{ o: t, s: 0 }] : []; },
      vars: (c, o) => ({ act: ACT[o.sunLate.cat] || 'something', time: fmtTime(o.sunLate.at, c.tz) }),
    },

    coinTie: {
      when: c => c.live && c.dow >= 2,
      pick: c => every(tiedPair(c)),
      vars: (c, o) => ({ name2: tiedPair(c).find(x => x.id !== o.id).name }),
    },
    la4: { when: c => c.live && c.dow >= 1, pick: c => every(c.alive.filter(o => o.aliased)) },

    seasonLeader: {
      when: fromWeek(2),
      pick: c => uniqueTop(c.P, o => o.total),
      vars: (c, o) => ({ gap: o.total - Math.max(...c.P.filter(x => x.id !== o.id).map(x => x.total)) }),
    },
    seasonLast: { when: fromWeek(2), pick: c => every(lows(c.P, o => o.total)) },
    out: { when: live, pick: c => every(c.P.filter(o => o.out)) },
    commish: { when: live, pick: c => every(c.P.filter(o => o.role === 'commissioner')) },

    beers: { when: live, pick: c => most(c.P, o => cat(o, 'beers'), 3), n: o => cat(o, 'beers') },
    beerRun: { when: live, pick: c => most(c.alive, o => o.beerRun, 3), n: o => o.beerRun },
    dater: { when: live, pick: c => most(c.P, o => cat(o, 'date'), 2), n: o => cat(o, 'date') },
    nodate: { when: fromWeek(3), pick: c => every(c.alive.filter(o => !cat(o, 'date'))) },
    reader: { when: live, pick: c => most(c.P, o => cat(o, 'reading'), 3), n: o => cat(o, 'reading') },
    gymrat: { when: live, pick: c => most(c.P, o => cat(o, 'gym'), 10), n: o => cat(o, 'gym') },
    nogym: { when: live, pick: c => most(c.active, o => o.gymDays, 10) },
    norun: { when: live, pick: c => most(c.active, o => o.runDays, 14) },
    sports: { when: live, pick: c => most(c.P, o => o.sports, 4), n: o => o.sports },
    minGym: { when: live, pick: c => most(c.P.filter(o => median(o.gymMins) <= 50), o => o.gymMins.length, 3) },
    minRun: { when: live, pick: c => most(c.P.filter(o => median(o.runMiles) < 2.3), o => o.runMiles.length, 2) },
    capped: { when: live, pick: c => most(c.P, o => o.caps, 3), n: o => o.caps },
    voided: { when: live, pick: c => most(c.P, o => o.voided, 1), n: o => o.voided },
    noPhoto: { when: live, pick: c => most(c.P, o => o.noPhoto, 3), n: o => o.noPhoto },
    hype: { when: c => c.live && c.dow >= 1, pick: c => most(c.alive.filter(o => o.pts < o.goal), o => o.given, 8), n: o => o.given },
    late: { when: live, pick: c => most(c.P, o => o.late, 3), n: o => o.late },
    mma: { when: live, pick: c => most(c.P, o => cat(o, 'mma'), 3), n: o => cat(o, 'mma') },
    capper: { when: live, pick: c => most(c.P, o => o.capsGiven, 2), n: o => o.capsGiven },
  };

  /* ------------------------------------------------------------ filling in the blanks */
  function fill(tpl, v) {
    let ok = true, text = '';
    const bold = [v.name];
    text = curly(tpl).replace(/\{(\w+)(?::([^}|]+)(?:\|([^}]+))?)?\}/g, (m, k, one, many) => {
      const val = v[k];
      if (val == null || (typeof val === 'number' && !Number.isFinite(val))) { ok = false; return m; }
      let s = typeof val === 'number' ? (POINTS.has(k) ? fmtPts(val) : String(val)) : String(val);
      if (one) s += ' ' + (val === 1 ? one : many || one + 's');
      if (NAMES.includes(k) && !bold.includes(s)) bold.push(s);
      return s;
    });
    return ok ? { text, bold } : null;
  }

  function resolve(c, i) {
    const [key, tpl, who] = LIST[i], W = C[key];
    if (!W || !(W.when ? W.when(c) : c.live)) return null;
    let cands = W.pick(c) || [];
    if (who) cands = cands.filter(x => x.o.username === who);
    if (!cands.length) return null;
    const best = Math.max(...cands.map(x => x.s));
    const o = rotate(cands.filter(x => x.s === best).map(x => x.o), c.day * 7 + i);
    const v = {
      name: o.name, pts: o.pts, left: Math.max(0, o.goal - o.pts), total: o.total, min: o.goal, strikes: o.strikes, streak: o.streak,
      days: o.days, gymDays: o.gymDays, runDays: o.runDays, lastwk: o.lastwk, elim: o.elim, day: c.dayName, week: c.week, year: c.year, datePts: CATS.date.pts, gymPts: CATS.gym.pts,
    };
    if (W.n) v.n = W.n(o, c);
    if (W.vars) Object.assign(v, W.vars(c, o));
    const out = fill(tpl, v);
    return out ? { i, id: ID[i], key, who: who || null, target: o.id, text: out.text, bold: out.bold } : null;
  }

  /* ------------------------------------------------------------ picking the day's roast */
  function choose(c, past, prev) {
    const lastUse = new Map(past.map(h => [h.joke, h.day]));
    const fits = LIST.map((_, i) => resolve(c, i)).filter(Boolean);
    if (!fits.length) return null;
    let offers = fits.filter(r => !lastUse.has(r.id));
    if (!offers.length) {   // every roast that fits has had its day: bring back the one used longest ago, about someone new if possible
      const firstWho = new Map(); past.forEach(h => { if (!firstWho.has(h.joke)) firstWho.set(h.joke, h.who); });
      const old = fits.filter(r => !prev || (r.id !== prev.joke && r.target !== prev.who))
        .sort((a, b) => (firstWho.get(a.id) === a.target) - (firstWho.get(b.id) === b.target) || (lastUse.get(a.id) < lastUse.get(b.id) ? -1 : 1));
      return old[0] || fits[0];
    }
    for (const k of SPECIAL) { const r = offers.find(x => x.key === k); if (r) return r; }
    offers = offers.filter(r => !SPECIAL.includes(r.key));
    const tiers = prev ? [r => r.key !== prev.key && r.target !== prev.who, r => r.target !== prev.who, () => true] : [() => true];
    for (const ok of tiers) { const pool = offers.filter(ok); if (pool.length) return draw(pool, c); }
    return null;
  }
  /* A weighted draw over situations (seeded by the date), then that situation's roast:
     one written for whoever it's about if there is one, otherwise the next unused
     generic one in the order they're listed (best first). */
  function draw(pool, c) {
    const groups = {};
    pool.forEach(r => { (groups[r.key] = groups[r.key] || []).push(r); });
    const keys = Object.keys(groups).sort();
    const w = keys.map(k => (WEIGHT[k] || HABIT_WEIGHT) * (groups[k].some(r => r.who) ? PERSONAL : 1));
    let x = random(c.day * 7919 + 2026)() * w.reduce((a, b) => a + b, 0), key = keys[keys.length - 1];
    for (let j = 0; j < keys.length; j++) if ((x -= w[j]) < 0) { key = keys[j]; break; }
    const g = groups[key], mine = g.filter(r => r.who);
    return mine.length ? mine[mod(c.day, mine.length)] : g[0];     // generic ones go in the order they're written
  }

  /** Today's roast. hist = the saved roasts ({ day, joke, key, who, n, ... }); excluded = member ids to leave out.
      → { day, joke, key, who, text, bold, n, rerun? } or null. n numbers each roast the first time it
      airs (1–100); a rerun keeps its old number. */
  function today(members, posts, cfg, now = new Date(), hist = [], excluded) {
    const c = build(members, posts, cfg, now, excluded); if (!c) return null;
    const day = Logic.dayKey(now, c.tz), yest = Logic.dayKey(Logic.addDays(startOf(now, c.tz), -1, c.tz), c.tz);
    const past = (hist || []).filter(h => h && h.day < day).sort((a, b) => (a.day < b.day ? -1 : 1));
    c.first = past.length === 0;
    const prev = past.length && past[past.length - 1].day === yest ? past[past.length - 1] : null;
    const r = choose(c, past, prev);
    if (!r) return null;
    const aired = past.find(h => h.joke === r.id), n = aired && aired.n ? aired.n : new Set(past.map(h => h.joke)).size + 1;
    return Object.assign({ day, joke: r.id, key: r.key, who: r.target, text: r.text, bold: r.bold, n }, aired ? { rerun: true } : {});
  }
  /** Fallback when the server can't save roasts: replay every day since `from`. */
  function replay(members, posts, cfg, now, from, excluded) {
    const tz = cfg.timezone || CONFIG.timezone, hist = [], end = Logic.dayKey(now, tz);
    for (let d = Logic.dayKey(from, tz); d < end; d = Logic.dayKey(Logic.addDays(Logic.parseDay(d, tz, 12), 1, tz), tz)) {
      const r = today(members, posts, cfg, Logic.parseDay(d, tz, 12), hist, excluded);
      if (r) hist.push(r);
    }
    return hist;
  }
  /** A saved roast as HTML: the roasted person's name highlighted, other names bold. */
  function html(r) {
    let h = esc(r.text || '');
    (r.bold || []).forEach((nm, k) => { if (nm) h = h.split(esc(nm)).join(`<b${k === 0 ? ' class="t"' : ''}>${esc(nm)}</b>`); });
    return h;
  }
  /** Every roast that fits on a given day, with its target (for testing). */
  function all(members, posts, cfg, now, first = false, excluded) {
    const c = build(members, posts, cfg, now || new Date(), excluded); if (!c) return [];
    c.first = first; return LIST.map((_, i) => resolve(c, i));
  }

  return { LIST, WHEN, ID, today, replay, html, all };
})();
