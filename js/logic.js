'use strict';
/* =====================================================================
   WINTER ARC · rules engine (pure functions, no storage)
   Weeks run Monday 00:00 through Sunday in the group's timezone.
   ===================================================================== */
const BADGES = [
  { id: 'first',    name: 'First Rep',          icon: 'gym',     desc: 'Log your first activity.' },
  { id: 'safe',     name: 'Safe & Sound',       icon: 'shield',  desc: 'Hit 7 points in a week.' },
  { id: 'iron',     name: 'Iron Addict',        icon: 'trophy',  desc: '3 gym sessions in one week.' },
  { id: 'road',     name: 'Road Warrior',       icon: 'run',     desc: 'Log 5 runs.' },
  { id: 'herc',     name: 'Hercules Week',      icon: 'bolt',    desc: 'Score 14+ points in one week.' },
  { id: 'lover',    name: 'Lover Boy',          icon: 'date',    desc: 'Go on a date.' },
  { id: 'fellas',   name: 'One of the Fellas',  icon: 'beers',   desc: 'Beers with the fellas 3 times.' },
  { id: 'brain',    name: 'Big Brain',          icon: 'reading', desc: 'Read 5 times.' },
  { id: 'allsport', name: 'All-Sport',          icon: 'star',    desc: 'Log Jickle, Volo and Soccer.' },
  { id: 'fire',     name: 'On Fire',            icon: 'flame',   desc: 'Log something 7 days in a row.' },
];

