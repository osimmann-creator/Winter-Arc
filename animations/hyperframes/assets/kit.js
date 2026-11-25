/* Winter Arc kit for HyperFrames: small deterministic GSAP helpers every clip shares.
   Times are in seconds unless a name says frames (F = one frame at 30 fps).
   GSAP rules of thumb here (HyperFrames seeks to the end and back before it captures, so every tween must survive
   being rewound and replayed):
   - a fromTo that starts after 0 gets immediateRender:false unless its from-state should hold before it starts
     (something waiting offstage); otherwise it shows its from-state from frame 0;
   - every property in a fromTo's from-vars is also in its to-vars (a from-only property is lost after a rewind).
   An actor is laid out as  .actor > .squash > .jit > img.pose (one per pose, stacked):
   move .actor (slides, hops), squash .squash, shake .jit, swap poses with WA.pose(). */
(function () {
  'use strict';
  var F = 1 / 30;

  function rng(seed) {
    var s = ((seed + 1) * 2654435761) >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  /** An element from '#id' / '.class' / 'id' / an element. */
  function $(id) {
    if (typeof id !== 'string') return id;
    var el = /^[#.\[]/.test(id) ? document.querySelector(id) : document.getElementById(id);
    if (!el) throw new Error('kit.js: no element ' + id);
    return el;
  }

  /** Jitter an element over [at, at + dur]. amp px, rot deg; grow > 0 builds it up, decay fades it out. */
  function shake(tl, el, at, dur, amp, opt) {
    opt = opt || {};
    el = $(el);
    var r = rng(opt.seed || 7), step = (opt.step || 2) * F, rot = opt.rot || 0;
    var n = Math.max(1, Math.round(dur / step));
    for (var i = 0; i < n; i++) {
      var k = opt.decay ? 1 - i / n : 1 + (opt.grow || 0) * (i / n);
      tl.to(el, { x: (r() * 2 - 1) * amp * k, y: (r() * 2 - 1) * amp * 0.6 * k, rotation: (r() * 2 - 1) * rot * k, duration: step, ease: 'none' }, at + i * step);
    }
    tl.to(el, { x: 0, y: 0, rotation: 0, duration: step, ease: 'none' }, at + n * step);
  }

  /** Show one pose of an actor at `at` (all its img.pose share a canvas, so they line up). */
  function pose(tl, actor, name, at) {
    actor = $(actor);
    var imgs = actor.querySelectorAll('img.pose, .pose');
    for (var i = 0; i < imgs.length; i++) tl.set(imgs[i], { opacity: imgs[i].dataset.pose === name ? 1 : 0 }, at);
  }

  /** A take: quick squash, the new pose on the stretch, then settle. */
  function take(tl, actor, name, at, amt) {
    actor = $(actor);
    var sq = actor.querySelector('.squash') || actor;
    amt = amt || 0.08;
    tl.to(sq, { scaleY: 1 - amt, scaleX: 1 + amt * 0.7, duration: 3 * F, ease: 'power2.in' }, at - 3 * F);
    pose(tl, actor, name, at);
    tl.to(sq, { scaleY: 1 + amt * 0.6, scaleX: 1 - amt * 0.4, duration: 3 * F, ease: 'power2.out' }, at);
    tl.to(sq, { scaleY: 1, scaleX: 1, duration: 7 * F, ease: 'back.out(3)' }, at + 3 * F);
  }

  /** Squash and stretch on the spot (landing, impact). */
  function squash(tl, el, at, amt, frames) {
    el = $(el);
    var sq = el.querySelector && el.querySelector('.squash') || el;
    amt = amt || 0.12; frames = frames || 12;
    tl.to(sq, { scaleY: 1 - amt, scaleX: 1 + amt * 0.8, duration: 3 * F, ease: 'power2.out' }, at);
    tl.to(sq, { scaleY: 1, scaleX: 1, duration: (frames - 3) * F, ease: 'elastic.out(1.1, 0.45)' }, at + 3 * F);
  }

  /** Hop: up h px and back down over `frames`. */
  function hop(tl, el, at, h, frames) {
    el = $(el); h = h || 60; frames = frames || 12;
    tl.to(el, { y: '-=' + h, duration: frames / 2 * F, ease: 'power2.out' }, at);
    tl.to(el, { y: '+=' + h, duration: frames / 2 * F, ease: 'power2.in' }, at + frames / 2 * F);
  }

  /** Pop something in (scale from 0 with an overshoot). */
  function popIn(tl, el, at, frames, opt) {
    opt = opt || {};
    // immediateRender:false keeps the element as it was (usually hidden) until the pop, whichever way the clip is seeked
    tl.fromTo($(el), { scale: opt.from == null ? 0 : opt.from, rotation: opt.rot0 == null ? -12 : opt.rot0, opacity: 1 },
      { scale: opt.to || 1, rotation: opt.rot || 0, opacity: 1, duration: (frames || 10) * F, ease: opt.ease || 'back.out(2.4)', immediateRender: false }, at);
  }
  function popOut(tl, el, at, frames) {
    tl.to($(el), { scale: 0, opacity: 0, duration: (frames || 6) * F, ease: 'back.in(2)' }, at);
  }
  /** A comic sound word (.word): pops in, trembles, then blows away. */
  function word(tl, el, at, frames, opt) {
    el = $(el); opt = opt || {};
    frames = frames || 26;
    tl.set(el, { opacity: 0 }, 0);
    popIn(tl, el, at, 9, { rot0: opt.rot0 == null ? -18 : opt.rot0, rot: opt.rot || 0, from: 0.2 });
    if (opt.shake !== false) shake(tl, el.querySelector('.jit') || el.firstElementChild || el, at, (frames - 8) * F, opt.amp || 4, { seed: opt.seed || 3 });
    tl.to(el, { scale: 1.3, opacity: 0, duration: 6 * F, ease: 'power1.in' }, at + (frames - 6) * F);
  }

  /** Throw an element along a parabola: start x0,y0 (px offsets), velocity vx,vy px/frame, gravity g px/frame². */
  function toss(tl, el, at, o) {
    el = $(el);
    var frames = o.frames || 24, g = o.g == null ? 1.2 : o.g;
    var x1 = o.x0 + o.vx * frames;
    tl.set(el, { x: o.x0, y: o.y0, opacity: 1, rotation: o.r0 || 0, scale: o.s || 1 }, at);
    tl.to(el, { x: x1, rotation: (o.r0 || 0) + (o.spin || 0) * frames, duration: frames * F, ease: 'none' }, at);
    if (o.vy < 0) {
      var ta = Math.min(frames, -o.vy / g), ya = o.y0 + o.vy * ta + 0.5 * g * ta * ta;
      tl.to(el, { y: ya, duration: ta * F, ease: 'power2.out' }, at);
      var rest = frames - ta, y2 = ya + 0.5 * g * rest * rest;
      if (rest > 0.5) tl.to(el, { y: y2, duration: rest * F, ease: 'power2.in' }, at + ta * F);
    } else {
      tl.to(el, { y: o.y0 + o.vy * frames + 0.5 * g * frames * frames, duration: frames * F, ease: 'power2.in' }, at);
    }
    if (o.fade !== false) tl.to(el, { opacity: 0, duration: 5 * F, ease: 'none' }, at + (frames - 5) * F);
  }

  /** Fill a container with n copies of html (for particles); returns them. Their look comes from CSS. */
  function spawn(container, n, html) {
    container = $(container);
    var out = [];
    for (var i = 0; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'pt';
      d.innerHTML = typeof html === 'function' ? html(i) : html;
      container.appendChild(d);
      out.push(d);
    }
    return out;
  }

  /** Confetti burst from (x, y) in canvas px. */
  function confetti(tl, container, at, x, y, opt) {
    opt = opt || {};
    var colors = opt.colors || ['#EE5982', '#FFD064', '#7254DC', '#45B87A', '#5C7CF0', '#F2853A'];
    var r = rng(opt.seed || 5), n = opt.n || 40;
    var bits = spawn(container, n, function (i) {
      var c = colors[i % colors.length], w = 14 + r() * 14, h = 8 + r() * 10;
      return '<i style="display:block;width:' + w + 'px;height:' + h + 'px;background:' + c + ';border:3px solid #341720;border-radius:3px"></i>';
    });
    bits.forEach(function (b, i) {
      var a = (opt.angle == null ? -Math.PI / 2 : opt.angle) + (r() * 2 - 1) * (opt.spread || 1.1), sp = (opt.speed || 26) * (0.55 + r() * 0.7);
      tl.set(b, { position: 'absolute', left: 0, top: 0, opacity: 0 }, 0);
      toss(tl, b, at + r() * 3 * F, { x0: x, y0: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: opt.g || 1.4, frames: opt.frames || 40, spin: (r() * 2 - 1) * 24, r0: r() * 360 });
    });
  }

  /** Gentle float (name tags, signs): yoyo bob from `at` for `dur` seconds. */
  function bob(tl, el, at, dur, amp, period) {
    period = period || 1.1;
    var reps = Math.max(1, Math.floor(dur / (period / 2)) - 1);
    tl.to($(el), { y: '-=' + (amp || 8), duration: period / 2, ease: 'sine.inOut', yoyo: true, repeat: reps }, at);
  }

  window.WA = { F: F, rng: rng, shake: shake, pose: pose, take: take, squash: squash, hop: hop, popIn: popIn, popOut: popOut,
    word: word, toss: toss, spawn: spawn, confetti: confetti, bob: bob, $: $ };
})();
