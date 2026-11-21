'use strict';
/* =====================================================================
   WINTER ARC · DATA LAYER  ←  SWAP THIS FILE FOR THE REAL BACKEND
   ---------------------------------------------------------------------
   Everything the app reads or writes goes through `Store`. This preview
   version fakes the whole group in this browser (localStorage). The
   hosted version implements the same methods on real sign-in, a shared
   database and photo storage. Nothing else in the app changes.
   HANDOFF.md has the full spec, tables and security rules.

   It's a closed group: every account is made ahead of time (or by the
   commissioner in Account → Members). There is no sign-up screen.

   Data model
     group  { name, seasonStart 'YYYY-MM-DD' (a Monday), seasonWeeks,
              weeklyMin, strikesOut, timezone (IANA, e.g. 'America/New_York':
              weeks end Sunday 11:59 PM there) }               one row
     user   { id, username, mustChangePassword }               sign-in
     member { id, userId, username, name, color, photo?, joinedWeek,
              role: 'member'|'commissioner' }
     post   { id, memberId, cat, at (ISO), minutes?, miles?, caption?,
              photo? (URL), witnesses: [memberId],
              reactions: { [emoji]: [memberId] }, voided, fraud }
     event  { id, type: 'coin'|'bluehair'|'iron'|'hoat', key (unique), at, data }
              inside jokes + the Hoat Guarantee (config.js); `seen` is per person
     prefs  { sundayReminder: bool, capAlerts: bool }

   Methods (async unless marked sync). Throw Error('friendly message') to
   show the person a toast.
     mode                         (prop) 'demo' here, 'live' when hosted
     init()                       restore the session, load data
     config()               sync  the group's season rules merged over config.js
   Sign-in
     getAuth()                    { signedIn, user: { id, username }|null,
                                    mustChangePassword }  true after a
                                    temporary password: they must pick their own
     signIn(username, password)
     setPassword(newPassword)     first sign-in, or Account → change password
     signOut()
   Profile + group
     getMe()                      your member record
     getGroup()                   the group row
     updateProfile(patch)         { name?, color?, photo? (data URL | null) }
     getPrefs(), updatePrefs(patch)
   Commissioner only (the server must check)
     updateGroup(patch)
     addFriend({ name, username })      → { username, tempPassword }
     resetPassword(memberId)            → { username, tempPassword }
     removeMember(id), makeCommissioner(id)   (hands the role over)
   Group data
     listMembers(), listPosts()
     uploadPhoto(dataUrl)         → URL
     addPost(post), deletePost(id)       delete: only your own
     toggleReaction(postId, emoji)       → updated post
     voidPost(id)                 commissioner: voided + fraud (rule 9)
     subscribe(fn)          sync  call fn when anyone else changes data
   Inside jokes
     listEvents()                 [{ ...event, seen }]  seen = by you
     recordEvent({ type, key, data, at })  no-op if the key exists → event
     markSeen(eventId)
   Preview only (ignored when hosted)
     demoRoster(), demoSignInAs(memberId), resetDemo()
   ===================================================================== */