const Logic = (() => {
  const DAY = 864e5;
  const HOUR = 36e5;
  const calendars = new Map();

  function civilDate(date, tz = CONFIG.timezone) {
    if (!calendars.has(tz)) {
      calendars.set(tz, new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, calendar: 'iso8601', numberingSystem: 'latn',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      }));
    }
    const parts = {};
    const instant = new Date(date);
    for (const part of calendars.get(tz).formatToParts(instant)) {
      if (part.type !== 'literal') parts[part.type] = Number(part.value);
    }
    // UTC holds the civil components for calendar arithmetic, independently of the instant.
    const clock = new Date(instant.getTime());
    clock.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    clock.setUTCHours(parts.hour, parts.minute, parts.second);
    return clock;
  }

  function inZone(clock, tz) {
    const wallTime = +clock;
    const offsets = [-DAY, DAY].map(delta => +civilDate(wallTime + delta, tz) - wallTime - delta);
    const candidates = offsets.map(offset => wallTime - offset).sort((a, b) => a - b);
    const exact = candidates.find(candidate => +civilDate(candidate, tz) === wallTime);
    // Choose the first occurrence of a repeated time and advance through a skipped time.
    return new Date(exact ?? candidates[1]);
  }

  function mondayOf(date, tz = CONFIG.timezone) {
    const clock = civilDate(date, tz);
    clock.setUTCHours(0, 0, 0, 0);
    clock.setUTCDate(clock.getUTCDate() - (clock.getUTCDay() + 6) % 7);
    return inZone(clock, tz);
  }

  function addDays(date, days, tz = CONFIG.timezone) {
    const clock = civilDate(date, tz);
    clock.setUTCDate(clock.getUTCDate() + days);
    return inZone(clock, tz);
  }

  function jokeCooldownStart(date, tz = CONFIG.timezone) {
    return addDays(mondayOf(date, tz), -7, tz);
  }

  function parseDay(key, tz = CONFIG.timezone, hour = 0) {
    const date = new Date(`${key}T${String(hour).padStart(2, '0')}:00:00.000Z`);
    return Number.isFinite(+date) ? inZone(date, tz) : date;
  }

  const dayKey = (date, tz = CONFIG.timezone) => civilDate(date, tz).toISOString().slice(0, 10);
  const insideJokesStarted = (date, tz) => dayKey(date, tz) >= CONFIG.insideJokesStart;
  const ordinal = (date, tz) => Math.floor(+civilDate(date, tz) / DAY);
  const monday = day => day - ((day + 3) % 7 + 7) % 7;
  const weekIdx = (date, start, tz = CONFIG.timezone) => (monday(ordinal(date, tz)) - monday(ordinal(start, tz))) / 7;

  function season(cfg, now = new Date()) {
    const timezone = cfg.timezone || CONFIG.timezone;
    now = new Date(now);
    const start = mondayOf(parseDay(cfg.seasonStart, timezone), timezone);
    const weeks = cfg.seasonWeeks, end = addDays(start, weeks * 7, timezone);
    const raw = weekIdx(now, start, timezone);
    const status = now < start ? 'pre' : now >= end ? 'over' : 'live';
    const idx = status === 'pre' ? 0 : status === 'over' ? weeks - 1 : raw;
    const wkStart = addDays(start, idx * 7, timezone), wkEnd = addDays(wkStart, 7, timezone);
    const lastComplete = status === 'pre' ? -1 : status === 'over' ? weeks - 1 : raw - 1;
    return { start, end, weeks, idx, status, wkStart, wkEnd, lastComplete, timezone, msLeft: Math.max(0, (status === 'pre' ? start : wkEnd) - now) };
  }

  function streakOf(days, today) {
    let d = days.has(today) ? today : today - 1;
    let n = 0; while (days.has(d)) { n++; d--; }
    return n;
  }
  function bestStreakOf(days) {
    const list = [...days].sort((a, b) => a - b); let best = 0, run = 0, prev = null;
    for (const day of list) { run = day - prev === 1 ? run + 1 : 1; best = Math.max(best, run); prev = day; }
    return best;
  }

  function compute(members, posts, cfg, now = new Date()) {
    const S = season(cfg, now), by = {};
    const cappedPosts = cappedPostIds(posts, S.timezone);
    const firstWeek = monday(ordinal(S.start, S.timezone));
    const today = ordinal(now, S.timezone);
    const weekDates = Array.from({ length: S.weeks }, (_, w) => dayKey(addDays(S.start, w * 7, S.timezone), S.timezone));
    for (const m of members) by[m.id] = { id: m.id, weekPts: Array(S.weeks).fill(0), weekGym: Array(S.weeks).fill(0), fraudWeeks: new Set(), posts: [], counted: [], cat: {}, total: 0, strikes: 0, strikeWeeks: [], eliminated: false, elimWeek: null, safeWeeks: 0, streak: 0, bestStreak: 0, witnessed: 0 };
    for (const m of members) { by[m.id].injuryWeeks = new Set(); by[m.id].injuryReports = []; }
    for (const report of cfg.injuryPeriods || []) {
      const R = by[report.memberId], start = Date.parse(report.startedAt);
      if (R) R.injuryReports.push({ id: report.id || null, startedAt: report.startedAt, resolvedAt: report.resolvedAt || null });
      const end = Math.min(report.resolvedAt ? Date.parse(report.resolvedAt) : Infinity, +now + 1);
      if (!R || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const first = Math.max(0, weekIdx(start, S.start, S.timezone));
      const last = Math.min(S.weeks - 1, weekIdx(end - 1, S.start, S.timezone));
      for (let week = first; week <= last; week++) R.injuryWeeks.add(week);
    }
    for (const p of posts) {
      const R = by[p.memberId]; if (!R) continue;
      const w = (monday(ordinal(p.at, S.timezone)) - firstWeek) / 7;
      if (w < 0 || w >= S.weeks) continue;
      R.posts.push(p);
      if (p.fraud) R.fraudWeeks.add(w);
      if (p.voided || cappedPosts.has(p.id)) continue;
      R.counted.push(p);
      R.weekPts[w] += (CATS[p.cat] && CATS[p.cat].pts) || 0;
      if (p.cat === 'gym') R.weekGym[w]++;
      R.cat[p.cat] = (R.cat[p.cat] || 0) + 1;
      for (const wid of p.witnesses || []) if (by[wid]) by[wid].witnessed++;
    }
    for (const m of members) {
      const R = by[m.id];
      R.weekGoals = weekDates.map(date => (cfg.weeklyGoalOverrides ?? CONFIG.weeklyGoalOverrides)?.[m.username]?.[date] ?? cfg.weeklyMin);
      R.goal = R.weekGoals[S.idx] ?? cfg.weeklyMin;
      for (const w of R.fraudWeeks) R.weekPts[w] = 0;                       // rule 9: fraud = 0-point week
      R.weekPts = R.weekPts.map(v => Math.round(v * 2) / 2);
      R.total = R.weekPts.reduce((a, b) => a + b, 0);
      const from = Math.max(0, m.joinedWeek || 0);
      for (let w = from; w <= S.lastComplete; w++) {
        if (R.weekPts[w] >= R.weekGoals[w]) R.safeWeeks++;
        else if (!R.eliminated && !R.injuryWeeks.has(w)) { R.strikes++; R.strikeWeeks.push(w); if (R.strikes >= cfg.strikesOut) { R.eliminated = true; R.elimWeek = w; } }
      }
      R.thisWeek = S.status === 'pre' ? 0 : R.weekPts[S.idx];
      R.bestWeek = Math.max(0, ...R.weekPts);
      const days = new Set(R.counted.map(p => ordinal(p.at, S.timezone)));
      R.streak = streakOf(days, today); R.bestStreak = bestStreakOf(days);
      const fav = Object.entries(R.cat).sort((a, b) => b[1] - a[1])[0];
      R.fav = fav ? fav[0] : null;
      R.badges = badgesFor(R, cfg);
    }
    const alive = members.filter(m => !by[m.id].eliminated);
    const weekRank = [...members].sort((a, b) => by[b.id].thisWeek - by[a.id].thisWeek || by[b.id].total - by[a.id].total || a.name.localeCompare(b.name));
    const allRank = [...members].sort((a, b) => by[b.id].total - by[a.id].total || a.name.localeCompare(b.name));
    const winners = S.status !== 'over' ? [] : alive.length ? alive.map(m => m.id) : allRank.length ? [allRank[0].id] : [];
    return { season: S, by, alive, weekRank, allRank, winners, cappedPosts, weeklyMin: cfg.weeklyMin };
  }

  function badgesFor(R, cfg) {
    const has = {
      first: R.counted.length >= 1,
      safe: R.weekPts.some((v, w) => v >= R.weekGoals[w]),
      iron: R.weekGym.some(v => v >= 3),
      road: (R.cat.run || 0) >= 5,
      herc: R.bestWeek >= cfg.weeklyMin * 2,
      lover: (R.cat.date || 0) >= 1,
      fellas: (R.cat.beers || 0) >= 3,
      brain: (R.cat.reading || 0) >= 5,
      allsport: ['jickle', 'volo', 'soccer'].every(k => R.cat[k]),
      fire: R.bestStreak >= 7,
    };
    return BADGES.filter(b => has[b.id]).map(b => b.id);
  }

  /* What a draft post still needs before it counts (rules 2, 4, 5, 6, 7). */
  function draftProblems(d) {
    const out = [];
    if (!d.photo && !(d.witnesses && d.witnesses.length)) out.push('Add a photo or tag a witness. No proof = no points.');
    if (!d.cat) out.push('Pick what you did.');
    if (d.cat === 'gym') { if (!(d.minutes >= 45)) out.push('Gym needs 45+ minutes.'); if (!d.checks.lifted) out.push('Confirm you actually lifted.'); }
    if (d.cat === 'run' && !(d.miles >= 2)) out.push('Runs need 2+ miles.');
    if (d.cat === 'bike') {
      const miles = Number(d.bikeMiles);
      if (!Number.isFinite(miles) || miles < CATS.bike.minMiles) out.push(`Bike rides need at least ${CATS.bike.minMiles} miles.`);
    }
    if (d.cat === 'date' && !(d.checks.oneOnOne && d.checks.notGf)) out.push('Confirm both date rules.');
    if (d.cat === 'beers' && !d.checks.inPerson) out.push('Confirm you were there in person with the fellas.');
    return out;
  }

  /* Day of week (0 = Sunday … 6 = Saturday) and hour, in an IANA time zone. */
  function zoned(now, tz) {
    const clock = civilDate(now, tz);
    return { day: clock.getUTCDay(), hour: clock.getUTCHours() };
  }

  const byTime = (a, b) => Date.parse(a.at) - Date.parse(b.at) || String(a.id).localeCompare(String(b.id));

  function cappedPostIds(posts, timezone) {
    const used = new Set(), capped = new Set();
    const limited = posts.filter(p => !p.voided && CATS[p.cat]?.oncePerWeek).sort(byTime);
    for (const post of limited) {
      const week = monday(ordinal(post.at, timezone));
      const key = `${post.memberId}:${post.cat}:${week}`;
      if (used.has(key)) capped.add(post.id);
      used.add(key);
    }
    return capped;
  }

  function lastPlaceTrips(posts, target, alive, calc) {
    if (alive.length < 2) return 0;
    const scores = new Map(alive.map(m => [m.id, 0]));
    const rivals = alive.filter(m => m.id !== target.id);
    let trips = 0, wasLast = false;
    for (const post of posts) {
      if (!scores.has(post.memberId) || calc.by[post.memberId].fraudWeeks.has(calc.season.idx)) continue;
      scores.set(post.memberId, scores.get(post.memberId) + (CATS[post.cat]?.pts || 0));
      const isLast = rivals.every(m => scores.get(m.id) > scores.get(target.id));
      if (isLast && !wasLast) trips++;
      wasLast = isLast;
    }
    return wasLast ? trips : 0;
  }

  /* Inside jokes that are true right now → [{ type, key, data, at }].
     The store deduplicates keys and enforces the cooldown for each joke type.
     hoat = { username, min }: also the Hoat Guarantee (that person reached the weekly minimum). */
  function jokes(members, calc, J, now = new Date(), tz, hoat) {
    const out = [], S = calc.season;
    if (!J || S.status === 'pre') return out;
    now = new Date(now);
    tz = tz || S.timezone;
    const w = S.idx, at = now.toISOString();
    const insideJokesOpen = insideJokesStarted(now, tz);
    const byUsername = new Map(members.map(m => [m.username?.toLowerCase(), m]));
    const people = type => (J[type]?.users || []).map(u => byUsername.get(u));
    const pts = m => calc.by[m.id].thisWeek;
    const add = (type, key, data = {}) => {
      if (insideJokesOpen || type === 'hoat') out.push({ type, key: `${type}:${key}`, data: { week: w, ...data }, at });
    };
    const alive = m => m && !calc.by[m.id].eliminated;

    const [lastJake, lastGaurav] = people('nets');
    if (S.lastComplete >= 0 && (S.status === 'live' || now < addDays(S.end, 7, tz))) {
      const who = [lastJake, lastGaurav].filter(m => m && calc.by[m.id].strikeWeeks.includes(S.lastComplete)).map(m => m.id);
      if (who.length) add('nets', S.lastComplete, { week: S.lastComplete, who });
    }
    if (S.status !== 'live') return out;

    /* Holidays: everyone sees them on the day (group timezone), once a year. */
    const [year, month, date] = dayKey(now, tz).split('-').map(Number), weekday = zoned(now, tz).day;
    const lowest = () => {
      const pool = members.filter(m => alive(m)), lo = Math.min(...pool.map(pts));
      return { who: pool.filter(m => pts(m) === lo).map(m => m.id), pts: lo };
    };
    if (J.thanksgiving && month === 11 && weekday === 4 && date >= 22 && date <= 28 && calc.alive.length) {
      add('thanksgiving', year, lowest());
    }
    if (J.nye && month === 12 && date === 31) add('nye', year, { year: year + 1 });
    if (J.groundhog && month === 2 && date === 2) {
      const host = byUsername.get(J.groundhog.host);
      add('groundhog', year, host ? { who: host.id } : {});
    }
    if (J.valentine && month === 2 && date === 14) {
      const short = members.filter(m => alive(m) && pts(m) < calc.by[m.id].goal).map(m => m.id);
      add('valentine', year, { who: short, sunday: weekday === 0 });
    }

    const bestOf40 = bestOf40Week(J, people, calc, S, tz, now);
    const [dean, jake] = people('coin');
    if (dean && jake && pts(dean) > 0 && pts(dean) === pts(jake) && !bestOf40) {
      add('coin', `${w}:${pts(dean)}`, { pts: pts(dean), a: dean.id, b: jake.id });
    }
    const [leader] = people('bluehair');
    if (leader && pts(leader) > 0 && members.every(m => m.id === leader.id || pts(m) < pts(leader))) {
      add('bluehair', w, { pts: pts(leader), who: leader.id });
    }
    const clock = zoned(now, tz);
    const inWindow = j => clock.day === j.day && clock.hour >= j.from && clock.hour < j.to;
    const bag = people('bag');
    if (bag.length && bag.every(m => m && pts(m) > 0 && pts(m) === pts(bag[0]))) {
      add('bag', `${w}:${pts(bag[0])}`, { pts: pts(bag[0]), who: bag.map(m => m.id) });
    }
    const counted = members.flatMap(m => calc.by[m.id].counted).sort(byTime);
    const week = counted.filter(p => Date.parse(p.at) >= +S.wkStart && Date.parse(p.at) < +S.wkEnd);
    const [fighter] = people('fight');
    const beers = fighter && week.find(p => p.memberId === fighter.id && p.cat === 'beers' && Date.parse(p.at) <= +now);
    if (beers) {
      const previousDay = ordinal(beers.at, tz) - 1;
      const gym = counted.some(p => p.memberId === fighter.id && p.cat === 'gym'
        && Date.parse(p.at) <= Date.parse(beers.at) && ordinal(p.at, tz) >= previousDay);
      if (gym) add('fight', w, { who: fighter.id, post: beers.id });
    }
    const [capper] = people('crashout');
    const [beerDrinker] = people('satellite');
    for (const post of week) {
      if (capper && post.memberId !== capper.id && post.reactions?.[CAP]?.includes(capper.id)) {
        add('crashout', post.id, { who: capper.id, post: post.id, target: post.memberId });
      }
      if (beerDrinker && post.memberId === beerDrinker.id && post.cat === 'beers') {
        add('satellite', post.id, { who: beerDrinker.id, post: post.id });
      }
    }

    const [lastPlace] = people('puke');
    if (alive(lastPlace)) {
      const trips = lastPlaceTrips(week, lastPlace, calc.alive, calc);
      if (trips) add('puke', `${w}:${trips}`, { pts: pts(lastPlace), who: lastPlace.id, n: trips });
    }
    const [fighterMma] = people('mma');
    if (fighterMma) {
      const n = week.filter(p => p.memberId === fighterMma.id && p.cat === 'mma').length;
      if (n >= 4) add('mma', w, { who: fighterMma.id, n });
    }

    const firstWeek = m => +addDays(S.start, (m.joinedWeek || 0) * 7, tz);
    const [idle] = people('radiator');
    if (alive(idle)) {
      const latest = counted.filter(p => p.memberId === idle.id).at(-1);
      const since = latest ? Date.parse(latest.at) : firstWeek(idle);
      if (now - since >= 96 * HOUR) add('radiator', latest?.id || 'start', { who: idle.id, post: latest?.id || null });
    }
    const [late] = people('mom');
    if (alive(late) && inWindow(J.mom) && pts(late) < calc.by[late.id].goal) {
      add('mom', w, { pts: pts(late), who: late.id });
    }
    const [phil] = people('phil');
    if (phil) {
      let previous = firstWeek(phil);
      for (const post of counted.filter(p => p.memberId === phil.id)) {
        const time = Date.parse(post.at);
        if (time >= +S.wkStart && time < +S.wkEnd && time - previous >= 72 * HOUR) {
          add('phil', post.id, { who: phil.id, post: post.id });
        }
        previous = time;
      }
    }
    if (J.scared) {
      const date = counted.filter(p => p.cat === 'date').at(-1);
      const since = Math.max(+S.start, date ? Date.parse(date.at) : +S.start);
      const days = Math.floor((now - since) / DAY), n = Math.floor(days / J.scared.days);
      if (n > 0) add('scared', `${dayKey(since, tz)}:${n}`, { n, days });
    }
    for (const type of ['iron', 'liquor', 'timesheet', 'fridge']) {
      const [target] = people(type);
      if (!target) continue;
      const { goal, fraudWeeks } = calc.by[target.id];
      if (fraudWeeks.has(w)) continue;
      let points = 0;
      for (const post of week) {
        if (post.memberId !== target.id || Date.parse(post.at) > +now) continue;
        points += CATS[post.cat]?.pts || 0;
        if (points < goal) continue;
        const { day } = zoned(post.at, tz);
        if (J[type].days.includes(day)) add(type, w, { post: post.id, pts: points, day, who: target.id });
        break;
      }
    }
    roundTwo(add, { members, calc, J, now, tz, w, S, clock, counted, week, people, pts, alive, firstWeek });
    roundThree(add, { members, calc, J, now, tz, w, S, counted, week, people, pts, alive, firstWeek, bestOf40 });
    if (hoat) {
      const h = byUsername.get(hoat.username);
      if (h && pts(h) >= hoat.min) add('hoat', w, { pts: pts(h), who: h.id });
    }
    return out;
  }

  /* Round 2 inside jokes (animations/hyperframes). Holidays are with the others near the top of jokes(). */
  function roundTwo(add, { members, calc, J, now, tz, w, S, clock, counted, week, people, pts, alive, firstWeek }) {
    const goal = m => calc.by[m.id].goal;
    const upToNow = week.filter(p => Date.parse(p.at) <= +now);

    // Osim's Sunday: still short at 6 PM -> The Crossing; the post that gets him there lands on Sunday -> Final Call
    const [osim] = people('crossing');
    if (alive(osim) && clock.day === J.crossing.day && clock.hour >= J.crossing.from && pts(osim) < goal(osim)) {
      add('crossing', w, { who: osim.id, pts: pts(osim), goal: goal(osim) });
    }
    const [flyer] = people('finalcall');
    if (flyer && !calc.by[flyer.id].fraudWeeks.has(w)) {
      let points = 0;
      for (const post of upToNow.filter(p => p.memberId === flyer.id)) {
        points += CATS[post.cat]?.pts || 0;
        if (points < goal(flyer)) continue;
        if (J.finalcall.days.includes(zoned(post.at, tz).day)) add('finalcall', w, { who: flyer.id, post: post.id, pts: points });
        break;
      }
    }
    // ...and Monday, if he missed last week by a little: #worthit
    const [eater] = people('worthit');
    const last = S.lastComplete;
    if (eater && clock.day === 1 && last >= 0 && last === w - 1) {
      const R = calc.by[eater.id], short = R.weekGoals[last] - R.weekPts[last];
      const wasIn = R.elimWeek === null || R.elimWeek >= last;
      if (wasIn && short > 0 && short <= J.worthit.short) add('worthit', w, { who: eater.id, pts: R.weekPts[last], short });
    }

    // Dean logs something timed between 10 PM and 3:59 AM: Operation Basement
    const [dean] = people('basement');
    if (dean) {
      for (const post of upToNow) {
        const hour = zoned(post.at, tz).hour;
        if (post.memberId === dean.id && (hour >= J.basement.from || hour < J.basement.to)) add('basement', post.id, { who: dean.id, post: post.id });
      }
    }

    // Dylan and Connor both still in and both 72+ hours without a log: No Map
    const lost = people('nomap');
    if (lost.length === 2 && lost.every(alive)) {
      const latest = lost.map(m => counted.filter(p => p.memberId === m.id && Date.parse(p.at) <= +now).at(-1));
      const dry = lost.every((m, i) => +now - (latest[i] ? Date.parse(latest[i].at) : firstWeek(m)) >= J.nomap.hours * HOUR);
      if (dry) add('nomap', latest.map(p => p?.id || 'start').join(':'), { who: lost.map(m => m.id), posts: latest.map(p => p?.id || null) });
    }

    // First place changing hands this week, post by post: Grand Theft #1 (Fri/Sat), My Car, My Rules (Sunday)
    const running = new Map(members.map(m => [m.id, 0]));
    const soleLeader = () => {
      let best = -Infinity, ids = [];
      for (const [id, v] of running) { if (v > best) { best = v; ids = [id]; } else if (v === best) ids.push(id); }
      return best > 0 && ids.length === 1 ? ids[0] : null;
    };
    let stolen = false, crashed = false;   // once a week each: the first time it happens
    for (const post of upToNow) {
      if (!running.has(post.memberId) || calc.by[post.memberId].fraudWeeks.has(w)) continue;
      const before = soleLeader();
      running.set(post.memberId, running.get(post.memberId) + (CATS[post.cat]?.pts || 0));
      const after = soleLeader(), day = zoned(post.at, tz).day;
      if (J.grandtheft && !stolen && before && after && after !== before && J.grandtheft.days.includes(day)) {
        stolen = true;
        add('grandtheft', w, { who: after, victim: before, post: post.id });
      }
      if (J.mycar && !crashed && before && after !== before && day === 0) {
        crashed = true;
        add('mycar', w, { who: before, by: post.memberId, post: post.id });
      }
    }

    // A post gets its third cap: Wanted. A post is voided: Busted.
    const thisWeek = p => {
      const t = Date.parse(p.at);
      return t >= +S.wkStart && t < +S.wkEnd;
    };
    const lastWeekStart = +addDays(S.wkStart, -7, tz);
    for (const m of members) {
      for (const post of calc.by[m.id].posts) {
        if (J.wanted && !post.voided && thisWeek(post) && (post.reactions?.[CAP]?.length || 0) >= CAP_DISPUTE) {
          add('wanted', post.id, { who: post.memberId, post: post.id, n: post.reactions[CAP].length });
        }
        if (J.busted && post.fraud && Date.parse(post.at) >= lastWeekStart && Date.parse(post.at) <= +now) {
          add('busted', post.id, { who: post.memberId, post: post.id });
        }
      }
    }

    // Someone takes his last strike: Wasted. He logs again afterwards: Out on Parole.
    for (const m of members) {
      const R = calc.by[m.id];
      if (!R.eliminated) continue;
      if (J.wasted && R.elimWeek === S.lastComplete) add('wasted', m.id, { who: m.id, strikes: R.strikes, week: R.elimWeek });
      if (J.parole) {
        const out = +addDays(S.start, (R.elimWeek + 1) * 7, tz);
        const back = R.counted.find(p => Date.parse(p.at) >= out && Date.parse(p.at) <= +now);
        if (back && thisWeek(back)) add('parole', m.id, { who: m.id, post: back.id });
      }
    }

    // Two members log the same activity on the same day and tag each other: Partners in Crime
    if (J.partners) {
      const seen = new Set();
      for (const a of upToNow) {
        for (const b of upToNow) {
          if (a.memberId >= b.memberId || a.cat !== b.cat || ordinal(a.at, tz) !== ordinal(b.at, tz)) continue;
          if (!(a.witnesses || []).includes(b.memberId) || !(b.witnesses || []).includes(a.memberId)) continue;
          const pair = [a.memberId, b.memberId].sort(), key = `${w}:${pair.join(':')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          add('partners', key, { who: pair, cat: a.cat, posts: [a.id, b.id] });
        }
      }
    }
  }

  /* Running weekly totals, post by post, up to `now`: calls visit(week, totals) after each counted post,
     totals = { memberId: points this week so far } for the given members. Fraud weeks count as 0. */
  function replayWeeks(calc, list, S, tz, now, visit) {
    const ids = list.map(m => m.id), run = {};
    const posts = ids.flatMap(id => calc.by[id].counted).filter(p => Date.parse(p.at) <= +now).sort(byTime);
    for (const p of posts) {
      const k = weekIdx(p.at, S.start, tz);
      const t = (run[k] ||= Object.fromEntries(ids.map(id => [id, 0])));
      if (!calc.by[p.memberId].fraudWeeks.has(k)) t[p.memberId] += CATS[p.cat]?.pts || 0;
      visit(k, t);
    }
  }
  /* Best of 40: this is the week Dean and Jake tie for the `ties`-th time this season (tied above 0 at any point
     in a week counts that week, the way The Coin would have played). That week it plays instead of The Coin. */
  function bestOf40Week(J, people, calc, S, tz, now) {
    if (!J.bestof40) return false;
    const pair = people('bestof40');
    if (pair.length !== 2 || !pair.every(Boolean)) return false;
    const tied = new Set();
    replayWeeks(calc, pair, S, tz, now, (k, t) => {
      const [a, b] = pair.map(m => t[m.id]);
      if (a > 0 && a === b) tied.add(k);
    });
    return tied.has(S.idx) && [...tied].filter(k => k < S.idx).length === (J.bestof40.ties || 3) - 1;
  }

  /* Round 3 inside jokes (animations/hyperframes, NEW-ANIMATIONS-3). Mom's Fridge shares the goal-post loop in jokes(). */
  function roundThree(add, { members, calc, J, now, tz, w, S, counted, week, people, pts, alive, firstWeek, bestOf40 }) {
    const goal = m => calc.by[m.id].goal;
    const upToNow = week.filter(p => Date.parse(p.at) <= +now);
    const latestOf = m => counted.filter(p => p.memberId === m.id && Date.parse(p.at) <= +now).at(-1);
    const quietFor = m => { const p = latestOf(m); return +now - (p ? Date.parse(p.at) : firstWeek(m)); };

    // Connor still in and 72+ hours without a log: Signal Lost (No Map plays instead if Dylan has gone quiet too)
    const [sat] = people('signal');
    if (alive(sat) && quietFor(sat) >= J.signal.hours * HOUR) {
      const pair = J.nomap ? people('nomap') : [];
      const other = pair.includes(sat) ? pair.find(m => m && m.id !== sat.id) : null;
      const noMap = other && alive(other) && quietFor(other) >= J.nomap.hours * HOUR;
      const latest = latestOf(sat);
      if (!noMap) add('signal', latest?.id || 'start', { who: sat.id, post: latest?.id || null, hours: Math.floor(quietFor(sat) / HOUR) });
    }
    // Connor logs something timed between 10 PM and 4:59 AM: 3 AM Besties
    const [owl] = people('besties');
    if (owl) {
      for (const post of upToNow) {
        const hour = zoned(post.at, tz).hour;
        if (post.memberId === owl.id && (hour >= J.besties.from || hour < J.besties.to)) add('besties', post.id, { who: owl.id, post: post.id });
      }
    }
    // Everyone still in has reached his goal this week, except Connor: Locked Out (anyone injured this week doesn't count)
    const [stray] = people('lockedout');
    if (alive(stray) && pts(stray) < goal(stray)) {
      const others = members.filter(m => m.id !== stray.id && alive(m) && !calc.by[m.id].injuryWeeks.has(w));
      if (others.length && others.every(m => pts(m) >= goal(m))) add('lockedout', w, { who: stray.id, pts: pts(stray), goal: goal(stray) });
    }
    // Dean and Dylan tied above 0: The Volcano
    const [hiker, partner] = people('volcano');
    if (hiker && partner && pts(hiker) > 0 && pts(hiker) === pts(partner)) {
      add('volcano', `${w}:${pts(hiker)}`, { pts: pts(hiker), who: [hiker.id, partner.id] });
    }
    // The third week Dean and Jake tie: Best of 40 (The Coin skips that week, see jokes())
    if (bestOf40) {
      const pair = people('bestof40');
      add('bestof40', w, { who: pair.map(m => m.id), pts: pts(pair[0]), n: J.bestof40.ties || 3 });
    }
    // The third week this season Dylan hits exactly 4 (La4): Retire the Number, once a season
    const [la4] = people('la4');
    if (la4) {
      const hit = new Set();
      replayWeeks(calc, [la4], S, tz, now, (k, t) => { if (t[la4.id] === J.la4.points) hit.add(k); });
      if (hit.has(w) && [...hit].filter(k => k < w).length === (J.la4.weeks || 3) - 1) add('la4', w, { who: la4.id, pts: J.la4.points, n: J.la4.weeks || 3 });
    }
    // Jake logs Beers with the fellas: Balanced Diet that night, The Pull-Out the morning after (from 6 AM, group timezone)
    const [fella] = people('diet');
    if (fella) {
      for (const post of upToNow) if (post.memberId === fella.id && post.cat === 'beers') add('diet', post.id, { who: fella.id, post: post.id });
    }
    const [host] = people('pullout');
    if (host) {
      for (const post of counted) {
        if (post.memberId !== host.id || post.cat !== 'beers' || +now - Date.parse(post.at) > 2 * DAY) continue;
        // the first 6 AM after the post: the same morning for a post after midnight, otherwise the next one
        let morning = parseDay(dayKey(post.at, tz), tz, J.pullout.hour);
        if (+morning <= Date.parse(post.at)) morning = parseDay(dayKey(addDays(post.at, 1, tz), tz), tz, J.pullout.hour);
        if (+now >= +morning && +now < +morning + DAY) add('pullout', post.id, { who: host.id, post: post.id });
      }
    }
    // Jake's first post after a dry spell long enough for The Radiator (4 days): Jailbreak
    const [jailed] = people('jailbreak');
    if (alive(jailed)) {
      let previous = firstWeek(jailed);
      for (const post of counted.filter(p => p.memberId === jailed.id && Date.parse(p.at) <= +now)) {
        const time = Date.parse(post.at);
        if (time >= +S.wkStart && time < +S.wkEnd && time - previous >= 96 * HOUR) {
          add('jailbreak', post.id, { who: jailed.id, post: post.id, days: Math.floor((time - previous) / DAY) });
        }
        previous = time;
      }
    }
    // The commissioner marks Phil recovered: Cleared to Play (once per report, the week it closes)
    const [patient] = people('cleared');
    if (patient) {
      for (const report of calc.by[patient.id].injuryReports || []) {
        const closed = report.resolvedAt ? Date.parse(report.resolvedAt) : NaN;
        if (report.id && closed <= +now && closed >= +S.wkStart) add('cleared', report.id, { who: patient.id, report: report.id });
      }
    }
    // Phil logs on three days in a row this week: Early Spring
    const [groundhog] = people('spring');
    if (groundhog) {
      const days = [...new Set(upToNow.filter(p => p.memberId === groundhog.id).map(p => ordinal(p.at, tz)))].sort((a, b) => a - b);
      let run = 0, best = 0;
      days.forEach((d, i) => { run = i && d === days[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
      if (best >= J.spring.days) add('spring', w, { who: groundhog.id, days: best });
    }
    // The first date after a Scared of Girls drought: War Hero (keyed like the drought's Scared of Girls event)
    if (J.warhero) {
      let previous = +S.start;
      for (const post of counted.filter(p => p.cat === 'date' && Date.parse(p.at) <= +now)) {
        const time = Date.parse(post.at), since = Math.max(+S.start, previous);
        const days = Math.floor((time - since) / DAY), n = Math.floor(days / (J.scared?.days || 30));
        if (n > 0 && time >= +S.wkStart && time < +S.wkEnd) add('warhero', `${dayKey(since, tz)}:${n}`, { who: post.memberId, post: post.id, days });
        previous = time;
      }
    }
  }

  /* Christmas: Naughty or Nice (XMAS in config.js). Which part of the vote today is, in the group's timezone. */
  function xmasPhase(now = new Date(), tz = CONFIG.timezone, rules = XMAS) {
    const [year, month, date] = dayKey(now, tz).split('-').map(Number);
    if (month === rules.vote[0] && date === rules.vote[1]) return { phase: 'voting', year };
    if (month === rules.reveal[0] && date >= rules.reveal[1]) return { phase: 'reveal', year };
    return { phase: 'closed', year: month === rules.vote[0] ? year : null };
  }
  /* The verdicts from the votes ({ voter, target, choice }), with totals only (never who voted what).
     Nice list first (nicest first), then the naughty list with the naughtiest last. */
  function xmasResults(memberIds, votes, rules = XMAS) {
    const ids = new Set(memberIds), valid = votes.filter(v => ids.has(v.voter) && ids.has(v.target) && v.voter !== v.target);
    const voters = new Set(valid.map(v => v.voter));
    const rows = memberIds.map(id => {
      const mine = valid.filter(v => v.target === id), nice = mine.filter(v => v.choice === 'nice').length, naughty = mine.length - nice;
      const voted = voters.has(id);
      let verdict = nice > naughty ? 'nice' : naughty > nice ? 'naughty' : rules.ties;
      if (!voted && rules.nonVoters) verdict = rules.nonVoters;
      return { id, nice, naughty, voted, verdict };
    });
    const score = r => r.naughty - r.nice + (r.voted ? 0 : 0.5);
    rows.sort((a, b) => a.verdict !== b.verdict ? (a.verdict === 'nice' ? -1 : 1) : score(a) - score(b));
    return { rows, voters: voters.size, nonVoters: rows.filter(r => !r.voted).map(r => r.id) };
  }

  function displayName(member, calc) {
    const alias = ALIASES[member.username];
    return alias && calc?.season.status === 'live' && calc.by[member.id]?.thisWeek === alias.points ? alias.name : member.name;
  }

  /* The post that pushed someone to the weekly minimum, one per week (no stamp in a fraud week). */
  function crossings(posts, memberId, cfg) {
    const tz = cfg.timezone || CONFIG.timezone;
    const start = parseDay(cfg.seasonStart, tz), wk = {};
    const capped = cappedPostIds(posts, tz);
    posts.filter(p => p.memberId === memberId && p.cat).sort(byTime).forEach(p => {
      const w = weekIdx(p.at, start, tz);
      const s = (wk[w] ||= { sum: 0, id: null, fraud: false });
      if (p.fraud) s.fraud = true;
      if (p.voided || capped.has(p.id) || s.id) return;
      s.sum += (CATS[p.cat] && CATS[p.cat].pts) || 0;
      if (s.sum >= cfg.weeklyMin) s.id = p.id;
    });
    return new Set(Object.values(wk).filter(s => s.id && !s.fraud).map(s => s.id));
  }

  return { compute, season, mondayOf, addDays, dayKey, parseDay, weekIdx, draftProblems, zoned, jokes, insideJokesStarted, jokeCooldownStart, crossings, displayName, xmasPhase, xmasResults };
})();
