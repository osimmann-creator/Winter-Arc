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
     Each key is recorded once (the store ignores repeats).
     hoat = { username, min }: also the Hoat Guarantee (that person reached the weekly minimum). */
  function jokes(members, calc, J, now = new Date(), tz, hoat) {
    const out = [], S = calc.season;
    if (S.status !== 'live' || !J) return out;
    const w = S.idx, by = u => members.find(m => String(m.username || '').toLowerCase() === u);
    const pts = m => calc.by[m.id].thisWeek;
    const at = now.toISOString();   // stamped when it's first noticed (right after the post that caused it)
    if (J.coin) {
      const [a, b] = J.coin.users.map(by);
      if (a && b && pts(a) > 0 && pts(a) === pts(b)) out.push({ type: 'coin', key: `coin:${w}:${pts(a)}`, data: { week: w, pts: pts(a), a: a.id, b: b.id }, at });
    }
    if (J.bluehair) {
      const c = by(J.bluehair.users[0]);
      if (c && pts(c) > 0 && members.every(m => m.id === c.id || pts(m) < pts(c))) out.push({ type: 'bluehair', key: `bluehair:${w}`, data: { week: w, pts: pts(c), who: c.id }, at });
    }
    if (J.iron) {
      const z = zoned(now, tz), y = by(J.iron.users[0]);
      if (y && z.day === J.iron.day && z.hour >= J.iron.from && z.hour < J.iron.to && !calc.by[y.id].eliminated) {
        const rivals = members.filter(m => m.id !== y.id && !calc.by[m.id].eliminated);
        if (rivals.length && rivals.every(m => pts(m) >= pts(y)) && rivals.some(m => pts(m) > pts(y))) out.push({ type: 'iron', key: `iron:${w}`, data: { week: w, pts: pts(y), who: y.id }, at });
      }
    }
    if (hoat) {
      const h = by(hoat.username);
      if (h && pts(h) >= hoat.min) out.push({ type: 'hoat', key: `hoat:${w}`, data: { week: w, pts: pts(h), who: h.id }, at });
    }
    return out;
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

  return { compute, season, mondayOf, addDays, dayKey, parseDay, weekIdx, draftProblems, zoned, jokes, crossings };
})();
