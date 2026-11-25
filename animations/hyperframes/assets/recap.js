/* The Monday Report (recap-*.html): shared bits for the weekly recap clips.
   On Monday the app plays them back to back (intro, player of the week, strikes or everybody survived, dead last,
   outro), so they share one banner: a WINTER ARC WEEKLY tab over the segment's title plate.
   The per-member clips read who they're about from HyperFrames variables (see recap.member()). */
(function () {
  'use strict';
  var INK = '#341720';

  /** The member a variant clip is about: { member, name, color, dark } from --variables, with a preview default. */
  function member(def) {
    var V = (window.__hyperframes && window.__hyperframes.getVariables) ? window.__hyperframes.getVariables() : {};
    return {
      member: V.member || def.member, name: String(V.name || def.name).toUpperCase(),
      color: V.color || def.color, dark: V.dark || def.dark,
    };
  }

  /** Build the banner in an empty div. title: the segment ("PLAYER OF THE WEEK"); color/dark: the plate. */
  function banner(id, title, color, dark, light) {
    var el = WA.$(id), fs = Math.min(104, 880 / (title.length * 0.66));
    el.className = 'rc-banner';
    el.innerHTML = '<div class="rc-tab" id="' + el.id + '-tab"><span class="rc-dot"></span>WINTER ARC WEEKLY</div>' +
      '<div class="rc-plate" id="' + el.id + '-plate" style="background:linear-gradient(180deg,' + color + ' 0%,' + color + ' 60%,' + dark + ' 100%);' +
      'padding:' + (fs * 0.26) + 'px ' + (fs * 0.42) + 'px ' + (fs * 0.12) + 'px"><div class="rc-shine"></div>' +
      '<span class="rc-t" style="font-size:' + fs + 'px"><span class="bk" style="-webkit-text-stroke:' + (fs * 0.2) + 'px ' + INK +
      ';filter:drop-shadow(0 ' + (fs * 0.07) + 'px 0 ' + INK + ')">' + title + '</span><span class="fr" style="background-image:linear-gradient(180deg,#fff 0%,#fff 50%,' +
      (light || '#FFF0B7') + ' 54%,' + (light || '#FFF0B7') + ' 100%)">' + title + '</span></span></div>';
    gsap.set([el.id + '-tab', el.id + '-plate'].map(function (s) { return '#' + s; }), { scale: 0, opacity: 0 });
    return el;
  }

  /** Pop the banner in at `at` (the plate first, then the tab), with a little settle wobble. */
  function bannerIn(tl, id, at) {
    var F = WA.F, plate = '#' + id + '-plate', tab = '#' + id + '-tab';
    tl.fromTo(plate, { scale: 0, rotation: -8, opacity: 1 }, { scale: 1, rotation: -2, opacity: 1, duration: 9 * F, ease: 'back.out(2.6)', immediateRender: false }, at);
    tl.fromTo(tab, { scale: 0, rotation: 10, opacity: 1 }, { scale: 1, rotation: 2, opacity: 1, duration: 8 * F, ease: 'back.out(3)', immediateRender: false }, at + 5 * F);
    tl.to(plate, { rotation: 0, duration: 14 * F, ease: 'sine.inOut' }, at + 9 * F);
  }

  /** A name tag that isn't part of an actor (so it stays upright while he flips): fills an empty div. */
  function tag(id, name, color, x, y) {
    var el = WA.$(id);
    el.className = 'tag';
    el.style.cssText += ';--c:' + color + ';left:' + x + 'px;top:' + y + 'px;transform:none';
    el.textContent = name;
    gsap.set(el, { xPercent: -50 });   // centred by GSAP, so tweening x/scale doesn't drop the centring
    return el;
  }

  window.WA = Object.assign(window.WA || {}, { recap: { member: member, banner: banner, bannerIn: bannerIn, tag: tag } });
})();
