'use strict';
/* =====================================================================
   WINTER ARC · screens and interactions
   ===================================================================== */
const App = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const S = { tab: 'home', board: 'week', messages: [], comments: {}, feedReactions: {}, activeInjuries: [], me: null, group: null, members: [], posts: [], events: [], calc: null, draft: null, ringFrom: null, busy: false,
    acct: null, prefs: null, lastUser: '', profileTrail: [] };
  const pendingCommentHearts = new Set();
  const pendingFeedReactions = new Set();
  const pendingPollVotes = new Set();
  let feedRefreshing = false;
  const COLORS = ['#7254DC', '#F2853A', '#2FA36B', '#2F66E6', '#EE5982', '#1FA3A0', '#B45AC8', '#E39A2E', '#D9644F'];
  const isDemo = () => Store.mode === 'demo';
  const cfg = () => ({ ...Store.config(), injuryPeriods: S.injuryPeriods });
  const view = () => $('#view');
  const scrollToTop = (behavior = 'instant') => $('#app').scrollTo({ top: 0, behavior });
  const ic = (n, cls) => Art.ui(n, cls);
  const member = id => S.members.find(m => m.id === id);
  const openProfileMember = () => member(S.profileTrail.at(-1)?.id);
  const isComm = () => !!(S.me && member(S.me.id) && member(S.me.id).role === 'commissioner');
  const displayName = m => m ? Logic.displayName(m, S.calc) : 'Someone';
  const nameOf = id => (S.me && id === S.me.id ? 'You' : displayName(member(id)));
  const catName = cat => CATS[cat].short || CATS[cat].label;
  const fmtDay = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: cfg().timezone });
  const fmtRange = (a, b) => fmtDay(a) + ' – ' + fmtDay(Logic.addDays(b, -1, cfg().timezone));
  function fmtLeft(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return (d ? d + 'd ' : '') + [h, m, s % 60].map(v => String(v).padStart(2, '0')).join(':');
  }
  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 172800) return 'yesterday'; if (s < 604800) return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' });
    return fmtDay(iso);
  }
  const ptsWord = v => (v === 1 ? 'point' : 'points');
  const fmtPace = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  function parsePace(value) {
    if (!value.trim()) return null;
    const match = /^([0-9]{1,3}):([0-5][0-9])$/.exec(value.trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) || NaN : NaN;
  }
  function avatar(id, size = 40) {
    const m = member(id) || {};
    return bigAv(m.name, m.color || '#1E8FFF', m.photo, size);
  }
  function profileButton(id, content, cls = '') {
    const m = member(id), own = id === S.me?.id;
    if (!m || id === openProfileMember()?.id || (own && S.tab === 'me' && !S.profileTrail.length)) {
      return `<span class="${cls}">${content}</span>`;
    }
    const label = own ? 'View your profile' : `View ${displayName(m)}’s profile`;
    return `<button type="button" class="profile-trigger ${cls}" data-act="member-profile" data-id="${esc(id)}" aria-label="${esc(label)}">${content}</button>`;
  }
  const coin = (pts, cls = '') => `<span class="coin ${cls}">+${fmtPts(pts)}</span>`;
  const postPoints = post => post.voided || S.calc.cappedPosts.has(post.id) ? 0 : CATS[post.cat].pts;
  const catChip = cat => `<span class="cchip" style="--c:${CATS[cat].color}">${Art.icon64(cat)}${esc(catName(cat))}</span>`;

  async function load() {
    S.auth = await Store.getAuth();
    const inn = !!(S.auth && S.auth.signedIn && !S.auth.mustChangePassword);
    S.me = inn ? await Store.getMe() : null;
    S.group = S.me ? await Store.getGroup() : null;
    // Naughty or Nice: the ballot on Dec 24, the results from Dec 25 (asking for them also records the xmas event)
    const xmasOn = !!S.me && Logic.xmasPhase(new Date(), cfg().timezone).phase !== 'closed';
    let [members, posts, events, social, xmas] = S.me
      ? await Promise.all([Store.listMembers(), Store.listPosts(), Store.listEvents(), Store.listSocial(),
        xmasOn ? Store.getXmas().catch(err => { console.warn('Could not load Naughty or Nice', err); return null; }) : null])
      : [[], [], [], { messages: [], comments: [], activeInjuries: [] }, null];
    if (xmas && xmas.phase === 'reveal' && xmas.voted.length && !events.some(e => e.key === 'xmas:' + xmas.year)) events = await Store.listEvents();
    S.xmas = xmas;
    S.members = members;
    if (S.me && !S.members.some(m => m.id === S.me.id)) S.me = null;
    if (!S.me) S.profileTrail.length = 0;
    else while (S.profileTrail.length && !openProfileMember()) S.profileTrail.pop();
    S.posts = posts;
    S.events = events;
    S.messages = social.messages;
    S.polls = social.polls || [];
    S.feedReactions = social.feedReactions || {};
    S.activeInjuries = social.activeInjuries;
    S.injuryPeriods = social.injuryPeriods || [];
    S.comments = {};
    for (const comment of social.comments) (S.comments[comment.kind + ':' + comment.target] ||= []).push(comment);
    S.calc = Logic.compute(S.members, S.posts, cfg(), new Date());
  }
  /** In the app proper (tabs showing), as opposed to the sign-in screens. */
  const inApp = () => !!(S.me && !(S.auth && S.auth.mustChangePassword));

  // Keep the header outside the scrolling feed. Only the editor and the feed's
  // bottom clearance need to respond to the keyboard.
  let keyboardFrame = 0, keyboardField = null;
  function syncKeyboard() {
    if (!window.visualViewport || keyboardFrame) return;
    keyboardFrame = requestAnimationFrame(() => {
      keyboardFrame = 0;
      const viewport = window.visualViewport, field = document.activeElement, body = document.body;
      const app = $('#app');
      const typing = app.contains(field) && field.matches('textarea, input:not([type]), input:is([type="text"], [type="password"], [type="number"], [type="email"], [type="search"], [type="url"], [type="tel"])');
      // The feed scrolls independently, including when the browser reveals a field.
      if (viewport.scale <= 1.01 && window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
      const keyboard = typing && viewport.scale <= 1.01 && document.documentElement.clientHeight - viewport.height > 100;
      body.classList.toggle('keyboard-open', !!keyboard);
      if (!keyboard) {
        app.style.removeProperty('--keyboard-bottom');
        keyboardField = null;
        return;
      }
      const frame = app.getBoundingClientRect();
      const visibleTop = Math.max(frame.top + 18, viewport.offsetTop);
      const visibleBottom = Math.min(frame.bottom, viewport.offsetTop + viewport.height);
      const bottomInset = `${Math.round(frame.bottom - visibleBottom)}px`;
      if (keyboardField === field && app.style.getPropertyValue('--keyboard-bottom') === bottomInset) return;

      keyboardField = field;
      app.style.setProperty('--keyboard-bottom', bottomInset);
      const editor = field.closest('.feed-comment') || field;
      const bounds = editor.getBoundingClientRect();
      const bottom = visibleBottom - 12;
      const top = Math.min(bottom - bounds.height, visibleTop + 12);
      if (bounds.bottom > bottom) app.scrollTop += bounds.bottom - bottom;
      else if (bounds.top < top) app.scrollTop -= top - bounds.top;
    });
  }

  /* ------------------------------------------------------------ render */
  function render() {
    const app = inApp();
    document.body.classList.toggle('signed-out', !app);
    $('#sampleChip').hidden = !isDemo();
    const mb = $('#meBtn'); mb.hidden = !app; mb.innerHTML = app ? avatar(S.me.id, 36) : '';
    renderView(); navState();
  }
  function renderView() {
    const v = view(), profile = openProfileMember();
    if (S.auth?.signedIn && S.auth.mustChangePassword) v.innerHTML = vSetPassword();
    else if (!inApp()) v.innerHTML = vSignedOut();
    else if (profile) v.innerHTML = vProfile(profile);
    else v.innerHTML = S.tab === 'feed' ? vFeed() : S.tab === 'board' ? vBoard() : S.tab === 'me' ? vProfile(member(S.me.id)) : S.tab === 'account' ? vAccount() : vHome();
    syncKeyboard();
  }
  function navState() {
    $$('.tabs [data-tab]').forEach(b => { if (b.dataset.tab === S.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  function go(tab) {
    if (!inApp()) return;
    if (S.tab === tab && !S.profileTrail.length) { scrollToTop('smooth'); return; }
    S.profileTrail.length = 0;
    S.tab = tab; renderView(); scrollToTop(); navState();
  }
  function openMemberProfile(id) {
    if (!inApp() || !member(id) || id === openProfileMember()?.id) return;
    if (id === S.me.id) { go('me'); return; }
    S.profileTrail.push({ id, scrollTop: $('#app').scrollTop });
    renderView(); scrollToTop();
    $('#profileName').focus({ preventScroll: true });
  }
  function backFromProfile() {
    const previous = S.profileTrail.pop();
    if (!previous) return;
    renderView();
    $('#app').scrollTo({ top: previous.scrollTop, behavior: 'instant' });
    view().focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------ home */
  function mascotState(R, se, left) {
    const min = R.goal, behind = left > 0 && se.msLeft < 2 * 864e5;
    if (se.status === 'pre') return ['point', `The Winter Arc starts ${fmtDay(se.start)}. Stretch those biceps.`];
    if (se.status === 'over') {
      const w = S.calc.winners.map(id => nameOf(id));
      return ['cheer', w.length ? `It’s over! ${w.join(', ')} ${w.length > 1 ? 'are' : 'is'} the stuff of legend.` : 'The Winter Arc is over. Legends were made.'];
    }
    if (R.eliminated) return ['shrug', 'You’re out, champ. All-time points still decide it if nobody survives, so keep stacking.'];
    if (left > 0 && R.injuryWeeks.has(se.idx)) return ['thumbs', 'This week is exempt from strikes while you recover.'];
    if (left <= 0) return ['flex', R.thisWeek >= min * 2 ? 'Double the minimum? Zeus is taking notes.' : 'Safe this week! Anything more is bonus glory.'];
    if (behind) return ['shrug', `${fmtPts(left)} ${ptsWord(left)} to go and the clock is ticking. Move, champ!`];
    if (R.strikes >= 1) return ['wave', `One strike already. ${fmtPts(left)} more ${ptsWord(left)} and this week is safe.`];
    return ['wave', `${fmtPts(left)} more ${ptsWord(left)} and you’re safe this week, champ.`];
  }
  function ringSVG(pts, min) {
    const r = 52, C = 2 * Math.PI * r, k = Math.min(pts, min) / min, over = U.clamp((pts - min) / min);
    const ticks = Array.from({ length: min }, (_, i) => `<line x1="64" y1="3" x2="64" y2="17" transform="rotate(${((i / min) * 360).toFixed(2)} 64 64)"/>`).join('');
    return `<div class="ring" role="img" aria-label="${fmtPts(pts)} of ${min} points this week">
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle class="track" cx="64" cy="64" r="${r}"/>
        <circle class="fill${pts >= min ? ' done' : ''}" id="ringFill" cx="64" cy="64" r="${r}" stroke-dasharray="${C.toFixed(2)}" style="stroke-dashoffset:${(C * (1 - k)).toFixed(2)}"/>
        <circle class="over" id="ringOver" cx="64" cy="64" r="${r}" stroke-dasharray="${C.toFixed(2)}" style="stroke-dashoffset:${(C * (1 - over)).toFixed(2)}"/>
        <g class="ticks">${ticks}</g>
        <circle class="rim" cx="64" cy="64" r="61"/><circle class="rim" cx="64" cy="64" r="43"/>
      </svg>
      <div class="ring-num"><b id="ringNum">${fmtPts(pts)}</b><span>of ${min}</span></div>
    </div>`;
  }
  function setRing(pts) {
    const min = S.calc.by[S.me.id].goal, C = 2 * Math.PI * 52, f = $('#ringFill'), o = $('#ringOver'); if (!f) return;
    f.style.strokeDashoffset = (C * (1 - Math.min(pts, min) / min)).toFixed(2);
    o.style.strokeDashoffset = (C * (1 - U.clamp((pts - min) / min))).toFixed(2);
    f.classList.toggle('done', pts >= min);
    $('.ring').setAttribute('aria-label', `${fmtPts(pts)} of ${min} points this week`);
  }
  function countUp(el, from, to, dur = 1000) {
    if (!el) return; const t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmtPts(Math.round((from + (to - from) * e) * 2) / 2); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function strikesHTML(R) {
    const n = cfg().strikesOut;
    return `<span class="strikes" role="img" aria-label="${R.strikes} of ${n} strikes">${Array.from({ length: n }, (_, i) => `<i class="${i < R.strikes ? 'on' : ''}">${i < R.strikes ? ic('x') : ''}</i>`).join('')}</span>`;
  }
  const miniRow = p => `<li>${profileButton(p.memberId, avatar(p.memberId, 34))}<span class="mtxt"><b>${esc(nameOf(p.memberId))}</b> ${esc(catName(p.cat).toLowerCase() === 'beers' ? 'had beers with the fellas' : 'logged ' + catName(p.cat))}<small>${ago(p.at)}</small></span><span class="mic" style="--c:${CATS[p.cat].color}">${Art.icon64(p.cat)}</span>${coin(postPoints(p), 'sm')}</li>`;
  function vHome() {
    const C = S.calc, se = C.season, R = C.by[S.me.id], min = R.goal;
    const pts = S.ringFrom != null ? S.ringFrom : R.thisWeek, left = Math.max(0, min - R.thisWeek);
    const chip = se.status === 'pre' ? ['pre', 'Starts ' + fmtDay(se.start)] : se.status === 'over' ? ['over', 'Season over']
      : R.eliminated ? ['out', 'Eliminated'] : R.thisWeek >= min ? ['safe', isHoat() ? 'Hoat guaranteed' : 'Safe this week']
      : R.injuryWeeks.has(se.idx) ? ['safe', 'Injury exemption'] : ['todo', `${fmtPts(left)} to go`];
    const [pose, line] = mascotState(R, se, left);
    const recent = S.posts.filter(p => !p.voided && Logic.weekIdx(new Date(p.at), se.start) === se.idx).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 4);
    return `<section class="screen home" aria-labelledby="hT">
  <h1 id="hT" class="sr">Home</h1>
  ${xmasNudgeHTML()}
  ${roastHTML(roastToday())}
  <div class="greet"><img class="mascot" src="${Art.mascot(pose, S.me.username)}" alt="" width="338" height="640"><p class="bubble">${esc(line)}</p></div>
  <div class="card ringcard">
    ${isHoat() && R.thisWeek >= min && se.status === 'live' ? `<span class="hoat-mini${pts >= min ? ' on' : ''}" role="img" aria-label="${esc(HOAT.text)}">${Art.hoatStamp()}</span>` : ''}
    ${ringSVG(pts, min)}
    <div class="ring-info">
      <p class="eyebrow">${se.status === 'pre' ? 'Preseason' : `Week ${se.idx + 1} of ${se.weeks}`}</p>
      <p class="dates">${fmtRange(se.wkStart, se.wkEnd)}</p>
      <span class="chip ${chip[0]}">${chip[1]}</span>
      <p class="cd">${ic('clock')}<span>${se.status === 'pre' ? 'Starts in' : se.status === 'over' ? 'Final week ended' : 'Ends Sun 11:59 PM'}</span><b id="cd">${se.status === 'over' ? fmtRange(se.wkStart, se.wkEnd) : fmtLeft(se.msLeft)}</b></p>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><span class="flame">${Art.icon64('flame')}</span><b>${R.streak}</b><small>day streak</small></div>
    <div class="stat">${strikesHTML(R)}<small>${R.eliminated ? 'eliminated' : 'strikes'}</small></div>
    <div class="stat"><span class="shield">${Art.icon64('shield')}</span><b>${R.safeWeeks}</b><small>weeks safe</small></div>
  </div>
  <button class="btn btn-log" data-act="log">${ic('plus')}<span>Log an activity</span></button>
  <div class="card standing">
    <h2>Still standing <small>${C.alive.length} of ${S.members.length}</small></h2>
    <div class="avs">${S.members.map(m => {
      const out = C.by[m.id].eliminated;
      return profileButton(m.id, `${avatar(m.id, 46)}${out ? `<i class="xmark">${ic('x')}</i>` : ''}<small>${esc(nameOf(m.id))}</small>`, out ? 'sv out' : 'sv');
    }).join('')}</div>
    <p class="note">Two strikes and you’re out. Survivors win the Winter Arc.</p>
  </div>
  <div class="card recent">
    <div class="row-h"><h2>This week</h2><button class="link" data-act="tab" data-tab="feed">See the feed ${ic('chevron')}</button></div>
    ${recent.length ? `<ul class="mini">${recent.map(miniRow).join('')}</ul>` : '<p class="note">Nothing logged yet this week. Be first.</p>'}
  </div>
</section>`;
  }

  /* ------------------------------------------------------------ roast of the day (js/jokes.js) */
  /* One roast a day, the same for everyone. The server picks it and saves it as an event
     (type 'roast', key 'roast:YYYY-MM-DD' in the group's time zone). Until that comes back
     this phone shows its own pick, which comes out the same from the same posts. Nobody on
     the injury report gets roasted. */
  const roastExclusions = () => new Set(S.activeInjuries.map(report => report.memberId));
  const savedRoast = e => e && e.type === 'roast' && e.data && typeof e.data.text === 'string';
  function roastToday() {
    if (!Array.isArray(S.activeInjuries)) return null;
    const now = new Date(), tz = cfg().timezone, day = Logic.dayKey(now, tz);
    const saved = S.events.find(e => savedRoast(e) && e.key === 'roast:' + day);
    if (saved) return Object.assign({}, saved.data, { day });
    if (S.roast && S.roast.day === day) return S.roast.none ? null : S.roast;
    try {
      const excluded = roastExclusions();
      // the saved roasts are the history; if the server can't save them, replay the season on this phone
      const hist = S.roastLocal ? Jokes.replay(S.members, S.posts, cfg(), now, Logic.parseDay(cfg().seasonStart, tz), excluded)
        : S.events.filter(savedRoast).map(e => Object.assign({}, e.data, { day: e.key.slice(6) }));
      const r = Jokes.today(S.members, S.posts, cfg(), now, hist, excluded);
      S.roast = r || { day, none: true };
      if (r && !S.roastLocal) saveRoast(r);
      return r;
    } catch (e) { console.error(e); return null; }
  }
  async function saveRoast(r) {
    let ev;
    try { ev = await Store.recordEvent({ type: 'roast', key: 'roast:' + r.day }); }
    catch (err) {   // the server couldn't pick or save it: every phone works it out from the posts instead
      console.warn('Could not save the roast of the day', err);
      S.roastLocal = true; S.roast = null; swapRoast(); return;
    }
    if (!savedRoast(ev)) return;   // nothing saved for today (yet): keep this phone's pick
    if (!S.events.some(e => e.key === ev.key)) S.events.push(ev);
    if (ev.data.text !== r.text || ev.data.n !== r.n || !!ev.data.rerun !== !!r.rerun) swapRoast();
  }
  function swapRoast() { const el = $('.roast'); if (el) el.outerHTML = roastHTML(roastToday(), true); }
  function roastHTML(r, swap) {
    if (!r) return '';
    const m = member(r.who) || {}, tag = S.me && r.who === S.me.id ? 'You got roasted' : 'Roast of the day';
    const no = r.n ? (r.rerun ? `Rerun #${r.n}` : `#${r.n}`) : '';
    return `<section class="roast${swap ? ' swap' : ''}" style="--c:${m.color || '#E9566C'}" aria-label="${esc(no ? `${tag}, ${no}` : tag)}">
    <span class="roast-tag">${Art.icon64('flame')}<span>${tag}</span></span>
    ${no ? `<span class="roast-no">${no}</span>` : ''}
    ${avatar(r.who, 52)}
    <p class="roast-txt">${Jokes.html(r)}</p>
  </section>`;
  }

  /* ------------------------------------------------------------ feed */
  const seg = (name, opts, cur) => `<div class="seg" role="tablist" aria-label="${name}">${opts.map(([v, l]) => `<button role="tab" aria-selected="${v === cur}" data-act="seg" data-seg="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const findComment = id => Object.values(S.comments).flat().find(comment => comment.id === id);
  function reactionsHTML(kind, id, reactions = S.feedReactions[kind + ':' + id] || {}) {
    return `<div class="rx">${REACTIONS.map(emoji => {
      const who = reactions[emoji] || [], on = who.includes(S.me.id);
      const key = `${kind}:${id}:${emoji}`;
      return `<button type="button" class="${on ? 'on' : ''}" data-act="react" data-kind="${kind}"
        data-id="${esc(id)}" data-e="${emoji}" aria-pressed="${on}" aria-label="${emoji === CAP && kind === 'activity' ? 'Call cap on this post' : 'React ' + emoji}"${pendingFeedReactions.has(key) ? ' disabled' : ''}>${emoji}<span>${who.length || ''}</span></button>`;
    }).join('')}</div>`;
  }
  function commentsHTML(kind, id) {
    const comments = S.comments[kind + ':' + id] || [];
    return `<div class="feed-comments">
      ${comments.length ? `<ul>${comments.map(c => `<li>
        ${profileButton(c.memberId, avatar(c.memberId, 25))}
        <div class="comment-copy"><b>${esc(displayName(member(c.memberId)))}</b> <small>${ago(c.at)}</small><p>${esc(c.body)}</p></div>
        <button class="comment-heart" type="button" data-act="comment-heart" data-id="${esc(c.id)}"
          aria-label="Heart comment" aria-pressed="${!!c.hearted}"${pendingCommentHearts.has(c.id) ? ' disabled' : ''}>${ic('heart')}<span aria-live="polite">${c.heartCount ?? 0}</span></button>
      </li>`).join('')}</ul>` : ''}
      <form class="feed-comment" data-feed-form data-comment-for="${esc(id)}" data-comment-kind="${kind}">
        <input name="body" aria-label="Write a comment" maxlength="300" placeholder="Write a comment…" required>
        <button class="btn" type="submit">Comment</button>
      </form>
    </div>`;
  }
  function postCard(p) {
    const C0 = CATS[p.cat], mine = p.memberId === S.me.id, caps = (p.reactions[CAP] || []).length, se = S.calc.season;
    const thisWeek = Logic.weekIdx(p.at, se.start, se.timezone) === se.idx;
    const details = [p.cat === 'gym' && p.minutes ? p.minutes + ' min' : '', p.miles ? p.miles + ' mi' : '', p.paceSeconds ? fmtPace(p.paceSeconds) + ' /mi' : ''].filter(Boolean).join(' · ');
    const wit = (p.witnesses || []).map(id => esc(nameOf(id))).join(', ');
    return `<article class="post card${p.voided ? ' voided' : ''}" data-id="${p.id}" style="--c:${C0.color}">
  <header>${profileButton(p.memberId, `${avatar(p.memberId, 44)}<span class="who"><b>${esc(nameOf(p.memberId))}</b><span>${catChip(p.cat)}<em>${ago(p.at)}</em></span></span>`, 'post-author')}${coin(postPoints(p))}</header>
  ${p.photo ? `<button class="photo" data-act="photo" data-id="${p.id}" aria-label="Open the proof photo"><img src="${esc(Art.photo(p.photo))}" alt="Proof for ${esc(C0.label)}" loading="lazy"></button>` : ''}
  ${p.voided ? `<p class="stamp">${p.fraud ? 'Voided · fraud · 0-point week' : 'Voided · 0 points'}</p>` : ''}
  ${S.calc.cappedPosts.has(p.id) ? '<p class="note">Weekly limit reached for this activity.</p>' : ''}
  ${p.caption ? `<p class="cap">${esc(p.caption)}</p>` : ''}
  ${details || wit ? `<p class="meta">${details ? `<span>${ic('clock')}${details}</span>` : ''}${wit ? `<span>${ic('users')}Witnessed by ${wit}</span>` : ''}</p>` : ''}
  ${caps >= CAP_DISPUTE && !p.voided ? `<p class="dispute">${ic('flag')}Disputed: ${caps} people called cap</p>` : ''}
  <footer>
    ${reactionsHTML('activity', p.id, p.reactions)}
    ${mine && !p.voided && !p.fraud ? `<button class="link" data-act="edit" data-id="${p.id}">Edit</button>` : ''}
    ${mine && thisWeek ? `<button class="link danger" data-act="del" data-id="${p.id}">Delete</button>` : ''}
    ${!p.voided && (mine || isComm()) ? `<button class="link danger" data-act="void" data-id="${p.id}">Void</button>` : ''}
  </footer>
  ${commentsHTML('activity', p.id)}
</article>`;
  }
  function messageCard(message) {
    const injury = message.kind === 'injury';
    return `<article class="card post feed-message${injury ? ' injury-report' : ''}">
      ${injury ? `<p class="eyebrow">Team news</p><h2>${esc(message.title)}</h2><small>${ago(message.at)}</small>`
        : `<header>${profileButton(message.memberId, `${avatar(message.memberId, 40)}<span class="who"><b>${esc(nameOf(message.memberId))}</b><span>${ago(message.at)}</span></span>`, 'post-author')}</header>`}
      <p class="feed-message-body">${esc(message.body)}</p>
      <footer>${reactionsHTML('message', message.id)}</footer>
      ${commentsHTML('message', message.id)}
    </article>`;
  }
  function feedComposer() {
    const { timezone } = cfg(), today = Logic.dayKey(new Date(), timezone);
    const posted = S.messages.some(p => p.kind === 'text' && p.memberId === S.me.id && Logic.dayKey(p.at, timezone) === today);
    return `<div class="card feed-composer">
      ${posted ? '<p class="note">You’ve shared your text post for today.</p>' : `<form id="textFeedForm" class="form" data-feed-form>
        <label class="fld"><span>Text post</span><textarea name="body" maxlength="600" rows="2" placeholder="What’s happening?" required></textarea></label>
        <div class="row-h"><small class="note">One per day</small><button class="btn btn-primary" type="submit">Post</button></div>
      </form>`}
      ${isComm() ? `<details class="injury-composer"><summary>Manage injury reports</summary>
        ${(S.activeInjuries || []).length ? `<ul class="injury-statuses">${S.activeInjuries.map(report => `<li class="row-h"><b>${esc(report.name)}</b><button type="button" class="link" data-act="resolve-injury" data-id="${esc(report.id)}">Mark recovered</button></li>`).join('')}</ul>` : ''}
        <form id="injuryFeedForm" class="form" data-feed-form>
          <label class="fld"><span>Member</span><select name="memberId" required>${S.members.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></label>
          <label class="fld"><span>Estimated weeks out</span><input name="weeksOut" type="number" min="1" max="26" required></label>
          <label class="fld"><span>Injury update</span><textarea name="summary" maxlength="600" rows="2" required></textarea></label>
          <label class="fld"><span>Closing note (optional)</span><input name="closingNote" maxlength="280"></label>
          <button class="btn" type="submit">Publish injury report</button>
        </form></details>` : ''}
    </div>`;
  }
  const newestFirst = (a, b) => new Date(b.at) - new Date(a.at);
  function pollComposer() {
    return `<details class="card poll-composer"><summary>Create a poll</summary>
      <form class="form" id="pollFeedForm" data-feed-form>
        <label class="fld"><span>Question</span><input name="question" maxlength="240" required></label>
        ${[1, 2, 3, 4].map(number => `<label class="fld"><span>Choice ${number}${number > 2 ? ' (optional)' : ''}</span><input name="choice" maxlength="80"${number <= 2 ? ' required' : ''}></label>`).join('')}
        <button class="btn btn-primary" type="submit">Post poll</button>
      </form>
    </details>`;
  }
  function pollCard(poll) {
    const total = poll.choices.reduce((sum, choice) => sum + choice.votes, 0);
    return `<article class="post card feed-poll" data-poll-id="${esc(poll.id)}">
      <p class="eyebrow">Poll · ${esc(ago(poll.at))}</p>
      <h2>${esc(poll.question)}</h2>
      <div class="poll-choices">${poll.choices.map(({ label, votes }, index) => `<button type="button" data-act="poll-vote" data-id="${esc(poll.id)}" data-choice="${index}" aria-pressed="${poll.myChoice === index}">
        <span>${esc(label)}</span><span>${votes} ${votes === 1 ? 'vote' : 'votes'}</span>
      </button>`).join('')}</div>
      <p class="note">${total} ${total === 1 ? 'vote' : 'votes'} · ${poll.myChoice === null ? 'Choose one' : 'Tap another option to change your vote'}</p>
    </article>`;
  }
  const renderPost = p => p.isEvent ? jokeCard(p) : p.kind ? messageCard(p) : postCard(p);
  function vFeed() {
    const evs = S.events.filter(inFeed).map(e => ({ ...e, isEvent: true }));
    const list = [...S.posts, ...evs, ...S.messages, ...S.polls].sort(newestFirst);
    return `<section class="screen feed"><div class="screen-h"><h1>Feed</h1>
    <button class="feed-refresh" type="button" data-act="refresh-feed" aria-disabled="${feedRefreshing}">${ic('refresh')}<span>${feedRefreshing ? 'Refreshing…' : 'Refresh'}</span></button>
  </div>
  ${xmasBallotHTML()}
  ${feedComposer()}
  ${isComm() ? pollComposer() : ''}
  ${list.length ? list.map(post => post.kind === 'poll' ? pollCard(post) : renderPost(post)).join('') : `<div class="card empty"><img src="${Art.mascot('point')}" alt="" width="104" height="160"><h2>Nothing here yet</h2><p class="note">Log something and it shows up here for the fellas.</p></div>`}
  <p class="cap-hint">Think a post is fake? Tap ${CAP} to call cap. ${CAP_DISPUTE} caps marks it disputed.</p>
</section>`;
  }

  const feedVisible = () => inApp() && S.tab === 'feed' && !openProfileMember();
  const editingFeed = () => document.activeElement?.closest('[data-feed-form]');
  const canRefreshFeed = () => feedVisible() && !feedRefreshing && !quiet() && !editingFeed();
  function updateRefreshButton() {
    const button = $('.feed-refresh');
    if (!button) return;
    button.setAttribute('aria-disabled', String(feedRefreshing));
    $('span', button).textContent = feedRefreshing ? 'Refreshing…' : 'Refresh';
  }
  async function refreshFeed() {
    if (!canRefreshFeed()) return;
    feedRefreshing = true;
    updateRefreshButton();
    try {
      await load();
    } catch (error) {
      if (feedVisible()) toast('Couldn’t refresh the feed. Try again.', 'shrug');
      console.warn('Feed refresh failed', error);
      return;
    } finally {
      feedRefreshing = false;
      updateRefreshButton();
    }
    if (!inApp()) render();
    else if (feedVisible() && !editingFeed()) {
      const restoreFocus = document.activeElement === $('.feed-refresh');
      renderView();
      if (restoreFocus) $('.feed-refresh').focus({ preventScroll: true });
    }
  }

  function bindFeedRefresh() {
    const app = $('#app');
    let start;
    const atTop = () => app.scrollTop <= 4;
    app.addEventListener('touchstart', event => {
      start = null;
      if (event.touches.length !== 1 || !atTop() || !canRefreshFeed()
          || event.target.closest('input, textarea, select')) return;
      start = event.touches[0];
    }, { passive: true });
    app.addEventListener('touchmove', () => {
      if (!atTop()) start = null;
    }, { passive: true });
    app.addEventListener('touchend', event => {
      const origin = start;
      start = null;
      const end = event.changedTouches[0];
      if (!origin || !end || end.identifier !== origin.identifier || !atTop()) return;
      const down = end.clientY - origin.clientY;
      if (down >= 64 && down > Math.abs(end.clientX - origin.clientX) * 1.3) refreshFeed();
    }, { passive: true });
    app.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  }

  /* ------------------------------------------------------------ leaderboard */
  function boardRow(m, i, week, max) {
    const R = S.calc.by[m.id], v = week ? R.thisWeek : R.total, min = R.goal, w = week ? Math.min(1, v / min) : max ? v / max : 0;
    return `<li class="row${R.eliminated ? ' out' : ''}${m.id === S.me.id ? ' me' : ''}${i < 3 ? ' top' + (i + 1) : ''}" data-id="${m.id}">
  <span class="rk">${i + 1}</span>
  ${profileButton(m.id, `${avatar(m.id, 44)}<span class="who"><b>${esc(displayName(m))}${m.id === S.me.id ? ' <small>(you)</small>' : ''}</b><span class="bar${week && v >= min ? ' full' : ''}"><i style="--w:${(w * 100).toFixed(1)}%"></i></span></span>`, 'board-person')}
  <div class="side"><b class="pts">${fmtPts(v)}</b>${R.eliminated ? '<span class="outtag">OUT</span>' : strikesHTML(R)}</div>
</li>`;
  }
  function podium(top) {
    const order = [top[1], top[0], top[2]], h = [76, 104, 58], n = ['2', '1', '3'];
    return `<div class="podium" aria-label="Top three all-time">${order.map((m, i) => `<div class="pod p${n[i]}">${i === 1 ? '<span class="crown">' + Art.icon64('trophy') + '</span>' : ''}${profileButton(m.id, `${avatar(m.id, i === 1 ? 64 : 50)}<b>${esc(displayName(m))}</b>`, 'pod-person')}<span class="ppts">${fmtPts(S.calc.by[m.id].total)} pts</span><div class="blk" style="--h:${h[i]}px">${n[i]}</div></div>`).join('')}</div>`;
  }
  function vBoard() {
    const C = S.calc, min = cfg().weeklyMin, week = S.board === 'week', list = week ? C.weekRank : C.allRank;
    const max = Math.max(min, ...list.map(m => (week ? C.by[m.id].thisWeek : C.by[m.id].total)));
    return `<section class="screen boardS"><div class="screen-h"><h1>Leaderboard</h1>${seg('board', [['week', 'This week'], ['all', 'All-time']], S.board)}</div>
  ${!week && list.length >= 3 ? podium(list.slice(0, 3)) : ''}
  <ol class="board card">${list.map((m, i) => boardRow(m, i, week, max)).join('')}</ol>
  <p class="note center">${week ? `The standard goal is ${min} points. Miss your weekly goal and take a strike.` : 'Survivors win the Winter Arc. If nobody survives, most all-time points wins.'}</p>
</section>`;
  }
  function flipBoard(update) {
    const first = new Map($$('.board .row').map(r => [r.dataset.id, r.getBoundingClientRect().top]));
    update();
    $$('.board .row').forEach(r => {
      const f = first.get(r.dataset.id); if (f == null) return;
      const dy = f - r.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,1.25,.4,1)' });
    });
  }

  /* ------------------------------------------------------------ me */
  function historyChart(R, se) {
    const n = se.weeks, W = 320, H = 140, pad = 18, bw = (W - pad) / n, min = cfg().weeklyMin, max = Math.max(min * 2, R.bestWeek || 0);
    const y = v => H - 20 - (v / max) * (H - 34);
    let g = '';
    for (let w = 0; w < n; w++) {
      const v = R.weekPts[w], x = pad + w * bw + 1.5, cur = se.status === 'live' && w === se.idx, done = w <= se.lastComplete;
      const exempt = R.injuryWeeks.has(w);
      const cls = exempt ? 'exempt' : cur ? 'cur' : !done ? 'fut' : v >= R.weekGoals[w] ? 'ok' : 'miss';
      const hh = cls === 'fut' ? 3 : Math.max(3, H - 20 - y(v));
      g += `<rect class="${cls}" x="${x.toFixed(1)}" y="${(H - 20 - hh).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${hh.toFixed(1)}" rx="3"><title>Week ${w + 1}: ${fmtPts(v)} pts${exempt ? ' · injury exemption' : ' of ' + R.weekGoals[w] + ' required'}</title></rect>`;
      if (w % 4 === 0 || w === n - 1) g += `<text x="${(x + (bw - 3) / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">W${w + 1}</text>`;
    }
    const ly = y(min);
    return `<svg class="hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Points per week, the dashed line is the standard ${min}-point goal">${g}<line class="minline" x1="${pad}" x2="${W}" y1="${ly.toFixed(1)}" y2="${ly.toFixed(1)}"/><text class="minlab" x="2" y="${(ly + 4).toFixed(1)}">${min}</text></svg>
  <p class="legend"><span class="k ok"></span>safe <span class="k miss"></span>strike <span class="k cur"></span>this week${R.injuryWeeks.size ? ' <span class="k exempt"></span>injury exemption' : ''}</p>`;
  }
  function rulesHTML() {
    const min = cfg().weeklyMin;
    return `<div class="rules-body">
  <p class="lead"><b>NO EXCUSES.</b> The mission is simple: earn ${min} points every week or face the consequences.</p>
  <h3>Point system</h3>
  <ul class="pts-list">${CAT_ORDER.map(k => `<li><span class="mic" style="--c:${CATS[k].color}">${Art.icon64(k)}</span>${esc(CATS[k].label)}<b>${fmtPts(CATS[k].pts)}</b></li>`).join('')}</ul>
  <p>Each member can log Reading once and Beers with the fellas once per game week.</p>
  <h3>Official rules</h3>
  <ol>
    <li><b>Weekly minimum.</b> The standard goal is ${min} points per week. No rolling points into the next week.</li>
    <li><b>The honor system.</b> All activities must be documented here. No proof = no points. Photos, screenshots, or witnesses count.</li>
    <li><b>No double dipping.</b> One activity cannot count for multiple categories. Each event earns points once.</li>
    <li><b>Gym requirements.</b> Minimum 45-minute workout. Actually lift. Sitting on your phone doesn’t count.</li>
    <li><b>Running and cycling requirements.</b> Minimum 2 miles per run or ${CATS.bike.minMiles} miles per bike ride. Walking to the fridge doesn’t count.</li>
    <li><b>Dating requirements.</b> Must be an actual one-on-one date. Dating apps, texting, and FaceTime do not count. A date with your existing girlfriend does not count.</li>
    <li><b>Bronson Beer requirements.</b> Must physically attend and have at least one beer with the fellas. Drinking alone doesn’t count.</li>
    <li><b>Weekly deadline.</b> Weeks run Monday through Sunday at 11:59 PM. Points reset every Monday.</li>
    <li><b>No fake points.</b> Fraudulent claims result in an automatic 0-point week.</li>
  </ol>
  <h3>Strikes</h3>
  <p>Miss your weekly goal and you take a strike. Any week covered by an injury report is exempt from strikes. ${cfg().strikesOut} strikes = elimination. Anyone who survives the entire Winter Arc wins. If nobody survives, the most all-time points wins.</p>
</div>`;
  }
  function vProfile(m) {
    const { season: se, by } = S.calc, R = by[m.id], own = m.id === S.me.id;
    const posts = [...S.posts.filter(p => p.memberId === m.id), ...S.messages.filter(p => p.kind === 'text' && p.memberId === m.id)]
      .sort(newestFirst);
    const runs = R.counted.filter(post => post.cat === 'run' && Logic.weekIdx(post.at, se.start, se.timezone) === se.idx);
    const miles = runs.reduce((sum, post) => sum + post.miles, 0);
    const timed = runs.filter(post => post.paceSeconds > 0);
    const timedMiles = timed.reduce((sum, post) => sum + post.miles, 0);
    const pace = timedMiles && Math.round(timed.reduce((sum, post) => sum + post.paceSeconds * post.miles, 0) / timedMiles);
    return `<section class="screen me" aria-labelledby="profileName">
  ${own ? '' : backBtn('profile-back', '')}
  <div class="card profile${own ? ' own' : ''}">
    ${avatar(m.id, 70)}
    <div class="profile-info">
      <h1 id="profileName" tabindex="-1">${esc(displayName(m))}</h1>
      <p>${m.role === 'commissioner' ? '<span class="chip comm">Commissioner</span>' : ''}<span class="chip ${R.eliminated ? 'out' : 'safe'}">${R.eliminated ? 'Eliminated' : 'Still in'}</span></p>
      ${S.group ? `<p class="crewline">${ic('users')}${esc(S.group.name)} · ${S.members.length} people</p>` : ''}
      <button class="link profile-posts-link" type="button" data-act="profile-posts">View posts</button>
    </div>
    ${own ? `<button class="gear" data-act="account" aria-label="Account and settings">${ic('gear')}</button>` : ''}
  </div>
  <div class="grid4">
    <div class="tile"><b>${fmtPts(R.thisWeek)}</b><small>points this week</small></div>
    <div class="tile"><b>${fmtPts(R.total)}</b><small>all-time points</small></div>
    <div class="tile"><b>${R.strikes}</b><small>${R.strikes === 1 ? 'strike' : 'strikes'}</small></div>
    <div class="tile"><b>${R.safeWeeks}</b><small>weeks safe</small></div>
    <div class="tile"><b>${fmtPts(R.bestWeek)}</b><small>best week</small></div>
    <div class="tile">${R.fav ? `<span class="mic big" style="--c:${CATS[R.fav].color}">${Art.icon64(R.fav)}</span>` : '<b>–</b>'}<small>${R.fav ? 'favorite: ' + esc(catName(R.fav)) : 'no favorite yet'}</small></div>
  </div>
  <div class="card"><h2>Running this week</h2><p class="kv"><b>${Number(miles.toFixed(2))} mi</b>${pace ? `<span>${fmtPace(pace)} /mi average${timed.length < runs.length ? ` · ${timed.length} of ${runs.length} runs` : ''}</span>` : '<span>Average pace available when logged</span>'}</p></div>
  <div class="card"><h2>${own ? 'Your weeks' : 'Weekly points'}</h2>${historyChart(R, se)}</div>
  <div class="card"><h2>Badges <small>${R.badges.length} of ${BADGES.length}</small></h2><div class="badges">${BADGES.map(b => { const has = R.badges.includes(b.id); return `<button class="badge${has ? '' : ' locked'}" data-act="badge" data-id="${b.id}" aria-label="${esc(b.name)}. ${esc(b.desc)}${has ? '' : ' Locked.'}">${Art.icon64(b.icon)}<span>${esc(b.name)}</span></button>`; }).join('')}</div></div>
  ${own ? `<details class="card rules"><summary><h2>Official rules</h2>${ic('chevron', 'chev')}</summary>${rulesHTML()}</details>
  <div class="card settings"><h2>Settings</h2>
    <button class="btn" data-act="account">${ic('gear')}Account &amp; settings</button>
    ${isDemo() ? `<button class="btn" data-act="switch">${ic('users')}Switch person (preview)</button><button class="btn" data-act="reset">${ic('refresh')}Reset sample data</button>` : ''}
  </div>` : ''}
  <section class="profile-feed" aria-labelledby="profilePosts">
    <div class="screen-h"><h2 id="profilePosts" tabindex="-1">${own ? 'Your posts' : 'Posts'}</h2></div>
    ${posts.length ? posts.map(renderPost).join('') : `<div class="card empty"><p class="note">${own ? 'Your activities and text updates will appear here.' : 'No posts yet.'}</p></div>`}
  </section>
</section>`;
  }

  /* ------------------------------------------------------------ sign-in + accounts */
  const COMM_NAME = 'Osim';
  function bigAv(name, color, photo, size = 96) {
    const style = `--c:${color};--s:${size}px`;
    if (photo) return `<img class="av av-photo" style="${style}" src="${esc(photo)}" alt="">`;
    return `<span class="av" style="${style}" aria-hidden="true">${esc((String(name || '').trim()[0] || '?').toUpperCase())}</span>`;
  }
  const swatches = (cur, act) => `<div class="swatches" role="radiogroup" aria-label="Colour">${COLORS.map(c => `<button type="button" role="radio" aria-checked="${c === cur}" aria-label="Colour ${c}" data-act="${act}" data-c="${c}" style="--c:${c}"></button>`).join('')}</div>`;
  const backBtn = (act, to, label = 'Back') => `<button type="button" class="back" data-act="${act}" data-to="${to}">${ic('back')}${label}</button>`;
  const demoNote = html => (isDemo() ? `<p class="demo-note">${html}</p>` : '');
  const field = (id, label, attrs = '', after = '') => `<label class="fld" for="${id}"><span>${label}</span><input id="${id}" ${attrs}>${after}</label>`;
  const pwField = (id, label, auto) => `<label class="fld" for="${id}"><span>${label}</span><span class="pw"><input id="${id}" type="password" autocomplete="${auto}" ${auto === 'new-password' ? 'minlength="8"' : ''} required><button type="button" class="pw-eye" data-act="pw-eye" aria-label="Show password">${ic('eye')}</button></span></label>`;

  /* signed out: one screen, username + password. No sign-up: accounts are made for you. */
  function vSignedOut() {
    return `<section class="screen auth welcome">
  <div class="hero-auth">
    <img class="mascot big" src="${Art.mascot('flex')}" alt="Flexander, the Winter Arc mascot, flexing" width="410" height="640">
    <h1 class="logo">Winter <span>Arc</span></h1>
    <p class="tag">7 points a week. No excuses.</p>
  </div>
  <form id="signinForm" class="card form auth-card" novalidate>
    ${field('siUser', 'Username', `autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required placeholder="your first name" value="${esc(S.lastUser || '')}"`)}
    ${pwField('siPass', 'Password', 'current-password')}
    <button class="btn btn-primary wide" type="submit">${ic('lock')}Sign in</button>
    <p class="hint center">Forgot it? Ask ${esc(COMM_NAME)} to reset your password.</p>
  </form>
  <p class="fine">Members only. Your sign-in details come from ${esc(COMM_NAME)}. Proof or it didn’t happen.</p>
  ${demoNote(`Preview: sign in as <b>osim</b> with <b>winterarc</b>. Everyone else uses <b>winterarc</b> too and gets asked to pick their own password. <button type="button" class="link small" data-act="demo-pick">Or just pick someone</button>`)}
</section>`;
  }

  /* first sign-in with a temporary password: pick your own */
  function vSetPassword() {
    const m = S.auth.user || {};
    return `<section class="screen auth">
  <div class="auth-h"><img class="mascot sm" src="${Art.mascot('wave')}" alt="" width="120" height="160"><h1>Welcome, ${esc(m.username || 'champ')}!</h1></div>
  <p class="note center">You signed in with a temporary password. Pick your own so it’s just yours.</p>
  <form id="setpwForm" class="card form" novalidate>
    <input class="sr" type="text" autocomplete="username" value="${esc(m.username || '')}" readonly tabindex="-1" aria-hidden="true">
    ${pwField('npPass', 'New password', 'new-password')}
    ${pwField('npPass2', 'Type it again', 'new-password')}
    <p class="hint">At least 8 characters.</p>
    <button class="btn btn-primary wide" type="submit">${ic('check')}Save and go</button>
  </form>
  <button type="button" class="link" data-act="signout">Not you? Sign out</button>
</section>`;
  }

  /* account + group settings (from Me, or the avatar in the top bar) */
  function vAccount() {
    const m = member(S.me.id), u = (S.auth && S.auth.user) || {}, g = S.group || {};
    const ac = S.acct || (S.acct = { color: m.color });
    const comm = isComm();
    const others = S.members.filter(x => x.id !== m.id);
    const num = (k, label) => `<label class="fld sm" for="gs_${k}"><span>${label}</span><input id="gs_${k}" type="number" inputmode="numeric" value="${g[k]}" required></label>`;
    return `<section class="screen account">
  ${backBtn('tab-to', 'me', 'Me')}
  <h1 class="pageh">Account</h1>
  <form id="profileForm" class="card form">
    <h2>Profile</h2>
    <div class="prow">
      <label class="avpick sm">${bigAv(m.name, ac.color, m.photo, 78)}<span class="cam">${ic('camera')}</span><input id="avatarInput" type="file" accept="image/*,.heic,.heif" aria-label="Choose and crop a profile photo"></label>
      <div class="pcol">${field('acName', 'Name', `maxlength="24" value="${esc(m.name)}" required`)}
        <div class="avatar-actions"><label for="avatarInput" class="link small">Choose &amp; crop photo</label>${m.photo ? '<button type="button" class="link small" data-act="crop-avatar">Crop current photo</button><button type="button" class="link small" data-act="acct-clear-photo">Remove photo</button>' : ''}</div>
        <p id="avatarStatus" class="note" role="status" hidden>Opening photo…</p>
      </div>
    </div>
    <div class="fld"><span>Colour</span>${swatches(ac.color, 'acct-color')}</div>
    <button class="btn btn-primary" type="submit">${ic('check')}Save profile</button>
  </form>
  <div class="card">
    <h2>Sign-in</h2>
    <p class="kv"><span>${ic('key')}Username</span><b class="uname">${esc(u.username || m.username || '')}</b></p>
    <form id="pwForm" class="form inline"><input class="sr" type="text" autocomplete="username" value="${esc(u.username || m.username || '')}" readonly tabindex="-1" aria-hidden="true">${pwField('acPass', 'New password', 'new-password')}<button class="btn" type="submit">${ic('lock')}Change password</button></form>
  </div>
  <div class="card">
    <h2>The season</h2>
    <p class="kv"><span>${ic('users')}<b>${esc(g.name || 'Winter Arc')}</b> · ${S.members.length} people</span><span class="chip ${comm ? 'comm' : ''}">${comm ? 'Commissioner' : 'Member'}</span></p>
    <p class="note">Starts ${fmtDay(Logic.parseDay(g.seasonStart || CONFIG.seasonStart, cfg().timezone))} · ${g.seasonWeeks} weeks · ${g.weeklyMin} points a week · ${g.strikesOut} strikes and you’re out. Weeks end Sunday 11:59 PM${g.timezone ? ` (${esc(g.timezone.replace(/_/g, ' '))} time)` : ''}.</p>
  </div>
  ${comm ? `<form id="groupForm" class="card form comm-card">
    <h2>${ic('crown')}Commissioner</h2>
    ${field('gs_name', 'Name', `maxlength="32" value="${esc(g.name || '')}" required`)}
    ${field('gs_seasonStart', 'Week 1 starts (a Monday)', `type="date" value="${esc(g.seasonStart || '')}" required`)}
    <div class="numrow">${num('seasonWeeks', 'Weeks')}${num('weeklyMin', 'Points a week')}${num('strikesOut', 'Strikes = out')}</div>
    <p class="hint">Changing the rules mid-season re-scores everyone’s weeks.</p>
    <button class="btn btn-primary" type="submit">${ic('check')}Save season settings</button>
  </form>
  <div class="card comm-card">
    <h2>${ic('users')}Members <small>${S.members.length}</small></h2>
    <p class="note">Tap someone to reset their password, hand over the commissioner role or remove them.</p>
    <ul class="mlist">${others.map(x => `<li><button type="button" class="mrow" data-act="member-menu" data-id="${x.id}">${avatar(x.id, 36)}<span class="mname"><b>${esc(x.name)}</b><small>@${esc(x.username || '')}</small></span>${ic('chevron', 'mchev')}</button></li>`).join('')}</ul>
    <form id="addFriendForm" class="form addf">
      <h3>${ic('userplus')}Add a friend</h3>
      <div class="numrow two">${field('afName', 'Name', 'maxlength="24" placeholder="First name" required')}${field('afUser', 'Username', 'maxlength="20" autocapitalize="none" spellcheck="false" placeholder="firstname" required')}</div>
      <button class="btn" type="submit">${ic('plus')}Add friend</button>
      <p class="hint">They get a temporary password to send them. No sign-up page, ever.</p>
    </form>
  </div>` : ''}
  <div class="card danger-card">
    <button class="btn" data-act="signout">${ic('out')}Sign out</button>
    <p class="note">Forgot your password next time? ${comm ? 'You’re the commissioner: hand the role to someone first if you need a reset.' : `Ask ${esc(COMM_NAME)} for a reset.`}</p>
  </div>
  <p class="powered">Powered by Claude &amp; Za</p>
</section>`;
  }

  /* preview only: jump into anyone's account */
  function demoChooser(title, sub) {
    const list = Store.demoRoster();
    return modal(`<h2>${esc(title)}</h2><p class="note">${esc(sub)}</p>
      <div class="who-list chooser">${list.map(a => `<button class="who-btn" data-ok data-val="${a.id}">${bigAv(a.name, a.color, a.photo, 40)}<span class="who-t"><b>${esc(a.name)}</b><small>@${esc(a.username)}</small></span>${a.role === 'commissioner' ? '<span class="chip comm">Comm</span>' : ''}</button>`).join('')}</div>
      <div class="mact"><button class="btn" data-close>Cancel</button></div>`, 'chooser-modal');
  }
  /* commissioner: show a temporary password once */
  function showTemp(name, r) {
    const pr = modal(`<h2>${esc(name)}’s sign-in</h2>
      <p>Send this to ${esc(name)} privately. They’ll pick their own password the first time they sign in.</p>
      <div class="codebox temp"><span class="lbl">Username</span><b>${esc(r.username)}</b><span class="lbl">Temporary password</span><b id="tempPw">${esc(r.tempPassword)}</b></div>
      <div class="mact"><button class="btn" data-act-copy="${esc(`Winter Arc sign-in\nUsername: ${r.username}\nPassword: ${r.tempPassword}`)}">${ic('copy')}Copy</button><button class="btn btn-primary" data-ok>Done</button></div>`, 'temp-modal');
    const cb = pr.el && pr.el.querySelector('[data-act-copy]');
    if (cb) cb.addEventListener('click', e => { e.stopPropagation(); copyText(cb.dataset.actCopy, 'Copied. Send it privately.'); });
    return pr;
  }

  async function afterAuth() {
    S.acct = null; S.tab = 'home';
    S.profileTrail.length = 0;
    await load();
    if (inApp()) toast(`Welcome back, ${displayName(S.me)}.`, 'wave');
    render(); scrollToTop();
    if (inApp()) checkJokes();
  }
  async function editAvatar(source, selector) {
    const memberId = S.me?.id;
    if (!memberId) return;
    const status = $('#avatarStatus');
    if (status) status.hidden = false;
    try {
      await AvatarCrop.edit(source, photo => {
        if (S.me?.id !== memberId) throw new Error('Sign in again to update your photo.');
        return gotAvatar(photo);
      });
    } finally {
      if (status) status.hidden = true;
      $(selector)?.focus({ preventScroll: true });
    }
  }
  async function gotAvatar(dataUrl) {
    const nameDraft = $('#acName')?.value;
    const updated = await Store.updateProfile({ photo: dataUrl });
    S.me = updated;
    S.members = S.members.map(m => m.id === updated.id ? updated : m);
    render();
    const name = $('#acName');
    if (name && nameDraft !== undefined) name.value = nameDraft;
    toast('Photo updated.');
  }
  async function copyText(text, ok = 'Copied.') {
    try { await navigator.clipboard.writeText(text); toast(ok); } catch (e) { toast(text.replace(/\n/g, ' · ')); }
  }

  const AUTH_ACT = {
    'pw-eye'(el) { const i = el.parentElement.querySelector('input'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); el.classList.toggle('on', show); },
    async 'demo-pick'() {
      const pick = await demoChooser('Sign in as…', 'Preview only: skips the password.'); if (!pick) return;
      await Store.demoSignInAs(pick); await afterAuth();
    },
    async signout() { await Store.signOut(); await afterAuth(); },
    'crop-avatar'() { if (S.me?.photo) return editAvatar(S.me.photo, '[data-act="crop-avatar"]'); },
    account() { S.acct = null; go('account'); },
    'tab-to': el => go(el.dataset.to),
    'acct-color'(el) { S.acct.color = el.dataset.c; $$('.swatches [data-act="acct-color"]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.c === el.dataset.c))); const av = $('.avpick .av'); if (av) av.style.setProperty('--c', el.dataset.c); },
    async 'acct-clear-photo'() { await Store.updateProfile({ photo: null }); await load(); render(); toast('Photo removed.'); },
    async 'member-menu'(el) {
      const x = member(el.dataset.id); if (!x) return;
      const pick = await modal(`<h2>${esc(x.name)}</h2><p class="note">@${esc(x.username || '')}</p>
        <div class="menu-list">
          <button class="btn wide" data-ok data-val="reset">${ic('key')}Reset password</button>
          <button class="btn wide" data-ok data-val="comm">${ic('crown')}Make commissioner</button>
          <button class="btn wide danger-t" data-ok data-val="remove">${ic('x')}Remove</button>
        </div>
        <div class="mact"><button class="btn" data-close>Cancel</button></div>`, 'menu-modal');
      if (pick === 'reset') return AUTH_ACT['reset-pw'](el);
      if (pick === 'comm') return AUTH_ACT['make-comm'](el);
      if (pick === 'remove') return AUTH_ACT['remove-member'](el);
    },
    async 'reset-pw'(el) {
      const x = member(el.dataset.id); if (!x) return;
      if (!(await confirmBox(`Reset ${x.name}’s password?`, 'Their old password stops working. You’ll get a temporary one to send them.', 'Reset'))) return;
      const r = await Store.resetPassword(x.id); await showTemp(x.name, r);
    },
    async 'make-comm'(el) {
      const x = member(el.dataset.id); if (!x) return;
      if (!(await confirmBox(`Make ${x.name} commissioner?`, 'They get the season settings, password resets and the void button. You become a regular member.', 'Hand it over'))) return;
      await Store.makeCommissioner(x.id); await load(); render(); toast(`${x.name} is the commissioner now.`);
    },
    async 'remove-member'(el) {
      const x = member(el.dataset.id); if (!x) return;
      if (!(await confirmBox(`Remove ${x.name}?`, 'Their sign-in stops working and their posts come off the board.', 'Remove', true))) return;
      await Store.removeMember(x.id); await load(); renderView(); toast(`${x.name} was removed.`, 'shrug');
    },
  };

  const FORMS = {
    async signinForm() {
      const un = $('#siUser').value, pw = $('#siPass').value; S.lastUser = un;
      await Store.signIn(un, pw); await afterAuth();
    },
    async setpwForm() {
      const a = $('#npPass').value, b = $('#npPass2').value;
      if (a !== b) throw new Error('Those two passwords don’t match.');
      await Store.setPassword(a); await afterAuth(); toast('Password saved. You’re in.', 'thumbs');
    },
    async profileForm() {
      await Store.updateProfile({ name: $('#acName').value, color: S.acct.color });
      await load(); render(); toast('Profile saved.', 'thumbs');
    },
    async pwForm() { await Store.setPassword($('#acPass').value); $('#acPass').value = ''; toast('Password changed.', 'thumbs'); },
    async groupForm() {
      const g = S.group || {}, v = id => ($('#gs_' + id) ? $('#gs_' + id).value : g[id]);
      await Store.updateGroup({ name: v('name'), seasonStart: v('seasonStart'), seasonWeeks: +v('seasonWeeks'), weeklyMin: +v('weeklyMin'), strikesOut: +v('strikesOut') });
      await load(); render(); toast('Season settings saved.', 'thumbs');
    },
    async addFriendForm() {
      const name = $('#afName').value, un = $('#afUser').value;
      const r = await Store.addFriend({ name, username: un });
      await load(); renderView(); await showTemp(name.trim(), r);
    },
    async textFeedForm(form) {
      await Store.addTextPost(new FormData(form).get('body'));
      await load(); renderView(); toast('Posted to the feed.');
    },
    async pollFeedForm(form) {
      const data = new FormData(form);
      await Store.createPoll({ question: data.get('question'), choices: data.getAll('choice').map(choice => choice.trim()).filter(Boolean) });
      await load(); renderView(); toast('Poll posted.');
    },
    async injuryFeedForm(form) {
      await Store.createInjuryReport(Object.fromEntries(new FormData(form)));
      await load(); renderView(); toast('Injury report posted.');
    },
  };

  /* ------------------------------------------------------------ log sheet */
  function weekDays() {
    const { timezone } = cfg(), now = new Date(), out = [];
    const today = Logic.dayKey(now, timezone), yesterday = Logic.dayKey(Logic.addDays(now, -1, timezone), timezone);
    const start = S.draft.original ? Logic.mondayOf(S.draft.original.at, timezone) : S.calc.season.wkStart;
    const end = Logic.addDays(start, 7, timezone);
    for (let d = start; d < end && d <= now; d = Logic.addDays(d, 1, timezone)) {
      const key = Logic.dayKey(d, timezone);
      const label = key === today ? 'Today' : key === yesterday ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday:'short', timeZone:timezone });
      out.push({ key, label });
    }
    return out.reverse();
  }
  function openLog(original = null) {
    if (!S.me || S.busy) return;
    const se = S.calc.season;
    if (!original && se.status === 'pre') return toast(`Logging opens ${fmtDay(se.start)} when week 1 starts.`);
    if (!original && se.status === 'over') return toast('The Winter Arc is over. No more logging.');
    const cat = original?.cat;
    S.draft = {
      original, cat, photo: original?.photo || null, witnesses: [...(original?.witnesses || [])],
      minutes: original?.minutes ?? 60, miles: original?.cat === 'run' ? original.miles ?? 2 : 2,
      bikeMiles: original?.cat === 'bike' ? String(original.miles ?? '') : '', caption: original?.caption || '',
      pace: original?.paceSeconds ? fmtPace(original.paceSeconds) : '',
      day: Logic.dayKey(original?.at || new Date(), cfg().timezone), tried: false,
      checks: { lifted: cat === 'gym', oneOnOne: cat === 'date', notGf: cat === 'date', inPerson: cat === 'beers' },
    };
    const sh = $('#sheet');
    sh.innerHTML = `<div class="scrim" data-act="close-sheet"></div>
<div class="panel" role="dialog" aria-modal="true" aria-labelledby="logT">
  <div class="grab" aria-hidden="true"></div>
  <header class="sheet-h"><h2 id="logT">${original ? 'Edit activity' : 'Log an activity'}</h2><button class="xbtn" data-act="close-sheet" aria-label="Close">${ic('x')}</button></header>
  <section class="step"><h3><span class="num">1</span>Proof</h3><div id="shProof"></div></section>
  <section class="step"><h3><span class="num">2</span>What did you do?</h3><div class="cats" id="shCats"></div></section>
  <section class="step" id="shDetails" hidden></section>
  <section class="step"><h3><span class="num" id="whenNum">3</span>When?</h3><div class="days" id="shWhen"></div></section>
  <label class="capf" for="caption"><span>Caption <small>(optional)</small></span><input id="caption" maxlength="140" value="${esc(S.draft.caption)}" placeholder="Leg day survived" autocomplete="off"></label>
  <div id="shFoot"></div>
  <p class="fine">One activity per post. No double dipping.</p>
</div>`;
    sh.hidden = false; sh.classList.remove('bye');
    document.body.classList.add('sheet-open');
    refreshSheet();
    setTimeout(() => $('.panel .xbtn') && $('.panel .xbtn').focus(), 60);
  }
  function closeSheet() {
    const sh = $('#sheet'); if (sh.hidden) return;
    sh.classList.add('bye'); document.body.classList.remove('sheet-open');
    setTimeout(() => { sh.hidden = true; sh.innerHTML = ''; sh.classList.remove('bye'); }, 230);
  }
  function refreshSheet() { refreshProof(); refreshCats(); refreshDetails(); refreshWhen(); refreshFoot(); }
  function refreshProof() {
    const d = S.draft, el = $('#shProof'); if (!el) return;
    const others = S.members.filter(m => m.id !== S.me.id);
    el.innerHTML = (d.photo
      ? `<figure class="shot"><img src="${esc(Art.photo(d.photo))}" alt="Your proof photo"></figure><div class="shot-actions"><button class="btn" data-act="pick-photo">${ic('camera')}Change photo</button><button class="btn" data-act="clear-photo">${ic('trash')}Remove</button></div>`
      : `<button class="drop" data-act="pick-photo"><span class="drop-ic">${ic('camera')}</span><b>Add a photo or screenshot</b><span>Workout tracker, a gym pic, your run app, the date spot…</span></button>`)
      + `<div class="wit"><p>${d.photo ? 'Tag witnesses too (optional)' : 'No photo? Tag witnesses instead'}</p><div class="chips">${others.map(m => `<button data-act="wit" data-id="${m.id}" aria-pressed="${d.witnesses.includes(m.id)}">${avatar(m.id, 26)}${esc(m.name)}</button>`).join('')}</div></div>`;
  }
  function refreshCats() {
    const el = $('#shCats'); if (!el) return;
    el.innerHTML = CAT_ORDER.map(k => `<button class="cat" style="--c:${CATS[k].color};--d:${CATS[k].dark}" data-act="cat" data-cat="${k}" aria-pressed="${S.draft.cat === k}">${Art.icon64(k)}<span class="cn">${esc(catName(k))}</span><span class="p">${fmtPts(CATS[k].pts)}</span></button>`).join('');
  }
  function refreshDetails() {
    const d = S.draft, el = $('#shDetails'); if (!el) return;
    const need = d.cat && ['gym', 'run', 'bike', 'date', 'beers'].includes(d.cat);
    el.hidden = !need; $('#whenNum').textContent = need ? '4' : '3';
    if (!need) { el.innerHTML = ''; return; }
    const ck = (key, label) => `<label class="check"><input type="checkbox" data-check="${key}"${d.checks[key] ? ' checked' : ''}><span class="box">${ic('check')}</span><span>${label}</span></label>`;
    let body = '';
    if (d.cat === 'gym') body = `<div class="stepper"><button data-act="step" data-k="minutes" data-d="-5" aria-label="5 minutes less">${ic('minus')}</button><output id="minOut">${d.minutes}<small> min</small></output><button data-act="step" data-k="minutes" data-d="5" aria-label="5 minutes more">${ic('plus')}</button></div>
      <p class="${d.minutes >= 45 ? 'ok' : 'warn'}" id="minMsg">${d.minutes >= 45 ? 'Counts. 45 minutes minimum.' : 'Gym needs at least 45 minutes to count.'}</p>
      <div class="checks">${ck('lifted', 'I actually lifted. No sitting on my phone.')}</div>`;
    if (d.cat === 'run') body = `<div class="stepper"><button data-act="step" data-k="miles" data-d="-0.1" aria-label="0.1 miles less">${ic('minus')}</button><output id="miOut">${d.miles.toFixed(1)}<small> mi</small></output><button data-act="step" data-k="miles" data-d="0.1" aria-label="0.1 miles more">${ic('plus')}</button></div>
      <p class="${d.miles >= 2 ? 'ok' : 'warn'}" id="miMsg">${d.miles >= 2 ? 'Counts. 2 miles minimum.' : 'Runs need at least 2 miles.'}</p>
      <label class="fld"><span>Average pace (optional)</span><input id="runPace" maxlength="6" placeholder="8:30" value="${esc(d.pace)}" inputmode="text" autocomplete="off"><small>Minutes and seconds per mile</small></label>`;
    if (d.cat === 'bike') body = `<label class="fld"><span>Distance (miles)</span><input id="bikeMiles" type="number" inputmode="decimal" min="${CATS.bike.minMiles}" step="any" required value="${esc(d.bikeMiles)}"><small>${CATS.bike.minMiles} miles minimum</small></label>`;
    if (d.cat === 'date') body = `<div class="checks">${ck('oneOnOne', 'A real one-on-one date, in person. Not apps, texting or FaceTime.')}${ck('notGf', 'Not with my existing girlfriend.')}</div>`;
    if (d.cat === 'beers') body = `<div class="checks">${ck('inPerson', 'I was there in person and had at least one beer with the fellas.')}</div><p class="note">Tip: tag the fellas as witnesses above.</p>`;
    el.innerHTML = `<h3><span class="num">3</span>The fine print</h3>${body}`;
  }
  function refreshWhen() {
    const el = $('#shWhen'); if (!el) return;
    el.innerHTML = weekDays().map(x => `<button data-act="day" data-day="${x.key}" aria-pressed="${S.draft.day === x.key}">${x.label}</button>`).join('');
  }
  function draftProblems(draft) {
    const problems = Logic.draftProblems(draft);
    if (draft.cat === 'run' && Number.isNaN(parsePace(draft.pace))) problems.push('Enter a pace like 8:30 per mile.');
    const { season } = S.calc;
    const reference = draft.original?.at || new Date();
    if (CATS[draft.cat]?.oncePerWeek && draft.cat !== draft.original?.cat && S.posts.some(post =>
      post.memberId === S.me.id && !post.voided && post.cat === draft.cat && Logic.weekIdx(post.at, reference, season.timezone) === 0
    )) problems.push(`You’ve already logged ${catName(draft.cat)} ${draft.original ? 'that' : 'this'} week.`);
    return problems;
  }
  function refreshFoot() {
    const d = S.draft, el = $('#shFoot'); if (!el) return;
    const probs = draftProblems(d), C0 = d.cat ? CATS[d.cat] : null;
    el.innerHTML = `${probs.length ? `<ul class="need${d.tried ? ' tried' : ''}" aria-live="polite">${probs.map(p => `<li>${ic('alert')}${esc(p)}</li>`).join('')}</ul>` : ''}
      <button class="btn btn-primary submit" data-act="submit"${probs.length ? ' aria-disabled="true"' : ''}>${d.original ? 'Save changes' : C0 ? `Claim +${fmtPts(C0.pts)} ${ptsWord(C0.pts)}` : 'Claim points'}</button>`;
  }
  function downscale(file, max = 1100, q = 0.8) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file couldn’t be opened as an image. Try a JPG or PNG screenshot.')); };
      img.src = url;
    });
  }
  function whenISO(key) {
    const now = new Date(), timezone = cfg().timezone;
    if (key === Logic.dayKey(now, timezone)) return now.toISOString();
    return Logic.parseDay(key, timezone, 12).toISOString();
  }
  async function submit() {
    const d = S.draft, probs = draftProblems(d);
    if (probs.length) { d.tried = true; refreshFoot(); const b = $('.submit'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
    if (S.busy) return;
    S.busy = true;
    const before = S.calc.by[S.me.id], oldPts = before.thisWeek, oldBadges = new Set(before.badges);
    const original = d.original;
    const sameDay = original && d.day === Logic.dayKey(original.at, cfg().timezone);
    const post = {
      id: original?.id || `p_${crypto.randomUUID()}`, cat: d.cat, at: sameDay ? original.at : whenISO(d.day),
      witnesses: d.witnesses.slice(), caption: d.caption.trim(), photo: null,
    };
    if (d.cat === 'gym') post.minutes = d.minutes;
    if (d.cat === 'run') { post.miles = d.miles; post.paceSeconds = parsePace(d.pace); }
    if (d.cat === 'bike') post.miles = Number(d.bikeMiles);
    try {
      if (d.photo) post.photo = d.photo === original?.photo ? d.photo : await Store.uploadPhoto(d.photo);
      if (original) await Store.editPost({ ...post, editVersion: original.editVersion });
      else await Store.addPost(post);
    } catch (e) { S.busy = false; toast('Couldn’t save that post: ' + e.message); return; }
    closeSheet();
    try {
      await load();
      if (original) { render(); toast('Activity updated.'); }
      else {
        S.tab = 'home'; S.profileTrail.length = 0; S.ringFrom = oldPts; render(); scrollToTop();
        try { if (navigator.vibrate) navigator.vibrate([16, 50, 16]); } catch (e) { /* not supported */ }
        await Celebrate.play(Celebrate.pick(post.cat, S.me && S.me.username));
        await afterLog(oldPts, oldBadges, post.cat);
      }
    } finally { S.busy = false; }
    checkJokes();
  }
  function flyPoints(text) {
    const ring = $('.ring'); if (!ring) return Promise.resolve();
    const r = ring.getBoundingClientRect(), el = document.createElement('div');
    el.className = 'fly coin'; el.textContent = text; document.body.appendChild(el);
    const sx = innerWidth / 2, sy = innerHeight - 110, ex = r.left + r.width / 2, ey = r.top + r.height / 2;
    const a = el.animate([
      { transform: `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(.5)`, opacity: 0 },
      { transform: `translate(${(sx + ex) / 2}px,${Math.min(sy, ey) - 80}px) translate(-50%,-50%) scale(1.5) rotate(-8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${ex}px,${ey}px) translate(-50%,-50%) scale(.5)`, opacity: 0.2 },
    ], { duration: 860, easing: 'cubic-bezier(.3,.7,.4,1)' });
    return a.finished.then(() => el.remove(), () => el.remove());
  }
  async function afterLog(oldPts, oldBadges, cat) {
    const R = S.calc.by[S.me.id], min = R.goal;
    await flyPoints('+' + fmtPts(CATS[cat].pts));
    S.ringFrom = null;
    setRing(R.thisWeek); countUp($('#ringNum'), oldPts, R.thisWeek);
    const ring = $('.ring'); if (ring) { ring.classList.remove('bump'); void ring.offsetWidth; ring.classList.add('bump'); }
    if (oldPts < min && R.thisWeek >= min) {
      await wait(650);
      if (isHoat()) await hoatSlam();
      else { const card = $('.ringcard'); if (card) { const st = document.createElement('span'); st.className = 'stamp-safe'; st.textContent = 'SAFE!'; card.appendChild(st); } }
      const g = $('.greet .mascot'); if (g) g.src = Art.mascot(isHoat() ? 'thumbs' : 'flex', S.me.username);
      await Celebrate.confetti();
      toast(isHoat() ? `${HOAT.text}. ${min} points, as promised.` : R.eliminated ? 'You hit your goal! Every point still counts toward all-time.' : 'Safe this week! Anything more is bonus glory.', isHoat() ? 'thumbs' : 'flex');
    } else toast(`+${fmtPts(CATS[cat].pts)} for ${catName(cat)}. ${R.thisWeek >= min ? 'Already safe, now you’re just showing off.' : `${fmtPts(min - R.thisWeek)} to go this week.`}`);
    for (const id of R.badges.filter(b => !oldBadges.has(b))) await showBadge(id, true);
  }

  /* ------------------------------------------------------------ inside jokes + Hoat Guarantee */
  const isHoat = () => !!(S.me && String(S.me.username || '').toLowerCase() === HOAT.username);
  const realName = id => displayName(member(id));
  function jokeText(e) {
    const d = e.data || {};
    if (e.type === 'coin') return `${realName(d.a)} and ${realName(d.b)} are tied at ${fmtPts(d.pts)} ${ptsWord(d.pts)} this week. Not even a $1 coin can split them.`;
    if (e.type === 'bluehair') return `${realName(d.who)} has the most points this week with ${fmtPts(d.pts)}. Blue hair activated.`;
    if (e.type === 'iron') return d.post
      ? `${realName(d.who)} hit his weekly goal on Sunday with ${fmtPts(d.pts)} ${ptsWord(d.pts)}. Time to iron that shirt.`
      : `It’s Saturday morning and ${realName(d.who)} is in last with ${fmtPts(d.pts)} ${ptsWord(d.pts)}. Ironing his shirt again?`;
    const names = (ids = []) => new Intl.ListFormat('en').format(ids.map(realName));
    if (e.type === 'liquor') return d.post
      ? `${realName(d.who)} hit his weekly goal on Sunday with ${fmtPts(d.pts)} ${ptsWord(d.pts)}. Time for the liquor run.`
      : `It’s Saturday morning and ${realName(d.who)} is in last with ${fmtPts(d.pts)} points. Still out on that liquor run?`;
    if (e.type === 'bag') return `${names(d.who)} are tied at ${fmtPts(d.pts)} points this week. That’s The Bag.`;
    if (e.type === 'fight') return d.post
      ? `${realName(d.who)} logged beers with the fellas after a gym session. Somebody hold him back.`
      : `${realName(d.who)} shares the lead with ${names(d.tied)} at ${fmtPts(d.pts)} points. Somebody hold him back.`;
    if (e.type === 'crashout') return `${realName(d.who)} called 🧢 on ${realName(d.target)}’s post. Crash Out KNR.`;
    if (e.type === 'satellite') return `${realName(d.who)} logged beers with the fellas. Now for the long trip home to his satellite house.`;
    if (e.type === 'puke') return `${realName(d.who)} dropped into last place on his own. Somebody get him a towel.`;
    if (e.type === 'mma') return `${realName(d.who)} has logged ${d.n} MMA sessions this week. He’d like you to know he does MMA.`;
    if (e.type === 'radiator') return `${realName(d.who)} has gone four days without a log. Somebody check the radiator.`;
    if (e.type === 'mom') return `${realName(d.who)} is still below his weekly goal on Sunday. His mom found out.`;
    if (e.type === 'nets') return `${names(d.who)} took a strike last week and missed the train to the Nets game.`;
    if (e.type === 'phil') return `${realName(d.who)} logged an activity after at least three days away. He saw his shadow. Six more weeks of Winter Arc.`;
    if (e.type === 'scared') return `No date posts for ${d.days ?? d.n * 30} days. The fellas are scared of girls.`;
    if (e.type === 'timesheet') return `${realName(d.who)} reached his weekly goal with ${fmtPts(d.pts)} points on ${d.day === 6 ? 'Saturday' : 'Sunday'}. Big night out, so the work time sheet gets filed from the club at 11:59.`;
    if (e.type === 'hoat') return `${realName(d.who)} hit ${fmtPts(d.pts)} ${ptsWord(d.pts)} this week. Stamped and guaranteed.`;
    const they = (ids = []) => ids.length > 1;
    if (e.type === 'thanksgiving') return `Happy Thanksgiving. ${names(d.who)} ${they(d.who) ? 'have' : 'has'} ${fmtPts(d.pts)} ${ptsWord(d.pts)} this week, the fewest of anyone, so the heaviest thing ${they(d.who) ? 'they' : 'he'} lifted all week is a fork.`;
    // round 2: the post a joke is about, if it's still there
    const post = d.post ? S.posts.find(p => p.id === d.post) : null;
    const what = post ? `${catName(post.cat)} post` : 'post';
    const clock = iso => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: cfg().timezone });
    const weekday = iso => new Date(iso).toLocaleDateString('en-US', { weekday: 'long', timeZone: cfg().timezone });
    const J = INSIDE_JOKES[e.type] || {};
    if (e.type === 'crossing') {
      const left = Math.max(0, (d.goal || 0) - (d.pts || 0));
      return `It’s ${J.from % 12 || 12} ${J.from < 12 ? 'AM' : 'PM'} on Sunday and ${realName(d.who)} still needs ${fmtPts(left)} ${ptsWord(left)}. The canoe is drifting toward the island, and nobody is paddling.`;
    }
    if (e.type === 'mycar') return `${realName(d.who)} was alone in first until ${d.by ? realName(d.by) : 'someone'} caught him on Sunday. My car, my rules, my fault.`;
    if (e.type === 'finalcall') return `${realName(d.who)} hit his weekly goal on Sunday with ${fmtPts(d.pts)} ${ptsWord(d.pts)}. Boarded. Barely.`;
    if (e.type === 'worthit') return `${realName(d.who)} missed last week’s goal by ${fmtPts(d.short)} ${ptsWord(d.short)}. Missed the flight. No regrets.`;
    if (e.type === 'basement') return post
      ? `${realName(d.who)} logged ${catName(post.cat)} at ${clock(post.at)}. Operation Basement: he snuck out for points.`
      : `${realName(d.who)} logged something in the middle of the night. Operation Basement: he snuck out for points.`;
    if (e.type === 'nomap') return `${names(d.who)} haven’t logged anything in ${Math.round((J.hours || 72) / 24)} days. No map. No signal. No idea.`;
    if (e.type === 'grandtheft') return `${realName(d.who)} stole first place from ${realName(d.victim)}${post ? ' on ' + weekday(post.at) : ''}. First place: stolen.`;
    if (e.type === 'wanted') return `${realName(d.who)}’s ${what} has ${d.n} ${CAP}. ${d.n} caps, ${d.n} stars. He’s wanted.`;
    if (e.type === 'busted') return d.selfVoided
      ? `${realName(d.who)} voided their own ${what}. Points police showed up anyway.`
      : `${realName(d.who)}’s ${what} got voided, so that week is worth 0 points. Busted.`;
    if (e.type === 'wasted') return `${realName(d.who)} took strike ${d.strikes} and he’s out. Wasted. See you next season.`;
    if (e.type === 'parole') return `${realName(d.who)} logged ${post ? catName(post.cat) : 'something'} for the first time since he was eliminated. Out on parole. Still eliminated, but every point counts toward all-time.`;
    if (e.type === 'partners') return `${names(d.who)} both logged ${d.cat && CATS[d.cat] ? catName(d.cat) : 'the same thing'} on the same day and vouched for each other. Partners in crime.`;
    if (e.type === 'xmas') {
      const rows = xmasRows(e), naughty = rows.filter(r => r.verdict !== 'nice'), skipped = rows.filter(r => !r.voted);
      return `The votes are in. ${rows.length - naughty.length} made the nice list and ${naughty.length} got coal.${skipped.length ? ` Didn’t vote: ${names(skipped.map(r => r.id))}.` : ''}`;
    }
    if (e.type === 'nye') return `It’s New Year’s Eve. ${d.year ? d.year + ': new' : 'New'} year, same goals.`;
    if (e.type === 'groundhog') return `Happy Groundhog Day. ${d.who && member(d.who) ? realName(d.who) : 'Phil'} has spoken: six more weeks of Winter Arc.`;
    if (e.type === 'valentine') {
      const short = (d.who || []).filter(id => member(id));
      if (!short.length) return 'Happy Valentine’s Day. Everyone’s already safe this week.';
      return `Happy Valentine’s Day. ${d.sunday ? 'It’s Sunday, and ' : ''}${names(short)} ${they(short) ? 'are' : 'is'} still short. A date is worth ${fmtPts(CATS.date.pts)}.`;
    }
    return '';
  }
  const JOKE_EYEBROW = {
    coin: 'Achievement unlocked', bluehair: 'Week leader', iron: 'Weekly points', liquor: 'Weekly points',
    bag: 'Three-way tie', crashout: 'Cap called', satellite: 'Beers with the boys',
    puke: 'Last place', mma: 'Fight night', radiator: 'Missing person', mom: 'Sunday', nets: 'Strike',
    phil: 'Sighting', scared: 'Date drought', timesheet: 'Last minute', hoat: 'Every week, as promised',
    thanksgiving: 'Holiday special',
    crossing: 'Sunday night', mycar: 'First place lost', finalcall: 'Sunday save', worthit: 'So close',
    basement: 'Late night', nomap: 'Missing persons', grandtheft: 'First place stolen', wanted: 'Disputed',
    busted: 'Post voided', wasted: 'Eliminated', parole: 'Back in action', partners: 'Witnesses',
    xmas: 'The votes are in', nye: 'Holiday special', groundhog: 'Holiday special', valentine: 'Holiday special',
  };
  /** Every inside joke that has happened goes in the feed (config: feed). */
  const inFeed = e => (e.type === 'hoat' ? HOAT.feed !== false : !!(INSIDE_JOKES[e.type] && INSIDE_JOKES[e.type].feed));
  function jokeCard(e) {
    if (e.type === 'xmas') return xmasCard(e);
    const hoat = e.type === 'hoat', J = hoat ? { title: HOAT.title } : INSIDE_JOKES[e.type], d = e.data || {};
    const eyebrow = e.type === 'fight' ? (d.post ? 'Gym and beers' : 'Tied for first') : JOKE_EYEBROW[e.type] || 'Inside joke';
    const who = [...new Set([d.a, d.b, d.who, d.tied, d.target, d.by, d.victim].flat().filter(id => id && member(id)))].slice(0, 6);
    const vis = hoat
      ? `<button class="jk-vid jk-stamp" data-act="hoat-replay" aria-label="${esc(HOAT.text)}: play the stamp again">${Art.hoatStamp()}</button>`
      : J.video ? `<button class="jk-vid" data-act="play" data-id="${J.video}" aria-label="Play ${esc(J.title)}"><img src="${Art.poster(J.video)}" alt="" loading="lazy" width="96" height="209"><span class="gplay">${ic('play')}</span></button>` : '';
    return `<article class="post card joke joke-${e.type}${vis ? '' : ' text-only'}" data-eid="${e.id}">
  ${vis}
  <div class="jk-body">
    <p class="eyebrow">${eyebrow}</p>
    <h3${J.title.length > 13 ? ' class="long"' : ''}>${esc(J.title)}</h3>
    <p class="jk-text">${esc(jokeText(e))}</p>
    <p class="jk-meta"><span class="jk-avs">${who.map(id => avatar(id, 28)).join('')}</span><em>${ago(e.at)}</em></p>
  </div>
  <footer>${reactionsHTML('event', e.id)}</footer>
  ${commentsHTML('event', e.id)}
</article>`;
  }
  let jokeBusy = false;
  const quiet = () => $('#avatarCrop').open || S.busy || Celebrate.busy() || !$('#sheet').hidden || !!$('#layer .modal:not(.bye)') || !!$('.xmas-reveal');
  /** Record any inside joke that's true right now (straight to the feed), then pop up the ones you haven't seen (once each). */
  async function checkJokes() {
    if (!inApp() || jokeBusy) return;
    jokeBusy = true;
    try {
      const checkedAt = new Date(), { timezone, weeklyMin } = cfg();
      const found = Logic.jokes(S.members, S.calc, INSIDE_JOKES, checkedAt, timezone, HOAT.feed !== false ? { username: HOAT.username, min: weeklyMin } : null);
      const cooldownStart = Logic.jokeCooldownStart(checkedAt, timezone).toISOString();
      const cooling = new Set(S.events.filter(event => INSIDE_JOKES[event.type] && event.at >= cooldownStart).map(event => event.type));
      let added = false;
      for (const event of found) {
        if (cooling.has(event.type) || S.events.some(e => e.key === event.key)) continue;
        const saved = await Store.recordEvent(event).catch(err => {
          console.warn('Could not record', event.key, err);
          return null;
        });
        if (!saved) continue;
        if (INSIDE_JOKES[saved.type]) cooling.add(saved.type);
        added = true;
      }
      if (added) { S.events = await Store.listEvents(); if (S.tab === 'feed' && $('#sheet').hidden) renderView(); }
      if (!Logic.insideJokesStarted(checkedAt, timezone) || quiet()) return;
      const se = S.calc.season, now = Date.now();
      const due = S.events.filter(e => !e.seen && INSIDE_JOKES[e.type]?.video).sort((a, b) => new Date(a.at) - new Date(b.at));
      for (const e of due) {
        const J = INSIDE_JOKES[e.type];
        if (now - new Date(e.at) > J.playFor * 36e5 || Logic.weekIdx(new Date(e.at), se.start, cfg().timezone) !== se.idx) { await Store.markSeen(e.id); e.seen = true; continue; }
        if (quiet()) break;
        Celebrate.prefetch(J.video);
        await Celebrate.play(J.video);
        await Store.markSeen(e.id); e.seen = true;
        if (e.type === 'xmas') await xmasReveal(e);   // the video is the intro; the app stamps the faces
        else toast(jokeText(e), 'cheer');
        await wait(900);
      }
    } catch (err) { console.error(err); } finally { jokeBusy = false; }
  }
  /** The red rubber stamp, slammed on screen, then tucked into the ring card. */
  async function hoatSlam() {
    const el = document.createElement('div');
    el.className = 'hoat-slam';
    el.innerHTML = `<div class="hs-stamp" role="img" aria-label="${esc(HOAT.text)}">${Art.hoatStamp()}</div>`;
    document.body.appendChild(el);
    const st = el.querySelector('.hs-stamp');
    try { if (navigator.vibrate) navigator.vibrate([20, 40, 90]); } catch (e) { /* not supported */ }
    await st.animate([
      { transform: 'scale(3.2) rotate(-22deg)', opacity: 0 },
      { transform: 'scale(.88) rotate(-8deg)', opacity: 1, offset: 0.62 },
      { transform: 'scale(1) rotate(-8deg)', opacity: 1 },
    ], { duration: 420, easing: 'cubic-bezier(.55,0,.7,.4)', fill: 'forwards' }).finished.catch(() => {});
    el.classList.add('inked');
    $('#app').animate([{ transform: 'none' }, { transform: 'translate(-8px,6px)' }, { transform: 'translate(7px,-5px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'none' }], { duration: 340 });
    await wait(1500);
    const tgt = $('.ringcard .hoat-mini'), a = st.getBoundingClientRect(), b = tgt && tgt.getBoundingClientRect();
    const to = b && b.width ? { transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px,${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${b.width / a.width}) rotate(-12deg)`, opacity: 1 } : { transform: 'scale(.5) rotate(-8deg)', opacity: 0 };
    el.classList.add('leaving');
    await st.animate([{ transform: 'scale(1) rotate(-8deg)', opacity: 1 }, to], { duration: 520, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    if (tgt) tgt.classList.add('on');
    el.remove();
  }

  /* ------------------------------------------------------------ Christmas: Naughty or Nice (XMAS in config.js) */
  /* Dec 24: a ballot pinned to the top of the feed (plus a nudge on Home). Dec 25: the server saves the results
     as the xmas event; each phone plays the joke-xmas intro once, then stamps every face NICE or NAUGHTY. */
  const pendingXmas = new Map();   // target -> choice, while that vote is on its way to the server
  const xmasVoting = () => !!(S.me && S.xmas && S.xmas.phase === 'voting');
  const xmasOthers = () => S.members.filter(m => m.id !== S.me.id);
  const xmasMine = () => Object.assign({}, S.xmas && S.xmas.mine, Object.fromEntries(pendingXmas));
  const xmasList = ids => new Intl.ListFormat('en').format(ids.map(id => (S.me && id === S.me.id ? 'you' : displayName(member(id)))));
  /** The verdicts saved with the xmas event (nicest first, naughtiest last), for people still in the group. */
  function xmasRows(e) { return ((e && e.data && e.data.rows) || []).filter(r => r && member(r.id)); }
  /** Under the word on someone's stamp: his own side of the count first (NICE 6–2, NAUGHTY 5–3). */
  function xmasLine(r) { return !r.voted ? 'DIDN’T VOTE' : r.verdict === 'nice' ? `${r.nice}–${r.naughty}` : `${r.naughty}–${r.nice}`; }

  function xmasNudgeHTML() {
    if (!xmasVoting()) return '';
    const mine = xmasMine(), others = xmasOthers(), done = others.filter(m => mine[m.id]).length, all = done === others.length;
    return `<button type="button" class="card xmas-nudge${all ? ' done' : ''}" data-act="xmas-go">
    <span class="xn-ic" aria-hidden="true">${all ? '😇' : '🎅'}</span>
    <span class="xn-t"><b>${all ? 'Your ballot’s in' : 'Naughty or Nice is open'}</b><small>${all ? 'You can still change your votes until 11:59 PM.' : `You’ve voted on ${done} of ${others.length}. Votes lock at 11:59 PM, and anyone who doesn’t vote gets coal.`}</small></span>
    ${ic('chevron')}
  </button>`;
  }
  function xmasBallotHTML() {
    if (!xmasVoting()) return '';
    const mine = xmasMine();
    const row = m => {
      const c = mine[m.id], n = esc(displayName(m));
      return `<li class="xb-row">${avatar(m.id, 38)}<b>${n}</b><span class="xb-btns" role="group" aria-label="${n}">
      <button type="button" class="xb nice" data-act="xmas-vote" data-id="${m.id}" data-c="nice" aria-label="Nice" aria-pressed="${c === 'nice'}"><span aria-hidden="true">😇</span><span class="w"> Nice</span></button><button type="button" class="xb naughty" data-act="xmas-vote" data-id="${m.id}" data-c="naughty" aria-label="Naughty" aria-pressed="${c === 'naughty'}"><span aria-hidden="true">😈</span><span class="w"> Naughty</span></button>
    </span></li>`;
    };
    return `<section class="card xmas-ballot" aria-labelledby="xbT">
  <p class="eyebrow">Christmas Eve · votes lock at 11:59 PM</p>
  <h2 id="xbT">Naughty or Nice</h2>
  <p class="note">Vote on everyone. Nobody sees a count until Christmas morning, and nobody ever sees who voted what. Don’t vote at all and you go straight on the naughty list.</p>
  <ul class="xb-list">${xmasOthers().map(row).join('')}</ul>
  ${xmasStatusHTML()}
</section>`;
  }
  function xmasStatusHTML() {
    const mine = xmasMine(), others = xmasOthers(), done = others.filter(m => mine[m.id]).length;
    const voted = new Set(S.xmas.voted || []);
    if (done) voted.add(S.me.id);
    const waiting = S.members.filter(m => !voted.has(m.id)).map(m => m.id);
    return `<div class="xb-status" aria-live="polite">
    <p><b>${done === others.length ? 'Your ballot’s in.' : `You’ve voted on ${done} of ${others.length}.`}</b>${done === others.length ? ' You can change it until 11:59 PM.' : ''}</p>
    <p class="note">${voted.size} of ${S.members.length} have voted.${waiting.length ? ` Still waiting on ${esc(xmasList(waiting))}.` : ' Everyone’s in.'}</p>
  </div>`;
  }
  /** Update the ballot in place (the buttons keep focus). */
  function paintBallot() {
    const card = $('.xmas-ballot');
    if (!card) return;
    if (!xmasVoting()) { card.remove(); return; }
    const mine = xmasMine();
    $$('[data-act="xmas-vote"]', card).forEach(b => b.setAttribute('aria-pressed', String(mine[b.dataset.id] === b.dataset.c)));
    const st = $('.xb-status', card);
    if (st) st.outerHTML = xmasStatusHTML();
  }
  async function castXmasVote(target, choice) {
    if (!xmasVoting() || xmasMine()[target] === choice) return;
    pendingXmas.set(target, choice);
    paintBallot();
    try {
      const next = await Store.castXmasVote(target, choice);
      if (pendingXmas.get(target) === choice) pendingXmas.delete(target);
      S.xmas = next;
    } catch (err) {
      if (pendingXmas.get(target) === choice) pendingXmas.delete(target);
      toast(err.message || 'That vote didn’t go through. Try again.', 'shrug');
      if (err.status === 403) { await load(); renderView(); return; }   // voting closed at midnight
    }
    paintBallot();
  }

  /** The results card in the feed: both lists with the counts. Tapping the poster replays the reveal. */
  function xmasCard(e) {
    const rows = xmasRows(e), d = e.data || {}, J = INSIDE_JOKES.xmas;
    const item = r => `<li>${avatar(r.id, 30)}<span class="xr-who"><b>${esc(displayName(member(r.id)))}</b><small>😇 ${r.nice} · 😈 ${r.naughty}${r.voted ? '' : ' · didn’t vote'}</small></span></li>`;
    const col = (nice, label) => {
      const xs = rows.filter(r => (r.verdict === 'nice') === nice);
      return `<section class="xr-col ${nice ? 'nice' : 'naughty'}"><h4>${label}</h4>${xs.length ? `<ul>${xs.map(item).join('')}</ul>` : '<p class="note">Nobody.</p>'}</section>`;
    };
    return `<article class="post card joke joke-xmas" data-eid="${e.id}">
  <button class="jk-vid" data-act="xmas-replay" data-id="${e.id}" aria-label="Play the Naughty or Nice reveal again"><img src="${Art.poster(J.video)}" alt="" loading="lazy" width="96" height="209"><span class="gplay">${ic('play')}</span></button>
  <div class="jk-body">
    <p class="eyebrow">${JOKE_EYEBROW.xmas}${d.year ? ' · ' + d.year : ''}</p>
    <h3 class="long">${esc(J.title)}</h3>
    <p class="jk-text">${esc(jokeText(e))}</p>
    <p class="jk-meta"><em>${ago(e.at)}</em></p>
  </div>
  <div class="xr-lists">${col(true, '😇 Nice list')}${col(false, '😈 Naughty list')}</div>
  <footer>${reactionsHTML('event', e.id)}</footer>
  ${commentsHTML('event', e.id)}
</article>`;
  }

  /** The reveal: one face at a time gets stamped NICE or NAUGHTY with its count (nice list first, the naughtiest
      last), then drops onto its list. Tap anywhere to skip to the end. Resolves when it's closed. */
  function xmasReveal(e) {
    const rows = xmasRows(e);
    if (!rows.length) return Promise.resolve();
    const d = e.data || {}, nice = rows.filter(r => r.verdict === 'nice'), naughty = rows.filter(r => r.verdict !== 'nice');
    const skipped = rows.filter(r => !r.voted), back = document.activeElement;
    const nameOfRow = r => esc(displayName(member(r.id)));
    const slot = r => `<li class="xr-slot" data-id="${r.id}">${avatar(r.id, 40)}<span class="xr-who"><b>${nameOfRow(r)}</b><small>😇 ${r.nice} · 😈 ${r.naughty}</small></span></li>`;
    const snow = Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37 + 11) % 100}%;--d:${6 + (i * 7) % 9}s;--t:-${((i * 1.7) % 9).toFixed(1)}s;--s:${4 + (i * 5) % 8}px"></i>`).join('');
    const el = document.createElement('div');
    el.className = 'xmas-reveal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'xrT');
    el.innerHTML = `<div class="xr-snow" aria-hidden="true">${snow}</div>
  <div class="xr-board">
    <p class="xr-eyebrow">Christmas${d.year ? ' ' + d.year : ''} · ${d.voters || 0} of ${rows.length} voted</p>
    <h2 id="xrT" class="xr-title">Naughty or Nice</h2>
    <div class="xr-cols">
      <section class="xr-col nice"><h3>😇 Nice list</h3><ul>${nice.map(slot).join('') || '<li class="xr-none">Nobody</li>'}</ul></section>
      <section class="xr-col naughty"><h3>😈 Naughty list</h3><ul>${naughty.map(slot).join('') || '<li class="xr-none">Nobody</li>'}</ul></section>
    </div>
    ${skipped.length ? `<p class="xr-note">Didn’t vote, so straight to the naughty list: ${esc(xmasList(skipped.map(r => r.id)))}.</p>` : ''}
    <button type="button" class="btn btn-primary xr-done">Skip to the results</button>
  </div>
  <div class="xr-stage" aria-hidden="true"></div>`;
    document.body.appendChild(el);
    const stage = $('.xr-stage', el), btn = $('.xr-done', el);
    const running = new Set(), waiters = new Set();
    let skip = matchMedia('(prefers-reduced-motion: reduce)').matches, finished = false;
    const anim = (node, frames, opts) => {
      const a = node.animate(frames, opts);
      if (skip) a.finish(); else running.add(a);
      return a.finished.catch(() => {}).then(() => { running.delete(a); });
    };
    const pause = ms => skip ? Promise.resolve() : new Promise(res => {
      let t;
      const done = () => { clearTimeout(t); waiters.delete(done); res(); };
      t = setTimeout(done, ms);
      waiters.add(done);
    });
    const skipAll = () => {
      if (skip) return;
      skip = true;
      [...running].forEach(a => a.finish());
      [...waiters].forEach(fn => fn());
    };
    const buzz = pattern => { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (err) { /* not supported */ } };

    async function run() {
      const order = [...nice, ...naughty];
      for (let i = 0; i < order.length && !skip; i++) {
        const r = order[i], last = order.length > 1 && i === order.length - 1 && r.verdict !== 'nice';
        const face = document.createElement('div');
        face.className = `xr-face ${r.verdict === 'nice' ? 'nice' : 'naughty'}`;
        face.innerHTML = `${last ? '<p class="xr-kicker">And the naughtiest of them all…</p>' : ''}<span class="xr-av">${avatar(r.id, 150)}<span class="xr-stamp">${Art.xmasStamp(r.verdict, xmasLine(r))}</span></span><b class="xr-name">${nameOfRow(r)}</b><small class="xr-count">😇 ${r.nice} · 😈 ${r.naughty}${r.voted ? '' : ' · didn’t vote'}</small>`;
        stage.appendChild(face);
        stage.classList.add('on');
        await anim(face, [{ transform: 'translateY(70px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'both' });
        await pause(last ? 1000 : 300);
        if (skip) break;
        buzz(last ? [30, 50, 160] : [20, 40, 90]);
        await anim($('.xr-stamp', face), [
          { transform: 'translate(-50%,-50%) scale(3.2) rotate(-22deg)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(.88) rotate(-8deg)', opacity: 1, offset: 0.62 },
          { transform: 'translate(-50%,-50%) scale(1) rotate(-8deg)', opacity: 1 },
        ], { duration: 420, easing: 'cubic-bezier(.55,0,.7,.4)', fill: 'forwards' });
        face.classList.add('inked');
        anim(face, [{ transform: 'none' }, { transform: 'translate(-8px,6px)' }, { transform: 'translate(7px,-5px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'none' }], { duration: last ? 520 : 340 });
        await pause(last ? 1800 : r.verdict === 'nice' ? 650 : 800);
        if (skip) break;
        // fly the face onto its list: scale around the avatar so it lands on the slot's avatar
        const target = $(`.xr-slot[data-id="${r.id}"]`, el);
        target.scrollIntoView({ block: 'nearest' });
        const f = face.getBoundingClientRect(), a = $('.xr-av > .av', face).getBoundingClientRect(), b = $('.av', target).getBoundingClientRect();
        const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
        face.style.transformOrigin = `${ax - f.left}px ${ay - f.top}px`;
        await anim(face, [{ transform: 'none', opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - ax}px,${b.top + b.height / 2 - ay}px) scale(${b.width / a.width})`, opacity: 0.3 }], { duration: 440, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
        face.remove();
        stage.classList.remove('on');
        target.classList.add('on');
        anim(target, [{ transform: 'scale(1.2)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
        await pause(120);
      }
      stage.innerHTML = '';
      stage.classList.remove('on');
      $$('.xr-slot', el).forEach(s => s.classList.add('on'));
    }

    return new Promise(resolve => {
      const close = () => {
        document.removeEventListener('keydown', onKey);
        el.classList.add('bye');
        setTimeout(() => { el.remove(); resolve(); }, 240);
        if (back && back.isConnected && back.focus) back.focus({ preventScroll: true });
      };
      const onKey = ev => { if (ev.key === 'Escape') { if (finished) close(); else skipAll(); } };
      document.addEventListener('keydown', onKey);
      el.addEventListener('click', ev => {
        if (finished) { if (ev.target.closest('.xr-done')) close(); return; }
        skipAll();
      });
      btn.focus({ preventScroll: true });
      run().catch(err => console.error(err)).then(() => {
        finished = true;
        el.classList.add('done');
        btn.textContent = 'Merry Christmas';
        btn.focus({ preventScroll: true });
      });
    });
  }

  /* ------------------------------------------------------------ modals + toasts */
  function modal(html, cls = '') {
    let el;
    const pr = new Promise(res => {
      const back = document.activeElement; el = document.createElement('div');
      el.className = 'modal ' + cls;
      el.innerHTML = `<div class="scrim" data-close></div><div class="mbox" role="dialog" aria-modal="true">${html}</div>`;
      $('#layer').appendChild(el);
      const close = v => { document.removeEventListener('keydown', onKey); el.classList.add('bye'); setTimeout(() => el.remove(), 180); if (back && back.focus) back.focus(); res(v); };
      const onKey = e => { if (e.key === 'Escape') close(false); };
      document.addEventListener('keydown', onKey);
      el.addEventListener('click', e => { const b = e.target.closest('[data-close],[data-ok]'); if (!b || b.disabled) return; e.stopPropagation(); close(b.hasAttribute('data-ok') ? (b.dataset.val || true) : false); });
      setTimeout(() => { const f = el.querySelector('input') || el.querySelector('[data-ok]') || el.querySelector('.mbox button'); if (f) f.focus(); }, 60);
    });
    pr.el = el;
    return pr;
  }
  const confirmBox = (title, body, ok, danger) => modal(`<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="mact"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>`);
  function showBadge(id, fresh, memberId = S.me.id) {
    const b = BADGES.find(x => x.id === id), has = S.calc.by[memberId].badges.includes(id);
    return modal(`<div class="bpop${has ? '' : ' locked'}"><div class="burst" aria-hidden="true"></div>${Art.icon64(b.icon, 'big')}<p class="eyebrow">${fresh ? 'Badge unlocked' : has ? 'Badge earned' : 'Locked badge'}</p><h2>${esc(b.name)}</h2><p>${esc(b.desc)}</p><button class="btn btn-primary" data-ok>${fresh ? 'Let’s go' : 'OK'}</button></div>`, 'badge-modal');
  }
  function toast(msg, pose = 'thumbs') {
    const t = $('#toast'); t.innerHTML = `<img src="${Art.mascot(pose)}" alt="">${esc(msg)}`;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 3000);
  }
  function floatEmoji(el, e) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span'); s.className = 'femo'; s.textContent = e;
      s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + 'px'; document.body.appendChild(s);
      const dx = (Math.random() - 0.5) * 80, dy = -60 - Math.random() * 70;
      s.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),${dy}px) scale(1.25)`, opacity: 0 }], { duration: 650 + i * 70, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished.then(() => s.remove(), () => s.remove());
    }
  }

  function updateReactionButton(button, memberIds) {
    const on = memberIds.includes(S.me.id);
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
    button.querySelector('span').textContent = memberIds.length || '';
    if (on) {
      button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop');
      floatEmoji(button, button.dataset.e);
    }
  }

  async function reactToFeedPost(el) {
    const { kind, id, e: emoji } = el.dataset, viewer = S.me?.id;
    const key = `${kind}:${id}:${emoji}`;
    if (!viewer || pendingFeedReactions.has(key)) return;
    pendingFeedReactions.add(key);
    el.disabled = true;
    let memberIds;
    try {
      const saved = await Store.setFeedReaction(kind, id, emoji, el.getAttribute('aria-pressed') !== 'true');
      if (S.me?.id !== viewer) return;
      memberIds = saved;
      (S.feedReactions[kind + ':' + id] ??= {})[emoji] = memberIds;
    } finally {
      pendingFeedReactions.delete(key);
      const button = $(`.rx button[data-kind="${kind}"][data-id="${CSS.escape(id)}"][data-e="${CSS.escape(emoji)}"]`);
      if (button) {
        button.disabled = false;
        if (memberIds) updateReactionButton(button, memberIds);
      }
    }
  }

  /* ------------------------------------------------------------ actions */
  const ACT = {
    tab: el => go(el.dataset.tab),
    'refresh-feed': () => refreshFeed(),
    async 'poll-vote'(button) {
      const { id, choice } = button.dataset;
      if (pendingPollVotes.has(id) || button.getAttribute('aria-pressed') === 'true') return;
      const card = button.closest('.feed-poll');
      pendingPollVotes.add(id);
      card.setAttribute('aria-busy', 'true');
      try {
        await Store.votePoll(id, Number(choice));
        const { polls } = await Store.listSocial();
        S.polls = polls;
        const poll = polls.find(item => item.id === id);
        if (poll && card.isConnected) {
          const focused = document.activeElement === button;
          card.insertAdjacentHTML('afterend', pollCard(poll));
          if (focused) card.nextElementSibling.querySelector(`[data-choice="${Number(choice)}"]`).focus({ preventScroll: true });
          card.remove();
        }
      } finally {
        pendingPollVotes.delete(id);
        card.removeAttribute('aria-busy');
      }
    },
    'member-profile': el => openMemberProfile(el.dataset.id),
    'profile-back': () => backFromProfile(),
    'profile-posts'() {
      const heading = $('#profilePosts');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start' });
    },
    log: () => openLog(),
    'hoat-replay': () => hoatSlam(),
    async 'resolve-injury'(el) {
      const report = S.activeInjuries?.find(row => row.id === el.dataset.id);
      if (!report || !await confirmBox(`Mark ${report.name} recovered?`, 'This closes the active injury report.', 'Mark recovered')) return;
      await Store.resolveInjuryReport(report.id);
      await load(); renderView(); toast('Injury report closed.');
    },
    seg(el) { flipBoard(() => { S.board = el.dataset.v; renderView(); }); },
    async 'comment-heart'(el) {
      const id = el.dataset.id, comment = findComment(id), viewer = S.me?.id;
      if (!comment || !viewer || pendingCommentHearts.has(id)) return;
      pendingCommentHearts.add(id);
      el.disabled = true;
      let state;
      try {
        const saved = await Store.setCommentHeart(id, !comment.hearted);
        if (S.me?.id !== viewer) return;
        state = saved;
        const current = findComment(id);
        if (current) Object.assign(current, state);
      } finally {
        pendingCommentHearts.delete(id);
        const button = $(`.comment-heart[data-id="${CSS.escape(id)}"]`);
        if (button) {
          button.disabled = false;
          if (state) {
            button.setAttribute('aria-pressed', String(state.hearted));
            button.querySelector('span').textContent = state.heartCount;
          }
        }
      }
    },
    async react(el) {
      if (el.dataset.kind !== 'activity') return reactToFeedPost(el);
      const p = await Store.toggleReaction(el.dataset.id, el.dataset.e); if (!p) return;
      const i = S.posts.findIndex(x => x.id === p.id); if (i >= 0) S.posts[i] = p;
      updateReactionButton(el, p.reactions[el.dataset.e] || []);
      if (el.dataset.e === CAP) { const card = el.closest('.post'); setTimeout(() => { if (card && card.isConnected) card.outerHTML = postCard(p); }, 650); }
    },
    photo(el) { const p = S.posts.find(x => x.id === el.dataset.id); if (p) modal(`<img class="full" src="${esc(Art.photo(p.photo))}" alt="Proof photo"><button class="btn" data-close>Close</button>`, 'photo-modal'); },
    edit(el) {
      const post = S.posts.find(p => p.id === el.dataset.id && p.memberId === S.me.id && !p.voided && !p.fraud);
      if (post) openLog(post);
    },
    async del(el) {
      if (!(await confirmBox('Delete this post?', 'Its points come off your week.', 'Delete', true))) return;
      await Store.deletePost(el.dataset.id); await load(); renderView(); toast('Post deleted.');
    },
    async void(el) {
      const p = S.posts.find(x => x.id === el.dataset.id); if (!p) return;
      const who = (member(p.memberId) || {}).name || 'They';
      const own = p.memberId === S.me.id;
      const note = own ? 'This removes the points from this activity.' : `Rule 9: ${esc(who)} gets a 0-point week for the week of this post.`;
      if (!(await confirmBox(own ? 'Void your post?' : 'Void this post as fraud?', note, 'Void it', true))) return;
      try { await Store.voidPost(p.id); } catch (e) { toast(e.message, 'shrug'); return; }
      await load(); renderView(); toast(own ? 'Activity voided.' : `Voided. ${who} gets a 0-point week.`, 'shrug');
      if (own && S.events.some(e => e.key === 'busted:' + p.id && !e.seen)) checkJokes();
    },
    play: el => Celebrate.play(el.dataset.id),
    'xmas-vote': el => castXmasVote(el.dataset.id, el.dataset.c),
    'xmas-go': () => go('feed'),
    async 'xmas-replay'(el) {
      const e = S.events.find(x => x.id === el.dataset.id && x.type === 'xmas');
      if (!e || quiet()) return;
      Celebrate.prefetch(INSIDE_JOKES.xmas.video);
      await Celebrate.play(INSIDE_JOKES.xmas.video);
      await xmasReveal(e);
    },
    badge: el => showBadge(el.dataset.id, false, openProfileMember()?.id),
    async switch() {
      const pick = await demoChooser('Switch person', 'Preview only: jump into anyone’s account.'); if (!pick) return;
      await Store.demoSignInAs(pick); await afterAuth();
    },
    async reset() {
      if (!(await confirmBox('Reset the sample data?', 'Your test posts, inside jokes and passwords go back to the start.', 'Reset'))) return;
      await Store.resetDemo(); await load(); S.tab = 'home'; S.profileTrail.length = 0; render(); scrollToTop(); toast('Sample data reset.');
    },
    ...AUTH_ACT,
    'close-sheet': () => closeSheet(),
    'pick-photo': () => $('#photoInput').click(),
    'clear-photo': () => { S.draft.photo = null; refreshProof(); refreshFoot(); },
    wit(el) { const w = S.draft.witnesses, id = el.dataset.id, i = w.indexOf(id); if (i >= 0) w.splice(i, 1); else w.push(id); el.setAttribute('aria-pressed', String(i < 0)); refreshFoot(); },
    cat(el) { S.draft.cat = el.dataset.cat; if (!S.draft.original) Celebrate.prepare(el.dataset.cat, S.me && S.me.username); refreshCats(); refreshDetails(); refreshFoot(); },
    step(el) {
      const d = S.draft, k = el.dataset.k, dv = parseFloat(el.dataset.d);
      if (k === 'minutes') { d.minutes = U.clamp(d.minutes + dv, 0, 300); $('#minOut').innerHTML = `${d.minutes}<small> min</small>`; const m = $('#minMsg'); m.className = d.minutes >= 45 ? 'ok' : 'warn'; m.textContent = d.minutes >= 45 ? 'Counts. 45 minutes minimum.' : 'Gym needs at least 45 minutes to count.'; }
      else { d.miles = Math.max(0, Math.round((d.miles + dv) * 10) / 10); $('#miOut').innerHTML = `${d.miles.toFixed(1)}<small> mi</small>`; const m = $('#miMsg'); m.className = d.miles >= 2 ? 'ok' : 'warn'; m.textContent = d.miles >= 2 ? 'Counts. 2 miles minimum.' : 'Runs need at least 2 miles.'; }
      refreshFoot();
    },
    day(el) { S.draft.day = el.dataset.day; refreshWhen(); },
    submit: () => submit(),
  };

  function bind() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if (!el || el.closest('.modal')) return;
      const fn = ACT[el.dataset.act]; if (!fn) return;
      e.preventDefault(); Promise.resolve(fn(el, e)).catch(err => { console.error(err); toast(err.message || 'Something went wrong.', 'shrug'); });
    });
    document.addEventListener('change', async e => {
      const t = e.target;
      if (t.id === 'photoInput') {
        const f = t.files && t.files[0]; t.value = ''; if (!f || !S.draft) return;
        try { S.draft.photo = await downscale(f); refreshProof(); refreshFoot(); } catch (err) { toast(err.message, 'shrug'); }
      } else if (t.id === 'avatarInput') {
        const file = t.files?.[0]; if (!file) return;
        try { await editAvatar(file, '#avatarInput'); } catch (err) { toast(err.message, 'shrug'); }
        finally { t.value = ''; }
      } else if (t.dataset && t.dataset.pref) {
        try { S.prefs = await Store.updatePrefs({ [t.dataset.pref]: t.checked }); toast(t.checked ? 'Reminder on.' : 'Reminder off.', 'thumbs'); } catch (err) { t.checked = !t.checked; toast(err.message, 'shrug'); }
      } else if (t.dataset && t.dataset.check && S.draft) { S.draft.checks[t.dataset.check] = t.checked; refreshFoot(); }
    });
    document.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'caption' && S.draft) S.draft.caption = t.value;
      else if (t.id === 'runPace' && S.draft) { S.draft.pace = t.value; refreshFoot(); }
      else if (t.id === 'bikeMiles' && S.draft) { S.draft.bikeMiles = t.value; refreshFoot(); }
      else if (t.id === 'siUser') S.lastUser = t.value;
      else if (t.id === 'afName') { const u = $('#afUser'); if (u && !u.dataset.touched) u.value = t.value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ''); }
      else if (t.id === 'afUser') t.dataset.touched = '1';
    });
    document.addEventListener('submit', async e => {
      const form = e.target;
      const fn = form.dataset.commentFor ? async () => {
        await Store.addFeedComment({ target:form.dataset.commentFor, kind:form.dataset.commentKind, body:new FormData(form).get('body') });
        await load(); renderView();
      } : FORMS[form.id];
      if (!fn) return; e.preventDefault();
      const btn = e.target.querySelector('[type=submit]'); if (btn) btn.disabled = true;
      try { await fn(e.target); } catch (err) { toast(err.message || 'Something went wrong.', 'shrug'); } finally { if (btn && btn.isConnected) btn.disabled = false; }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden && !$('#layer .modal')) closeSheet(); });
  }
  function tick() {
    const el = $('#cd'); if (!S.calc || !inApp()) return;
    const se = Logic.season(cfg(), new Date());
    const day = Logic.dayKey(new Date(), se.timezone);
    if (!tick.day) tick.day = day;
    if (tick.day !== day && !quiet() && !document.activeElement?.closest('[data-feed-form]')) {
      tick.day = day;
      load().then(renderView);
      return;
    }
    if (se.idx !== S.calc.season.idx || se.status !== S.calc.season.status) { if (!S.busy && !Celebrate.busy() && $('#sheet').hidden) load().then(renderView); return; }
    if (el && se.status !== 'over') el.textContent = fmtLeft(se.msLeft);
    if (Date.now() - (tick.j || 0) > 12000) { tick.j = Date.now(); checkJokes(); }
  }

  async function start() {
    $$('[data-icon]').forEach(b => b.insertAdjacentHTML('afterbegin', ic(b.dataset.icon)));
    window.visualViewport?.addEventListener('resize', syncKeyboard);
    window.visualViewport?.addEventListener('scroll', syncKeyboard);
    window.addEventListener('scroll', syncKeyboard, { passive: true });
    document.addEventListener('focusin', syncKeyboard);
    document.addEventListener('focusout', syncKeyboard);
    bind();
    bindFeedRefresh();
    await Store.init();
    S.lastUser = Store.setupUsername;
    try { await Promise.race([Promise.all([document.fonts.load('40px "Luckiest Guy"'), document.fonts.load('700 16px "Baloo 2"')]), wait(1500)]); } catch (e) { /* fonts optional */ }
    await load();
    render();
    document.body.classList.remove('booting');
    setInterval(tick, 1000);
    tick.j = Date.now();
    checkJokes();
    Store.subscribe(async () => {
      if (feedRefreshing || quiet() || pendingCommentHearts.size || pendingFeedReactions.size || pendingPollVotes.size || pendingXmas.size || editingFeed()) return false;
      const wasInApp = inApp();
      await load();
      if (inApp() !== wasInApp) render();
      else if (inApp() && S.tab !== 'account') renderView();
      checkJokes();
    });
  }
  return { start, state: S };
})();

App.start().catch(() => {
  document.body.classList.remove('booting');
  document.body.classList.add('signed-out');
  document.getElementById('view').innerHTML =
    '<section class="screen auth"><p class="note">Winter Arc couldn’t connect. Reload to try again.</p></section>';
});
