'use strict';
/* =====================================================================
   WINTER ARC · opening: biceps rise, the mascot flexes, then the last
   frame splits open like doors to reveal Home. Tap to skip.
   ===================================================================== */
const Intro = (() => {
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = false;

  function play() {
    return new Promise(resolve => {
      const el = document.getElementById('intro');
      if (reduced() || running) { el.hidden = true; resolve(); return; }
      running = true;
      el.innerHTML = `<video playsinline muted autoplay preload="auto" disablepictureinpicture poster="assets/intro/intro-first.webp" src="assets/intro/intro.mp4"></video>
        <div class="door l"><img src="assets/intro/intro-last.webp" alt=""></div>
        <div class="door r"><img src="assets/intro/intro-last.webp" alt=""></div>
        <button class="skip" type="button">Skip</button>`;
      el.hidden = false;
      el.className = 'intro';
      const v = el.querySelector('video');
      let done = false;
      const end = mode => {
        if (done) return;
        done = true;
        clearTimeout(safety);
        if (mode === 'doors') {
          el.classList.add('split');
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
          setTimeout(finish, 720);
        } else {
          el.classList.add('fade');
          setTimeout(finish, 280);
        }
      };
      const finish = () => { el.hidden = true; el.className = 'intro'; el.innerHTML = ''; running = false; resolve(); };
      v.addEventListener('ended', () => end('doors'));
      v.addEventListener('error', () => end('fade'));
      el.onclick = () => end('fade');
      const safety = setTimeout(() => end('doors'), 6000);
      const p = v.play();
      if (p && p.catch) p.catch(() => end('fade'));
    });
  }
  return { play, running: () => running };
})();
