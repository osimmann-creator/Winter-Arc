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
        else if (!R.eliminated) { R.strikes++; R.strikeWeeks.push(w); if (R.strikes >= cfg.strikesOut) { R.eliminated = true; R.elimWeek = w; } }
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

    const [dean, jake] = people('coin');
    if (dean && jake && pts(dean) > 0 && pts(dean) === pts(jake)) {
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
    for (const type of ['iron', 'liquor', 'timesheet']) {
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
    if (hoat) {
      const h = byUsername.get(hoat.username);
      if (h && pts(h) >= hoat.min) add('hoat', w, { pts: pts(h), who: h.id });
    }
    return out;
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

  return { compute, season, mondayOf, addDays, dayKey, parseDay, weekIdx, draftProblems, zoned, jokes, insideJokesStarted, jokeCooldownStart, crossings, displayName };
})();
