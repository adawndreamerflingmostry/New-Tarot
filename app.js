/*!
 * 塔罗牌 · 交互程序
 * 洗牌 → 结束洗牌 → 指定数量抽牌 → 翻牌展示 → 点击看牌义
 */
(function () {
  'use strict';

  const DECK = window.TAROT.DECK;
  const T = window.TAROT;
  const ART = window.TAROT_ART;
  const cardFaceSVG = ART.face;
  const cardBackSVG = ART.back;

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_DRAW = 10;

  /* ============================================================
   * 1. 基础工具
   * ========================================================== */
  function randInt(max) {
    if (max <= 0) return 0;
    if (!window.crypto || !window.crypto.getRandomValues) return Math.floor(Math.random() * max);
    const buf = new Uint32Array(1);
    const limit = Math.floor(0xFFFFFFFF / max) * max;
    let v;
    do {
      crypto.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % max;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

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

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function $(sel) { return document.querySelector(sel); }

  /* ============================================================
   * 3. 应用状态
   * ========================================================== */
  const state = {
    phase: 'idle',          /* idle | shuffling | settling | ready | drawing | drawn */
    order: DECK.map(function (c) { return c.uid; }),
    drawn: [],
    nodes: [],
    shuffleTimer: null,
    shuffleCount: 0,
    activeIdx: -1
  };

  const els = {};
  const VISUAL_DECK = 28;

  /* ============================================================
   * 4. 启动
   * ========================================================== */
  function init() {
    if (!document.getElementById('deck')) return;
    els.deck = $('#deck');
    els.deckStage = $('#deckStage');
    els.deckCount = $('#deckCount');
    els.deckState = $('#deckState');
    els.fan = $('#fan');
    els.spread = $('#spread');
    els.spreadEmpty = $('#spreadEmpty');
    els.drawnList = $('#drawnList');
    els.status = $('#status');
    els.shuffleBtn = $('#shuffleBtn');
    els.stopBtn = $('#stopBtn');
    els.drawBtn = $('#drawBtn');
    els.resetBtn = $('#resetBtn');
    els.countInput = $('#countInput');
    els.minusBtn = $('#minusBtn');
    els.plusBtn = $('#plusBtn');
    els.modal = $('#modal');
    els.modalCard = $('#modalCard');
    els.modalInfo = $('#modalInfo');
    els.modalClose = $('#modalClose');

    buildStars();
    renderDeckStack();
    bindEvents();
    resetAll(true);
    updateButtons();
    applyDemo();
  }

  function buildStars() {
    const host = $('#stars');
    if (!host || REDUCED) return;
    let html = '';
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = Math.random() < 0.82 ? 1 : 2;
      const dur = 3 + Math.random() * 6;
      const delay = -Math.random() * 9;
      const op = 0.2 + Math.random() * 0.6;
      html += '<i style="left:' + x.toFixed(2) + '%;top:' + y.toFixed(2) + '%;width:' + size + 'px;height:' + size +
        'px;--op:' + op.toFixed(2) + ';animation-duration:' + dur.toFixed(1) + 's;animation-delay:' + delay.toFixed(1) + 's"></i>';
    }
    host.innerHTML = html;
  }

  function renderDeckStack() {
    const rnd = mulberry32(20261027);
    let html = '';
    for (let i = 0; i < VISUAL_DECK; i++) {
      const t = i / (VISUAL_DECK - 1);
      const ox = ((t - 0.5) * 8 + (rnd() - 0.5) * 2).toFixed(2);
      const oy = ((0.5 - t) * 16 + (rnd() - 0.5) * 2).toFixed(2);
      const rot = ((rnd() - 0.5) * 2.2).toFixed(2);
      const dir = i < VISUAL_DECK / 2 ? -1 : 1;
      html += '<div class="deck-card" style="--i:' + i + ';--ox:' + ox + 'px;--oy:' + oy + 'px;--rot:' + rot +
        'deg;--dir:' + dir + ';--delay:' + (-i * 0.055).toFixed(2) + 's;--dur:' + (1.5 + rnd() * 0.5).toFixed(2) +
        's;z-index:' + i + '">' + cardBackSVG() + '</div>';
    }
    els.deck.innerHTML = html;
  }

  /* ============================================================
   * 5. 状态与按钮
   * ========================================================== */
  function setStatus(text, tone) {
    els.status.textContent = text;
    els.status.dataset.tone = tone || '';
  }

  function updateButtons() {
    const p = state.phase;
    els.shuffleBtn.disabled = (p === 'shuffling' || p === 'settling' || p === 'drawing');
    els.stopBtn.disabled = (p !== 'shuffling');
    els.drawBtn.disabled = (p !== 'ready');
    els.resetBtn.disabled = (p === 'shuffling' || p === 'settling' || p === 'drawing');
    els.shuffleBtn.textContent = p === 'shuffling' ? '洗牌中…' : '开始洗牌';
    els.shuffleBtn.classList.toggle('is-busy', p === 'shuffling');
    els.countInput.disabled = (p === 'shuffling' || p === 'settling' || p === 'drawing');
    els.minusBtn.disabled = els.countInput.disabled;
    els.plusBtn.disabled = els.countInput.disabled;
  }

  function updateDeckCount() {
    const left = state.order.length;
    els.deckCount.textContent = left;
    els.deckCount.classList.remove('pop');
    void els.deckCount.offsetWidth;
    els.deckCount.classList.add('pop');
  }

  /* ============================================================
   * 6. 洗牌
   * ========================================================== */
  function startShuffle() {
    if (state.phase === 'shuffling' || state.phase === 'settling' || state.phase === 'drawing') return;
    hardReset();

    state.phase = 'shuffling';
    state.shuffleCount = 0;
    shuffle(state.order);

    els.deck.classList.remove('is-ready', 'is-settling');
    els.deck.classList.add('is-shuffling');
    els.deckState.textContent = '洗牌中…';
    updateButtons();
    setStatus('正在洗牌… 静下心，想着你的问题。牌停下的时候，就是答案开始的地方。', 'live');

    state.shuffleTimer = setInterval(function () {
      shuffle(state.order);
      state.shuffleCount++;
      els.deckState.textContent = '洗牌中 ×' + state.shuffleCount;
    }, 460);
  }

  function stopShuffle() {
    if (state.phase !== 'shuffling') return;
    clearInterval(state.shuffleTimer);
    state.shuffleTimer = null;
    state.phase = 'settling';
    shuffle(state.order);
    els.deck.classList.remove('is-shuffling');
    els.deck.classList.add('is-settling');
    els.deckState.textContent = '收牌…';
    updateButtons();
    setStatus('收牌，切牌，牌堆安静下来……', 'live');

    setTimeout(function () {
      els.deck.classList.remove('is-settling');
      els.deck.classList.add('is-ready');
      state.phase = 'ready';
      els.deckState.textContent = '已洗好';
      updateButtons();
      setStatus('牌已洗好。选择抽牌数量，然后点击「抽牌」。', 'ready');
      pulseRing();
    }, REDUCED ? 60 : 950);
  }

  function pulseRing() {
    if (REDUCED) return;
    const ring = document.createElement('div');
    ring.className = 'deck-wave';
    els.deckStage.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 1400);
  }

  /* ============================================================
   * 7. 抽牌
   * ========================================================== */
  async function drawCards(opts) {
    const instant = !!(opts && opts.instant);
    if (state.phase !== 'ready') return;

    const inputVal = parseInt(els.countInput.value, 10);
    const want = clamp(isNaN(inputVal) ? 1 : inputVal, 1, MAX_DRAW);
    const n = Math.min(want, state.order.length);
    if (!n) {
      setStatus('牌堆空了，点击「重置」重新开始。', 'warn');
      return;
    }
    if (n < want) setStatus('牌堆只剩 ' + n + ' 张，就抽这些吧。', 'warn');

    state.phase = 'drawing';
    updateButtons();
    setStatus('抽 ' + n + ' 张牌…', 'live');

    const uids = state.order.slice(0, n);
    state.order = state.order.slice(n);
    updateDeckCount();

    state.drawn = uids.map(function (uid, i) {
      const card = Object.assign({}, DECK[uid]);
      card.reversed = randInt(2) === 1;
      card.position = i + 1;
      return card;
    });

    els.fan.classList.toggle('instant', instant || REDUCED);
    renderDrawnCards(state.drawn);
    layoutFan();
    els.spreadEmpty.hidden = true;
    els.deck.classList.remove('is-ready');

    if (instant || REDUCED) {
      state.nodes.forEach(function (node) { node.inner.classList.add('revealed'); });
      await wait(30);
      finishDraw(n);
      return;
    }

    await dealAnimation();
    await revealAnimation();
    finishDraw(n);
  }

  function renderDrawnCards(cards) {
    els.fan.innerHTML = '';
    state.nodes = [];
    const frag = document.createDocumentFragment();
    cards.forEach(function (card, i) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'slot';
      slot.dataset.idx = String(i);
      slot.setAttribute('aria-label', '第 ' + (i + 1) + ' 张：' + card.name + '，' + (card.reversed ? '逆位' : '正位'));
      slot.innerHTML =
        '<span class="card-3d"><span class="card-inner">' +
        '<span class="face front' + (card.reversed ? ' reversed' : '') + '">' + cardFaceSVG(card) + '</span>' +
        '<span class="face back">' + cardBackSVG() + '</span>' +
        '</span></span>';
      const node = {
        slot: slot,
        card: card,
        rot: 0,
        card3d: slot.querySelector('.card-3d'),
        inner: slot.querySelector('.card-inner')
      };
      slot.addEventListener('click', function () { openModal(i); });
      state.nodes.push(node);
      frag.appendChild(slot);
    });
    els.fan.appendChild(frag);
  }

  function fanMetrics(n) {
    const probe = state.nodes[0] && state.nodes[0].slot;
    const cardW = (probe && probe.offsetWidth) || 120;
    const box = els.fan.getBoundingClientRect();
    const avail = Math.max(box.width - 24, cardW);
    const gap = n > 1 ? Math.min(cardW * 0.72, Math.max(cardW * 0.3, (avail - cardW) / (n - 1))) : 0;
    const step = n > 1 ? Math.min(9.5, 44 / (n - 1)) : 0;
    return { cardW: cardW, gap: gap, step: step, total: gap * (n - 1) };
  }

  function layoutFan() {
    const n = state.nodes.length;
    if (!n) return;
    const m = fanMetrics(n);
    state.nodes.forEach(function (node, i) {
      const x = -m.total / 2 + m.gap * i;
      const rot = (i - (n - 1) / 2) * m.step;
      const dist = Math.abs(i - (n - 1) / 2) / Math.max((n - 1) / 2, 1);
      const lift = dist * dist * 20;
      node.rot = rot;
      node.slot.style.transform = 'translate(-50%, 0) translate(' + x.toFixed(2) + 'px,' + lift.toFixed(2) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
      node.slot.style.zIndex = String(10 + i);
    });
  }

  function dealAnimation() {
    const deckRect = els.deck.getBoundingClientRect();
    return Promise.all(state.nodes.map(function (node, i) {
      const r = node.slot.getBoundingClientRect();
      const dx = (deckRect.left + deckRect.width / 2) - (r.left + r.width / 2);
      const dy = (deckRect.top + deckRect.height / 2) - (r.top + r.height / 2);
      const sc = deckRect.width / (node.slot.offsetWidth || r.width);
      const a = (-node.rot * Math.PI) / 180;
      const lx = dx * Math.cos(a) - dy * Math.sin(a);
      const ly = dx * Math.sin(a) + dy * Math.cos(a);
      const anim = node.card3d.animate([
        { transform: 'translate(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ') rotate(' + (-node.rot).toFixed(2) + 'deg)', opacity: 0.92 },
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 }
      ], {
        duration: 620,
        delay: i * 85,
        easing: 'cubic-bezier(.2,.78,.28,1)',
        fill: 'backwards'
      });
      return anim.finished.catch(function () { });
    }));
  }

  function revealAnimation() {
    const step = 130;
    state.nodes.forEach(function (node, i) {
      setTimeout(function () {
        node.inner.classList.add('revealed');
        sparks(node.slot);
      }, 60 + i * step);
    });
    return wait(60 + (state.nodes.length - 1) * step + (REDUCED ? 0 : 500));
  }

  function finishDraw(n) {
    state.phase = 'drawn';
    updateButtons();
    setStatus('已抽出 ' + n + ' 张牌。点击任意一张牌，查看它的完整牌义。', 'done');
    els.deckState.textContent = '已抽 ' + n + ' 张';
    renderDrawnList();
  }

  function renderDrawnList() {
    els.drawnList.innerHTML = state.drawn.map(function (card, i) {
      const pal = T.palette(card);
      return '<li><button type="button" class="drawn-chip" data-idx="' + i + '" style="--accent:' + pal.accent + '">' +
        '<span class="chip-idx">' + (i + 1) + '</span>' +
        '<span class="chip-name">' + card.name + '</span>' +
        '<span class="chip-ori' + (card.reversed ? ' rev' : '') + '">' + (card.reversed ? '逆位' : '正位') + '</span>' +
        '</button></li>';
    }).join('');
    els.drawnList.querySelectorAll('.drawn-chip').forEach(function (b) {
      b.addEventListener('click', function () { openModal(parseInt(b.dataset.idx, 10)); });
    });
  }

  function sparks(host) {
    if (REDUCED) return;
    const wrap = document.createElement('span');
    wrap.className = 'sparks';
    let inner = '';
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 26 + Math.random() * 46;
      inner += '<i style="--tx:' + (Math.cos(a) * d).toFixed(1) + 'px;--ty:' + (Math.sin(a) * d).toFixed(1) +
        'px;animation-delay:' + (Math.random() * 130).toFixed(0) + 'ms"></i>';
    }
    wrap.innerHTML = inner;
    host.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 1300);
  }

  /* ============================================================
   * 8. 重置
   * ========================================================== */
  function hardReset() {
    clearInterval(state.shuffleTimer);
    state.shuffleTimer = null;
    state.drawn = [];
    state.nodes = [];
    state.order = DECK.map(function (c) { return c.uid; });
    els.fan.innerHTML = '';
    els.fan.classList.remove('instant');
    els.drawnList.innerHTML = '';
    els.spreadEmpty.hidden = false;
    updateDeckCount();
    els.deck.classList.remove('is-shuffling', 'is-settling', 'is-ready');
    if (!els.modal.hidden) {
      els.modal.classList.remove('open');
      els.modal.hidden = true;
      document.body.classList.remove('modal-open');
    }
  }

  function resetAll(silent) {
    hardReset();
    state.phase = 'idle';
    els.deckState.textContent = '待洗牌';
    updateButtons();
    if (!silent) setStatus('点击「开始洗牌」，让牌堆动起来。', '');
  }

  /* ============================================================
   * 9. 牌义弹层
   * ========================================================== */
  function openModal(idx) {
    const card = state.drawn[idx];
    if (!card) return;
    state.activeIdx = idx;
    const pal = T.palette(card);
    const ori = card.reversed ? '逆位' : '正位';
    const other = card.reversed ? '正位' : '逆位';
    const kw = card.reversed ? card.keywords.reversed : card.keywords.upright;
    const meaning = card.reversed ? card.meaning.reversed : card.meaning.upright;
    const otherKw = card.reversed ? card.keywords.upright : card.keywords.reversed;

    els.modal.style.setProperty('--accent', pal.accent);
    els.modalCard.innerHTML = '<div class="modal-art' + (card.reversed ? ' reversed' : '') + '">' + cardFaceSVG(card) + '</div>';

    const meta = card.arcana === 'major'
      ? '大阿卡纳 · ' + card.rankLabel + ' · ' + card.element + ' · ' + card.astro
      : '小阿卡纳 · ' + T.SUITS[card.suit].name + ' · ' + T.SUITS[card.suit].theme + ' · ' + card.element;

    els.modalInfo.innerHTML =
      '<p class="m-kicker">第 ' + (idx + 1) + ' 张 · ' + (card.reversed ? '逆位' : '正位') + '</p>' +
      '<h2 class="m-title">' + card.name + '<span class="m-en">' + card.en + '</span></h2>' +
      '<p class="m-meta">' + meta + '</p>' +
      '<div class="m-badge ' + (card.reversed ? 'rev' : '') + '">' + ori + '</div>' +
      '<div class="m-chips">' + kw.map(function (k) { return '<span>' + k + '</span>'; }).join('') + '</div>' +
      '<h3 class="m-sub">牌义</h3>' +
      '<p class="m-meaning">' + meaning + '</p>' +
      '<p class="m-other"><b>另一面 · ' + other + '</b>' + otherKw.join(' · ') + '</p>';

    els.modal.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(function () { els.modal.classList.add('open'); });
    els.modalClose.focus({ preventScroll: true });
  }

  function closeModal() {
    if (els.modal.hidden) return;
    els.modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    const slot = state.nodes[state.activeIdx];
    setTimeout(function () {
      els.modal.hidden = true;
      if (slot) slot.slot.focus({ preventScroll: true });
    }, 260);
  }

  /* ============================================================
   * 10. 事件绑定
   * ========================================================== */
  function bindEvents() {
    els.shuffleBtn.addEventListener('click', startShuffle);
    els.stopBtn.addEventListener('click', stopShuffle);
    els.drawBtn.addEventListener('click', function () { drawCards(); });
    els.resetBtn.addEventListener('click', function () {
      resetAll(false);
      setStatus('已重置。新的问题，从洗牌开始。', '');
    });

    els.minusBtn.addEventListener('click', function () { stepCount(-1); });
    els.plusBtn.addEventListener('click', function () { stepCount(1); });
    els.countInput.addEventListener('change', normalizeCount);
    els.countInput.addEventListener('blur', normalizeCount);
    els.countInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !els.drawBtn.disabled) drawCards();
    });

    els.modalClose.addEventListener('click', closeModal);
    els.modal.addEventListener('click', function (e) {
      if (e.target === els.modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (!els.modal.hidden) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (tag === 'button' && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ' || e.code === 'Space') {
        if (state.phase === 'shuffling') { e.preventDefault(); stopShuffle(); }
      } else if (e.key === 's' || e.key === 'S') {
        if (state.phase === 'shuffling') stopShuffle(); else startShuffle();
      } else if (e.key === 'd' || e.key === 'D') {
        if (!els.drawBtn.disabled) drawCards();
      } else if (e.key === 'r' || e.key === 'R') {
        if (!els.resetBtn.disabled) { resetAll(false); setStatus('已重置。新的问题，从洗牌开始。', ''); }
      }
    });

    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (state.nodes.length) layoutFan();
      }, 140);
    });
  }

  function normalizeCount() {
    const v = parseInt(els.countInput.value, 10);
    els.countInput.value = String(clamp(isNaN(v) ? 1 : v, 1, MAX_DRAW));
  }

  function stepCount(delta) {
    normalizeCount();
    const v = parseInt(els.countInput.value, 10) + delta;
    els.countInput.value = String(clamp(v, 1, MAX_DRAW));
  }

  /* ============================================================
   * 11. 演示状态（?demo=shuffling|ready|drawn&n=3），便于截图自检
   * ========================================================== */
  function applyDemo() {
    const params = new URLSearchParams(location.search);
    const demo = params.get('demo');
    if (!demo) return;
    const n = clamp(parseInt(params.get('n') || '3', 10) || 3, 1, MAX_DRAW);
    els.countInput.value = String(n);

    if (demo === 'ready') {
      state.phase = 'ready';
      els.deck.classList.add('is-ready');
      els.deckState.textContent = '已洗好';
      updateButtons();
      setStatus('牌已洗好。选择抽牌数量，然后点击「抽牌」。', 'ready');
    } else if (demo === 'shuffling') {
      startShuffle();
    } else if (demo === 'drawn') {
      state.phase = 'ready';
      els.deck.classList.add('is-ready');
      updateButtons();
      drawCards({ instant: true });
      const openIdx = parseInt(params.get('open') || '-1', 10);
      if (openIdx >= 0) setTimeout(function () { openModal(openIdx); }, 420);
    }
  }

  /* 便于调试与二次开发 */
  window.TAROT_UI = {
    face: cardFaceSVG,
    back: cardBackSVG,
    deck: DECK,
    model: T,
    state: state,
    startShuffle: startShuffle,
    stopShuffle: stopShuffle,
    draw: drawCards,
    reset: resetAll
  };

  document.addEventListener('DOMContentLoaded', init);
})();
