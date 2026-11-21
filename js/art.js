'use strict';
/* =====================================================================
   WINTER ARC · art: icons (inline SVG), mascot images, demo photos
   ===================================================================== */
const Art = (() => {
  const K = '#341720';
  const st = `stroke="${K}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

  /* Activity + badge icons, 64x64, cartoon style to match the mascot. */
  const ICON = {
    gym: `<rect x="18" y="28" width="28" height="8" rx="3" fill="#D3CEDE" ${st}/>
      <rect x="10" y="14" width="11" height="36" rx="4.5" fill="#F2853A" ${st}/><rect x="43" y="14" width="11" height="36" rx="4.5" fill="#F2853A" ${st}/>
      <rect x="4" y="21" width="8" height="22" rx="3.5" fill="#FAB483" ${st}/><rect x="52" y="21" width="8" height="22" rx="3.5" fill="#FAB483" ${st}/>
      <rect x="13" y="18" width="3" height="12" rx="1.5" fill="#fff" opacity=".7"/><rect x="46" y="18" width="3" height="12" rx="1.5" fill="#fff" opacity=".7"/>`,
    run: `<path d="M8 44 V30 C8 24 13 20 19 21 L27 23 C29 28 34 31 41 31 C51 31 58 35 58 42 V44 Z" fill="#5C7CF0" ${st}/>
      <path d="M5 43 H59 C61 43 61 52 57 52 H9 C5 52 4 46 5 43 Z" fill="#fff" ${st}/>
      <path d="M21 27 L27 25.5 M23 31 L30 29.5 M26 35 L33 33.5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <path d="M36 39 L50 37" stroke="#FFD064" stroke-width="4" stroke-linecap="round"/>
      <path d="M8 31 C10 27 13 25 16 25" stroke="#fff" stroke-width="2.5" fill="none" opacity=".7" stroke-linecap="round"/>`,
    jickle: `<g transform="rotate(-32 30 30)"><rect x="27" y="36" width="9" height="22" rx="3.5" fill="#412633" ${st}/>
      <rect x="15" y="4" width="33" height="38" rx="14" fill="#45B87A" ${st}/><rect x="20" y="9" width="23" height="28" rx="10" fill="none" stroke="#4C9259" stroke-width="3"/>
      <circle cx="31.5" cy="23" r="5" fill="#FEDF8A" stroke="${K}" stroke-width="2.5"/></g>
      <circle cx="50" cy="48" r="9" fill="#F9EE4E" ${st}/><circle cx="47" cy="46" r="1.6" fill="#C7BF30"/><circle cx="53" cy="47" r="1.6" fill="#C7BF30"/><circle cx="50" cy="52" r="1.6" fill="#C7BF30"/>`,
    volo: `<circle cx="32" cy="32" r="26" fill="#fff"/>
      <path d="M10 24 Q32 8 54 24" stroke="#7254DC" stroke-width="8" fill="none"/>
      <path d="M15 47 Q27 38 39 55" stroke="#FFD064" stroke-width="8" fill="none"/>
      <path d="M8 28 Q32 13 56 28 M9 20 Q32 4 52 17 M12 50 Q26 38 41 57 M30 30 Q42 34 55 44" stroke="${K}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="26" fill="none" ${st}/><ellipse cx="22" cy="20" rx="5" ry="3" fill="#fff" opacity=".8" transform="rotate(-30 22 20)"/>`,
    soccer: `<circle cx="32" cy="32" r="26" fill="#fff"/>
      <path d="M32 22 L41.5 29 L38 40 H26 L22.5 29 Z" fill="${K}"/>
      <path d="M32 8.5 L38 12 L35.5 16 H28.5 L26 12 Z M54 26 L56.5 32 L52 36 L47 32 L49 26 Z M10 26 L15 26 L17 32 L12 36 L7.5 32 Z M18 50 L24 49 L26.5 54 L22 56.5 L17 54 Z M46 50 L47 54 L42 56.5 L37.5 54 L40 49 Z" fill="${K}"/>
      <path d="M32 22 V16 M41.5 29 L47 30 M38 40 L41 47 M26 40 L23 47 M22.5 29 L17 30" stroke="${K}" stroke-width="2.5"/>
      <circle cx="32" cy="32" r="26" fill="none" ${st}/><ellipse cx="21" cy="19" rx="5" ry="3" fill="#fff" opacity=".85" transform="rotate(-30 21 19)"/>`,
    date: `<path d="M32 56 C24 50 6 39 6 24 C6 14 14 8 22 8 C27 8 30 11 32 15 C34 11 37 8 42 8 C50 8 58 14 58 24 C58 39 40 50 32 56 Z" fill="#EE5982" ${st}/>
      <ellipse cx="20" cy="20" rx="6" ry="4" fill="#fff" opacity=".75" transform="rotate(-35 20 20)"/>`,
    beers: `<path d="M42 25 H48 C54 25 56 29 56 36 C56 43 54 47 48 47 H42" fill="none" stroke="${K}" stroke-width="9" stroke-linecap="round"/>
      <path d="M42 25 H48 C54 25 56 29 56 36 C56 43 54 47 48 47 H42" fill="none" stroke="#F3EEFE" stroke-width="4" stroke-linecap="round"/>
      <rect x="10" y="20" width="33" height="38" rx="6" fill="#FFB359" ${st}/><rect x="32" y="24" width="7" height="30" rx="3" fill="#EA9332"/>
      <rect x="14" y="26" width="4" height="24" rx="2" fill="#fff" opacity=".55"/>
      <path d="M8 22 C6 16 11 11 16 13 C18 8 25 7 28 11 C32 7 40 9 40 14 C46 14 47 21 43 24 C38 26 30 24 26 25 C20 26 12 27 8 22 Z" fill="#fff" ${st}/>
      <circle cx="22" cy="40" r="2" fill="#FFE1AD"/><circle cx="27" cy="47" r="1.6" fill="#FFE1AD"/>`,
    reading: `<path d="M4 16 Q18 10 32 16 Q46 10 60 16 V54 Q46 48 32 54 Q18 48 4 54 Z" fill="#7254DC" ${st}/>
      <path d="M8 14 Q20 8 32 14 V50 Q20 44 8 50 Z M56 14 Q44 8 32 14 V50 Q44 44 56 50 Z" fill="#FFFDF6" ${st}/>
      <path d="M13 21 Q20 18 27 21 M13 28 Q20 25 27 28 M13 35 Q20 32 26 35 M37 21 Q44 18 51 21 M37 28 Q44 25 51 28 M38 35 Q44 32 51 35" stroke="#B9AFC7" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    mma: `<path d="M17 41 H47 V55 C47 58 45 59 42 59 H22 C19 59 17 58 17 55 Z" fill="#FFFDF6" ${st}/>
      <rect x="14" y="44" width="36" height="9" rx="3.5" fill="#962830" ${st}/><path d="M37 46 V51" stroke="#FFFDF6" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
      <path d="M18 42 C13 36 12 26 14 19 C16 10 24 5 33 5 C43 5 51 11 52 21 C53 30 50 37 46 42 Z" fill="#D9434A" ${st}/>
      <path d="M15 27 C9 26 6 32 9 37 C11 41 17 42 21 39" fill="#D9434A" ${st}/>
      <path d="M22 17 C23 21 23 24 22 27 M30 14 C31 19 31 23 30 27 M38 15 C39 20 39 23 38 27 M45 18 C46 22 46 25 45 28" stroke="#962830" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M21 31 C28 34 38 34 47 31" stroke="#962830" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="25" cy="11" rx="6" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 25 11)"/>`,
    shield: `<path d="M32 5 L55 13 V30 C55 44 45 54 32 59 C19 54 9 44 9 30 V13 Z" fill="#7254DC" ${st}/>
      <path d="M32 11 L49 17 V30 C49 40 42 48 32 52 Z" fill="#514BA9" opacity=".55"/>
      <path d="M21 32 L29 40 L44 23" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    trophy: `<path d="M18 14 C8 14 6 26 18 30 M46 14 C56 14 58 26 46 30" fill="none" stroke="${K}" stroke-width="8"/>
      <path d="M18 14 C8 14 6 26 18 30 M46 14 C56 14 58 26 46 30" fill="none" stroke="#FFD064" stroke-width="3.5"/>
      <path d="M17 8 H47 V22 C47 33 40 39 32 39 C24 39 17 33 17 22 Z" fill="#FFD064" ${st}/>
      <rect x="27" y="38" width="10" height="9" fill="#C77928" ${st}/><rect x="18" y="46" width="28" height="10" rx="3" fill="#865436" ${st}/>
      <path d="M23 13 V22" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".75"/>`,
    bolt: `<path d="M37 4 L13 36 H29 L25 60 L51 24 H35 Z" fill="#FEDF8A" ${st}/><path d="M33 12 L21 31" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    star: `<path d="M32 5 L39.5 23 L59 24.5 L44 37 L48.5 56 L32 46 L15.5 56 L20 37 L5 24.5 L24.5 23 Z" fill="#FFD064" ${st}/><path d="M28 19 L23 29" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
    flame: `<path d="M32 4 C41 15 51 22 51 38 C51 50 42 59 32 59 C22 59 13 50 13 38 C13 28 20 21 23 12 C27 20 29 22 31 25 C34 17 35 11 32 4 Z" fill="#F2853A" ${st}/>
      <path d="M32 30 C37 36 42 40 42 47 C42 53 37 57 32 57 C27 57 22 53 22 47 C22 42 26 38 28 33 C30 37 31 38 32 39 C33 36 33 33 32 30 Z" fill="#FEDF8A"/>`,
  };
  const icon64 = (name, cls = '') => `<svg class="i64 ${cls}" viewBox="0 0 64 64" aria-hidden="true">${ICON[name] || ''}</svg>`;

  /* Line icons for UI chrome, 24x24. */
  const UI = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    feed: '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/>',
    board: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11"/><path d="M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11"/><path d="M12 13v4"/><path d="M8.5 20h7l-1-3h-5z"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.2 2.6 3.7 5.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    out: '<path d="M14 4h5v16h-5"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7.5l8 6 8-6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="7"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    crown: '<path d="M4 18.5h16M4.5 16 3 7.5l5 4 4-6.5 4 6.5 5-4-1.5 8.5z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
    userplus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M18.5 8v6M15.5 11h6"/>',
  };
  const ui = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${UI[n] || ''}</svg>`;

  /* Osim's red rubber stamp: HOAT GUARANTEE with a thumbs up. */
  let stampN = 0;
  function hoatStamp() {
    const id = 'hs' + (++stampN), R = U.rng(7), red = '#D7263D';
    let specks = '';
    for (let i = 0; i < 70; i++) specks += `<circle cx="${(R() * 360).toFixed(1)}" cy="${(R() * 220).toFixed(1)}" r="${(0.8 + R() * 2.6).toFixed(1)}"/>`;
    return `<svg class="hoat-svg" viewBox="0 0 360 220" aria-hidden="true">
  <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="220"><rect width="360" height="220" fill="#fff"/><g fill="#000">${specks}</g>
    <path d="M30 170 Q120 150 200 178" stroke="#000" stroke-width="3" fill="none" opacity=".6"/><path d="M210 40 Q280 30 340 52" stroke="#000" stroke-width="2.5" fill="none" opacity=".5"/></mask></defs>
  <g mask="url(#${id})">
    <rect x="9" y="9" width="342" height="202" rx="30" fill="none" stroke="${red}" stroke-width="12"/>
    <rect x="25" y="25" width="310" height="170" rx="18" fill="none" stroke="${red}" stroke-width="4"/>
    <g transform="translate(88 112)">
      <circle r="58" fill="none" stroke="${red}" stroke-width="7"/>
      <rect x="-44" y="-8" width="22" height="56" rx="6" fill="${red}"/>
      <path d="M-16 -6C-10-16-6-30-6-44C-6-58 12-60 13-44C14-32 11-18 9-10L33-10C46-10 48 2 40 6C48 10 46 20 38 22C46 26 44 36 36 37C42 41 38 48 30 48L-16 48Z" fill="${red}"/>
      <path d="M12 8H36M12 22H36M12 36H31" stroke="#FFF6F6" stroke-width="3.5" stroke-linecap="round" opacity=".9"/>
    </g>
    <text x="244" y="120" text-anchor="middle" textLength="168" lengthAdjust="spacingAndGlyphs" font-family="'Luckiest Guy', Impact, sans-serif" font-size="70" fill="${red}">HOAT</text>
    <text x="244" y="156" text-anchor="middle" textLength="168" lengthAdjust="spacingAndGlyphs" font-family="'Luckiest Guy', Impact, sans-serif" font-size="25" fill="${red}">GUARANTEE</text>
    <path d="M178 174h132" stroke="${red}" stroke-width="4" stroke-linecap="round"/>
    ${[214, 244, 274].map(x => `<path transform="translate(${x} 36) scale(.8)" d="M0 0l4.2 8.6 9.5 1.4-6.9 6.7 1.6 9.4-8.4-4.4-8.4 4.4 1.6-9.4-6.9-6.7 9.5-1.4z" fill="${red}"/>`).join('')}
  </g>
</svg>`;
  }

  const mascot = pose => `assets/mascot/${pose}.webp`;
  const photo = p => (!p ? '' : p.startsWith('demo:') ? `assets/demo/${p.slice(5)}.webp` : p);
  const video = id => `assets/celebrations/${id}.mp4`;
  const poster = id => `assets/celebrations/${id}.webp`;

  return { icon64, ui, mascot, photo, video, poster, hoatStamp, ICON };
})();
