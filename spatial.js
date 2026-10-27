/*!
 * 空间塔罗 · 思维语法系统
 * 78 张牌的空间状态 · 四向语义 · 五个思维操作 · 语法网格 · 解读资料导出
 * 纯原生 JavaScript，无后端、无网络、无 AI 接口。
 */
(function () {
  'use strict';

  const T = window.TAROT;
  const ART = window.TAROT_ART;

  /* ============================================================
   * 1. 常量与规则
   * ========================================================== */
  const SPACE = 1000;            /* 桌布内部坐标空间（正方形） */
  const PAD = 38;                /* 桌布内边距（坐标单位） */
  const CARD_ASPECT = 1.66;
  const RATIO_DESKTOP = 0.05;    /* 卡牌宽度 / 桌布宽度：越小牌越小、桌布越显得开阔 */
  const RATIO_MOBILE = 0.076;

  const DIRS = {
    upright: {
      key: 'upright', label: '正向', short: '正', deg: 0, color: '#e2c17c',
      angle: '0°', sem: '保留该牌的基础寓意'
    },
    reversed: {
      key: 'reversed', label: '逆向', short: '逆', deg: 180, color: '#e09280',
      angle: '180°', sem: '基础寓意朝相反方向解释'
    },
    inward: {
      key: 'inward', label: '向内', short: '内', deg: 270, color: '#9fb6e8',
      angle: '270°（逆时针 90°）', sem: '向内回溯、内在化、尚未显化'
    },
    outward: {
      key: 'outward', label: '向外', short: '外', deg: 90, color: '#e8c58f',
      angle: '90°（顺时针 90°）', sem: '推进、显化、能量向外作用'
    }
  };
  const DIR_KEYS = ['upright', 'reversed', 'inward', 'outward'];
  const FLIP = { upright: 'reversed', reversed: 'upright', inward: 'outward', outward: 'inward' };

  const REVERSE_MODES = {
    reverseExplore: {
      label: '反向探索',
      desc: '探索与原有方向相反的可能性，纳入相反发展方向的考察。'
    },
    negate: {
      label: '否定质疑',
      desc: '质疑既有判断，检视某个未经证实的前提是否成立。'
    },
    turn: {
      label: '转折转向',
      desc: '在操作过程中引入转折点，关注方向改变与前后阶段对比。'
    }
  };

  const OP_LABELS = {
    emotion: '心绪／欲求',
    diverge: '发散／探索',
    converge: '皈依／实在',
    reverse: '反转／否定',
    advance: '推进／演化'
  };

  const SPEED_LABELS = { first: '首次点击（默认强度）', fast: '快速', medium: '中速', slow: '缓慢' };

  const RULES = {
    version: 'STG-1.0',
    fastMs: 350,
    slowMs: 900,
    defaultIntensity: 0.6,
    gridDefault: 15,
    gridMin: 5,
    gridMax: 15,
    maxUndo: 80
  };

  const AI_GUIDE = `请根据上方资料解读本次自定义塔罗结果。

首先阅读用户最初提出的问题，然后阅读本系统的规则、操作历史、抽牌清单和网格结构。

请严格区分以下四种信息：

卡牌本身的基础牌义。

卡牌的最终方向及其语义。

用户通过按钮操作表达的意图。

用户在网格中构造的语法与关系。

对于反转操作，请进一步区分三种模式：

反向探索：探索与原有方向相反的可能性。

否定质疑：检视某个前提是否成立，允许对既有解释提出质疑。

转折转向：关注操作历史中被标记的转折位置及其前后关系。

每次反转操作都应根据自己的模式和历史位置进行理解。

不要因为用户曾经点击反转按钮，就对所有卡牌的最终牌义再次自动取反。单张牌的最终方向决定该牌如何解释，反转历史则用于理解用户希望采用的语义视角。

请结合心绪／欲求的操作节奏，发散与皈依的操作历史，以及推进／演化的操作记录，理解用户希望怎样探索问题。不要把这些操作直接当成客观预测结果的证据。

解读必须优先遵循用户实际构造的网格结构。

主干方块主要按照从左到右的方向进行解释；绿色修饰链必须按照规定的上下读取方向解释，并明确说明每条修饰链关联到哪个主干方块。

如果主干存在分支，请分别解释分支和连接关系。如果主干上下同时存在修饰链，可以考虑权衡、双重限定、相互补充或潜在冲突，但不要机械地将它们判定为冲突。

对于关注发展的问题，请根据实际网格结构和卡牌含义探讨事物的当前状态、可能变化、潜在转折和后续发展。不要在没有依据的情况下强行把所有牌排列为固定的起因、过程和结果。

请先解释网格的整体结构，再分析各个主干节点及其修饰关系，最后给出综合解释。

当出现多种合理解释时，请指出主要解释及其他可能性，不要将象征性解读当作已经客观证实的事实。

如果资料存在缺失或结构存在歧义，请明确指出，不要擅自补造未提供的信息。`;

  /* ============================================================
   * 2. 工具
   * ========================================================== */
  function $(sel) { return document.querySelector(sel); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffleIn(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function clone(obj) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(obj); } catch (e) { /* fallthrough */ }
    }
    return JSON.parse(JSON.stringify(obj));
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function stamp(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function fileStamp(d) {
    d = d || new Date();
    return '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  }
  function round1(n) { return Math.round(n * 10) / 10; }

  /* ============================================================
   * 3. 应用状态
   * ========================================================== */
  const state = {
    cards: [],
    selection: [],                       /* 抽牌顺序（uid） */
    events: [],
    phase: 'editing',                    /* editing | revealed */
    counts: { emotion: 0, diverge: 0, converge: 0, reverse: 0, advance: 0 },
    lastClick: { emotion: 0, diverge: 0, converge: 0, reverse: 0, advance: 0 },
    reverseMode: 'reverseExplore',
    flipCount: 0,
    grid: { size: RULES.gridDefault, cells: [] },
    selectedCell: null,
    allowDup: false,
    undoStack: [],
    generatedAt: null,
    outputText: '',
    stale: false,
    startedAt: Date.now(),
    lastSpeed: null,
    lastIntensity: null
  };

  const el = {};
  let tablePx = 0;
  let cardPxW = 0;
  let cardPxH = 0;
  let ratio = RATIO_DESKTOP;
  let toastTimer = null;
  let confirmResolver = null;
  let chaosTimer = null;

  /* ============================================================
   * 4. 初始化
   * ========================================================== */
  function init() {
    cacheDom();
    buildGridSizeOptions();
    ensureGridCells();
    buildCards();
    measure();
    drawCloth();
    initialLayout();
    bindEvents();
    buildGridDom();
    renderAll();
    updateStage();
    if (window.ResizeObserver) {
      let raf = 0;
      const ro = new ResizeObserver(function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          const before = cardPxW;
          measure();
          drawCloth();
          if (Math.abs(cardPxW - before) > 0.5) {
            clampAll();
            resolveCollisions(4);
          }
          renderCards(false);
        });
      });
      ro.observe(el.tablecloth);
    } else {
      window.addEventListener('resize', function () {
        measure(); drawCloth(); renderCards(false);
      });
    }
  }

  function cacheDom() {
    el.question = $('#questionInput');
    el.extraSubject = $('#extraSubject');
    el.extraRange = $('#extraRange');
    el.extraContext = $('#extraContext');
    el.stageBar = $('#stageBar');
    el.stageSteps = Array.from(document.querySelectorAll('.stage'));
    el.tablecloth = $('#tablecloth');
    el.cardsLayer = $('#cardsLayer');
    el.clothTex = $('#clothTex');
    el.tableHint = $('#tableHint');
    el.tableFootHint = $('#tableFootHint');
    el.timeAxis = $('#timeAxis');
    el.tableBadge = $('#tableBadge');
    el.selCount = $('#selCount');
    el.selBadge = $('#selBadge');
    el.freezeLabel = $('#freezeLabel');
    el.dirDigest = $('#dirDigest');
    el.opButtons = $('#opButtons');
    el.reverseModes = $('#reverseModes');
    el.reverseModeName = $('#reverseModeName');
    el.reverseModeDesc = $('#reverseModeDesc');
    el.undoBtn = $('#undoBtn');
    el.resetBtn = $('#resetBtn');
    el.railStatus = $('#railStatus');
    el.selectionList = $('#selectionList');
    el.selEmpty = $('#selEmpty');
    el.revealBtn = $('#revealBtn');
    el.backToEditBtn = $('#backToEditBtn');
    el.eventLog = $('#eventLog');
    el.eventCount = $('#eventCount');
    el.galleryPanel = $('#galleryPanel');
    el.revealedGallery = $('#revealedGallery');
    el.gridSection = $('#gridSection');
    el.gridBoard = $('#gridBoard');
    el.gridColLabels = $('#gridColLabels');
    el.gridRowLabels = $('#gridRowLabels');
    el.gridEditor = $('#gridEditor');
    el.gridOk = $('#gridOk');
    el.gridErrors = $('#gridErrors');
    el.gridHint = $('#gridHint');
    el.gridSize = $('#gridSize');
    el.allowDup = $('#allowDup');
    el.exportSection = $('#exportSection');
    el.exportHint = $('#exportHint');
    el.outputText = $('#outputText');
    el.genBtn = $('#genBtn');
    el.copyBtn = $('#copyBtn');
    el.pngBtn = $('#pngBtn');
    el.jsonBtn = $('#jsonBtn');
    el.confirmModal = $('#confirmModal');
    el.confirmTitle = $('#confirmTitle');
    el.confirmBody = $('#confirmBody');
    el.confirmOk = $('#confirmOk');
    el.confirmCancel = $('#confirmCancel');
    el.cardModal = $('#cardModal');
    el.cardModalArt = $('#cardModalArt');
    el.cardModalInfo = $('#cardModalInfo');
    el.cardModalClose = $('#cardModalClose');
    el.toast = $('#toast');
  }

  /* ============================================================
   * 5. 桌布纹理
   * ========================================================== */
  function drawCloth() {
    const cv = el.clothTex;
    const size = el.tablecloth.clientWidth;
    if (!size || !cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    /* 细网格 */
    ctx.strokeStyle = 'rgba(226,193,124,0.045)';
    ctx.lineWidth = 1;
    const step = size / 18;
    for (let i = 1; i < 18; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }

    /* 同心圆 */
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * (0.16 + i * 0.085), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(226,193,124,' + (0.075 - i * 0.013).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* 放射线 */
    ctx.strokeStyle = 'rgba(226,193,124,0.04)';
    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      ctx.beginPath();
      ctx.moveTo(size / 2 + Math.cos(a) * size * 0.2, size / 2 + Math.sin(a) * size * 0.2);
      ctx.lineTo(size / 2 + Math.cos(a) * size * 0.47, size / 2 + Math.sin(a) * size * 0.47);
      ctx.stroke();
    }

    /* 星尘 */
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 1.1 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + Math.random() * 0.25).toFixed(2) + ')';
      ctx.fill();
    }
  }

  /* ============================================================
   * 6. 卡牌：创建、坐标、尺寸
   * ========================================================== */
  function buildCards() {
    const frag = document.createDocumentFragment();
    T.DECK.forEach(function (card) {
      const runtime = {
        uid: card.uid,
        card: card,
        x: 0,
        y: 0,
        dir: 'upright',
        visAngle: 0,
        selected: false,
        drawIndex: null
      };
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'tcard';
      node.dataset.uid = String(card.uid);
      node.innerHTML =
        '<span class="tcard-rot"><span class="tcard-flip">' +
        '<span class="tcard-back">' + ART.back() + '<i class="dir-mark"></i></span>' +
        '<span class="tcard-face"></span>' +
        '</span></span><span class="tcard-badge" hidden></span>';
      runtime.el = node;
      runtime.rot = node.querySelector('.tcard-rot');
      runtime.faceEl = node.querySelector('.tcard-face');
      runtime.badge = node.querySelector('.tcard-badge');
      node.addEventListener('click', function () { onCardClick(runtime); });
      runtime.nodeTitle = card.name;
      state.cards.push(runtime);
      frag.appendChild(node);
    });
    el.cardsLayer.appendChild(frag);
  }

  function initialLayout() {
    const b = bounds();
    const n = 9;
    const cx = (b.maxX - b.minX) / (n - 1);
    const cy = (b.maxY - b.minY) / (n - 1);
    const slots = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) slots.push([c, r]);
    shuffleIn(slots);
    state.cards.forEach(function (card, i) {
      const s = slots[i];
      card.x = b.minX + s[0] * cx + rand(-0.3, 0.3) * cx;
      card.y = b.minY + s[1] * cy + rand(-0.3, 0.3) * cy;
      card.dir = 'upright';
      card.visAngle = 0;
    });
    clampAll();
    resolveCollisions(4);
  }

  function randomDir() {
    const r = Math.random();
    if (r < 0.5) return 'upright';
    if (r < 0.7) return 'reversed';
    if (r < 0.85) return 'inward';
    return 'outward';
  }

  function randomOtherDir(cur) {
    let d = randomDir();
    let guard = 0;
    while (d === cur && guard++ < 8) d = randomDir();
    return d;
  }

  function measure() {
    tablePx = el.tablecloth.clientWidth;
    ratio = tablePx < 560 ? RATIO_MOBILE : RATIO_DESKTOP;
    cardPxW = tablePx * ratio;
    cardPxH = cardPxW * CARD_ASPECT;
    el.tablecloth.style.setProperty('--cw', cardPxW.toFixed(2) + 'px');
    el.tablecloth.style.setProperty('--ch', cardPxH.toFixed(2) + 'px');
  }

  function designCard() {
    const w = SPACE * ratio;
    /* 碰撞体积很小：只保留刚好不"完全重叠"的最小间隔，允许牌自然叠放 */
    return { w: w, h: w * CARD_ASPECT, minDist: w * 0.14 };
  }

  function bounds() {
    const d = designCard();
    return {
      minX: PAD + d.w / 2,
      maxX: SPACE - PAD - d.w / 2,
      minY: PAD + d.h / 2,
      maxY: SPACE - PAD - d.h / 2
    };
  }

  function clampAll() {
    const b = bounds();
    state.cards.forEach(function (c) {
      c.x = clamp(c.x, b.minX, b.maxX);
      c.y = clamp(c.y, b.minY, b.maxY);
    });
  }

  /* 大幅位移越界时按镜面反射折回桌布内，而不是贴死在边缘 */
  function reflectAll() {
    const b = bounds();
    state.cards.forEach(function (c) {
      if (c.x < b.minX) c.x = b.minX + (b.minX - c.x);
      else if (c.x > b.maxX) c.x = b.maxX - (c.x - b.maxX);
      if (c.y < b.minY) c.y = b.minY + (b.minY - c.y);
      else if (c.y > b.maxY) c.y = b.maxY - (c.y - b.maxY);
    });
    clampAll();
  }

  function resolveCollisions(iterations) {
    const d = designCard();
    const min = d.minDist;
    const min2 = min * min;
    const cards = state.cards;
    const b = bounds();
    const iters = iterations || 5;
    for (let it = 0; it < iters; it++) {
      let moved = false;
      for (let i = 0; i < cards.length; i++) {
        const a = cards[i];
        for (let j = i + 1; j < cards.length; j++) {
          const c = cards[j];
          let dx = c.x - a.x;
          let dy = c.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 >= min2) continue;
          let dist = Math.sqrt(d2);
          if (dist < 0.001) {
            const ang = Math.random() * Math.PI * 2;
            dx = Math.cos(ang); dy = Math.sin(ang); dist = 1;
          }
          const push = (min - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push; a.y -= uy * push;
          c.x += ux * push; c.y += uy * push;
          moved = true;
        }
      }
      for (let i = 0; i < cards.length; i++) {
        cards[i].x = clamp(cards[i].x, b.minX, b.maxX);
        cards[i].y = clamp(cards[i].y, b.minY, b.maxY);
      }
      if (!moved) break;
    }
  }

  /* ============================================================
   * 7. 渲染
   * ========================================================== */
  function renderCards(animate) {
    const S = tablePx;
    if (!S) return;
    const d = designCard();
    if (animate === false) el.cardsLayer.classList.add('no-anim');
    const isFrozen = state.phase === 'revealed';
    state.cards.forEach(function (c) {
      const px = (c.x / SPACE) * S;
      const py = (c.y / SPACE) * S;
      c.el.style.transform = 'translate3d(' + (px - cardPxW / 2).toFixed(2) + 'px,' + (py - cardPxH / 2).toFixed(2) + 'px,0)';
      c.rot.style.transform = 'rotate(' + c.visAngle.toFixed(1) + 'deg)';
      const z = 10 + Math.round(c.y) + (c.selected ? 600 : 0);
      c.el.style.zIndex = String(z);
      c.el.classList.toggle('is-selected', c.selected);
      c.el.classList.toggle('is-revealed', isFrozen && c.selected);
      if (c.drawIndex) {
        c.badge.hidden = false;
        c.badge.textContent = String(c.drawIndex);
      } else {
        c.badge.hidden = true;
      }
      const dirLabel = DIRS[c.dir].label;
      c.el.setAttribute('aria-label',
        c.selected
          ? '第 ' + c.drawIndex + ' 张 · 已选择 · ' + (isFrozen ? c.card.name + ' · ' + dirLabel : '未揭示') + ' · ' + dirLabel
          : '牌背 · ' + dirLabel);
    });
    el.tablecloth.classList.toggle('is-frozen', isFrozen);
    if (animate === false) {
      requestAnimationFrame(function () { el.cardsLayer.classList.remove('no-anim'); });
    }
  }

  function dirDigest() {
    const d = { upright: 0, reversed: 0, inward: 0, outward: 0 };
    state.cards.forEach(function (c) { d[c.dir]++; });
    return d;
  }

  function digestText(d) {
    return '正 ' + d.upright + ' · 逆 ' + d.reversed + ' · 内 ' + d.inward + ' · 外 ' + d.outward;
  }

  function totalClicks() {
    let n = 0;
    Object.keys(state.counts).forEach(function (k) { n += state.counts[k]; });
    return n;
  }

  function renderCounters() {
    Array.from(document.querySelectorAll('[data-count]')).forEach(function (node) {
      const key = node.dataset.count;
      node.textContent = String(state.counts[key]);
    });
    el.dirDigest.textContent = digestText(dirDigest());
    el.railStatus.textContent = '累计操作 ' + totalClicks() + ' 次 · 反转 ' + state.flipCount +
      ' 次 · 已抽 ' + state.selection.length + ' 张';
  }

  function renderSelection() {
    const revealed = state.phase === 'revealed';
    el.selectionList.innerHTML = state.selection.map(function (uid, i) {
      const c = cardByUid(uid);
      const dir = DIRECTIONS_TEXT(c.dir);
      const name = revealed ? c.card.name : '未揭示';
      const cls = revealed ? '' : ' hidden-name';
      const meta = revealed
        ? '<div class="sel-meta">' + c.card.en + ' · ' + dir.label + ' · ' + dir.angle + '</div>'
        : '<div class="sel-meta">等待揭示 · ' + dir.label + '</div>';
      return '<li class="sel-item">' +
        '<span class="sel-idx">' + (i + 1) + '</span>' +
        '<span class="sel-body"><div class="sel-name' + cls + '">' + name + '</div>' + meta + '</span>' +
        (revealed ? '' : '<button type="button" class="sel-remove" data-remove="' + uid + '" aria-label="取消第 ' + (i + 1) + ' 张">✕</button>') +
        '</li>';
    }).join('');
    el.freezeLabel.textContent = revealed ? '牌面方向已冻结' : '牌面方向可编辑';
    el.freezeLabel.classList.toggle('is-frozen', revealed);
    if (el.tableFootHint) el.tableFootHint.textContent = revealed ? '点击已揭示的牌查看牌义' : '点击牌背即可选牌';
    el.selEmpty.hidden = state.selection.length > 0;
    el.selCount.textContent = String(state.selection.length);
    el.selBadge.textContent = state.selection.length + ' 张';
    el.tableBadge.textContent = '78 张牌';
    el.revealBtn.disabled = state.selection.length === 0 || state.phase !== 'editing';
    el.revealBtn.hidden = state.phase === 'revealed';
    el.backToEditBtn.hidden = state.phase !== 'revealed';
  }

  function DIRECTIONS_TEXT(key) { return DIRS[key]; }

  function renderEvents() {
    const items = state.events.slice(-40);
    el.eventCount.textContent = state.events.length + ' 次';
    el.eventLog.innerHTML = items.map(function (ev) {
      const detail = [];
      if (ev.type === 'emotion') {
        detail.push('速度：' + SPEED_LABELS[ev.speed] + (ev.intervalMs != null ? '（间隔 ' + ev.intervalMs + ' ms）' : ''));
        detail.push('混沌强度：' + ev.intensity.toFixed(2) + '（该按钮第 ' + ev.clickCountType + ' 次）');
      } else if (ev.type === 'reverse') {
        detail.push('模式：' + REVERSE_MODES[ev.mode].label + ' · 累计反转 ' + ev.flipCount + ' 次');
      } else {
        detail.push('该按钮第 ' + ev.clickCountType + ' 次' + (ev.intervalMs != null ? ' · 间隔 ' + ev.intervalMs + ' ms' : ''));
      }
      detail.push('方向：' + digestText(ev.dirAfter));
      return '<li class="event-item' + (ev.type === 'reverse' ? ' t-reverse' : '') + '">' +
        '<span class="event-seq">' + ev.seq + '</span>' +
        '<span class="event-text"><b>' + OP_LABELS[ev.type] + '</b>' +
        detail.map(function (d) { return '<small>' + d + '</small>'; }).join('') +
        '</span></li>';
    }).join('');
    el.eventLog.scrollTop = el.eventLog.scrollHeight;
  }

  function renderGallery() {
    if (!state.selection.length) {
      el.revealedGallery.innerHTML = '';
      return;
    }
    el.revealedGallery.innerHTML = '';
    const frag = document.createDocumentFragment();
    state.selection.forEach(function (uid, i) {
      const c = cardByUid(uid);
      const dir = DIRS[c.dir];
      const dirCls = c.dir === 'reversed' ? 'rev' : c.dir === 'inward' ? 'in' : c.dir === 'outward' ? 'out' : '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'g-card';
      btn.innerHTML =
        '<span class="g-art">' + ART.face(c.card) + '<span class="g-idx">' + (i + 1) + '</span></span>' +
        '<span class="g-name">' + c.card.name + '</span>' +
        '<span class="g-dir ' + dirCls + '">' + dir.label + ' · ' + dir.angle + '</span>';
      btn.addEventListener('click', function () { openCardDetail(c); });
      frag.appendChild(btn);
    });
    el.revealedGallery.appendChild(frag);
  }

  function updateStage() {
    const done = {
      ask: !!(el.question.value.trim() || state.events.length || state.selection.length),
      operate: state.events.length > 0,
      draw: state.selection.length > 0,
      reveal: state.phase === 'revealed',
      grid: hasGridContent(),
      export: !!state.generatedAt && !state.stale
    };
    const order = ['ask', 'operate', 'draw', 'reveal', 'grid', 'export'];
    let current = 'ask';
    for (let i = 0; i < order.length; i++) {
      if (!done[order[i]]) { current = order[i]; break; }
      current = order[i];
    }
    el.stageSteps.forEach(function (node) {
      const key = node.dataset.stage;
      node.classList.toggle('is-done', !!done[key] && key !== current);
      node.classList.toggle('is-current', key === current);
    });
  }

  function updateSections() {
    const revealed = state.phase === 'revealed';
    el.galleryPanel.hidden = !revealed;
    el.exportSection.hidden = !revealed;
    el.gridSection.hidden = !revealed && !hasGridContent();
    el.gridSection.classList.toggle('is-locked', !revealed);
    el.gridHint.textContent = revealed ? '点击格子进行编辑' : '牌面编辑中，网格暂时只读';
    el.exportHint.textContent = state.stale
      ? '状态已变化，请重新生成（当前文本对应旧状态）'
      : '文本、图片与 JSON 全部来自当前真实状态';
    el.copyBtn.disabled = !state.generatedAt;
    el.pngBtn.disabled = state.phase !== 'revealed';
    el.jsonBtn.disabled = state.phase !== 'revealed';
  }

  function renderAll() {
    renderCards();
    renderSelection();
    renderGallery();
    renderEvents();
    renderCounters();
    renderGrid();
    renderEditor();
    validateNow();
    updateSections();
    updateStage();
    updateOpButtons();
  }

  function updateOpButtons() {
    const frozen = state.phase === 'revealed';
    Array.from(el.opButtons.children).forEach(function (b) { b.disabled = frozen; });
    el.reverseModes.querySelectorAll('button').forEach(function (b) { b.disabled = frozen; });
    el.undoBtn.disabled = state.undoStack.length === 0;
  }

  /* ============================================================
   * 8. 方向与坐标快照
   * ========================================================== */
  function setDir(card, dir, flip) {
    if (flip) {
      card.dir = FLIP[card.dir];
      card.visAngle += 180;
      return;
    }
    if (card.dir === dir) return;
    const target = DIRS[dir].deg;
    const cur = ((card.visAngle % 360) + 360) % 360;
    const delta = ((target - cur + 540) % 360) - 180;
    card.visAngle += delta;
    card.dir = dir;
  }

  function cardsCompact() {
    return state.cards.map(function (c) {
      return [c.uid, Math.round(c.x), Math.round(c.y), DIR_KEYS.indexOf(c.dir)];
    });
  }

  function cardByUid(uid) {
    return state.cards[uid];
  }

  /* ============================================================
   * 9. 历史 / 撤销
   * ========================================================== */
  function snapshot() {
    return {
      cards: state.cards.map(function (c) {
        return { x: c.x, y: c.y, dir: c.dir, visAngle: c.visAngle, selected: c.selected, drawIndex: c.drawIndex };
      }),
      selection: state.selection.slice(),
      events: clone(state.events),
      phase: state.phase,
      counts: clone(state.counts),
      lastClick: clone(state.lastClick),
      reverseMode: state.reverseMode,
      flipCount: state.flipCount,
      grid: { size: state.grid.size, cells: clone(state.grid.cells) },
      selectedCell: state.selectedCell ? { r: state.selectedCell.r, c: state.selectedCell.c } : null,
      allowDup: state.allowDup,
      generatedAt: state.generatedAt,
      outputText: state.outputText,
      stale: state.stale
    };
  }

  function pushUndo() {
    state.undoStack.push(snapshot());
    if (state.undoStack.length > RULES.maxUndo) state.undoStack.shift();
    updateOpButtons();
  }

  function restoreSnapshot(snap) {
    state.cards.forEach(function (c, i) { Object.assign(c, snap.cards[i]); });
    state.selection = snap.selection.slice();
    state.events = clone(snap.events);
    state.phase = snap.phase;
    state.counts = clone(snap.counts);
    state.lastClick = clone(snap.lastClick);
    state.reverseMode = snap.reverseMode;
    state.flipCount = snap.flipCount;
    state.grid = { size: snap.grid.size, cells: clone(snap.grid.cells) };
    state.selectedCell = snap.selectedCell ? { r: snap.selectedCell.r, c: snap.selectedCell.c } : null;
    state.allowDup = snap.allowDup;
    state.generatedAt = snap.generatedAt;
    state.outputText = snap.outputText;
    state.stale = snap.stale;
    el.outputText.textContent = state.outputText || '还没有生成资料。在网格编辑完成后点击「生成解读资料」。';
    buildGridDom();
    renderAll();
  }

  function doUndo() {
    if (!state.undoStack.length) return;
    const snap = state.undoStack[state.undoStack.length - 1];
    const needConfirm = snap.phase !== state.phase;
    const run = function () {
      state.undoStack.pop();
      restoreSnapshot(snap);
      closeAllModals();
      toast('已撤销上一步');
    };
    if (needConfirm) {
      confirmDialog('撤销到揭示之前？',
        '上一步操作会把牌面恢复到揭示前的编辑状态：所有牌的最终方向将重新随思维操作变化。网格内容会保留。是否继续？',
        '撤销并返回编辑', '取消').then(function (ok) { if (ok) run(); });
    } else {
      run();
    }
  }

  function beginOp() {
    pushUndo();
    clearTimeout(chaosTimer);
    el.cardsLayer.classList.remove('is-chaotic');
    return { dirBefore: dirDigest(), cardsBefore: cardsCompact() };
  }

  function finishOp(type, before, extra) {
    const ev = Object.assign({
      seq: state.events.length + 1,
      type: type,
      at: new Date(),
      elapsedMs: Date.now() - state.startedAt,
      intervalMs: null,
      speed: null,
      intensity: null,
      mode: null,
      clickCountType: state.counts[type],
      clickCountTotal: totalClicks(),
      dirBefore: before.dirBefore,
      dirAfter: dirDigest(),
      flipCount: state.flipCount,
      cardsBefore: before.cardsBefore,
      cardsAfter: cardsCompact()
    }, extra || {});
    state.events.push(ev);
    state.lastClick[type] = Date.now();
    renderEvents();
    renderCounters();
    renderSelection();
    markStale();
    updateStage();
    updateOpButtons();
    hideTableHint();
    return ev;
  }

  function markStale() {
    if (state.generatedAt) {
      state.stale = true;
      updateSections();
    }
  }

  /* ============================================================
   * 10. 五个思维操作
   * ========================================================== */
  function opEmotion() {
    if (state.phase === 'revealed') return;
    const before = beginOp();
    const now = Date.now();
    const prev = state.lastClick.emotion;
    let speed = 'first';
    let interval = null;
    if (prev) {
      interval = now - prev;
      speed = interval < RULES.fastMs ? 'fast' : interval < RULES.slowMs ? 'medium' : 'slow';
    }
    state.counts.emotion++;
    const base = speed === 'first' ? RULES.defaultIntensity
      : speed === 'fast' ? 1 : speed === 'medium' ? 0.62 : 0.34;
    const countFactor = 0.72 + 0.28 * Math.min(state.counts.emotion, 8) / 8;
    const intensity = clamp(base * countFactor, 0.2, 1);
    /* 全局混沌：每张牌被甩向任意方向、距离各不相同，可跨越整块桌布 */
    const step = (0.05 + 0.25 * intensity) * SPACE;

    state.cards.forEach(function (c) {
      const ang = Math.random() * Math.PI * 2;
      const dist = step * (0.2 + Math.random() * 1.0);
      c.x += Math.cos(ang) * dist;
      c.y += Math.sin(ang) * dist * (0.75 + Math.random() * 0.5);
      /* 混沌感同时来自频繁、随机的四向变化 */
      if (Math.random() < 0.3 + 0.6 * intensity) {
        setDir(c, randomOtherDir(c.dir), false);
      }
    });
    reflectAll();
    resolveCollisions(2);
    el.cardsLayer.classList.add('is-chaotic');
    state.cards.forEach(function (c) {
      c.el.style.setProperty('--jit-delay', (Math.random() * 0.09).toFixed(3) + 's');
    });
    clearTimeout(chaosTimer);
    chaosTimer = setTimeout(function () {
      el.cardsLayer.classList.remove('is-chaotic');
    }, 560);
    renderCards();
    renderCounters();
    state.lastSpeed = speed;
    state.lastIntensity = intensity;
    flashOp('emotion');
    finishOp('emotion', before, { speed: speed, intervalMs: interval, intensity: intensity });
    el.railStatus.textContent += ' · 本次节奏：' + SPEED_LABELS[speed];
  }

  function opDiverge() {
    if (state.phase === 'revealed') return;
    const before = beginOp();
    const now = Date.now();
    const prev = state.lastClick.diverge;
    const interval = prev ? now - prev : null;
    state.counts.diverge++;
    const R = SPACE * 0.42;
    const forces = state.cards.map(function () { return { x: 0, y: 0 }; });
    const cards = state.cards;
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d > R || d < 0.001) continue;
        const f = (1 - d / R) * 46;
        const ux = dx / d, uy = dy / d;
        forces[i].x -= ux * f; forces[i].y -= uy * f;
        forces[j].x += ux * f; forces[j].y += uy * f;
      }
    }
    cards.forEach(function (c, i) {
      const L = Math.sqrt(forces[i].x * forces[i].x + forces[i].y * forces[i].y);
      const cap = 52;
      const k = L > cap ? cap / L : 1;
      c.x += forces[i].x * k + rand(-3, 3);
      c.y += forces[i].y * k + rand(-3, 3);
      if (Math.random() < 0.16) setDir(c, randomDir(), false);
    });
    clampAll();
    resolveCollisions(4);
    renderCards();
    flashOp('diverge');
    finishOp('diverge', before, { intervalMs: interval });
  }

  function opConverge() {
    if (state.phase === 'revealed') return;
    const before = beginOp();
    const now = Date.now();
    const prev = state.lastClick.converge;
    const interval = prev ? now - prev : null;
    state.counts.converge++;

    const seeds = [];
    for (let i = 0; i < 4; i++) {
      const a = rand(0.2, 0.8);
      const b = rand(0.2, 0.8);
      seeds.push({ x: a * SPACE, y: b * SPACE });
    }
    state.cards.forEach(function (c) {
      let best = null;
      let bestD = Infinity;
      seeds.forEach(function (s) {
        const d = (s.x - c.x) * (s.x - c.x) + (s.y - c.y) * (s.y - c.y);
        if (d < bestD) { bestD = d; best = s; }
      });
      const dx = best.x - c.x;
      const dy = best.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const pull = Math.min(56, dist * 0.24);
      c.x += (dx / dist) * pull;
      c.y += (dy / dist) * pull;
      if (Math.random() < 0.11) setDir(c, randomDir(), false);
    });
    clampAll();
    resolveCollisions(5);
    renderCards();
    flashOp('converge');
    finishOp('converge', before, { intervalMs: interval });
  }

  function opReverse() {
    if (state.phase === 'revealed') return;
    const before = beginOp();
    const now = Date.now();
    const prev = state.lastClick.reverse;
    const interval = prev ? now - prev : null;
    state.counts.reverse++;
    state.flipCount++;
    state.cards.forEach(function (c) { setDir(c, null, true); });
    renderCards();
    flashOp('reverse');
    const ev = finishOp('reverse', before, {
      intervalMs: interval,
      mode: state.reverseMode,
      modeLabel: REVERSE_MODES[state.reverseMode].label
    });
    ev.turnAt = state.reverseMode === 'turn' ? ev.seq : null;
    renderEvents();
  }

  function opAdvance() {
    if (state.phase === 'revealed') return;
    const before = beginOp();
    const now = Date.now();
    const prev = state.lastClick.advance;
    const interval = prev ? now - prev : null;
    state.counts.advance++;

    let sumX = 0;
    state.cards.forEach(function (c) { sumX += c.x; });
    const meanX = sumX / state.cards.length;
    const pressure = clamp((0.66 - meanX / SPACE) / 0.5, 0.12, 1);
    state.cards.forEach(function (c) {
      c.x += SPACE * (0.03 + Math.random() * 0.032) * pressure;
      c.y += rand(-9, 9) * (1 - pressure * 0.55);
    });
    clampAll();
    resolveCollisions(4);
    renderCards();
    el.timeAxis.classList.remove('pulse');
    void el.timeAxis.offsetWidth;
    el.timeAxis.classList.add('pulse');
    flashOp('advance');
    finishOp('advance', before, { intervalMs: interval });
  }

  function flashOp(type) {
    const btn = el.opButtons.querySelector('[data-op="' + type + '"]');
    if (!btn) return;
    btn.classList.remove('is-flash');
    void btn.offsetWidth;
    btn.classList.add('is-flash');
  }

  function hideTableHint() {
    if (!el.tableHint.hidden) el.tableHint.hidden = true;
  }

  /* ============================================================
   * 11. 选牌 / 揭示 / 返回编辑
   * ========================================================== */
  function onCardClick(card) {
    if (state.phase === 'revealed') {
      if (card.selected) openCardDetail(card);
      return;
    }
    if (card.selected) {
      if (hasGridContent()) {
        toast('网格已引用抽牌序号，取消会打乱序号对应关系。请先清空网格或「重新开始」。');
        return;
      }
      pushUndo();
      const idx = state.selection.indexOf(card.uid);
      if (idx >= 0) state.selection.splice(idx, 1);
      renumberSelection();
      renderSelection();
      renderCards();
      markStale();
      updateStage();
      toast('已取消第 ' + (idx + 1) + ' 张，其余序号已重排');
    } else {
      pushUndo();
      state.selection.push(card.uid);
      card.selected = true;
      card.drawIndex = state.selection.length;
      renderSelection();
      renderCards();
      hideTableHint();
      markStale();
      updateStage();
    }
    updateOpButtons();
  }

  function renumberSelection() {
    state.cards.forEach(function (c) { c.selected = false; c.drawIndex = null; });
    state.selection.forEach(function (uid, i) {
      const c = cardByUid(uid);
      c.selected = true;
      c.drawIndex = i + 1;
    });
  }

  function revealCards() {
    if (state.phase === 'revealed') return;
    if (!state.selection.length) {
      toast('请先在桌布上至少选择一张牌。');
      return;
    }
    pushUndo();
    state.cards.forEach(function (c) {
      if (!c.selected) return;
      if (!c.faceEl.dataset.filled) {
        c.faceEl.innerHTML = ART.face(c.card);
        c.faceEl.dataset.filled = '1';
      }
    });
    state.phase = 'revealed';
    state.selection.forEach(function (uid, i) {
      const c = cardByUid(uid);
      c.el.style.setProperty('--flip-delay', (i * 90) + 'ms');
      c.el.style.setProperty('--flip-order', String(i));
    });
    renderAll();
    ensureGridRevealed();
    toast('已揭示 ' + state.selection.length + ' 张牌，方向已冻结。');
    el.galleryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ensureGridRevealed() {
    if (!state.grid.cells.length) ensureGridCells();
    buildGridDom();
    renderGrid();
    renderEditor();
    validateNow();
  }

  function backToEdit() {
    if (state.phase !== 'revealed') return;
    confirmDialog('返回编辑？',
      '返回编辑后：牌面重新变为牌背，五个思维按钮恢复可用，牌面方向会再次随操作变化；' +
      '已填入网格的抽牌序号与网格结构不会丢失，但对应卡牌的最终方向（因而语义）会随操作更新。是否继续？',
      '返回编辑', '取消').then(function (ok) {
        if (!ok) return;
        pushUndo();
        state.phase = 'editing';
        renderAll();
        toast('已返回编辑：可以继续调整牌面方向，调整后再次揭示。');
      });
  }

  function resetAll() {
    confirmDialog('重新开始？',
      '将清空本次的全部状态：78 张牌重新随机分布、抽牌选择、按钮操作与历史记录、语法网格、以及已生成的资料。此操作不可通过撤销恢复以外的方式找回，是否继续？',
      '清空并重新开始', '取消').then(function (ok) {
        if (!ok) return;
        pushUndo();
        state.selection = [];
        state.events = [];
        state.phase = 'editing';
        state.counts = { emotion: 0, diverge: 0, converge: 0, reverse: 0, advance: 0 };
        state.lastClick = { emotion: 0, diverge: 0, converge: 0, reverse: 0, advance: 0 };
        state.flipCount = 0;
        state.grid = { size: RULES.gridDefault, cells: [] };
        state.selectedCell = null;
        state.allowDup = false;
        state.generatedAt = null;
        state.outputText = '';
        state.stale = false;
        el.allowDup.checked = false;
        el.gridSize.value = String(RULES.gridDefault);
        el.outputText.textContent = '还没有生成资料。在网格编辑完成后点击「生成解读资料」。';
        clearTimeout(chaosTimer);
        el.cardsLayer.classList.remove('is-chaotic');
        state.cards.forEach(function (c) {
          c.selected = false;
          c.drawIndex = null;
          c.faceEl.innerHTML = '';
          delete c.faceEl.dataset.filled;
          c.el.style.removeProperty('--flip-delay');
          c.el.style.removeProperty('--flip-order');
        });
        initialLayout();
        el.tableHint.hidden = false;
        ensureGridCells();
        buildGridDom();
        renderAll();
        toast('已重新开始');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  /* ============================================================
   * 12. 语法网格
   * ========================================================== */
  function buildGridSizeOptions() {
    let html = '';
    for (let n = RULES.gridMin; n <= RULES.gridMax; n++) {
      html += '<option value="' + n + '"' + (n === RULES.gridDefault ? ' selected' : '') + '>' + n + ' × ' + n + '</option>';
    }
    el.gridSize.innerHTML = html;
  }

  function ensureGridCells() {
    const need = state.grid.size * state.grid.size;
    if (state.grid.cells.length !== need) {
      state.grid.cells = new Array(need).fill(null);
    }
  }

  function hasGridContent() {
    return state.grid.cells.some(Boolean);
  }

  function buildGridDom() {
    const n = state.grid.size;
    ensureGridCells();
    el.gridBoard.style.setProperty('--n', n);
    el.gridBoard.classList.toggle('is-dense', n >= 11);
    el.gridBoard.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gcell';
        b.dataset.r = r;
        b.dataset.c = c;
        b.innerHTML = '<span class="tag"></span><span class="num"></span><span class="nm"></span>';
        b.setAttribute('aria-label', '第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列，空白');
        frag.appendChild(b);
      }
    }
    el.gridBoard.appendChild(frag);

    let cols = '';
    let rows = '';
    for (let i = 1; i <= n; i++) {
      cols += '<span>' + i + '</span>';
      rows += '<span>' + i + '</span>';
    }
    el.gridColLabels.innerHTML = cols;
    el.gridRowLabels.innerHTML = rows;
    el.gridBoard.dataset.size = String(n);
  }

  function onCellClick(r, c) {
    if (state.phase !== 'revealed') {
      toast('揭示牌面后才能编辑语法网格。');
      return;
    }
    state.selectedCell = { r: r, c: c };
    renderGrid();
    renderEditor();
  }

  function cellIndex(r, c) {
    return r * state.grid.size + c;
  }

  function selectedCellData() {
    if (!state.selectedCell) return null;
    const { r, c } = state.selectedCell;
    return { r: r, c: c, data: state.grid.cells[cellIndex(r, c)] };
  }

  function cardNameOfIndex(index) {
    if (!index || index < 1 || index > state.selection.length) return '';
    const c = cardByUid(state.selection[index - 1]);
    return c.card.name;
  }

  function cellPerson(index) {
    if (!index || index < 1 || index > state.selection.length) return '—';
    const c = cardByUid(state.selection[index - 1]);
    return c.card.name + ' · ' + DIRS[c.dir].label;
  }

  function renderGrid() {
    const n = state.grid.size;
    el.gridBoard.classList.toggle('is-dense', n >= 11);
    const cells = el.gridBoard.children;
    if (cells.length !== n * n) return;
    const a = analyzeGrid();
    const labelByKey = new Map();
    a.mains.forEach(function (m) { labelByKey.set(m.r * n + m.c, m.label); });
    a.mods.forEach(function (m) { labelByKey.set(m.r * n + m.c, m.label); });
    const size = n;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        const node = cells[i];
        const cell = state.grid.cells[i];
        const tag = node.querySelector('.tag');
        const num = node.querySelector('.num');
        const nm = node.querySelector('.nm');
        node.className = 'gcell';
        node.classList.toggle('is-active', !!state.selectedCell && state.selectedCell.r === r && state.selectedCell.c === c);
        if (!cell) {
          tag.textContent = '';
          num.textContent = '';
          nm.textContent = '';
          node.setAttribute('aria-label', '第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列，空白');
          continue;
        }
        node.classList.add(cell.type === 'main' ? 'is-main' : 'is-mod');
        tag.textContent = labelByKey.get(i) || '';
        num.textContent = cell.index ? String(cell.index) : '?';
        nm.textContent = cardNameOfIndex(cell.index);
        node.setAttribute('aria-label',
          '第 ' + (r + 1) + ' 行第 ' + (c + 1) + ' 列，' +
          (cell.type === 'main' ? '主干方块 ' + (labelByKey.get(i) || '') : '绿色修饰方块 ' + (labelByKey.get(i) || '')) +
          '，抽牌序号 ' + (cell.index || '未填写') + '，' + (cardNameOfIndex(cell.index) || ''));
      }
    }
  }

  function renderEditor() {
    const sel = selectedCellData();
    if (!sel) {
      el.gridEditor.innerHTML = '<p class="ge-empty">点击左侧网格中的任意格子开始编辑。<br><br>' +
        '主干方块（M）用于表达主要语义，从左向右阅读；绿色修饰方块（G）只通过垂直相邻构成修饰链，' +
        '并必须挂在一个主干方块的上方或下方。</p>';
      return;
    }
    const cell = sel.data;
    const type = cell ? cell.type : '';
    const index = cell ? cell.index : '';
    const options = ['<option value="">— 选择抽牌序号 —</option>'];
    for (let i = 1; i <= state.selection.length; i++) {
      const c = cardByUid(state.selection[i - 1]);
      options.push('<option value="' + i + '"' + (i === index ? ' selected' : '') + '>' +
        i + ' · ' + c.card.name + '（' + DIRS[c.dir].label + '）</option>');
    }
    const preview = cell
      ? '<b>' + (cell.type === 'main' ? '主干方块' : '绿色修饰方块') + '</b><br>' +
        (cell.index ? '抽牌序号 ' + cell.index + ' · ' + cellPerson(cell.index) : '尚未选择抽牌序号') +
        '<br>基础牌义：' + (cell.index && cell.index >= 1 && cell.index <= state.selection.length
          ? cardByUid(state.selection[cell.index - 1]).card.meaning.upright.slice(0, 46) + '…'
          : '—')
      : '当前格子为空白。选择类型后即可填写抽牌序号。';
    el.gridEditor.innerHTML =
      '<div class="ge-pos"><span>第 ' + (sel.r + 1) + ' 行 · 第 ' + (sel.c + 1) + ' 列</span><small>' +
      (cell ? (cell.type === 'main' ? '主干方块' : '绿色修饰方块') : '空白') + '</small></div>' +
      '<div class="type-switch">' +
      '<button type="button" data-celltype="" class="' + (!cell ? 'on-main' : '') + '">空白</button>' +
      '<button type="button" data-celltype="main" class="' + (type === 'main' ? 'on-main' : '') + '">主干方块</button>' +
      '<button type="button" data-celltype="mod" class="' + (type === 'mod' ? 'on-mod' : '') + '">绿色修饰</button>' +
      '</div>' +
      '<label class="ge-field">卡牌序号（本次抽牌 1–' + state.selection.length + '）' +
      '<select id="cellIndex"' + (!cell ? ' disabled' : '') + '>' + options.join('') + '</select></label>' +
      '<div class="ge-preview">' + preview + '</div>' +
      '<button type="button" class="ge-clear" data-clearcell>清空此格</button>';
  }

  function setCellType(type) {
    if (state.phase !== 'revealed' || !state.selectedCell) return;
    const { r, c } = state.selectedCell;
    const i = cellIndex(r, c);
    pushUndo();
    if (!type) {
      state.grid.cells[i] = null;
    } else {
      const prev = state.grid.cells[i];
      state.grid.cells[i] = { type: type, index: prev && prev.index ? prev.index : firstFreeIndex(i) };
    }
    afterGridChange();
  }

  function setCellIndex(index) {
    if (state.phase !== 'revealed' || !state.selectedCell) return;
    const i = cellIndex(state.selectedCell.r, state.selectedCell.c);
    if (!state.grid.cells[i]) return;
    pushUndo();
    state.grid.cells[i].index = index;
    afterGridChange();
  }

  function firstFreeIndex(exceptIndex) {
    const used = new Set();
    state.grid.cells.forEach(function (cell, i) {
      if (cell && cell.index && i !== exceptIndex) used.add(cell.index);
    });
    for (let i = 1; i <= state.selection.length; i++) {
      if (!used.has(i)) return i;
    }
    return 1;
  }

  function afterGridChange() {
    renderGrid();
    renderEditor();
    validateNow();
    markStale();
    updateStage();
  }

  /* ---------- 网格分析 ---------- */
  function analyzeGrid() {
    const size = state.grid.size;
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = state.grid.cells[r * size + c];
        if (cell) cells.push({ r: r, c: c, type: cell.type, index: cell.index, key: r * size + c });
      }
    }
    const mains = cells.filter(function (x) { return x.type === 'main'; });
    const mods = cells.filter(function (x) { return x.type === 'mod'; });

    const sortedMains = mains.slice().sort(function (a, b) { return a.c - b.c || a.r - b.r; });
    const sortedMods = mods.slice().sort(function (a, b) { return a.c - b.c || a.r - b.r; });
    sortedMains.forEach(function (m, i) { m.label = 'M' + (i + 1); });
    sortedMods.forEach(function (m, i) { m.label = 'G' + (i + 1); });

    const isMain = function (r, c) {
      return r >= 0 && r < size && c >= 0 && c < size && !!state.grid.cells[r * size + c] && state.grid.cells[r * size + c].type === 'main';
    };
    const isMod = function (r, c) {
      return r >= 0 && r < size && c >= 0 && c < size && !!state.grid.cells[r * size + c] && state.grid.cells[r * size + c].type === 'mod';
    };
    const byKey = new Map(cells.map(function (x) { return [x.key, x]; }));

    /* 连接关系 */
    const connections = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        const dr = b.r - a.r;
        const dc = b.c - a.c;
        const adr = Math.abs(dr);
        const adc = Math.abs(dc);
        if (adr > 1 || adc > 1) continue;
        if (adr === 1 && dc === 0) {
          if (a.type === 'main' && b.type === 'main') continue; /* 违规，不记为连接 */
          connections.push({ kind: a.type === b.type ? 'vertical-chain' : 'vertical-attach', a: a, b: b });
        } else if (dr === 0 && adc === 1) {
          if (a.type === 'main' && b.type === 'main') {
            connections.push({ kind: 'horizontal', a: a, b: b });
          }
        } else if (adr === 1 && adc === 1) {
          if (a.type === 'main' && b.type === 'main') {
            connections.push({ kind: 'diagonal', a: a, b: b });
          }
        }
      }
    }

    /* 绿色修饰链（按列扫描连续绿色段） */
    const chains = [];
    for (let c = 0; c < size; c++) {
      let r = 0;
      while (r < size) {
        if (isMod(r, c)) {
          const start = r;
          while (r < size && isMod(r, c)) r++;
          const end = r - 1;
          const aboveMain = start > 0 && isMain(start - 1, c) ? byKey.get((start - 1) * size + c) : null;
          const belowMain = end < size - 1 && isMain(end + 1, c) ? byKey.get((end + 1) * size + c) : null;
          const chainCells = [];
          for (let rr = start; rr <= end; rr++) chainCells.push(byKey.get(rr * size + c));
          const chain = {
            c: c, start: start, end: end, cells: chainCells,
            aboveMain: aboveMain, belowMain: belowMain, attachments: []
          };
          if (aboveMain) {
            chain.attachments.push({
              type: 'below',            /* 链位于该主干的下方 */
              main: aboveMain,
              order: chainCells.slice().reverse().concat([aboveMain]),
              direction: 'bottom-up',
              directionText: '自最下方朝主干向上'
            });
          }
          if (belowMain) {
            chain.attachments.push({
              type: 'above',            /* 链位于该主干的上方 */
              main: belowMain,
              order: chainCells.concat([belowMain]),
              direction: 'top-down',
              directionText: '自最上方朝主干向下'
            });
          }
          chains.push(chain);
        } else {
          r++;
        }
      }
    }
    chains.forEach(function (ch, i) { ch.label = 'C' + (i + 1); });

    const paths = computeMainPaths(sortedMains, size);

    return {
      size: size, cells: cells, mains: sortedMains, mods: sortedMods,
      connections: connections, chains: chains, paths: paths,
      byKey: byKey
    };
  }

  function mainAdjacent(a, b) {
    const dr = Math.abs(a.r - b.r);
    const dc = Math.abs(a.c - b.c);
    return (dr === 0 && dc === 1) || (dr === 1 && dc === 1);
  }

  function computeMainPaths(mains, size) {
    if (!mains.length) return { paths: [], count: 0, linear: false, roots: [] };
    const allowed = mainAdjacent;
    const roots = mains.filter(function (m) {
      return !mains.some(function (o) { return o !== m && allowed(m, o) && o.c < m.c; });
    });
    const rootList = (roots.length ? roots : [mains.slice().sort(function (a, b) { return a.c - b.c || a.r - b.r; })[0]])
      .slice().sort(function (a, b) { return a.c - b.c || a.r - b.r; });
    const all = [];
    const seen = new Set();
    const visit = function (node, path) {
      const next = mains.filter(function (o) {
        return o !== node && allowed(node, o) && o.c > node.c && path.indexOf(o) < 0;
      }).sort(function (a, b) { return a.c - b.c || a.r - b.r; });
      if (!next.length) {
        const key = path.map(function (m) { return m.label; }).join('>');
        if (!seen.has(key) && path.length) { seen.add(key); all.push(path.slice()); }
        return;
      }
      next.forEach(function (o) {
        path.push(o);
        visit(o, path);
        path.pop();
      });
    };
    rootList.forEach(function (r) { visit(r, [r]); });
    const paths = all.slice(0, 24);
    return { paths: paths, count: all.length, linear: all.length === 1, roots: rootList };
  }

  function cellCoord(cell) {
    return '第' + (cell.r + 1) + '行第' + (cell.c + 1) + '列';
  }

  function cellRef(cell) {
    return (cell.label || '') + '（' + cellCoord(cell) + '）';
  }

  function mainComponents(mains) {
    if (!mains.length) return [];
    const seen = new Set();
    const comps = [];
    mains.forEach(function (start) {
      const key = start.r + ',' + start.c;
      if (seen.has(key)) return;
      const comp = [];
      const stack = [start];
      seen.add(key);
      while (stack.length) {
        const node = stack.pop();
        comp.push(node);
        mains.forEach(function (o) {
          const k = o.r + ',' + o.c;
          if (seen.has(k)) return;
          if (mainAdjacent(node, o)) { seen.add(k); stack.push(o); }
        });
      }
      comps.push(comp);
    });
    return comps;
  }

  function validateGrid() {
    const a = analyzeGrid();
    const errors = [];
    const cells = a.cells;
    if (!cells.length) {
      return { errors: ['网格为空：请至少放置一个主干方块。'], analysis: a };
    }
    if (!a.mains.length) errors.push('至少需要一个主干方块（当前只有绿色修饰方块）。');

    cells.forEach(function (cell) {
      const typeLabel = cell.type === 'main' ? '主干方块' : '绿色修饰方块';
      const ref = cell.label ? cell.label + '（' + cellCoord(cell) + '）' : cellCoord(cell);
      if (!cell.index) {
        errors.push(ref + '的' + typeLabel + '未填写抽牌序号。');
      } else if (cell.index < 1 || cell.index > state.selection.length) {
        errors.push(ref + '的抽牌序号「' + cell.index + '」超出本次抽牌范围（1–' + state.selection.length + '）。');
      }
    });

    /* 主干不能直接上下相邻 */
    for (let i = 0; i < a.mains.length; i++) {
      for (let j = i + 1; j < a.mains.length; j++) {
        const x = a.mains[i];
        const y = a.mains[j];
        if (Math.abs(x.r - y.r) === 1 && x.c === y.c) {
          errors.push(x.label + '（' + cellCoord(x) + '）与' + y.label + '（' + cellCoord(y) + '）上下直接相邻：主干方块不能垂直相邻，只能水平或斜向相连。');
        }
      }
    }

    /* 主干连通性 */
    if (a.mains.length > 1) {
      const comps = mainComponents(a.mains);
      if (comps.length > 1) {
        errors.push('主干方块未形成单一连通结构，存在 ' + comps.length + ' 个互不相连的部分：' +
          comps.map(function (comp, i) {
            return '第' + (i + 1) + '部分（' + comp.map(function (m) { return m.label + ' ' + cellCoord(m); }).join('、') + '）';
          }).join('；') + '。');
      }
    }

    /* 绿色方块斜向相邻 */
    for (let i = 0; i < a.mods.length; i++) {
      for (let j = i + 1; j < a.mods.length; j++) {
        const x = a.mods[i];
        const y = a.mods[j];
        if (Math.abs(x.r - y.r) === 1 && Math.abs(x.c - y.c) === 1) {
          errors.push(x.label + '（' + cellCoord(x) + '）与' + y.label + '（' + cellCoord(y) + '）斜向相邻：绿色修饰方块只能通过垂直相邻构成修饰链。');
        }
      }
    }

    /* 修饰链是否挂接主干 */
    a.chains.forEach(function (ch) {
      if (!ch.aboveMain && !ch.belowMain) {
        errors.push('第' + (ch.start + 1) + '–' + (ch.end + 1) + '行、第' + (ch.c + 1) + '列的绿色修饰链（' +
          ch.cells.map(function (x) { return x.label; }).join('、') + '）没有连接到任何主干方块。');
      }
    });

    /* 重复引用 */
    if (!state.allowDup) {
      const map = new Map();
      cells.forEach(function (cell) {
        if (!cell.index) return;
        if (!map.has(cell.index)) map.set(cell.index, []);
        map.get(cell.index).push(cell);
      });
      map.forEach(function (list, index) {
        if (list.length > 1) {
          errors.push('抽牌序号 ' + index + '（' + cardNameOfIndex(index) + '）被 ' + list.length +
            ' 个方块重复引用：' + list.map(function (c) { return c.label + ' ' + cellCoord(c); }).join('、') + '。');
        }
      });
    }

    return { errors: errors, analysis: a };
  }

  function validateNow() {
    const res = validateGrid();
    const errors = res.errors;
    const a = res.analysis;
    el.gridErrors.innerHTML = a.cells.length ? errors.map(function (e) { return '<li>' + e + '</li>'; }).join('') : '';
    if (!a.cells.length) {
      el.gridOk.textContent = '网格为空：至少放置一个主干方块。';
      el.gridOk.classList.add('is-bad');
    } else if (errors.length) {
      el.gridOk.textContent = '发现 ' + errors.length + ' 个结构问题（不会被自动修正）：';
      el.gridOk.classList.add('is-bad');
    } else {
      const chainCount = a.chains.length;
      const mainText = a.mains.length + ' 个主干方块' + (a.paths.count > 1 ? '（' + a.paths.count + ' 条阅读分支）' : '');
      el.gridOk.textContent = '结构校验通过：' + mainText + '，' + chainCount + ' 条绿色修饰链，全部序号有效。';
      el.gridOk.classList.remove('is-bad');
    }
    return errors;
  }

  /* ============================================================
   * 13. 牌义弹层
   * ========================================================== */
  function openCardDetail(c) {
    const dir = DIRS[c.dir];
    let gridUse = '未使用';
    const refs = [];
    state.grid.cells.forEach(function (cell, i) {
      if (!cell || cell.index !== c.drawIndex) return;
      const size = state.grid.size;
      refs.push((cell.type === 'main' ? '主干 ' : '修饰 ') + '第' + (Math.floor(i / size) + 1) + '行第' + (i % size + 1) + '列');
    });
    if (refs.length) gridUse = refs.join('、');
    el.cardModalArt.innerHTML = ART.face(c.card);
    el.cardModalInfo.innerHTML =
      '<div class="cm-en">' + c.card.en + ' · ' + c.card.id + '</div>' +
      '<h3 id="cardModalTitle">' + c.card.name + '</h3>' +
      '<div class="cm-row"><span class="cm-dir">' + dir.label + ' · ' + dir.angle + '</span></div>' +
      '<div class="cm-row"><b>方向语义：</b>' + dir.sem + '</div>' +
      '<div class="cm-row"><b>基础关键词：</b>' + c.card.keywords.upright.join(' / ') + '</div>' +
      '<div class="cm-row"><b>基础牌义：</b>' + c.card.meaning.upright + '</div>' +
      '<div class="cm-row"><b>抽牌序号：</b>' + c.drawIndex + ' / ' + state.selection.length + '</div>' +
      '<div class="cm-row"><b>网格使用：</b>' + gridUse + '</div>' +
      '<div class="cm-row"><b>桌布坐标：</b>x=' + (c.x / SPACE).toFixed(3) + ', y=' + (c.y / SPACE).toFixed(3) + '</div>';
    openModal(el.cardModal);
  }

  /* ============================================================
   * 14. 导出：文字
   * ========================================================== */
  function buildExportText() {
    const a = analyzeGrid();
    const errors = validateGrid().errors;
    const q = el.question.value.trim();
    const out = [];
    const push = function () {
      for (let i = 0; i < arguments.length; i++) out.push(arguments[i]);
    };

    push('════════════ 空间塔罗 · 思维语法系统 · 解读资料 ════════════');
    push('生成时间：' + stamp() + '（本地时间）');
    push('规则版本：' + RULES.version);
    push('卡牌来源：标准塔罗 78 张（大阿卡纳 22 + 小阿卡纳 56），牌面由程序生成。');
    push('');

    push('【一】用户原始问题');
    push(q || '（用户未填写问题）');
    push('');

    push('【二】补充信息（用户自行填写，未填则留空）');
    push('预测对象：' + (el.extraSubject.value.trim() || '（未填写）'));
    push('关注时间范围：' + (el.extraRange.value.trim() || '（未填写）'));
    push('补充背景：' + (el.extraContext.value.trim() || '（未填写）'));
    push('');

    push('【三】系统规则说明');
    push('3.0 洗牌与初始随机分布（随机化机制，不参与解读）');
    push('- 本系统的「洗牌」等价于初始化时 78 张牌在桌布上的随机分布；它只决定用户点击时遇到哪张牌，属于随机化机制，不承载象征意义。');
    push('- 洗牌过程、初始分布以及卡牌在桌布上的坐标都不参与解读。');
    push('- 解读只依据：用户问题与补充信息、五个思维操作的操作历史、用户实际点击顺序（抽牌顺序）、每张牌被冻结时的最终方向、以及用户在语法网格中构造的结构。');
    push('- 因此不要把牌与牌的距离、聚集程度、位置远近或初始分布当作征兆，也不要据此推断吉凶。');
    push('3.1 卡牌四向语义（方向是解释时必须遵守的语义属性，不是单纯视觉旋转）');
    push('- 正向（upright，0°）：保留该牌的基础寓意。');
    push('- 逆向（reversed，180°）：该牌基础寓意朝相反方向解释。');
    push('- 向内（inward，270°，即逆时针 90°）：向内回溯、内在化、尚未显化。');
    push('- 向外（outward，90°，即顺时针 90°）：推进、显化、能量向外作用。');
    push('  向内、向外不是普通逆位，不能直接解释为基础牌义的反面；具体含义仍需结合牌义与整体结构。');
    push('  程序内部以离散状态保存四向，不以任意角度表示语义。');
    push('3.2 五个思维操作按钮');
    push('- 心绪／欲求：以点击节奏与累积次数表达当下心情与欲求，驱动全部 78 张牌在整块桌布内做大幅度随机位移与频繁的离散方向变化；节奏越快，混沌运动越强（单次位移上限受控），牌会被甩到桌布的不同区域。');
    push('- 发散／探索：全部牌彼此排斥，靠得越近排斥越强，使可能性展开、差异显现；不表示现实中已经发生冲突。');
    push('- 皈依／实在：全部牌彼此吸引，形成局部聚集，把抽象可能性收束为具体结构；吸引不必然代表积极结果。');
    push('- 反转／否定：每次点击令全部 78 张牌的方向整体反转 180°，并记录本次的语义模式（三选一）。');
    push('- 推进／演化：沿桌布上标示的「时间推进」方向（从左向右）产生共同位移，表达对过程与阶段变化的关注；它不会把牌的方向改成向外，也不代表事情一定顺利。');
    push('3.3 心绪／欲求：点击速度与累积次数规则');
    push('- 快速：与上一次点击的间隔小于 ' + RULES.fastMs + ' 毫秒。');
    push('- 中速：间隔 ' + RULES.fastMs + '–' + RULES.slowMs + ' 毫秒。');
    push('- 缓慢：间隔大于 ' + RULES.slowMs + ' 毫秒。');
    push('- 第一次点击没有可比较的间隔，使用默认基础强度 ' + RULES.defaultIntensity.toFixed(2) + '，并同样乘以累积系数（0.72–1.00）。');
    push('- 累积点击次数对运动强度产生有限影响（系数 0.72–1.00），不会无限增长，也不会让牌面失控。');
    push('- 位移是全局的：每张牌会被甩向桌布任意方向，多次快速点击会让整副牌在大范围内重新分布；接近边界时按镜面反射折回，牌不会越出桌布。');
    push('- 卡牌碰撞体积很小（只保留刚好完全重叠的最小间隔），允许牌在混沌运动中自然叠放，但不会完全重合。');
    push('- 点击节奏与次数只是预测者主动输入的象征性表达，不构成心理诊断，也不直接代表预测结果的好坏。');
    push('3.4 发散／探索：排斥运动规则');
    push('- 计算牌与牌之间的距离，距离越近排斥越强，所有 78 张牌共同参与。');
    push('- 位移后有边界约束与最小间距约束，牌不会越出桌布，也不会永久重叠到无法选择。');
    push('- 可引发有限的方向变化；排斥只表示展开与区分，不表示现实冲突。');
    push('3.5 皈依／实在：吸引运动规则');
    push('- 全部牌向局部聚集中心靠近，形成若干局部聚集，所有牌共同参与。');
    push('- 存在最小间距与防重叠机制，牌不会被压缩到同一点。');
    push('- 可引发有限的方向变化；吸引可能意味着联系，也可能意味着依赖、束缚或过度聚合。');
    push('3.6 反转／否定：三种语义模式');
    push('- 模式 A 反向探索：探索某个方向的相反可能性，纳入相反发展方向的考察；不是直接把最终答案判定为相反结果。');
    push('- 模式 B 否定质疑：质疑已有判断或未经证实的前提，重新检视假设是否成立；不删除原始问题，也不机械改写问题文本。');
    push('- 模式 C 转折转向：在操作过程中引入转折点，关注趋势是否发生阶段转换；程序记录转折发生的操作序号，前後操作按时间顺序比较。多次使用该模式时分别记录，不合并为一个转折。');
    push('  选择模式只决定本次操作的语义标签，不会取消全局翻转效果。');
    push('3.7 全局翻转算法');
    push('- 正向 ↔ 逆向；向内 ↔ 向外。');
    push('- 视觉角度：0° ↔ 180°；90° ↔ 270°。');
    push('- 每次点击反转按钮，全部 78 张牌的方向状态整体反转 180°，空间坐标不变。');
    push('- 反转两次后方向回到反转前的状态，但两次操作都完整保留在操作历史中。');
    push('3.8 反转历史与单张牌最终牌义的区别');
    push('- 单张牌的最终方向用于解释该牌本身。');
    push('- 反转操作历史用于理解用户希望采用的视角、质疑或转折框架。');
    push('- 不会因为用户点击过反转按钮，就在单张牌的最终方向之外再对牌义取反一次，避免重复反转。');
    push('3.9 推进／演化');
    push('- 桌布上以「时间推进」箭头标示从左向右的时间方向。');
    push('- 每次点击让全部牌沿该方向产生有限位移，不同牌位移量略有差异，并保留空间分布。');
    push('- 位移在接近桌布右边界时自动衰减，避免牌群整体挤在最右侧。');
    push('- 推进与反转相互独立：推进表达过程展开，反转表达方向逆转、否定或转折意图。');
    push('3.10 主干方块（M，棕黄色）规则');
    push('- 主干方块表达主要语义，主要阅读方向为从左向右。');
    push('- 主干方块可以水平相邻，也可以斜向相邻。');
    push('- 主干方块不能直接上下相邻。');
    push('- 所有主干方块必须通过允许的连接方式形成一个连通结构；允许出现分支，分支不会被压缩成线性句子。');
    push('- 每个主干方块都必须填写一个有效的抽牌序号（本次抽牌的第几张牌）。');
    push('3.11 绿色修饰方块（G）规则');
    push('- 绿色方块用于修饰、补充、限定或改变主干语句的解释。');
    push('- 绿色方块只能通过垂直相邻构成修饰链，不能通过斜向相邻建立连接。');
    push('- 每条修饰链必须与一个或多个明确的主干方块垂直关联，不允许存在与主干断开的孤立修饰链。');
    push('- 每个绿色方块都必须填写有效的抽牌序号。');
    push('3.12 修饰链阅读规则');
    push('- 上方修饰链：从最上方开始，按从上到下的顺序读取，最终朝向主干（… → G2 → G1 → M）。');
    push('- 下方修饰链：从最下方开始，按从下到上的顺序读取，最终朝向主干（… → G4 → G3 → M）。');
    push('- 上下同时存在修饰链：可能表示权衡、双重限定、相互补充、不同方向的影响或潜在张力；程序不预设上下哪一侧为正或为负，也不自动判定冲突。');
    push('');

    push('【四】操作历史（按发生顺序，共 ' + state.events.length + ' 次）');
    if (!state.events.length) {
      push('本次没有任何思维操作。');
    } else {
      const counts = OP_LABELS;
      push('按按钮统计：' + Object.keys(state.counts).map(function (k) {
        return counts[k] + ' ' + state.counts[k] + ' 次';
      }).join('；') + '。');
      push('');
      state.events.forEach(function (ev) {
        let head = '事件' + ev.seq + '｜' + OP_LABELS[ev.type];
        if (ev.type === 'emotion') {
          head += '｜速度：' + SPEED_LABELS[ev.speed] +
            (ev.intervalMs != null ? '（与上次间隔 ' + ev.intervalMs + ' ms）' : '（首次点击）') +
            '｜混沌强度：' + ev.intensity.toFixed(2) +
            '｜该按钮累计：' + ev.clickCountType + ' 次';
        } else if (ev.type === 'reverse') {
          head += '｜模式：' + REVERSE_MODES[ev.mode].label +
            '｜累计反转：' + ev.flipCount + ' 次' +
            (ev.mode === 'turn' ? '｜转折标记：事件' + ev.seq : '');
        } else {
          head += '｜该按钮累计：' + ev.clickCountType + ' 次' +
            (ev.intervalMs != null ? '｜与上次间隔 ' + ev.intervalMs + ' ms' : '');
        }
        head += '｜累计操作：' + ev.clickCountTotal + ' 次';
        push(head);
        push('  方向状态：' + digestText(ev.dirBefore) + ' → ' + digestText(ev.dirAfter) + '（正向 / 逆向 / 向内 / 向外）');
      });

      const reverses = state.events.filter(function (e) { return e.type === 'reverse'; });
      if (reverses.length) {
        push('');
        push('反转操作明细（每次反转独立记录，不合并）：');
        reverses.forEach(function (ev, i) {
          push('- 第 ' + (i + 1) + ' 次反转：事件' + ev.seq + '，模式「' + REVERSE_MODES[ev.mode].label + '」，' +
            '翻转前 ' + digestText(ev.dirBefore) + '，翻转后 ' + digestText(ev.dirAfter) + '，累计反转 ' + ev.flipCount + ' 次。');
        });
        const turns = reverses.filter(function (e) { return e.mode === 'turn'; });
        if (turns.length) {
          push('转折标记：' + turns.map(function (e) { return '事件' + e.seq; }).join('、') +
            '（模式为「转折转向」；其后的操作发生在这些转折标记之后）。');
        }
      }
      const advances = state.events.filter(function (e) { return e.type === 'advance'; });
      if (advances.length) {
        push('');
        push('推进／演化操作位置：' + advances.map(function (e) { return '事件' + e.seq; }).join('、') + '。');
      }
      const speeds = state.events.filter(function (e) { return e.type === 'emotion'; })
        .map(function (e) { return e.speed; });
      if (speeds.length) {
        const fast = speeds.filter(function (s) { return s === 'fast'; }).length;
        const mid = speeds.filter(function (s) { return s === 'medium'; }).length;
        const slow = speeds.filter(function (s) { return s === 'slow'; }).length;
        const first = speeds.filter(function (s) { return s === 'first'; }).length;
        push('心绪／欲求节奏分布：快速 ' + fast + ' 次、中速 ' + mid + ' 次、缓慢 ' + slow + ' 次' +
          (first ? '、首次 ' + first + ' 次' : '') + '。');
      }
    }
    push('');

    push('【五】本次抽牌清单（按实际点击顺序，共 ' + state.selection.length + ' 张）');
    push('（说明：卡牌在桌布上的位置由初始随机分布决定，属于随机化背景，不参与解读；以下只记录点击顺序、最终方向、基础牌义与网格使用情况。）');
    if (!state.selection.length) {
      push('（没有抽取任何卡牌）');
    } else {
      state.selection.forEach(function (uid, i) {
        const c = cardByUid(uid);
        const dir = DIRS[c.dir];
        push((i + 1) + '. ' + c.card.name + '（' + c.card.en + '）');
        push('   卡牌唯一ID：' + c.card.id + '（牌堆序号 ' + (c.uid + 1) + '）');
        push('   基础关键词：' + c.card.keywords.upright.join(' / '));
        push('   基础牌义：' + (c.card.meaning && c.card.meaning.upright ? c.card.meaning.upright : '牌库未提供'));
        push('   最终方向：' + dir.label + '（' + dir.angle + '）—— ' + dir.sem + '。');
        push('   方向说明：先保留上列基础牌义，再结合实际方向理解；方向不改变牌名与牌库数据。');
        const uses = [];
        state.grid.cells.forEach(function (cell, idx) {
          if (!cell || cell.index !== (i + 1)) return;
          const size = state.grid.size;
          uses.push((cell.type === 'main' ? '主干方块' : '绿色修饰方块') + '（第' + (Math.floor(idx / size) + 1) + '行第' + (idx % size + 1) + '列）');
        });
        push('   网格中的使用情况：' + (uses.length ? uses.join('、') : '未使用'));
        push('');
      });
    }

    push('【六】自定义语法网格结构');
    push('网格尺寸：' + a.size + ' × ' + a.size);
    push('坐标规则：行号从上往下递增（第 1 行为最上方），列号从左往右递增（第 1 列为最左方）。');
    push('');
    if (!a.cells.length) {
      push('（网格为空）');
    } else {
      push('主干方块（M）：');
      a.mains.forEach(function (m) {
        push(m.label + '：' + cellCoord(m) + '，抽牌序号 ' + (m.index || '未填写') +
          '（' + (cardNameOfIndex(m.index) || '无效序号') + '，' + (m.index && m.index <= state.selection.length ? DIRS[cardByUid(state.selection[m.index - 1]).dir].label : '—') + '）。');
      });
      push('');
      push('修饰方块（G）：');
      if (!a.mods.length) {
        push('（无绿色修饰方块）');
      } else {
        a.mods.forEach(function (m) {
          const chain = a.chains.filter(function (ch) {
            return ch.cells.some(function (x) { return x.key === m.key; });
          })[0];
          push(m.label + '：' + cellCoord(m) + '，抽牌序号 ' + (m.index || '未填写') +
            '（' + (cardNameOfIndex(m.index) || '无效序号') + '），所在修饰链：' + (chain ? chain.label : '—') + '。');
        });
      }
      push('');
      push('连接关系：');
      if (!a.connections.length) {
        push('（没有已建立的连接关系）');
      } else {
        a.connections.forEach(function (cn) {
          const kindText = cn.kind === 'horizontal' ? '水平相连' :
            cn.kind === 'diagonal' ? '斜向相连' :
              cn.kind === 'vertical-attach' ? '垂直相连（修饰链与主干）' : '垂直相连（同一修饰链内）';
          const x = cn.a.label || '';
          const y = cn.b.label || '';
          push('- ' + x + '（' + cellCoord(cn.a) + '）与 ' + y + '（' + cellCoord(cn.b) + '）' + kindText + '。');
        });
      }
      push('');
      push('修饰链与读取顺序：');
      if (!a.chains.length) {
        push('（无修饰链）');
      } else {
        a.chains.forEach(function (ch) {
          push(ch.label + '：第' + (ch.start + 1) + '–' + (ch.end + 1) + '行、第' + (ch.c + 1) + '列，共 ' + ch.cells.length + ' 格。');
          ch.attachments.forEach(function (at) {
            push('  - ' + (at.type === 'above' ? '上方修饰链' : '下方修饰链') + '，关联 ' + cellRef(at.main) +
              '，读取方向：' + at.directionText + '，读取顺序：' + at.order.map(function (x) { return x.label; }).join(' → ') + '。');
          });
          if (ch.aboveMain && ch.belowMain) {
            push('  - 该修饰链同时位于 ' + cellRef(ch.aboveMain) + ' 下方与 ' + cellRef(ch.belowMain) +
              ' 上方，连接两个主干方块（可能表示权衡、双重限定、相互补充或潜在冲突，由解读方判断，程序不预设结论）。');
          }
        });
        const doubleSide = [];
        a.mains.forEach(function (m) {
          const above = a.chains.filter(function (ch) { return ch.belowMain && ch.belowMain.key === m.key; });
          const below = a.chains.filter(function (ch) { return ch.aboveMain && ch.aboveMain.key === m.key; });
          if (above.length && below.length) {
            doubleSide.push(m.label + '（' + cellCoord(m) + '）上方修饰链 ' + above.map(function (c) { return c.label; }).join('、') +
              ' 与下方修饰链 ' + below.map(function (c) { return c.label; }).join('、') + ' 同时存在');
          }
        });
        if (doubleSide.length) {
          push('');
          push('双侧修饰：' + doubleSide.join('；') + '。');
        }
      }
      push('');
      push('主干阅读顺序：');
      if (!a.mains.length) {
        push('（无主干方块）');
      } else if (!a.paths.paths.length) {
        push('（无法计算阅读顺序：主干结构存在问题）');
      } else if (a.paths.linear) {
        push('- 主干为单一线性结构：' + a.paths.paths[0].map(function (m) { return m.label; }).join(' → ') + '。');
      } else {
        a.paths.paths.forEach(function (p, i) {
          push('- 主干分支路径 ' + (i + 1) + '：' + p.map(function (m) { return m.label; }).join(' → ') + '。');
        });
        if (a.paths.count > a.paths.paths.length) {
          push('- （阅读路径超过 ' + a.paths.paths.length + ' 条，仅列出前 ' + a.paths.paths.length + ' 条）');
        }
      }
      push('');
      push('网格校验：' + (errors.length ? '未通过，发现 ' + errors.length + ' 个问题：' : '全部通过。'));
      errors.forEach(function (e) { push('  - ' + e); });
    }
    push('');

    push('【七】资料完整性说明');
    push('- 本资料全部读取自程序当前真实状态，没有使用任何示例数据。');
    push('- 本次抽取 ' + state.selection.length + ' 张牌，牌名与基础牌义来自同一套 78 张卡牌数据模型。');
    push('- 方向、操作历史、网格结构与校验结果均来自当前状态。');
    push('- 洗牌与初始随机分布已标记为随机化背景，未写入任何解读依据；桌布坐标不参与解读。');
    push('- 缺失项：无。');
    push('');

    push('【八】给外部 AI 的解读指导（固定指令）');
    push(AI_GUIDE);

    return out.join('\n');
  }

  function generateOutput() {
    const errors = validateGrid().errors;
    const run = function () {
      state.outputText = buildExportText();
      state.generatedAt = new Date();
      state.stale = false;
      el.outputText.textContent = state.outputText;
      el.copyBtn.disabled = false;
      el.pngBtn.disabled = false;
      el.jsonBtn.disabled = false;
      updateSections();
      updateStage();
      toast('解读资料已生成（' + state.outputText.length + ' 字）。');
      el.exportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (errors.length) {
      confirmDialog('网格存在 ' + errors.length + ' 个结构问题',
        '当前网格未通过校验。仍然可以生成资料，资料中会明确标注结构问题，不会自动修改你的结构。是否继续生成？',
        '仍然生成', '取消').then(function (ok) { if (ok) run(); });
    } else {
      run();
    }
  }

  function copyOutput() {
    const text = el.outputText.textContent;
    if (!text || !state.generatedAt) { toast('请先生成解读资料。'); return; }
    const fallback = function () {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) {
        toast('已复制全部文字（' + text.length + ' 字）');
      } else {
        try {
          const range = document.createRange();
          range.selectNodeContents(el.outputText);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) { /* ignore */ }
        toast('浏览器拒绝了自动复制，已为你选中全部文字，请按 Ctrl / ⌘ + C 复制。');
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('已复制全部文字（' + text.length + ' 字）');
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  /* ============================================================
   * 15. 导出：PNG
   * ========================================================== */
  function wrapText(ctx, text, maxWidth) {
    const chars = String(text).split('');
    const lines = [];
    let line = '';
    chars.forEach(function (ch) {
      if (ch === '\n') { lines.push(line); line = ''; return; }
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function ellipsis(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
    return s + '…';
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buildGridCanvas() {
    const a = analyzeGrid();
    const n = state.grid.size;
    const W = 1600;
    const padX = 56;
    const rightW = 470;
    const gap = 8;
    const gridArea = W - padX * 2 - rightW;
    const cell = Math.max(56, Math.floor((gridArea - (n - 1) * gap) / n));
    const gridH = n * cell + (n - 1) * gap;
    const gridTop = 236;
    const H = Math.max(940, gridTop + gridH + 120);
    const dpr = 2;

    const cv = document.createElement('canvas');
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.textBaseline = 'top';

    /* 背景 */
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#100c20');
    bg.addColorStop(0.55, '#0a0716');
    bg.addColorStop(1, '#07050e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* 装饰圆 */
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(W * 0.78, H * 0.22, 90 + i * 46, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(226,193,124,' + (0.05 - i * 0.008) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* 边框 */
    ctx.strokeStyle = 'rgba(226,193,124,0.28)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 18, 18, W - 36, H - 36, 18);
    ctx.stroke();

    /* 标题 */
    ctx.fillStyle = '#f3dfa9';
    ctx.font = '600 34px "Songti SC","STSong","SimSun",serif';
    ctx.fillText('空间塔罗 · 语法网格', padX, 52);
    ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(226,193,124,0.72)';
    ctx.fillText('规则版本 ' + RULES.version + '　·　生成于 ' + stamp(), padX, 100);

    /* 问题 */
    const q = el.question.value.trim() || '（用户未填写问题）';
    ctx.font = '15px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(239,231,212,0.9)';
    const qLines = wrapText(ctx, '问题：' + q, gridArea).slice(0, 3);
    qLines.forEach(function (line, i) {
      ctx.fillText(line, padX, 132 + i * 24);
    });

    /* 列号 / 行号 */
    const x0 = padX;
    const y0 = gridTop;
    ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(156,147,178,0.9)';
    ctx.textAlign = 'center';
    for (let c = 0; c < n; c++) {
      ctx.fillText(String(c + 1), x0 + c * (cell + gap) + cell / 2, y0 - 20);
    }
    ctx.textAlign = 'right';
    for (let r = 0; r < n; r++) {
      ctx.textBaseline = 'middle';
      ctx.fillText(String(r + 1), x0 - 14, y0 + r * (cell + gap) + cell / 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    /* 格子 */
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const x = x0 + c * (cell + gap);
        const y = y0 + r * (cell + gap);
        const data = state.grid.cells[r * n + c];
        roundRect(ctx, x, y, cell, cell, 9);
        if (!data) {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.09)';
          ctx.lineWidth = 1;
          ctx.stroke();
          continue;
        }
        const isMain = data.type === 'main';
        const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
        if (isMain) {
          grad.addColorStop(0, 'rgba(192,138,69,0.55)');
          grad.addColorStop(1, 'rgba(120,78,32,0.42)');
        } else {
          grad.addColorStop(0, 'rgba(95,156,109,0.55)');
          grad.addColorStop(1, 'rgba(48,94,60,0.42)');
        }
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = isMain ? 'rgba(226,174,102,0.9)' : 'rgba(130,206,150,0.9)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        const label = isMain
          ? a.mains.filter(function (m) { return m.r === r && m.c === c; })[0].label
          : a.mods.filter(function (m) { return m.r === r && m.c === c; })[0].label;
        ctx.fillStyle = isMain ? 'rgba(255,225,180,0.85)' : 'rgba(206,246,214,0.85)';
        ctx.font = '10px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(label, x + 7, y + 7);

        ctx.fillStyle = '#fff2d8';
        ctx.font = '600 ' + Math.round(cell * 0.28) + 'px "Songti SC","STSong","SimSun",serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(data.index || '?'), x + cell / 2, y + cell * 0.48);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        if (data.index && data.index <= state.selection.length) {
          const c2 = cardByUid(state.selection[data.index - 1]);
          ctx.fillStyle = 'rgba(255,255,255,0.78)';
          ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ellipsis(ctx, c2.card.name, cell - 14), x + cell / 2, y + cell * 0.74);
          ctx.textAlign = 'left';
        }
      }
    }

    /* 右侧信息栏 */
    let rx = padX + gridArea + 48;
    let ry = gridTop - 20;
    ctx.fillStyle = '#f3dfa9';
    ctx.font = '600 17px "Songti SC","STSong","SimSun",serif';
    ctx.fillText('图例', rx, ry);
    ry += 30;
    const legend = [
      { color: 'rgba(192,138,69,0.85)', border: 'rgba(226,174,102,0.95)', text: '主干方块 M（从左向右阅读）' },
      { color: 'rgba(95,156,109,0.85)', border: 'rgba(130,206,150,0.95)', text: '绿色修饰方块 G（垂直修饰链）' },
      { color: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)', text: '空白格子' }
    ];
    legend.forEach(function (lg) {
      ctx.beginPath();
      ctx.rect(rx, ry, 15, 15);
      ctx.fillStyle = lg.color;
      ctx.fill();
      ctx.strokeStyle = lg.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(239,231,212,0.82)';
      ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText(lg.text, rx + 24, ry + 2);
      ry += 26;
    });

    ry += 16;
    ctx.fillStyle = '#f3dfa9';
    ctx.font = '600 17px "Songti SC","STSong","SimSun",serif';
    ctx.fillText('抽牌清单（序号 → 牌名 · 方向）', rx, ry);
    ry += 28;
    ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
    const maxRows = Math.floor((H - ry - 96) / 21);
    state.selection.slice(0, maxRows).forEach(function (uid, i) {
      const c = cardByUid(uid);
      ctx.fillStyle = 'rgba(239,231,212,0.85)';
      ctx.fillText(String(i + 1).padStart(2, '0') + '　' + ellipsis(ctx, c.card.name, 130) + '　' + DIRS[c.dir].label, rx, ry);
      ry += 21;
    });
    if (state.selection.length > maxRows) {
      ctx.fillStyle = 'rgba(156,147,178,0.8)';
      ctx.fillText('… 共 ' + state.selection.length + ' 张', rx, ry);
      ry += 21;
    }

    /* 操作摘要 */
    ry += 12;
    ctx.fillStyle = '#f3dfa9';
    ctx.font = '600 17px "Songti SC","STSong","SimSun",serif';
    ctx.fillText('思维操作摘要', rx, ry);
    ry += 28;
    ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
    Object.keys(OP_LABELS).forEach(function (k) {
      ctx.fillStyle = 'rgba(239,231,212,0.8)';
      ctx.fillText(OP_LABELS[k] + '：' + state.counts[k] + ' 次', rx, ry);
      ry += 21;
    });
    ctx.fillStyle = 'rgba(156,147,178,0.85)';
    ctx.fillText('累计反转：' + state.flipCount + ' 次 · 累计操作：' + totalClicks() + ' 次', rx, ry);

    /* 底部 */
    ctx.fillStyle = 'rgba(156,147,178,0.7)';
    ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('本图由程序依据当前真实网格绘制，用于辅助理解结构；文字结构记录才是核心资料。', padX, H - 42);
    ctx.fillText('空间塔罗 · 思维语法系统　' + RULES.version, padX, H - 24);

    return cv;
  }

  function exportPng() {
    if (state.phase !== 'revealed') { toast('揭示牌面后才能导出网格图片。'); return; }
    try {
      const cv = buildGridCanvas();
      cv.toBlob(function (blob) {
        if (!blob) { toast('图片生成失败。'); return; }
        downloadBlob(blob, 'tarot-grid-' + fileStamp() + '.png');
        toast('网格 PNG 已导出。');
      }, 'image/png');
    } catch (e) {
      toast('图片导出失败：' + e.message);
    }
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  /* ============================================================
   * 16. 导出：JSON
   * ========================================================== */
  function buildStateJson() {
    const a = analyzeGrid();
    const errors = validateGrid().errors;
    const cells = [];
    for (let r = 0; r < a.size; r++) {
      for (let c = 0; c < a.size; c++) {
        const data = state.grid.cells[r * a.size + c];
        if (!data) continue;
        const label = data.type === 'main'
          ? (a.mains.filter(function (m) { return m.r === r && m.c === c; })[0] || {}).label
          : (a.mods.filter(function (m) { return m.r === r && m.c === c; })[0] || {}).label;
        cells.push({
          row: r + 1, col: c + 1,
          type: data.type,
          label: label || null,
          drawIndex: data.index || null
        });
      }
    }
    return {
      app: '空间塔罗 · 思维语法系统',
      rulesVersion: RULES.version,
      semantics: {
        shuffle: 'initial-random-layout',
        shuffleIsRandom: true,
        positionsAreInterpreted: false,
        note: '洗牌 / 初始随机分布属于随机化机制，不参与解读；牌坐标仅作为技术状态保留，不应据此解读。'
      },
      generatedAt: new Date().toISOString(),
      question: {
        text: el.question.value.trim(),
        subject: el.extraSubject.value.trim(),
        timeRange: el.extraRange.value.trim(),
        context: el.extraContext.value.trim()
      },
      phase: state.phase,
      stats: {
        totalOperations: totalClicks(),
        counts: clone(state.counts),
        reversalCount: state.flipCount,
        drawnCount: state.selection.length
      },
      operations: state.events.map(function (ev) {
        return {
          seq: ev.seq,
          type: ev.type,
          label: OP_LABELS[ev.type],
          mode: ev.mode,
          modeLabel: ev.mode ? REVERSE_MODES[ev.mode].label : null,
          timestamp: ev.at instanceof Date ? ev.at.toISOString() : ev.at,
          elapsedMs: ev.elapsedMs,
          intervalMs: ev.intervalMs,
          speed: ev.speed,
          intensity: ev.intensity,
          clickCountType: ev.clickCountType,
          clickCountTotal: ev.clickCountTotal,
          flipCount: ev.flipCount,
          dirBefore: ev.dirBefore,
          dirAfter: ev.dirAfter,
          cardsBefore: ev.cardsBefore,
          cardsAfter: ev.cardsAfter
        };
      }),
      cards: state.cards.map(function (c) {
        return {
          uid: c.uid,
          id: c.card.id,
          name: c.card.name,
          en: c.card.en,
          arcana: c.card.arcana,
          suit: c.card.suit,
          rank: c.card.rank,
          element: c.card.element,
          astro: c.card.astro,
          baseKeywords: c.card.keywords.upright,
          baseMeaning: c.card.meaning.upright,
          x: +(c.x / SPACE).toFixed(4),
          y: +(c.y / SPACE).toFixed(4),
          direction: c.dir,
          angleDeg: DIRS[c.dir].deg,
          directionSemantics: DIRS[c.dir].sem,
          selected: c.selected,
          drawIndex: c.drawIndex
        };
      }),
      drawn: state.selection.map(function (uid, i) {
        const c = cardByUid(uid);
        return {
          drawIndex: i + 1,
          uid: c.uid,
          id: c.card.id,
          name: c.card.name,
          direction: c.dir,
          angleDeg: DIRS[c.dir].deg,
          x: +(c.x / SPACE).toFixed(4),
          y: +(c.y / SPACE).toFixed(4)
        };
      }),
      grid: {
        size: a.size,
        cells: cells,
        mainConnections: a.connections.filter(function (cn) { return cn.kind !== 'vertical-chain' && cn.kind !== 'vertical-attach'; })
          .map(function (cn) {
            return { a: cn.a.label, b: cn.b.label, kind: cn.kind };
          }),
        chains: a.chains.map(function (ch) {
          return {
            label: ch.label,
            column: ch.c + 1,
            fromRow: ch.start + 1,
            toRow: ch.end + 1,
            cells: ch.cells.map(function (x) { return x.label; }),
            attachments: ch.attachments.map(function (at) {
              return {
                side: at.type,
                main: at.main.label,
                mainRow: at.main.r + 1,
                mainCol: at.main.c + 1,
                readDirection: at.directionText,
                readOrder: at.order.map(function (x) { return x.label; })
              };
            })
          };
        }),
        readingPaths: a.paths.paths.map(function (p) {
          return p.map(function (m) { return m.label; });
        }),
        validation: { ok: errors.length === 0, errors: errors }
      },
      exportText: state.outputText || null
    };
  }

  function exportJson() {
    if (state.phase !== 'revealed') { toast('揭示牌面后才能导出完整状态。'); return; }
    const data = buildStateJson();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, 'tarot-state-' + fileStamp() + '.json');
    toast('完整状态 JSON 已导出。');
  }

  /* ============================================================
   * 17. 弹层与提示
   * ========================================================== */
  function openModal(node) {
    node.hidden = false;
    requestAnimationFrame(function () { node.classList.add('open'); });
  }

  function closeModal(node) {
    node.classList.remove('open');
    setTimeout(function () { node.hidden = true; }, 240);
  }

  function closeAllModals() {
    [el.confirmModal, el.cardModal].forEach(function (node) {
      if (!node.hidden) {
        node.classList.remove('open');
        node.hidden = true;
      }
    });
  }

  function confirmDialog(title, body, okText, cancelText) {
    if (confirmResolver) {
      const old = confirmResolver;
      confirmResolver = null;
      old(false);
    }
    el.confirmTitle.textContent = title;
    el.confirmBody.textContent = body;
    el.confirmOk.textContent = okText || '确认';
    el.confirmCancel.textContent = cancelText || '取消';
    openModal(el.confirmModal);
    return new Promise(function (resolve) {
      confirmResolver = resolve;
    });
  }

  function settleConfirm(value) {
    if (!confirmResolver) return;
    const r = confirmResolver;
    confirmResolver = null;
    closeModal(el.confirmModal);
    r(value);
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2600);
  }

  /* ============================================================
   * 18. 事件绑定
   * ========================================================== */
  function bindEvents() {
    el.opButtons.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-op]');
      if (!btn || btn.disabled) return;
      const op = btn.dataset.op;
      if (op === 'emotion') opEmotion();
      else if (op === 'diverge') opDiverge();
      else if (op === 'converge') opConverge();
      else if (op === 'reverse') opReverse();
      else if (op === 'advance') opAdvance();
    });

    el.reverseModes.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-mode]');
      if (!btn || btn.disabled) return;
      state.reverseMode = btn.dataset.mode;
      Array.from(el.reverseModes.children).forEach(function (b) {
        const on = b.dataset.mode === state.reverseMode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      const mode = REVERSE_MODES[state.reverseMode];
      el.reverseModeName.textContent = mode.label;
      el.reverseModeDesc.textContent = mode.desc;
    });

    el.undoBtn.addEventListener('click', doUndo);
    el.resetBtn.addEventListener('click', resetAll);

    el.selectionList.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      if (state.phase === 'revealed') { toast('揭示后不能取消已选卡牌，请「返回编辑」或「重新开始」。'); return; }
      if (hasGridContent()) { toast('网格已引用抽牌序号，取消会打乱序号对应关系。请先清空网格或「重新开始」。'); return; }
      const uid = parseInt(btn.dataset.remove, 10);
      const idx = state.selection.indexOf(uid);
      if (idx < 0) return;
      pushUndo();
      state.selection.splice(idx, 1);
      renumberSelection();
      renderSelection();
      renderCards();
      markStale();
      updateStage();
      updateOpButtons();
      toast('已取消第 ' + (idx + 1) + ' 张，其余序号已重排');
    });

    el.revealBtn.addEventListener('click', revealCards);
    el.backToEditBtn.addEventListener('click', backToEdit);

    el.question.addEventListener('input', function () {
      markStale();
      updateStage();
    });
    [el.extraSubject, el.extraRange, el.extraContext].forEach(function (input) {
      input.addEventListener('input', markStale);
    });

    el.gridSize.addEventListener('change', function () {
      const size = parseInt(el.gridSize.value, 10);
      const apply = function () {
        pushUndo();
        state.grid.size = size;
        state.grid.cells = new Array(size * size).fill(null);
        state.selectedCell = null;
        buildGridDom();
        renderAll();
        markStale();
        toast('网格已调整为 ' + size + ' × ' + size + '（原内容已清空）');
      };
      if (hasGridContent()) {
        confirmDialog('改变网格尺寸？', '改变尺寸会清空当前网格中的所有方块与序号，是否继续？', '清空并调整', '取消')
          .then(function (ok) {
            if (ok) apply();
            else el.gridSize.value = String(state.grid.size);
          });
      } else {
        apply();
      }
    });

    el.allowDup.addEventListener('change', function () {
      state.allowDup = el.allowDup.checked;
      validateNow();
      markStale();
    });

    el.gridBoard.addEventListener('click', function (e) {
      const cell = e.target.closest('.gcell');
      if (!cell) return;
      onCellClick(parseInt(cell.dataset.r, 10), parseInt(cell.dataset.c, 10));
    });

    el.gridEditor.addEventListener('click', function (e) {
      const typeBtn = e.target.closest('[data-celltype]');
      if (typeBtn) {
        setCellType(typeBtn.dataset.celltype);
        return;
      }
      if (e.target.closest('[data-clearcell]')) {
        if (!state.selectedCell) return;
        setCellType('');
      }
    });

    el.gridEditor.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'cellIndex') {
        const v = e.target.value;
        setCellIndex(v ? parseInt(v, 10) : null);
      }
    });

    el.genBtn.addEventListener('click', generateOutput);
    el.copyBtn.addEventListener('click', copyOutput);
    el.pngBtn.addEventListener('click', exportPng);
    el.jsonBtn.addEventListener('click', exportJson);

    el.confirmOk.addEventListener('click', function () { settleConfirm(true); });
    el.confirmCancel.addEventListener('click', function () { settleConfirm(false); });
    el.confirmModal.addEventListener('click', function (e) {
      if (e.target === el.confirmModal) settleConfirm(false);
    });

    el.cardModalClose.addEventListener('click', function () { closeModal(el.cardModal); });
    el.cardModal.addEventListener('click', function (e) {
      if (e.target === el.cardModal) closeModal(el.cardModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!el.confirmModal.hidden) { settleConfirm(false); return; }
        if (!el.cardModal.hidden) { closeModal(el.cardModal); return; }
      }
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doUndo();
      }
    });
  }

  /* ============================================================
   * 19. 启动
   * ========================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 调试与二次开发入口 */
  window.SPATIAL = {
    state: state,
    rules: RULES,
    dirs: DIRS,
    modes: REVERSE_MODES,
    ops: { emotion: opEmotion, diverge: opDiverge, converge: opConverge, reverse: opReverse, advance: opAdvance },
    analyzeGrid: analyzeGrid,
    validateGrid: validateGrid,
    buildText: buildExportText,
    buildJson: buildStateJson,
    buildCanvas: buildGridCanvas,
    reveal: revealCards,
    reset: resetAll
  };
})();