const Store = (() => {
  const KEY = 'wa.demo.v4';
  const PASS = 'winterarc';
  let S = null;
  const subs = new Set();
  const notify = () => subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  const fail = msg => { throw new Error(msg); };

  /* three weeks of sample activity: two finished weeks and this one so far */
  const PLAN = [
    { osim: 'gym gym run run beers', amaan: 'gym gym gym run reading', ayaad: 'gym run beers', connor: 'gym gym run run date', dean: 'gym gym run run beers', dylan: 'run run gym reading beers jickle', gaurav: 'gym run volo soccer reading', jake: 'gym gym gym run volo jickle', philip: 'gym gym run run reading beers' },
    { osim: 'gym gym gym run reading jickle volo', amaan: 'gym gym run run beers', ayaad: 'gym gym run run reading', connor: 'gym gym gym run run', dean: 'date gym gym', dylan: 'gym gym run run reading', gaurav: 'gym gym run run beers', jake: 'gym run run run beers', philip: 'gym gym gym run soccer jickle' },
    // this week: Osim 5.5 (one gym from his stamp), Connor leads, Dean = Jake, Ayaad last
    { osim: 'gym run beers reading jickle', amaan: 'gym gym run run reading', ayaad: 'gym', connor: 'gym gym run date', dean: 'gym gym run beers reading', dylan: 'run gym reading', gaurav: 'gym beers soccer', jake: 'run run gym reading volo jickle', philip: 'gym gym run reading' },
  ];
  const CAPS = {
    gym: ['Chest day. Mirror selfie withheld for everyone’s safety.', 'Leg day survived. Stairs are a problem now.', 'Back and bis. Pump is unreal.', 'Hit a bench PR, no spotter needed.'],
    run: ['Cold one along the river.', 'Negative splits, baby.', 'Lungs: frozen. Spirit: unbroken.'],
    jickle: ['Dinked them into oblivion.', 'Won 11–7, humble about it.'],
    volo: ['Volo W. Spiked on a guy named Brad.', 'Team went 2–1 tonight.'],
    soccer: ['Pickup game. Two goals, one nutmeg.', 'Played keeper and survived.'],
    date: ['Dinner downtown. She laughed at my jokes.', 'Mini golf date. I let her win. (I did not.)'],
    beers: ['Thursday beers with the fellas.', 'The fellas showed up. Good night.'],
    reading: ['20 pages of Meditations.', 'Finished chapter 6. No spoilers.'],
  };
  const EMO = ['\u{1F525}', '\u{1F4AA}', '\u{1F44F}', '\u{1F602}'];
  const COLORS = ['#7254DC', '#F2853A', '#2FA36B', '#2F66E6', '#EE5982', '#1FA3A0', '#B45AC8', '#E39A2E', '#D9644F'];

  function seed(now = new Date()) {
    const curMon = Logic.mondayOf(now), start = Logic.addDays(curMon, -14);
    const group = { name: 'Winter Arc', seasonStart: Logic.dayKey(start), seasonWeeks: CONFIG.seasonWeeks, weeklyMin: CONFIG.weeklyMin, strikesOut: CONFIG.strikesOut, timezone: localZone() };
    const accounts = ROSTER.map(r => ({ id: 'u_' + r.username, username: r.username, password: PASS, mustChange: r.role !== 'commissioner' }));
    const members = ROSTER.map(r => ({ id: 'm_' + r.username, userId: 'u_' + r.username, username: r.username, name: r.name, color: r.color, joinedWeek: 0, role: r.role || 'member' }));
    const ids = members.map(m => m.id), posts = [];
    const todayWd = (now.getDay() + 6) % 7;
    PLAN.forEach((plan, w) => {
      ROSTER.forEach(({ username: key }, mi) => {
        const list = (plan[key] || '').split(' ').filter(Boolean), n = list.length;
        list.forEach((cat, pi) => {
          let day = Math.min(6, Math.floor((pi * 7) / n) + ((mi + pi) % 2)), hour = 6 + ((pi * 5 + mi * 3) % 15);
          if (w === 2) {
            day = Math.min(todayWd, Math.floor((pi * (todayWd + 1)) / n));
            if (day === todayWd && hour >= now.getHours()) { hour = now.getHours() - 1 - (pi % 3); if (hour < 0) { if (day === 0) { hour = 0; } else { day -= 1; hour = 18; } } }
          }
          const at = Logic.addDays(Logic.addDays(start, w * 7), day); at.setHours(hour, (pi * 17 + mi * 7) % 60, 0, 0);
          if (at > now) at.setTime(+now - (pi + 1) * 6e4);
          const me = 'm_' + key, others = ids.filter(x => x !== me);
          const p = { id: `p_${w}_${key}_${pi}`, memberId: me, cat, at: at.toISOString(), witnesses: [], reactions: {}, voided: false, fraud: false };
          if (cat === 'gym') p.minutes = 50 + ((pi * 7 + mi * 11) % 30);
          if (cat === 'run') p.miles = Math.round((2 + ((pi * 37 + mi * 13) % 25) / 10) * 10) / 10;
          if (cat === 'beers') p.witnesses = [others[(pi + mi) % others.length], others[(pi + mi + 2) % others.length]];
          else if (['jickle', 'volo', 'soccer'].includes(cat) && (pi + mi) % 2) p.witnesses = [others[(pi * 3 + mi) % others.length]];
          else p.photo = 'demo:' + cat;
          if ((pi + mi + w) % 3 !== 2) p.caption = CAPS[cat][(pi + mi) % CAPS[cat].length];
          const R = U.rng(mi * 31 + pi * 7 + w * 101);
          others.forEach(o => { if (R() < 0.3) { const e = EMO[Math.floor(R() * EMO.length)]; (p.reactions[e] = p.reactions[e] || []).push(o); } });
          posts.push(p);
        });
      });
    });
    return { v: 4, seedMonday: Logic.dayKey(curMon), group, accounts, members, posts, events: [], seen: {}, prefs: {}, session: null };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) {
      const slim = p => (p.photo && p.photo.startsWith('data:') ? Object.assign({}, p, { photo: undefined }) : p);
      try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, S, { posts: S.posts.map(slim), members: S.members.map(slim) }))); } catch (e2) { /* no storage: keep in memory */ }
    }
  }
  const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const tick = () => new Promise(r => setTimeout(r, 120)); // feels like a network call
  const localZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'; } catch (e) { return 'America/New_York'; } };
  const user = () => (S.session ? S.accounts.find(a => a.id === S.session.userId) || null : null);
  const me = () => { const u = user(); return u ? S.members.find(m => m.userId === u.id) || null : null; };
  const needMe = () => me() || fail('Sign in first.');
  const needComm = () => { const m = needMe(); if (m.role !== 'commissioner') fail('Only the commissioner can do that.'); return m; };
  const normUser = u => String(u || '').trim().toLowerCase().replace(/\s+/g, '');
  const cleanName = n => { const c = String(n || '').trim().replace(/\s+/g, ' ').slice(0, 24); if (!c) fail('Add a name first.'); return c; };
  const WORDS = ['toga', 'flex', 'zeus', 'laurel', 'marble', 'olympus', 'iron', 'cloud', 'sandal', 'column', 'torch', 'atlas'];
  const tempPassword = () => { const r = n => Math.floor(Math.random() * n); return `${WORDS[r(WORDS.length)]}-${WORDS[r(WORDS.length)]}-${10 + r(90)}`; };
  function checkSettings(st) {
    const name = String(st.name || '').trim().slice(0, 32) || 'Winter Arc';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(st.seasonStart || '')) fail('Pick the first Monday of the season.');
    const wk = Math.round(+st.seasonWeeks), mn = +st.weeklyMin, sk = Math.round(+st.strikesOut);
    if (!(wk >= 1 && wk <= 52)) fail('The season can run 1 to 52 weeks.');
    if (!(mn >= 1 && mn <= 50)) fail('The weekly minimum has to be between 1 and 50 points.');
    if (!(sk >= 1 && sk <= 10)) fail('Strikes to be eliminated has to be between 1 and 10.');
    return { name, seasonStart: Logic.dayKey(Logic.mondayOf(Logic.parseDay(st.seasonStart))), seasonWeeks: wk, weeklyMin: mn, strikesOut: sk, timezone: st.timezone || localZone() };
  }

  const api = {
    mode: 'demo',
    async init() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
      const cur = Logic.dayKey(Logic.mondayOf(new Date()));
      S = saved && saved.v === 4 && saved.seedMonday === cur ? saved : seed();
      save();
    },
    config() { const g = S && S.group; return Object.assign({}, CONFIG, g ? { seasonStart: g.seasonStart, seasonWeeks: g.seasonWeeks, weeklyMin: g.weeklyMin, strikesOut: g.strikesOut } : {}); },

    /* ---------------- sign-in ---------------- */
    async getAuth() { const u = user(); return { signedIn: !!u, user: u ? { id: u.id, username: u.username } : null, mustChangePassword: !!(u && u.mustChange) }; },
    async signIn(username, password) {
      await tick();
      const un = normUser(username);
      if (!un) fail('Type your username.');
      if (!password) fail('Type your password.');
      const a = S.accounts.find(x => x.username === un);
      if (!a || a.password !== password) fail('That username and password don’t match.');
      S.session = { userId: a.id }; save();
    },
    async setPassword(pw) {
      await tick();
      const u = user() || fail('Sign in first.');
      if (String(pw || '').length < 8) fail('Use at least 8 characters for your password.');
      if (u.mustChange && pw === u.password) fail('Pick your own password, not the temporary one.');
      u.password = pw; u.mustChange = false; save();
    },
    async signOut() { S.session = null; save(); },

    /* ---------------- profile + group ---------------- */
    async getMe() { return clone(me()); },
    async getGroup() { return clone(S.group); },
    async updateProfile(patch) {
      await tick();
      const m = needMe();
      if ('name' in patch) m.name = cleanName(patch.name);
      if ('color' in patch && COLORS.includes(patch.color)) m.color = patch.color;
      if ('photo' in patch) { if (patch.photo) m.photo = await api.uploadPhoto(patch.photo); else delete m.photo; }
      save(); notify(); return clone(m);
    },
    async getPrefs() { const u = user(); return Object.assign({ sundayReminder: true, capAlerts: true }, u ? S.prefs[u.id] : {}); },
    async updatePrefs(patch) { const u = user() || fail('Sign in first.'); S.prefs[u.id] = Object.assign(await api.getPrefs(), patch); save(); return clone(S.prefs[u.id]); },

    /* ---------------- commissioner ---------------- */
    async updateGroup(patch) { await tick(); needComm(); Object.assign(S.group, checkSettings(Object.assign({}, S.group, patch))); save(); notify(); return clone(S.group); },
    async addFriend({ name, username }) {
      await tick(); needComm();
      const n = cleanName(name), un = normUser(username || name);
      if (!/^[a-z0-9._-]{2,20}$/.test(un)) fail('Usernames are 2–20 letters or numbers, no spaces.');
      if (S.accounts.some(a => a.username === un)) fail('Someone already has that username.');
      const tp = tempPassword(), id = Date.now().toString(36);
      S.accounts.push({ id: 'u_' + id, username: un, password: tp, mustChange: true });
      const se = Logic.season(api.config());
      S.members.push({ id: 'm_' + id, userId: 'u_' + id, username: un, name: n, color: COLORS[S.members.length % COLORS.length], joinedWeek: se.status === 'live' ? se.idx : 0, role: 'member' });
      save(); notify();
      return { username: un, tempPassword: tp };
    },
    async resetPassword(memberId) {
      await tick(); needComm();
      const m = S.members.find(x => x.id === memberId) || fail('They’re not in the group.');
      const a = S.accounts.find(x => x.id === m.userId) || fail('They don’t have a sign-in.');
      const tp = tempPassword(); a.password = tp; a.mustChange = true; save();
      return { username: a.username, tempPassword: tp };
    },
    async removeMember(id) {
      await tick(); const m = needComm();
      const t = S.members.find(x => x.id === id) || fail('They’re not in the group.');
      if (t.id === m.id) fail('Hand the commissioner role to someone first.');
      S.posts = S.posts.filter(p => p.memberId !== t.id);
      S.posts.forEach(p => { p.witnesses = p.witnesses.filter(w => w !== t.id); Object.keys(p.reactions).forEach(e => { p.reactions[e] = p.reactions[e].filter(x => x !== t.id); }); });
      S.members = S.members.filter(x => x.id !== t.id);
      S.accounts = S.accounts.filter(a => a.id !== t.userId);
      save(); notify();
    },
    async makeCommissioner(id) {
      await tick(); const m = needComm();
      const t = S.members.find(x => x.id === id) || fail('They’re not in the group.');
      t.role = 'commissioner'; if (t.id !== m.id) m.role = 'member'; save(); notify();
    },

    /* ---------------- group data ---------------- */
    async listMembers() { return me() ? clone(S.members) : []; },
    async listPosts() { return me() ? clone(S.posts) : []; },
    async uploadPhoto(dataUrl) { return dataUrl; },
    async addPost(post) { const m = needMe(); const p = Object.assign(clone(post), { memberId: m.id }); S.posts.push(p); save(); return clone(p); },
    async deletePost(id) { const m = needMe(); S.posts = S.posts.filter(p => !(p.id === id && p.memberId === m.id)); save(); },
    async toggleReaction(postId, emoji) {
      const m = me(); const p = S.posts.find(x => x.id === postId); if (!p || !m) return null;
      const list = (p.reactions[emoji] = p.reactions[emoji] || []), i = list.indexOf(m.id);
      if (i >= 0) list.splice(i, 1); else list.push(m.id);
      save(); return clone(p);
    },
    async voidPost(id) { needComm(); const p = S.posts.find(x => x.id === id); if (p) { p.voided = true; p.fraud = true; save(); } },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    /* ---------------- inside jokes ---------------- */
    async listEvents() {
      const u = user(); if (!u || !me()) return [];
      const seen = new Set(S.seen[u.id] || []);
      return S.events.map(e => Object.assign(clone(e), { seen: seen.has(e.id) }));
    },
    async recordEvent(ev) {
      needMe();
      const have = S.events.find(e => e.key === ev.key);
      if (have) return clone(have);
      const e = { id: 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), type: ev.type, key: ev.key, at: ev.at || new Date().toISOString(), data: clone(ev.data || {}) };
      S.events.push(e); save(); return clone(e);
    },
    async markSeen(id) { const u = user(); if (!u) return; const list = (S.seen[u.id] = S.seen[u.id] || []); if (!list.includes(id)) list.push(id); save(); },

    /* ---------------- preview helpers ---------------- */
    demoRoster() { return S.members.map(m => ({ id: m.id, username: m.username, name: m.name, color: m.color, photo: m.photo, role: m.role })); },
    async demoSignInAs(memberId) {   // skips the password, and the "pick your own password" step
      const m = S.members.find(x => x.id === memberId); if (!m) return;
      const a = S.accounts.find(x => x.id === m.userId); if (a) a.mustChange = false;
      S.session = { userId: m.userId }; save();
    },
    async resetDemo() { S = seed(); save(); notify(); },
  };
  return api;
})();
