'use strict';
/* =====================================================================
   WINTER ARC · rules engine (pure functions, no storage)
   Weeks run Monday 00:00 → Sunday 11:59 PM in the viewer's local time.
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
  const mondayOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const weekIdx = (date, start) => Math.round((mondayOf(date) - mondayOf(start)) / (7 * DAY));

  function season(cfg, now = new Date()) {
    const start = mondayOf(parseDay(cfg.seasonStart)), weeks = cfg.seasonWeeks, end = addDays(start, weeks * 7);
    const raw = weekIdx(now, start);
    const status = now < start ? 'pre' : now >= end ? 'over' : 'live';
    const idx = status === 'pre' ? 0 : status === 'over' ? weeks - 1 : raw;
    const wkStart = addDays(start, idx * 7), wkEnd = addDays(wkStart, 7);
    const lastComplete = status === 'pre' ? -1 : status === 'over' ? weeks - 1 : raw - 1;
    return { start, end, weeks, idx, status, wkStart, wkEnd, lastComplete, msLeft: Math.max(0, (status === 'pre' ? start : wkEnd) - now) };
  }

  function streakOf(days, now) {
    let d = new Date(now); if (!days.has(dayKey(d))) d = addDays(d, -1);
    let n = 0; while (days.has(dayKey(d))) { n++; d = addDays(d, -1); }
    return n;
  }
  function bestStreakOf(days) {
    const list = [...days].sort(); let best = 0, run = 0, prev = null;
    for (const k of list) { const d = parseDay(k); run = prev && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    return best;
  }

  function compute(members, posts, cfg, now = new Date()) {
    const S = season(cfg, now), by = {};
    for (const m of members) by[m.id] = { id: m.id, weekPts: Array(S.weeks).fill(0), weekGym: Array(S.weeks).fill(0), fraudWeeks: new Set(), posts: [], counted: [], cat: {}, total: 0, strikes: 0, strikeWeeks: [], eliminated: false, elimWeek: null, safeWeeks: 0, streak: 0, bestStreak: 0, witnessed: 0 };
    for (const p of posts) {
      const R = by[p.memberId]; if (!R) continue;
      const w = weekIdx(new Date(p.at), S.start); if (w < 0 || w >= S.weeks) continue;
      R.posts.push(p);
      if (p.fraud) R.fraudWeeks.add(w);
      if (p.voided) continue;
      R.counted.push(p);
      R.weekPts[w] += (CATS[p.cat] && CATS[p.cat].pts) || 0;
      if (p.cat === 'gym') R.weekGym[w]++;
      R.cat[p.cat] = (R.cat[p.cat] || 0) + 1;
      for (const wid of p.witnesses || []) if (by[wid]) by[wid].witnessed++;
    }
    for (const m of members) {
      const R = by[m.id];
      for (const w of R.fraudWeeks) R.weekPts[w] = 0;                       // rule 9: fraud = 0-point week
      R.weekPts = R.weekPts.map(v => Math.round(v * 2) / 2);
      R.total = R.weekPts.reduce((a, b) => a + b, 0);
      const from = Math.max(0, m.joinedWeek || 0);
      for (let w = from; w <= S.lastComplete; w++) {
        if (R.weekPts[w] >= cfg.weeklyMin) R.safeWeeks++;
        else if (!R.eliminated) { R.strikes++; R.strikeWeeks.push(w); if (R.strikes >= cfg.strikesOut) { R.eliminated = true; R.elimWeek = w; } }
      }
      R.thisWeek = S.status === 'pre' ? 0 : R.weekPts[S.idx];
      R.bestWeek = Math.max(0, ...R.weekPts);
      const days = new Set(R.counted.map(p => dayKey(p.at)));
      R.streak = streakOf(days, now); R.bestStreak = bestStreakOf(days);
      const fav = Object.entries(R.cat).sort((a, b) => b[1] - a[1])[0];
      R.fav = fav ? fav[0] : null;
      R.badges = badgesFor(R, cfg);
    }
    const alive = members.filter(m => !by[m.id].eliminated);
    const weekRank = [...members].sort((a, b) => by[b.id].thisWeek - by[a.id].thisWeek || by[b.id].total - by[a.id].total || a.name.localeCompare(b.name));
    const allRank = [...members].sort((a, b) => by[b.id].total - by[a.id].total || a.name.localeCompare(b.name));
    const winners = S.status !== 'over' ? [] : alive.length ? alive.map(m => m.id) : allRank.length ? [allRank[0].id] : [];
    return { season: S, by, alive, weekRank, allRank, winners };
  }

  function badgesFor(R, cfg) {
    const has = {
      first: R.counted.length >= 1,
      safe: R.weekPts.some(v => v >= cfg.weeklyMin),
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
    if (d.cat === 'date' && !(d.checks.oneOnOne && d.checks.notGf)) out.push('Confirm both date rules.');
    if (d.cat === 'beers' && !d.checks.inPerson) out.push('Confirm you were there in person with the fellas.');
    return out;
  }

  /* Day of week (0 = Sunday … 6 = Saturday) and hour, in an IANA time zone. */
  function zoned(now, tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(now);
      const wd = parts.find(p => p.type === 'weekday').value, hr = +parts.find(p => p.type === 'hour').value;
      return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd), hour: hr % 24 };
    } catch (e) { return { day: now.getDay(), hour: now.getHours() }; }
  }

  /* Inside jokes that are true right now → [{ type, key, data, at }].
     Each key is recorded once (the store ignores repeats), so the key decides
     how often a joke can happen: per week, per tied score, per post, per dry spell.
     hoat = { username, min }: also the Hoat Guarantee (that person reached the weekly minimum).
     opts = { min: the weekly minimum, posts: every post (defaults to the season's posts in calc) } */
  function jokes(members, calc, J, now = new Date(), tz, hoat, opts = {}) {
    const out = [], S = calc.season;
    if (S.status !== 'live' || !J) return out;
    const w = S.idx, by = u => members.find(m => String(m.username || '').toLowerCase() === u);
    const R = m => calc.by[m.id] || { thisWeek: 0, eliminated: true, strikeWeeks: [], weekPts: [] };
    const pts = m => R(m).thisWeek;
    const at = now.toISOString();   // stamped when it's first noticed (right after the post that caused it)
    const add = (type, key, data) => out.push({ type, key, data: Object.assign({ week: w }, data), at });
    const min = opts.min || (hoat && hoat.min) || 7;
    const cap = typeof CAP !== 'undefined' ? CAP : '\u{1F9E2}';
    const all = (opts.posts || Object.values(calc.by).flatMap(x => x.posts)).filter(p => new Date(p.at) <= now);
    const wk = all.filter(p => weekIdx(new Date(p.at), S.start) === w).sort((a, b) => new Date(a.at) - new Date(b.at));
    const z = zoned(now, tz), inWindow = j => z.day === j.day && z.hour >= j.from && z.hour < j.to;
    const alive = members.filter(m => !R(m).eliminated);
    const joinedAt = m => addDays(S.start, 7 * Math.max(0, m.joinedWeek || 0));
    const logsOf = m => all.filter(p => p.memberId === m.id && !p.voided);
    /* last among the people still in, with at least one of them ahead (ties for last count) */
    const inLast = y => { const rivals = alive.filter(m => m.id !== y.id); return !R(y).eliminated && rivals.length > 0 && rivals.every(m => pts(m) >= pts(y)) && rivals.some(m => pts(m) > pts(y)); };

    if (J.coin) {                       // Dean & Jake tied above 0: once per week per tied score
      const [a, b] = J.coin.users.map(by);
      if (a && b && pts(a) > 0 && pts(a) === pts(b)) add('coin', `coin:${w}:${pts(a)}`, { pts: pts(a), a: a.id, b: b.id });
    }
    if (J.bluehair) {                   // Connor alone in first: once per week
      const c = by(J.bluehair.users[0]);
      if (c && pts(c) > 0 && members.every(m => m.id === c.id || pts(m) < pts(c))) add('bluehair', `bluehair:${w}`, { pts: pts(c), who: c.id });
    }
    if (J.iron) {                       // Saturday morning, Ayaad in last: once per week
      const y = by(J.iron.users[0]);
      if (y && inWindow(J.iron) && inLast(y)) add('iron', `iron:${w}`, { pts: pts(y), who: y.id });
    }
    if (J.liquor) {                     // Saturday morning, Gaurav in last: once per week
      const g = by(J.liquor.users[0]);
      if (g && inWindow(J.liquor) && inLast(g)) add('liquor', `liquor:${w}`, { pts: pts(g), who: g.id });
    }
    if (J.bag) {                        // Dean, Connor & Dylan all tied above 0: once per week per tied score
      const ms = J.bag.users.map(by);
      if (ms.length > 1 && ms.every(Boolean) && pts(ms[0]) > 0 && ms.every(m => pts(m) === pts(ms[0]))) add('bag', `bag:${w}:${pts(ms[0])}`, { pts: pts(ms[0]), who: ms.map(m => m.id) });
    }
    if (J.fight) {                      // Dylan tied for first above 0: once per week per tied score
      const d = by(J.fight.users[0]);
      if (d && pts(d) > 0 && members.every(m => pts(m) <= pts(d))) {
        const tied = members.filter(m => m.id !== d.id && pts(m) === pts(d));
        if (tied.length) add('fight', `fight:${w}:${pts(d)}`, { pts: pts(d), who: d.id, with: tied.map(m => m.id) });
      }
    }
    if (J.crashout) {                   // Connor calls cap on someone's post from this week: once per post
      const c = by(J.crashout.users[0]);
      if (c) for (const p of wk) if (p.memberId !== c.id && ((p.reactions || {})[cap] || []).includes(c.id)) add('crashout', `crashout:${p.id}`, { post: p.id, on: p.memberId, cat: p.cat, who: c.id });
    }
    if (J.satellite) {                  // Connor logs beers with the boys: once per post
      const c = by(J.satellite.users[0]);
      if (c) for (const p of wk) if (p.memberId === c.id && p.cat === 'beers' && !p.voided) add('satellite', `satellite:${p.id}`, { post: p.id, who: c.id, with: (p.witnesses || []).slice(0, 8) });
    }
    if (J.puke) {                       // Amaan alone in last: again each separate time he drops back there in a week
      const a = by(J.puke.users[0]);
      const soleLast = v => alive.length > 1 && alive.every(m => m.id === a.id || v(m) > v(a));
      if (a && !R(a).eliminated && soleLast(pts)) {
        const sum = {}, fraud = new Set(wk.filter(p => p.fraud).map(p => p.memberId));
        alive.forEach(m => { sum[m.id] = 0; });
        const v = m => (fraud.has(m.id) ? 0 : Math.round(sum[m.id] * 2) / 2);
        let n = 0, was = false;
        for (const p of wk) {           // replay the week in order and count the drops into last
          if (!(p.memberId in sum) || p.voided) continue;
          sum[p.memberId] += (CATS[p.cat] && CATS[p.cat].pts) || 0;
          const is = soleLast(v);
          if (is && !was) n++;
          was = is;
        }
        add('puke', `puke:${w}:${Math.max(1, n)}`, { pts: pts(a), who: a.id });
      }
    }
    if (J.mma) {                        // Amaan's 4th MMA session this week: once per week
      const a = by(J.mma.users[0]);
      const n = a ? wk.filter(p => p.memberId === a.id && p.cat === 'mma' && !p.voided).length : 0;
      if (a && n >= (J.mma.count || 4)) add('mma', `mma:${w}`, { n, who: a.id });
    }
    if (J.radiator) {                   // Jake hasn't logged in 4 days: once per dry spell
      const j = by(J.radiator.users[0]);
      if (j && !R(j).eliminated) {
        const last = logsOf(j).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
        const since = new Date(Math.max(+joinedAt(j), last ? +new Date(last.at) : 0)), days = Math.floor((now - since) / DAY);
        if (days >= (J.radiator.days || 4)) add('radiator', `radiator:${last ? last.id : 'start'}`, { days, since: since.toISOString(), who: j.id });
      }
    }
    if (J.mom) {                        // Sunday evening, Jake still short of the minimum: once per week
      const j = by(J.mom.users[0]);
      if (j && inWindow(J.mom) && !R(j).eliminated && pts(j) < min) add('mom', `mom:${w}`, { pts: pts(j), left: Math.round((min - pts(j)) * 2) / 2, who: j.id });
    }
    if (J.nets && S.lastComplete >= 0) { // Jake or Gaurav took a strike last week: once per week
      const lw = S.lastComplete, missed = J.nets.users.map(by).filter(m => m && (R(m).strikeWeeks || []).includes(lw));
      if (missed.length) add('nets', `nets:${lw}`, { week: lw, who: missed.map(m => m.id), pts: missed.map(m => R(m).weekPts[lw] || 0) });
    }
    if (J.phil) {                       // Philip logs after 3+ days without a log: once per post
      const ph = by(J.phil.users[0]);
      if (ph) {
        const mine = logsOf(ph).sort((a, b) => new Date(a.at) - new Date(b.at));
        mine.forEach((p, i) => {
          if (weekIdx(new Date(p.at), S.start) !== w) return;
          const prev = new Date(Math.max(+joinedAt(ph), i ? +new Date(mine[i - 1].at) : 0)), days = Math.floor((new Date(p.at) - prev) / DAY);
          if (days >= (J.phil.days || 3)) add('phil', `phil:${p.id}`, { post: p.id, days, who: ph.id });
        });
      }
    }
    if (J.scared) {                     // nobody has logged a date in 30 days: again every 30 days it goes on
      const last = Math.max(0, ...all.filter(p => p.cat === 'date' && !p.voided).map(p => +new Date(p.at)));
      const since = new Date(Math.max(+S.start, last)), days = Math.floor((now - since) / DAY), per = J.scared.days || 30;
      if (days >= per) add('scared', `scared:${dayKey(since)}:${Math.floor(days / per)}`, { days, since: since.toISOString() });
    }
    if (J.timesheet) {                  // Jake's post that gets him to the minimum lands on a Saturday or Sunday: once per week
      const j = by(J.timesheet.users[0]);
      const mine = j ? wk.filter(p => p.memberId === j.id) : [];
      if (j && !mine.some(p => p.fraud)) {
        let sum = 0;
        for (const p of mine) {
          if (p.voided) continue;
          const before = sum;
          sum += (CATS[p.cat] && CATS[p.cat].pts) || 0;
          if (before < min && sum >= min) {
            const day = zoned(new Date(p.at), tz).day;
            if ((J.timesheet.days || [6, 0]).includes(day)) add('timesheet', `timesheet:${w}`, { post: p.id, pts: Math.round(sum * 2) / 2, day, who: j.id });
            break;
          }
        }
      }
    }
    if (hoat) {
      const h = by(hoat.username);
      if (h && pts(h) >= hoat.min) add('hoat', `hoat:${w}`, { pts: pts(h), who: h.id });
    }
    return out;
  }

  /* Display names: while someone matches an alias (config.js ALIASES), the app shows that name instead. */
  function alias(m, calc, list) {
    const R = calc && calc.by[m.id], u = String(m.username || '').toLowerCase();
    if (!R || !list || calc.season.status !== 'live') return null;
    const a = list.find(x => x.username === u && R.thisWeek === x.pts);
    return a ? a.name : null;
  }

  /* The post that pushed someone to the weekly minimum, one per week (no stamp in a fraud week). */
  function crossings(posts, memberId, cfg) {
    const start = mondayOf(parseDay(cfg.seasonStart)), wk = {};
    posts.filter(p => p.memberId === memberId && p.cat).sort((a, b) => new Date(a.at) - new Date(b.at)).forEach(p => {
      const s = (wk[weekIdx(new Date(p.at), start)] = wk[weekIdx(new Date(p.at), start)] || { sum: 0, id: null, fraud: false });
      if (p.fraud) s.fraud = true;
      if (p.voided || s.id) return;
      s.sum += (CATS[p.cat] && CATS[p.cat].pts) || 0;
      if (s.sum >= cfg.weeklyMin) s.id = p.id;
    });
    return new Set(Object.values(wk).filter(s => s.id && !s.fraud).map(s => s.id));
  }

  return { compute, season, mondayOf, addDays, dayKey, parseDay, weekIdx, draftProblems, zoned, jokes, alias, crossings };
})();
