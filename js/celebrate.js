'use strict';
/* =====================================================================
   WINTER ARC · celebrations (full-screen video) + confetti
   ===================================================================== */
const Celebrate = (() => {
  let busy = false;
  const last = {}, prepared = {}, blobs = {}, pending = {};
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* Sound: on unless the person turned it off with the speaker button (remembered on this device).
     Phones only allow a video's sound right after a tap, so when sound is blocked the video plays
     muted and the speaker button says "Tap for sound". */
  const SOUND_KEY = 'wa.sound';
  const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { return true; } };
  const setSound = on => { try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) { /* private mode */ } };
  const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>';
  const ICON_ON = SPEAKER + '<path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const ICON_OFF = SPEAKER + '<path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const selectionKey = (cat, user) => `${cat}:${String(user || '').toLowerCase()}`;

  /** Download a celebration in the background so it starts instantly (and
      plays from a blob: URL, which also works on hosts without byte ranges). */
  function prefetch(id) {
    if (!id || blobs[id] || pending[id] || !window.fetch) return;
    pending[id] = fetch(Art.video(id))
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(r.status))))
      .then(b => { blobs[id] = URL.createObjectURL(b); })
      .catch(() => {})
      .finally(() => { delete pending[id]; });
    const img = new Image(); img.src = Art.poster(id);
  }

  function choose(cat, user) {
    const u = String(user || '').toLowerCase();
    const list = (CELEBRATIONS[cat] || []).filter(c => !c.users || c.users.includes(u));
    if (!list.length) return null;
    let opts = list.filter(c => c.id !== last[cat]);
    if (!opts.length) opts = list;
    return opts[Math.floor(Math.random() * opts.length)].id;
  }

  /** Called when an activity is selected in the log sheet: choose its
      celebration now and start downloading it. */
  function prepare(cat, user) {
    if (reduced()) return;
    const key = selectionKey(cat, user);
    if (!prepared[key]) prepared[key] = choose(cat, user);
    prefetch(prepared[key]);
  }

  /** Pick a celebration for an activity, avoiding the one played last time. */
  function pick(cat, user) {
    const key = selectionKey(cat, user);
    const id = prepared[key] || choose(cat, user);
    delete prepared[key];
    if (id) last[cat] = id;
    return id;
  }

  /** Play one celebration video full screen. Tap anywhere to skip; the speaker button turns sound on or off. */
  async function play(id) {
    if (!id || reduced()) return;
    busy = true;
    if (!blobs[id] && pending[id]) await Promise.race([pending[id], wait(1500)]);
    const src = blobs[id] || Art.video(id);
    return new Promise(resolve => {
      const el = document.getElementById('celebrate');
      el.innerHTML = `<video playsinline muted preload="auto" disablepictureinpicture poster="${Art.poster(id)}" src="${src}"></video>
        <button class="snd" type="button"></button>
        <button class="skip" type="button">Tap to skip</button>`;
      el.hidden = false;
      requestAnimationFrame(() => el.classList.add('show'));
      const v = el.querySelector('video'), btn = el.querySelector('.skip'), snd = el.querySelector('.snd');
      let done = false, safety = setTimeout(() => finish(), 9000);
      const paint = () => {
        snd.innerHTML = (v.muted ? ICON_OFF : ICON_ON) + (snd.classList.contains('hint') ? '<span>Tap for sound</span>' : '');
        snd.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Turn sound off');
        snd.classList.toggle('off', v.muted);
      };
      const tapToPlay = () => { el.classList.add('tap'); btn.textContent = 'Tap to play'; };
      snd.onclick = e => {
        e.stopPropagation();
        v.muted = !v.muted;
        setSound(!v.muted);
        snd.classList.remove('hint');
        paint();
        if (el.classList.contains('tap')) el.onclick();
      };
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(safety);
        el.classList.add('bye');
        setTimeout(() => { el.hidden = true; el.classList.remove('show', 'bye', 'tap'); el.innerHTML = ''; busy = false; resolve(); }, 240);
      };
      v.addEventListener('ended', finish);
      v.addEventListener('error', finish);
      el.onclick = () => {
        // Autoplay was blocked (e.g. iPhone Low Power Mode): the first tap plays, with sound if it's on.
        if (el.classList.contains('tap')) {
          el.classList.remove('tap'); btn.textContent = 'Tap to skip';
          clearTimeout(safety); safety = setTimeout(finish, 9000);
          v.muted = !soundOn(); snd.classList.remove('hint'); paint();
          const q = v.play(); if (q && q.catch) q.catch(finish);
          return;
        }
        finish();
      };
      // Try with sound first. If the phone won't allow it without a tap, play muted and offer the button.
      const want = soundOn();
      v.muted = !want;
      paint();
      const p = v.play();
      if (p && p.catch) {
        p.catch(() => {
          if (done) return;
          if (!want) { tapToPlay(); return; }
          v.muted = true;
          snd.classList.add('hint');
          paint();
          const q = v.play();
          if (q && q.catch) q.catch(() => { if (!done) tapToPlay(); });
        });
      }
    });
  }

  /** Canvas confetti burst; resolves when it has mostly fallen. */
  function confetti(ms = 2200) {
    if (reduced()) return Promise.resolve();
    return new Promise(resolve => {
      const cv = document.createElement('canvas');
      cv.className = 'confetti';
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      document.body.appendChild(cv);
      const c = cv.getContext('2d');
      c.scale(dpr, dpr);
      const cols = ['#FF4D6D', '#FFC93A', '#2D7BF0', '#2BD98A', '#B266FF', '#FF8A3D', '#FFFFFF'];
      const ps = Array.from({ length: 140 }, (_, i) => ({
        x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 16, vy: -8 - Math.random() * 12,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, w: 8 + Math.random() * 8, h: 5 + Math.random() * 5, col: cols[i % cols.length],
      }));
      const t0 = performance.now();
      const step = now => {
        const t = now - t0;
        c.clearRect(0, 0, innerWidth, innerHeight);
        for (const p of ps) {
          p.vy += 0.38; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.scale(1, Math.cos(p.r * 2));
          c.globalAlpha = Math.max(0, 1 - t / ms);
          c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          c.restore();
        }
        if (t < ms) requestAnimationFrame(step); else { cv.remove(); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  return { prepare, prefetch, pick, play, confetti, busy: () => busy };
})();
