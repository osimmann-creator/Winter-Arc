/* Shared props for the round 2 clips, as SVG strings (same look: flat shapes, espresso outlines).
   WA.car.interior() / WA.car.body(opt) / WA.car.wheel(): a side-view sedan facing right on a 900x460 canvas
   (wheels at x 222 and 702, y 372; ground at y 440). Put the interior first, then whoever sits inside (clip them
   to the window: x 262-652, y 74-214), then the body (it has the window cut out), then the two wheels.
     opt.color / opt.dark   paint          opt.door  extra SVG drawn on the door (e.g. a #1)
     opt.police             black-and-white with a light bar (ids <opt.id>-red / <opt.id>-blue glow on top)
     opt.mirror             faces left (its words stay readable)                 opt.scale  size */
(function () {
  'use strict';
  var INK = '#341720';
  function interior() {
    return '<svg width="900" height="460" viewBox="0 0 900 460" style="position:absolute;left:0;top:0;overflow:visible">' +
      '<path d="M262 214 L318 74 L588 74 L652 214 Z" fill="#3A2E4A"/>' +
      '<path d="M300 214 L300 150 Q300 120 330 120 L400 120 Q430 120 430 150 L430 214 Z M500 214 L500 150 Q500 120 530 120 L600 120 Q630 120 630 150 L630 214 Z" fill="#2B2236"/></svg>';
  }
  function body(o) {
    o = o || {};
    var c = o.police ? '#1B1726' : (o.color || '#D9434A'), dk = o.police ? '#0E0B14' : (o.dark || '#A82A33'), hi = o.police ? '#4A4560' : (o.light || '#F07A7F');
    var s = '<svg width="900" height="460" viewBox="0 0 900 460" style="position:absolute;left:0;top:0;overflow:visible">';
    if (o.police) {
      s += '<rect x="360" y="14" width="190" height="30" rx="10" fill="#2B2236" stroke="' + INK + '" stroke-width="8"/>' +
        '<rect x="372" y="2" width="76" height="30" rx="10" fill="#7A1C26" stroke="' + INK + '" stroke-width="7"/>' +
        '<rect x="462" y="2" width="76" height="30" rx="10" fill="#1C2E7A" stroke="' + INK + '" stroke-width="7"/>' +
        '<rect id="' + o.id + '-red" x="372" y="2" width="76" height="30" rx="10" fill="#FF3B4A" stroke="' + INK + '" stroke-width="7" opacity="0"/>' +
        '<rect id="' + o.id + '-blue" x="462" y="2" width="76" height="30" rx="10" fill="#4A7CFF" stroke="' + INK + '" stroke-width="7" opacity="0"/>';
    }
    s += '<path fill-rule="evenodd" d="M40 330 Q20 330 22 290 L28 250 Q34 228 70 226 L230 222 L300 60 Q308 40 336 40 L590 40 Q614 40 626 60 L700 220 L820 232 Q870 238 878 280 L882 330 Q884 372 846 372 L60 372 Q36 372 40 330 Z M262 214 L318 74 L588 74 L652 214 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="10" stroke-linejoin="round"/>';
    if (o.police) s += '<path d="M232 226 L700 222 L700 300 Q700 362 650 364 L282 364 Q232 362 232 300 Z" fill="#FFFFFF" stroke="' + INK + '" stroke-width="8"/>' +
      '<text x="466" y="322" text-anchor="middle" font-family="Luckiest Guy" font-size="50" fill="#1B1726"' + (o.mirror ? ' transform="translate(932 0) scale(-1 1)"' : '') + '>PTS POLICE</text>';
    s += '<path d="M452 74 L452 214" stroke="' + INK + '" stroke-width="16"/>' +
      '<path d="M80 250 L820 258" stroke="' + hi + '" stroke-width="12" stroke-linecap="round" opacity=".8"/>' +
      (o.police ? '' : '<path d="M70 300 L860 304" stroke="' + dk + '" stroke-width="8" stroke-linecap="round"/><path d="M330 250 L330 360 M580 254 L580 360" stroke="' + dk + '" stroke-width="6"/>' +
        '<rect x="350" y="268" width="50" height="12" rx="6" fill="' + INK + '"/><rect x="600" y="268" width="50" height="12" rx="6" fill="' + INK + '"/>') +
      '<path d="M842 258 L878 262 L880 292 L846 290 Z" fill="#FFF3B0" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round"/>' +
      '<path d="M26 262 L52 258 L50 292 L24 294 Z" fill="#FF6B6B" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round"/>' +
      '<rect x="18" y="330" width="120" height="30" rx="14" fill="#C9CED8" stroke="' + INK + '" stroke-width="7"/>' +
      '<rect x="770" y="330" width="120" height="30" rx="14" fill="#C9CED8" stroke="' + INK + '" stroke-width="7"/>' +
      '<path d="M150 372 Q150 300 222 300 Q294 300 294 372 M630 372 Q630 300 702 300 Q774 300 774 372" fill="' + dk + '" stroke="' + INK + '" stroke-width="9"/>' +
      '<path d="M300 200 L350 90 M330 206 L370 116 M540 206 L590 96" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" opacity=".35"/>' +
      (o.door || '') + '</svg>';
    return s;
  }
  function wheel() {
    return '<svg width="160" height="160" viewBox="-80 -80 160 160" style="position:absolute;left:0;top:0;overflow:visible"><circle r="70" fill="#2B2236" stroke="' + INK + '" stroke-width="9"/>' +
      '<circle r="34" fill="#C9CED8" stroke="' + INK + '" stroke-width="7"/><path d="M0 -30 L0 30 M-30 0 L30 0" stroke="#7D8494" stroke-width="8"/></svg>';
  }
  /** Build a whole car into an empty div: <div id> gets the car, a .cabin (for people, clipped to the window), wheels. */
  function build(id, o) {
    var el = document.getElementById(id);
    var sc = o.scale || 1;
    el.innerHTML = '<div class="car-in" style="position:absolute;left:0;top:0;width:900px;height:460px;transform-origin:0 0;transform:' +
      (o.mirror ? 'translateX(' + 900 * sc + 'px) scale(' + -sc + ',' + sc + ')' : 'scale(' + sc + ')') + '">' +
      interior() + '<div class="cabin" id="' + id + '-cabin" style="position:absolute;left:0;top:0;width:900px;height:222px;overflow:hidden"></div>' + body(o) +
      '<div class="wheel" id="' + id + '-w0" style="position:absolute;left:142px;top:292px;width:160px;height:160px">' + wheel() + '</div>' +
      '<div class="wheel" id="' + id + '-w1" style="position:absolute;left:622px;top:292px;width:160px;height:160px">' + wheel() + '</div></div>';
    el.style.position = 'absolute';
    el.style.width = 900 * (o.scale || 1) + 'px'; el.style.height = 460 * (o.scale || 1) + 'px';
    return el;
  }
  /** A five-point star path centred on 0,0. */
  function star(r, fill, sw) {
    var p = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      p += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1) + ' ';
    }
    return '<path d="' + p + 'Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 8) + '" stroke-linejoin="round"/>';
  }
  window.WA = window.WA || {};
  window.WA.car = { interior: interior, body: body, wheel: wheel, build: build };
  window.WA.star = star;
})();
