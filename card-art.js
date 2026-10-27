/*!
 * 塔罗牌 · 程序化牌面生成（经典抽牌页与空间塔罗系统共用）
 * 对外暴露 window.TAROT_ART.face(card) / .back()
 */
(function () {
  "use strict";

  const T = window.TAROT;
  const FONT_SERIF = "'Cormorant Garamond','Baskerville','Georgia','Songti SC','STSong','SimSun',serif";
  const FONT_SYMBOL = "'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','Times New Roman',serif";

  let svgSeq = 0;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ============================================================
   * 2. 牌面 SVG 生成
   * ========================================================== */

  function starPoints(cx, cy, outer, inner, n, rot) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (Math.PI * i) / n + (rot || 0);
      pts.push((cx + Math.cos(a) * r).toFixed(2) + ',' + (cy + Math.sin(a) * r).toFixed(2));
    }
    return pts.join(' ');
  }

  function polygon(cx, cy, r, n, rot) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + (rot || 0);
      pts.push((cx + Math.cos(a) * r).toFixed(2) + ',' + (cy + Math.sin(a) * r).toFixed(2));
    }
    return pts.join(' ');
  }

  /* 花色符号：权杖 / 圣杯 / 宝剑 / 星币，绘制在 0..100 的方框内 */
  function suitMarkup(suit, ink, accent, line) {
    const grad = 'url(#' + line + ')';
    if (suit === 'wands') {
      return '<g stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M50 94 L50 30" stroke="' + ink + '" stroke-width="6.5"/>' +
        '<path d="M50 30 C41 23 41 12 50 5 C59 12 59 23 50 30 Z" fill="' + accent + '"/>' +
        '<path d="M50 65 C40 61 34 54 32 46" stroke="' + ink + '" stroke-width="3.6" fill="none"/>' +
        '<path d="M50 74 C60 70 66 63 68 55" stroke="' + ink + '" stroke-width="3.6" fill="none"/>' +
        '<circle cx="50" cy="90" r="5" fill="' + accent + '"/>' +
        '<path d="M50 65 C43 63 40 58 39 53" stroke="' + accent + '" stroke-width="2" fill="none" opacity=".85"/>' +
        '</g>';
    }
    if (suit === 'cups') {
      return '<g stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M27 20 H73 V36 C73 54 63 64 50 64 C37 64 27 54 27 36 Z" fill="' + ink + '" fill-opacity=".14" stroke="' + ink + '" stroke-width="3.4"/>' +
        '<path d="M27 24 H73" stroke="' + accent + '" stroke-width="3"/>' +
        '<path d="M50 64 V82" stroke="' + ink + '" stroke-width="5"/>' +
        '<path d="M33 89 H67" stroke="' + ink + '" stroke-width="6"/>' +
        '<circle cx="50" cy="38" r="4.5" fill="' + accent + '" opacity=".9"/>' +
        '</g>';
    }
    if (suit === 'swords') {
      return '<g stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M50 5 L59 23 V59 H41 V23 Z" fill="' + ink + '"/>' +
        '<path d="M50 9 V56" stroke="' + line + '" stroke-width="1.6" opacity=".75"/>' +
        '<rect x="30" y="59" width="40" height="7" rx="3.5" fill="' + accent + '"/>' +
        '<path d="M50 66 V86" stroke="' + ink + '" stroke-width="5.5"/>' +
        '<circle cx="50" cy="91" r="5" fill="' + accent + '"/>' +
        '</g>';
    }
    /* pentacles */
    return '<g stroke-linejoin="round">' +
      '<circle cx="50" cy="50" r="42" fill="none" stroke="' + ink + '" stroke-width="4"/>' +
      '<circle cx="50" cy="50" r="35" fill="none" stroke="' + accent + '" stroke-width="1.1" opacity=".7"/>' +
      '<polygon points="' + starPoints(50, 50, 30, 11.5, 5, -Math.PI / 2) + '" fill="none" stroke="' + accent + '" stroke-width="2.6"/>' +
      '</g>';
  }

  function crownMarkup(ink, accent) {
    return '<g stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M30 34 L36 14 L50 27 L64 14 L70 34 Z" fill="' + accent + '" fill-opacity=".22" stroke="' + ink + '" stroke-width="2.4"/>' +
      '<circle cx="36" cy="14" r="2.6" fill="' + accent + '"/>' +
      '<circle cx="50" cy="27" r="2.6" fill="' + accent + '"/>' +
      '<circle cx="64" cy="14" r="2.6" fill="' + accent + '"/>' +
      '<path d="M30 40 H70" stroke="' + ink + '" stroke-width="1.4" opacity=".6"/>' +
      '</g>';
  }

  /* 背景：星点 + 星座连线 + 曼陀罗环 + 柔光 */
  function backdropMarkup(seed, ink, accent, line) {
    const rnd = mulberry32(seed);
    let s = '<g>';

    s += '<circle cx="100" cy="162" r="118" fill="url(#__GLOW__)"/>';

    /* 曼陀罗环 */
    const rings = 2 + Math.floor(rnd() * 2);
    for (let r = 0; r < rings; r++) {
      const rad = 42 + r * 22 + rnd() * 8;
      s += '<circle cx="100" cy="162" r="' + rad.toFixed(1) + '" fill="none" stroke="' + line +
        '" stroke-opacity="' + (0.18 - r * 0.045).toFixed(2) + '" stroke-width="' + (rnd() < 0.5 ? 0.8 : 1.3) + '"' +
        (rnd() < 0.4 ? ' stroke-dasharray="2 6"' : '') + '/>';
    }

    /* 射线 */
    const rays = 8 + Math.floor(rnd() * 7);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + rnd() * 0.12;
      const r1 = 104 + rnd() * 8;
      const r2 = r1 + 5 + rnd() * 16;
      s += '<line x1="' + (100 + Math.cos(a) * r1).toFixed(1) + '" y1="' + (162 + Math.sin(a) * r1).toFixed(1) +
        '" x2="' + (100 + Math.cos(a) * r2).toFixed(1) + '" y2="' + (162 + Math.sin(a) * r2).toFixed(1) +
        '" stroke="' + line + '" stroke-opacity=".28" stroke-width=".9"/>';
    }

    /* 星座 */
    const count = 6 + Math.floor(rnd() * 4);
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = 24 + rnd() * 62;
      pts.push([100 + Math.cos(a) * rad, 162 + Math.sin(a) * rad * 1.08]);
    }
    let path = '';
    pts.forEach(function (p, i) { path += (i ? ' L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
    s += '<path d="' + path + '" fill="none" stroke="' + accent + '" stroke-opacity=".16" stroke-width=".9"/>';
    pts.forEach(function (p) {
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (0.9 + rnd() * 1.3).toFixed(1) +
        '" fill="' + ink + '" fill-opacity=".55"/>';
    });

    /* 星尘 */
    const dust = 22 + Math.floor(rnd() * 16);
    for (let i = 0; i < dust; i++) {
      const x = 16 + rnd() * 168;
      const y = 60 + rnd() * 200;
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.4 + rnd() * 0.8).toFixed(2) +
        '" fill="' + ink + '" fill-opacity="' + (0.1 + rnd() * 0.35).toFixed(2) + '"/>';
    }

    return s + '</g>';
  }

  function frameMarkup(ink, accent, line) {
    const corner = function (x, y, sx, sy) {
      return '<path d="M' + x + ' ' + (y + 22 * sy) + ' Q' + x + ' ' + y + ' ' + (x + 22 * sx) + ' ' + y +
        '" fill="none" stroke="' + accent + '" stroke-opacity=".75" stroke-width="1.2" stroke-linecap="round"/>' +
        '<circle cx="' + (x + 7 * sx) + '" cy="' + (y + 7 * sy) + '" r="1.5" fill="' + accent + '" fill-opacity=".9"/>';
    };
    return '<rect x="3.5" y="3.5" width="193" height="327" rx="13" fill="none" stroke="' + line + '" stroke-width="2.2"/>' +
      '<rect x="9.5" y="9.5" width="181" height="315" rx="9" fill="none" stroke="' + accent + '" stroke-opacity=".55" stroke-width=".9"/>' +
      corner(18, 18, 1, 1) + corner(182, 18, -1, 1) + corner(18, 316, 1, -1) + corner(182, 316, -1, -1);
  }

  /* 生成一张牌的牌面（SVG 字符串） */
  function cardFaceSVG(card) {
    const pal = T.palette(card);
    const ink = pal.ink, accent = pal.accent, line = pal.line;
    const uid = 'f' + (svgSeq++);
    const seed = hash(card.id);
    const isMajor = card.arcana === 'major';
    const isCourt = !isMajor && card.rank > 10;

    let art = '';
    if (isMajor) {
      art = '<g>' +
        '<circle cx="100" cy="158" r="62" fill="none" stroke="' + accent + '" stroke-opacity=".35" stroke-width="1"/>' +
        '<circle cx="100" cy="158" r="56" fill="none" stroke="' + accent + '" stroke-opacity=".18" stroke-width=".8" stroke-dasharray="1 7"/>' +
        '<text x="100" y="158" text-anchor="middle" dominant-baseline="central" font-family="' + FONT_SYMBOL +
        '" font-size="96" fill="url(#' + uid + 'gold)" filter="url(#' + uid + 'blur)">' + card.glyph + '</text>' +
        '<text x="100" y="158" text-anchor="middle" dominant-baseline="central" font-family="' + FONT_SYMBOL +
        '" font-size="96" fill="url(#' + uid + 'gold)">' + card.glyph + '</text>' +
        '<circle cx="100" cy="86" r="2" fill="' + accent + '"/>' +
        '<circle cx="100" cy="230" r="2" fill="' + accent + '"/>' +
        '<circle cx="52" cy="158" r="2" fill="' + accent + '"/>' +
        '<circle cx="148" cy="158" r="2" fill="' + accent + '"/>' +
        '</g>';
    } else if (isCourt) {
      art = '<g>' +
        '<circle cx="100" cy="178" r="66" fill="none" stroke="' + accent + '" stroke-opacity=".35" stroke-width="1"/>' +
        '<polygon points="' + polygon(100, 178, 78, 4, Math.PI / 4) + '" fill="none" stroke="' + accent + '" stroke-opacity=".2" stroke-width=".9"/>' +
        '<g transform="translate(100 178) translate(-52 -52) scale(1.04)">' + suitMarkup(card.suit, ink, accent, line) + '</g>' +
        '<g transform="translate(100 96) translate(-50 -22) scale(0.62)">' + crownMarkup(ink, accent) + '</g>' +
        '</g>';
    } else {
      art = '<g>' + pipMarkup(card, ink, accent, line) + '</g>';
    }

    const numeral = isMajor ? card.rankLabel : card.rankLabel;

    return '<svg class="art" viewBox="0 0 200 334" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + uid + 'bg" x1="0" y1="0" x2=".45" y2="1">' +
      '<stop offset="0" stop-color="' + pal.bg[0] + '"/><stop offset="1" stop-color="' + pal.bg[1] + '"/></linearGradient>' +
      '<radialGradient id="' + uid + 'glow" cx=".5" cy=".42" r=".55">' +
      '<stop offset="0" stop-color="' + accent + '" stop-opacity=".3"/>' +
      '<stop offset=".62" stop-color="' + accent + '" stop-opacity=".06"/>' +
      '<stop offset="1" stop-color="' + accent + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + uid + 'gold" x1="0" y1="0" x2=".3" y2="1">' +
      '<stop offset="0" stop-color="' + ink + '"/><stop offset=".55" stop-color="' + accent + '"/><stop offset="1" stop-color="' + line + '"/></linearGradient>' +
      '<filter id="' + uid + 'blur" x="-40%" y="-40%" width="180%" height="180%">' +
      '<feGaussianBlur stdDeviation="4.5"/></filter>' +
      '</defs>' +
      '<rect x="0" y="0" width="200" height="334" rx="13" fill="url(#' + uid + 'bg)"/>' +
      backdropMarkup(seed, ink, accent, line).replace('__GLOW__', uid + 'glow') +
      '<rect x="0" y="0" width="200" height="334" rx="13" fill="url(#' + uid + 'glow)" opacity=".55"/>' +
      /* 顶部序号 */
      '<text x="100" y="45" text-anchor="middle" font-family="' + FONT_SERIF + '" font-size="17" letter-spacing="2.5" fill="' + accent + '">' + numeral + '</text>' +
      '<line x1="52" y1="54" x2="80" y2="54" stroke="' + line + '" stroke-opacity=".6" stroke-width=".8"/>' +
      '<line x1="120" y1="54" x2="148" y2="54" stroke="' + line + '" stroke-opacity=".6" stroke-width=".8"/>' +
      '<circle cx="100" cy="54" r="1.7" fill="' + accent + '"/>' +
      art +
      /* 底部名称 */
      '<line x1="72" y1="270" x2="128" y2="270" stroke="' + accent + '" stroke-opacity=".45" stroke-width=".9"/>' +
      '<circle cx="100" cy="270" r="1.6" fill="' + accent + '" fill-opacity=".8"/>' +
      '<text x="100" y="295" text-anchor="middle" font-family="' + FONT_SERIF + '" font-size="18.5" fill="' + ink + '" letter-spacing="1.5">' + card.name + '</text>' +
      '<text x="100" y="314" text-anchor="middle" font-family="' + FONT_SERIF + '" font-size="8" fill="' + accent + '" fill-opacity=".85" letter-spacing="1.4">' + card.en.toUpperCase() + '</text>' +
      frameMarkup(ink, accent, line) +
      '</svg>';
  }

  const PIP_POS = {
    1: [[100, 162]],
    2: [[100, 112], [100, 212]],
    3: [[100, 104], [68, 224], [132, 224]],
    4: [[70, 116], [130, 116], [70, 208], [130, 208]],
    5: [[68, 104], [132, 104], [100, 162], [68, 220], [132, 220]],
    6: [[74, 100], [126, 100], [74, 162], [126, 162], [74, 224], [126, 224]],
    7: [[66, 96], [100, 96], [134, 96], [100, 158], [66, 228], [100, 228], [134, 228]],
    8: [[74, 90], [126, 90], [74, 138], [126, 138], [74, 186], [126, 186], [74, 234], [126, 234]],
    9: [[66, 96], [100, 96], [134, 96], [66, 162], [100, 162], [134, 162], [66, 228], [100, 228], [134, 228]],
    10: [[58, 96], [86, 96], [114, 96], [142, 96], [86, 162], [114, 162], [58, 228], [86, 228], [114, 228], [142, 228]]
  };
  const PIP_SIZE = { 1: 92, 2: 62, 3: 54, 4: 50, 5: 44, 6: 40, 7: 32, 8: 34, 9: 30, 10: 26 };

  function pipMarkup(card, ink, accent, line) {
    const pos = PIP_POS[card.rank];
    const size = PIP_SIZE[card.rank];
    const icon = suitMarkup(card.suit, ink, accent, line);
    let s = '';
    /* 中央柔光 */
    s += '<circle cx="100" cy="162" r="76" fill="' + accent + '" fill-opacity=".045"/>';
    pos.forEach(function (p) {
      s += '<g transform="translate(' + (p[0] - size / 2) + ' ' + (p[1] - size / 2) + ') scale(' + (size / 100) + ')" opacity=".95">' + icon + '</g>';
    });
    return s;
  }

  /* 牌背 */
  function cardBackSVG() {
    const uid = 'b' + (svgSeq++);
    const gold = '#d9b45b';
    const goldLight = '#f0d9a7';
    let s = '<svg class="art" viewBox="0 0 200 334" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + uid + 'bg" x1="0" y1="0" x2=".5" y2="1">' +
      '<stop offset="0" stop-color="#191340"/><stop offset=".55" stop-color="#0d0a24"/><stop offset="1" stop-color="#06040f"/></linearGradient>' +
      '<linearGradient id="' + uid + 'g" x1="0" y1="0" x2=".6" y2="1">' +
      '<stop offset="0" stop-color="' + goldLight + '"/><stop offset=".5" stop-color="' + gold + '"/><stop offset="1" stop-color="#8f6d2c"/></linearGradient>' +
      '<radialGradient id="' + uid + 'r" cx=".5" cy=".45" r=".5">' +
      '<stop offset="0" stop-color="' + gold + '" stop-opacity=".22"/>' +
      '<stop offset="1" stop-color="' + gold + '" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="200" height="334" rx="13" fill="url(#' + uid + 'bg)"/>' +
      '<rect x="3.5" y="3.5" width="193" height="327" rx="13" fill="none" stroke="url(#' + uid + 'g)" stroke-width="2"/>' +
      '<rect x="10" y="10" width="180" height="314" rx="9" fill="none" stroke="' + gold + '" stroke-opacity=".45" stroke-width=".8"/>' +
      '<circle cx="100" cy="167" r="96" fill="url(#' + uid + 'r)"/>' +
      /* 内框斜纹 */
      '<g stroke="' + gold + '" stroke-opacity=".1" stroke-width=".8">' +
      '<path d="M20 20 L180 180 M20 60 L180 220 M20 100 L180 260 M20 140 L180 300"/>' +
      '<path d="M180 20 L20 180 M180 60 L20 220 M180 100 L20 260 M180 140 L20 300"/>' +
      '</g>' +
      /* 中央曼陀罗 */
      '<circle cx="100" cy="167" r="62" fill="none" stroke="url(#' + uid + 'g)" stroke-width="1.2"/>' +
      '<circle cx="100" cy="167" r="55" fill="none" stroke="' + gold + '" stroke-opacity=".4" stroke-width=".8" stroke-dasharray="1.5 5"/>' +
      '<polygon points="' + starPoints(100, 167, 50, 20, 8, -Math.PI / 2) + '" fill="none" stroke="url(#' + uid + 'g)" stroke-width="1.4"/>' +
      '<circle cx="100" cy="167" r="20" fill="#080516" stroke="' + gold + '" stroke-opacity=".6" stroke-width="1"/>' +
      /* 月牙 + 星 */
      '<path d="M104 156 A11 11 0 1 0 104 178 A9 9 0 1 1 104 156 Z" fill="' + goldLight + '" fill-opacity=".9"/>' +
      '<path d="' + starPoints(112, 154, 4.6, 1.7, 4, 0).replace(/^/, 'M').replace(/,/g, ' ') + '" fill="' + goldLight + '"/>' +
      /* 外圈点 */
      (function () {
        let dots = '';
        for (let i = 0; i < 24; i++) {
          const a = (Math.PI * 2 * i) / 24;
          dots += '<circle cx="' + (100 + Math.cos(a) * 68).toFixed(1) + '" cy="' + (167 + Math.sin(a) * 68).toFixed(1) + '" r="1.1" fill="' + gold + '" fill-opacity=".55"/>';
        }
        return dots;
      })() +
      /* 四角小花 */
      (function () {
        let c = '';
        [[26, 26], [174, 26], [26, 308], [174, 308]].forEach(function (p) {
          c += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.4" fill="none" stroke="' + gold + '" stroke-opacity=".55" stroke-width=".9"/>' +
            '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.1" fill="' + gold + '" fill-opacity=".8"/>';
        });
        return c;
      })() +
      '</svg>';
    return s;
  }

  window.TAROT_ART = {
    face: cardFaceSVG,
    back: cardBackSVG,
    starPoints: starPoints,
    polygon: polygon
  };
})();
