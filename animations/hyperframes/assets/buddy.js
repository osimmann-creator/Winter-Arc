/* Buddy: the second character, for people who aren't in the app (friends in the canoe, the driver, the guy whose
   car gets stolen, the cop, the top-hat crowd). Same look as Flexander: flat shapes, espresso outlines, cel shade.
   WA.buddy(opts) returns an <svg> string, feet at the bottom centre: viewBox -320 -1040 640 1080 (feet at 0,0).
     skin   '#F0B98F' | any colour          hair  'short' | 'curly' | 'bald' | 'long' | 'buzz'   hairColor
     hat    null | 'beanie' | 'cap' | 'top' | 'cop' | 'santa'     shades  true/false
     top    hoodie colour   pants  trouser colour   coat  'hoodie' | 'coat' | 'uniform' | 'puffer'
     beard  true/false (beardColor, default hairColor)
     face   'grin' | 'smile' | 'smug' | 'scared' | 'dazed' | 'mad' | 'neutral' | 'bliss'
     arms   'down' | 'up' | 'flail' | 'wheel' | 'hips' | 'wave' | 'point' | 'hold'
     legs   'stand' | 'walk' | 'sit' (sit: knees up, for a seat seen from the front) */
(function () {
  'use strict';
  var INK = '#341720';
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function arm(side, kind, o) {
    // side -1 = viewer's left. Shoulder at (side*138, -640).
    var s = side, sx = s * 138, sy = -640, sleeve = o.top, cuff = shade(o.top, -0.25), skin = o.skin;
    var hand = function (x, y, r) {
      return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 40) + '" fill="' + skin + '" stroke="' + INK + '" stroke-width="9"/>';
    };
    var seg = function (pts) {
      var d = 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L');
      return '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="94" stroke-linecap="round" stroke-linejoin="round"/>' +
             '<path d="' + d + '" fill="none" stroke="' + sleeve + '" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>';
    };
    var P;
    switch (kind) {
      case 'up': P = [[sx, sy], [sx + s * 70, sy - 170], [sx + s * 90, sy - 330]]; break;
      case 'flail': P = s < 0 ? [[sx, sy], [sx - 150, sy - 120], [sx - 190, sy - 290]] : [[sx, sy], [sx + 180, sy + 20], [sx + 300, sy - 60]]; break;
      case 'wheel': P = [[sx, sy], [sx + s * 40, sy + 160], [sx - s * 50, sy + 230]]; break;
      case 'hips': P = [[sx, sy], [sx + s * 110, sy + 140], [sx + s * 40, sy + 270]]; break;
      case 'wave': P = s > 0 ? [[sx, sy], [sx + 150, sy - 60], [sx + 170, sy - 250]] : [[sx, sy], [sx - 30, sy + 170], [sx - 20, sy + 300]]; break;
      case 'point': P = s > 0 ? [[sx, sy], [sx + 170, sy - 30], [sx + 330, sy - 60]] : [[sx, sy], [sx - 30, sy + 170], [sx - 20, sy + 300]]; break;
      case 'hold': P = [[sx, sy], [sx + s * 30, sy + 170], [sx - s * 40, sy + 210]]; break;
      default: P = [[sx, sy], [sx + s * 40, sy + 160], [sx + s * 46, sy + 300]];
    }
    var end = P[P.length - 1];
    return seg(P) + '<circle cx="' + end[0] + '" cy="' + end[1] + '" r="40" fill="' + cuff + '" stroke="' + INK + '" stroke-width="9"/>' + hand(end[0] + (kind === 'point' && s > 0 ? 20 : 0), end[1] + (kind === 'up' || kind === 'wave' || (kind === 'flail') ? -24 : 24), 38);
  }
  function legs(kind, o) {
    var pants = o.pants, dark = shade(o.pants, -0.3), shoe = o.shoe || '#2B2236', out = '';
    var leg = function (x0, x1, y1, w) {
      var d = 'M' + x0 + ' -360 L' + x1 + ' ' + y1;
      return '<path d="' + d + '" stroke="' + INK + '" stroke-width="' + (w + 18) + '" stroke-linecap="round"/>' +
             '<path d="' + d + '" stroke="' + pants + '" stroke-width="' + w + '" stroke-linecap="round"/>' +
             '<path d="M' + (x0 + 18) + ' -340 L' + (x1 + 18) + ' ' + (y1 - 20) + '" stroke="' + dark + '" stroke-width="16" stroke-linecap="round" opacity=".6"/>';
    };
    var foot = function (x, y, flip) {
      return '<path d="M' + (x - 62 * flip) + ' ' + y + ' Q' + (x - 66 * flip) + ' ' + (y - 50) + ' ' + x + ' ' + (y - 52) + ' Q' + (x + 70 * flip) + ' ' + (y - 46) + ' ' + (x + 78 * flip) + ' ' + y + ' Z" fill="' + shoe + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>';
    };
    if (kind === 'walk') out = leg(-60, -120, -40, 100) + leg(60, 110, -40, 100) + foot(-130, 0, -1) + foot(120, 0, 1);
    else if (kind === 'sit') out = leg(-60, -90, -200, 112) + leg(60, 90, -200, 112) +
      '<path d="M-150 -210 L-30 -210 L-40 -30 L-140 -30 Z" fill="' + pants + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>' +
      '<path d="M150 -210 L30 -210 L40 -30 L140 -30 Z" fill="' + pants + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>' + foot(-96, 0, -1) + foot(96, 0, 1);
    else out = leg(-62, -66, -40, 100) + leg(62, 66, -40, 100) + foot(-76, 0, -1) + foot(76, 0, 1);
    return out;
  }
  function body(o) {
    var t = o.top, dk = shade(t, -0.22), hi = shade(t, 0.25), out;
    out = '<path d="M-170 -600 Q-176 -680 -96 -690 L96 -690 Q176 -680 170 -600 L160 -350 Q150 -320 120 -318 L-120 -318 Q-150 -320 -160 -350 Z" fill="' + t + '" stroke="' + INK + '" stroke-width="10" stroke-linejoin="round"/>';
    out += '<path d="M120 -660 Q150 -560 132 -340" stroke="' + dk + '" stroke-width="26" fill="none" stroke-linecap="round"/>';
    out += '<path d="M-130 -650 Q-140 -600 -138 -540" stroke="' + hi + '" stroke-width="16" fill="none" stroke-linecap="round"/>';
    if (o.coat === 'uniform') {
      out += '<path d="M0 -690 L0 -320" stroke="' + INK + '" stroke-width="7"/>';
      out += '<circle cx="-14" cy="-600" r="9" fill="#FFD064" stroke="' + INK + '" stroke-width="4"/><circle cx="-14" cy="-500" r="9" fill="#FFD064" stroke="' + INK + '" stroke-width="4"/><circle cx="-14" cy="-400" r="9" fill="#FFD064" stroke="' + INK + '" stroke-width="4"/>';
      out += '<path d="M60 -600 L104 -600 L112 -560 L82 -540 L52 -560 Z" fill="#FFD064" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>';
      out += '<rect x="-170" y="-350" width="340" height="34" fill="#1B1726" stroke="' + INK + '" stroke-width="7"/>';
    } else if (o.coat === 'coat') {
      out += '<path d="M-60 -690 L0 -560 L60 -690" fill="' + (o.shirt || '#FFFFFF') + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
      out += '<path d="M0 -560 L0 -330" stroke="' + INK + '" stroke-width="7"/>';
      out += '<path d="M-12 -560 L0 -540 L12 -560 L0 -600 Z" fill="' + (o.tie || '#C9442E') + '" stroke="' + INK + '" stroke-width="5"/>';
    } else if (o.coat === 'puffer') {
      // quilted bands, a zip and a big collar
      [-600, -520, -440].forEach(function (y) {
        out += '<path d="M-168 ' + y + ' Q0 ' + (y + 26) + ' 168 ' + y + '" fill="none" stroke="' + dk + '" stroke-width="12" stroke-linecap="round"/>';
      });
      out += '<path d="M0 -690 L0 -320" stroke="' + INK + '" stroke-width="8"/><rect x="-10" y="-640" width="20" height="34" rx="5" fill="#C9CED8" stroke="' + INK + '" stroke-width="5"/>';
      out += '<path d="M-118 -740 Q0 -690 118 -740 L124 -680 Q0 -640 -124 -680 Z" fill="' + t + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>';
    } else {
      out += '<path d="M-90 -440 L90 -440 L104 -350 L-104 -350 Z" fill="' + dk + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
      out += '<path d="M-30 -660 L-36 -560 M30 -660 L36 -560" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>';
      out += '<path d="M-110 -690 Q0 -620 110 -690" fill="none" stroke="' + INK + '" stroke-width="9"/>';
    }
    return out;
  }
  function face(o) {
    var f = o.face || 'smile', eyes = '', mouth = '', brows = '', extra = '';
    var eye = function (x, rx, ry, px, py) {
      return '<ellipse cx="' + x + '" cy="-850" rx="' + rx + '" ry="' + ry + '" fill="#FFFFFF" stroke="' + INK + '" stroke-width="7"/>' +
             '<circle cx="' + (x + (px || 0)) + '" cy="' + (-846 + (py || 0)) + '" r="' + Math.min(15, ry * 0.5) + '" fill="' + INK + '"/>';
    };
    var arc = function (x) { return '<path d="M' + (x - 24) + ' -846 Q' + x + ' -872 ' + (x + 24) + ' -846" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/>'; };
    var spiral = function (x) { return '<circle cx="' + x + '" cy="-850" r="26" fill="#FFFFFF" stroke="' + INK + '" stroke-width="7"/><path d="M' + x + ' -850 m-4 0 a4 4 0 1 1 8 0 a9 9 0 1 1 -18 0 a14 14 0 1 1 28 0" fill="none" stroke="' + INK + '" stroke-width="5"/>'; };
    if (f === 'scared') { eyes = eye(-44, 30, 36, 0, -6) + eye(44, 30, 36, 0, -6); brows = '<path d="M-74 -910 L-24 -896 M74 -910 L24 -896" stroke="' + INK + '" stroke-width="11" stroke-linecap="round"/>';
      mouth = '<ellipse cx="0" cy="-752" rx="34" ry="40" fill="#7A2230" stroke="' + INK + '" stroke-width="8"/>'; extra = '<path d="M118 -880 Q132 -850 118 -838 Q104 -850 118 -880 Z" fill="#8FD3F5" stroke="' + INK + '" stroke-width="5"/>'; }
    else if (f === 'dazed') { eyes = spiral(-44) + spiral(44); mouth = '<path d="M-30 -760 Q0 -742 30 -762" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/>'; }
    else if (f === 'bliss' || f === 'grin') { eyes = arc(-44) + arc(44); mouth = '<path d="M-58 -790 Q0 -790 58 -790 Q50 -720 0 -716 Q-50 -720 -58 -790 Z" fill="#7A2230" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/><path d="M-46 -786 L46 -786 L40 -770 L-40 -770 Z" fill="#FFFFFF"/>'; }
    else if (f === 'smug') { eyes = '<path d="M-70 -852 L-18 -852 M18 -852 L70 -852" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>' + eye(-44, 24, 14, 6, 4).replace(/<ellipse[^>]*>/, '') + eye(44, 24, 14, 6, 4).replace(/<ellipse[^>]*>/, '');
      mouth = '<path d="M-40 -770 Q10 -744 50 -786" fill="none" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>'; }
    else if (f === 'mad') { eyes = eye(-44, 24, 24, 0, 2) + eye(44, 24, 24, 0, 2); brows = '<path d="M-78 -896 L-20 -872 M78 -896 L20 -872" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/>';
      mouth = '<path d="M-40 -754 Q0 -784 40 -754" fill="none" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>'; }
    else if (f === 'neutral') { eyes = eye(-44, 22, 26) + eye(44, 22, 26); mouth = '<path d="M-28 -762 L28 -762" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>'; }
    else { eyes = eye(-44, 24, 30, 2, 2) + eye(44, 24, 30, 2, 2); mouth = '<path d="M-46 -776 Q0 -730 46 -776" fill="none" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>'; }
    var nose = '<path d="M-6 -822 Q-20 -790 0 -786 Q14 -788 12 -800" fill="none" stroke="' + shade(o.skin, -0.35) + '" stroke-width="8" stroke-linecap="round"/>';
    return brows + eyes + nose + mouth + extra + (o.blush ? '<ellipse cx="-90" cy="-790" rx="26" ry="14" fill="#F08A8A" opacity=".55"/><ellipse cx="90" cy="-790" rx="26" ry="14" fill="#F08A8A" opacity=".55"/>' : '');
  }
  function hair(o) {
    var c = o.hairColor || '#3A2418', hi = shade(c, 0.25), s = o.hair || 'short';
    if (o.hat === 'top' || o.hat === 'cop' || o.hat === 'beanie' || o.hat === 'santa') s = s === 'bald' ? 'bald' : 'sides';
    switch (s) {
      case 'bald': return '';
      case 'sides': return '<path d="M-150 -840 Q-160 -900 -130 -930 L-120 -860 Z M150 -840 Q160 -900 130 -930 L120 -860 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
      case 'curly': {
        var out = '', pts = [[-130, -930], [-80, -980], [-20, -1000], [40, -995], [96, -970], [136, -920], [-150, -870], [150, -868]];
        pts.forEach(function (p) { out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="52" fill="' + c + '" stroke="' + INK + '" stroke-width="8"/>'; });
        return out + '<path d="M-110 -950 Q0 -1010 110 -950 L110 -900 L-110 -900 Z" fill="' + c + '"/>';
      }
      case 'long': return '<path d="M-160 -860 Q-170 -1000 0 -1010 Q170 -1000 160 -860 L170 -700 L120 -720 L110 -880 Q0 -930 -110 -880 L-120 -720 L-170 -700 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/><path d="M-90 -970 Q0 -1000 80 -970" stroke="' + hi + '" stroke-width="14" fill="none" stroke-linecap="round"/>';
      case 'buzz': return '<path d="M-148 -870 Q-150 -990 0 -996 Q150 -990 148 -870 Q120 -930 0 -936 Q-120 -930 -148 -870 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
      default: return '<path d="M-156 -860 Q-170 -1010 0 -1012 Q170 -1010 156 -860 Q140 -900 110 -910 Q60 -930 30 -905 Q-10 -950 -60 -920 Q-110 -935 -156 -860 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/><path d="M-80 -980 Q0 -1004 70 -980" stroke="' + hi + '" stroke-width="14" fill="none" stroke-linecap="round"/>';
    }
  }
  function hat(o) {
    var h = o.hat;
    if (h === 'beanie') { var c = o.hatColor || '#C9442E';
      return '<path d="M-160 -924 Q-170 -1094 0 -1104 Q170 -1094 160 -924 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>' +
        '<rect x="-172" y="-944" width="344" height="60" rx="24" fill="' + shade(c, -0.2) + '" stroke="' + INK + '" stroke-width="9"/>' +
        '<circle cx="0" cy="-1114" r="40" fill="#FFFFFF" stroke="' + INK + '" stroke-width="8"/>'; }
    if (h === 'santa') return '<path d="M-160 -924 Q-120 -1104 40 -1114 Q170 -1104 210 -974 L180 -964 Q150 -1044 60 -1054 L160 -924 Z" fill="#D9363E" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/><rect x="-176" y="-954" width="352" height="64" rx="30" fill="#FFFFFF" stroke="' + INK + '" stroke-width="9"/><circle cx="210" cy="-960" r="38" fill="#FFFFFF" stroke="' + INK + '" stroke-width="8"/>';
    if (h === 'top') return '<rect x="-120" y="-1190" width="240" height="290" rx="12" fill="#1B1726" stroke="' + INK + '" stroke-width="10"/><rect x="-120" y="-960" width="240" height="44" fill="' + (o.hatBand || '#C9442E') + '" stroke="' + INK + '" stroke-width="8"/><path d="M-90 -1160 L-90 -980" stroke="#3A3350" stroke-width="18" stroke-linecap="round"/><rect x="-200" y="-918" width="400" height="34" rx="17" fill="#1B1726" stroke="' + INK + '" stroke-width="10"/>';
    if (h === 'cop') return '<path d="M-150 -944 Q-160 -1054 0 -1074 Q160 -1054 150 -944 Z" fill="#23315E" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/><rect x="-160" y="-956" width="320" height="40" rx="10" fill="#1B1726" stroke="' + INK + '" stroke-width="8"/><path d="M-150 -920 Q0 -870 150 -920 L150 -904 Q0 -850 -150 -904 Z" fill="#1B1726" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/><path d="M0 -1044 L24 -1014 L14 -984 L-14 -984 L-24 -1014 Z" fill="#FFD064" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>';
    if (h === 'cap') { var cc = o.hatColor || '#2F66E6';
      return '<path d="M-156 -880 Q-160 -1030 0 -1036 Q160 -1030 156 -880 Z" fill="' + cc + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/><path d="M40 -892 Q190 -900 230 -870 Q190 -846 40 -858 Z" fill="' + shade(cc, -0.25) + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>'; }
    return '';
  }
  function shades() {
    return '<path d="M-160 -866 L160 -866" stroke="' + INK + '" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M-150 -872 L-14 -872 L-22 -824 Q-30 -806 -66 -806 L-104 -806 Q-140 -806 -146 -834 Z" fill="#1B1726" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>' +
      '<path d="M150 -872 L14 -872 L22 -824 Q30 -806 66 -806 L104 -806 Q140 -806 146 -834 Z" fill="#1B1726" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>' +
      '<path d="M-124 -860 L-96 -830 M46 -860 L72 -836" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" opacity=".6"/>';
  }
  function beard(o, mo) {
    var c = o.beardColor || o.hairColor || '#3A2418', hi = shade(c, 0.22);
    if (mo) return '<path d="M-70 -784 Q-34 -816 0 -800 Q34 -816 70 -784 Q40 -792 0 -786 Q-40 -792 -70 -784 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round"/>';
    return '<path d="M-152 -870 L-148 -780 Q-140 -636 0 -620 Q140 -636 148 -780 L152 -870 Q134 -810 112 -790 Q84 -722 0 -718 Q-84 -722 -112 -790 Q-134 -810 -152 -870 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>' +
      '<path d="M-90 -690 Q0 -650 90 -690" fill="none" stroke="' + hi + '" stroke-width="10" stroke-linecap="round" opacity=".7"/>';
  }
  function buddy(opt) {
    var o = Object.assign({ skin: '#F0B98F', hair: 'short', hairColor: '#3A2418', top: '#5C7CF0', pants: '#3E5A8C', coat: 'hoodie', face: 'smile', arms: 'down', legs: 'stand' }, opt || {});
    var skinDk = shade(o.skin, -0.2), armsBack = o.arms === 'wheel' || o.arms === 'hold';
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-320 -1240 640 1280" width="640" height="1280" style="overflow:visible">';
    if (o.legs === 'ground') {
      // sat on the ground: legs splayed out towards us, the rest of him lowered onto them
      var pants = o.pants, shoe = o.shoe || '#2B2236';
      [-1, 1].forEach(function (k) {
        s += '<path d="M' + k * 50 + ' -60 L' + k * 230 + ' -20" stroke="' + INK + '" stroke-width="118" stroke-linecap="round"/>' +
             '<path d="M' + k * 50 + ' -60 L' + k * 230 + ' -20" stroke="' + pants + '" stroke-width="100" stroke-linecap="round"/>' +
             '<ellipse cx="' + k * 270 + '" cy="-60" rx="44" ry="62" fill="' + shoe + '" stroke="' + INK + '" stroke-width="9" transform="rotate(' + k * 20 + ' ' + k * 270 + ' -60)"/>';
      });
      s += '<g transform="translate(0 300)">';
    } else s += '<g>';
    if (o.legs !== 'none' && o.legs !== 'ground') s += legs(o.legs, o);
    if (!armsBack) s += arm(-1, o.arms, o) + arm(1, o.arms, o);
    s += body(o);
    s += '<rect x="-52" y="-740" width="104" height="70" fill="' + skinDk + '" stroke="' + INK + '" stroke-width="9"/>';
    s += '<ellipse cx="-156" cy="-830" rx="30" ry="40" fill="' + o.skin + '" stroke="' + INK + '" stroke-width="8"/><ellipse cx="156" cy="-830" rx="30" ry="40" fill="' + o.skin + '" stroke="' + INK + '" stroke-width="8"/>';
    s += '<path d="M-150 -880 Q-156 -1000 0 -1004 Q156 -1000 150 -880 L144 -780 Q130 -700 0 -690 Q-130 -700 -144 -780 Z" fill="' + o.skin + '" stroke="' + INK + '" stroke-width="10" stroke-linejoin="round"/>';
    s += '<path d="M110 -950 Q140 -860 120 -760" stroke="' + skinDk + '" stroke-width="22" fill="none" stroke-linecap="round" opacity=".7"/>';
    if (o.beard) s += beard(o, false);
    s += hair(o) + face(o) + (o.beard ? beard(o, true) : '') + (o.shades ? shades() : '') + hat(o);
    if (armsBack) s += arm(-1, o.arms, o) + arm(1, o.arms, o);
    s += '</g></svg>';
    return s;
  }
  window.WA = window.WA || {};
  window.WA.buddy = buddy;
})();
