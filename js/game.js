(function () {
  const $ = function (s, el) { return (el || document).querySelector(s); };
  const $$ = function (s, el) { return Array.from((el || document).querySelectorAll(s)); };

  const S = {
    screen: 'start',
    level: 1,
    score: 0,
    stars: {},
    unlock: 1,
    running: false,
    timeLeft: 0,
    timerId: null,
    spawnTimeout: null,
    lastHole: -1,
    timers: []
  };

  const el = {};

  function cacheEls() {
    el.start = $('#start-screen');
    el.map = $('#map-screen');
    el.game = $('#game-screen');
    el.result = $('#result-screen');
    el.board = $('#board');
    el.mapGrid = $('#map-grid');
    el.mascot = $('#mascot');
    el.levelNo = $('#level-no');
    el.score = $('#score');
    el.timeFill = $('#time-fill');
    el.prompt = $('#prompt');
    el.hammer = $('#hammer');
    el.resultStars = $('#result-stars');
    el.resultTitle = $('#result-title');
    el.resultMsg = $('#result-msg');
    el.resultScore = $('#result-score');
    el.resultTarget = $('#result-target');
    el.btnStart = $('#btn-start');
    el.btnMapFromStart = $('#btn-map-from-start');
    el.btnNext = $('#btn-next');
    el.btnReplay = $('#btn-replay');
    el.btnMap = $('#btn-map');
    el.btnHome2 = $('#btn-home2');
    el.btnHome = $('#btn-home');
    el.btnQuit = $('#btn-quit');
    el.btnMute = $('#btn-mute');
    el.btnNight = $('#btn-night');
    el.intro = $('#intro');
    el.introNo = $('#intro-no');
  }

  function loadSave() {
    const u = parseInt(localStorage.getItem('ddsh_unlock'), 10) || 1;
    S.unlock = Math.min(Math.max(u, 1), 30);
    for (let i = 1; i <= 30; i++) {
      const v = parseInt(localStorage.getItem('ddsh_star_' + i), 10) || 0;
      S.stars[i] = v;
    }
  }

  function saveStars(id, stars) {
    if (stars > (S.stars[id] || 0)) {
      S.stars[id] = stars;
      localStorage.setItem('ddsh_star_' + id, String(stars));
    }
  }

  function showScreen(name) {
    S.screen = name;
    $$('.screen').forEach(function (s) { s.classList.remove('active'); });
    $('#result-screen').classList.toggle('active', false);
    $('#start-screen').classList.toggle('active', name === 'start');
    $('#map-screen').classList.toggle('active', name === 'map');
    $('#game-screen').classList.toggle('active', name === 'game');
    $('#result-screen').classList.toggle('active', name === 'result');
    el.hammer.classList.toggle('show', name === 'game');
    if (name !== 'game') {
      el.board.style.cursor = 'default';
    } else {
      el.board.style.cursor = 'none';
    }
  }

  function buildBoard() {
    const lv = getLevel(S.level);
    el.board.innerHTML = '';
    el.board.style.gridTemplateColumns = 'repeat(' + lv.cols + ', 1fr)';
    for (let i = 0; i < lv.rows * lv.cols; i++) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      hole.dataset.idx = String(i);
      const wrap = document.createElement('div');
      wrap.className = 'mole-wrap';
      wrap.appendChild($('#tpl-mole').content.cloneNode(true));
      const hill = document.createElement('div');
      hill.className = 'hill';
      hill.appendChild($('#tpl-hill').content.cloneNode(true));
      hole.appendChild(wrap);
      hole.appendChild(hill);
      el.board.appendChild(hole);
    }
  }

  function delay(fn, ms) {
    const t = setTimeout(function () {
      const i = S.timers.indexOf(t);
      if (i >= 0) S.timers.splice(i, 1);
      fn();
    }, ms);
    S.timers.push(t);
    return t;
  }

  function dropMole(hole) {
    if (!S.running) return;
    if (hole.classList.contains('up') && !hole.classList.contains('ko')) {
      hole.classList.remove('up');
    }
  }

  function spawnOne() {
    if (!S.running) return;
    const lv = getLevel(S.level);
    const holes = $$('.hole', el.board);
    const up = holes.filter(function (h) { return h.classList.contains('up'); }).length;
    if (up < lv.maxUp) {
      let idx = -1;
      let guard = 0;
      while (guard++ < 25) {
        const c = Math.floor(Math.random() * holes.length);
        if (c !== S.lastHole && !holes[c].classList.contains('up')) {
          idx = c;
          break;
        }
      }
      if (idx >= 0) {
        const hole = holes[idx];
        S.lastHole = idx;
        const gold = Math.random() < lv.goldChance;
        const wrap = $('.mole-wrap', hole);
        const old = wrap.querySelector('.mole');
        const clone = (gold ? $('#tpl-gold') : $('#tpl-mole')).content.cloneNode(true);
        wrap.replaceChild(clone, old);
        hole.classList.toggle('gold', gold);
        hole.classList.add('up');
        AudioManager.play('pop');
        delay(function () { dropMole(hole); }, lv.upTime);
      }
    }
    scheduleSpawn();
  }

  function scheduleSpawn() {
    if (!S.running) return;
    const lv = getLevel(S.level);
    const ms = lv.minI + Math.random() * (lv.maxI - lv.minI);
    delay(spawnOne, ms);
  }

  function burst(hole, gold) {
    const n = gold ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = gold ? 'fx-star gold' : 'fx-star';
      s.textContent = '⭐';
      const a = Math.random() * Math.PI * 2;
      const d = 28 + Math.random() * 42;
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px');
      s.style.setProperty('--dy', (Math.sin(a) * d - 42).toFixed(1) + 'px');
      hole.appendChild(s);
      setTimeout(function () { s.remove(); }, 900);
    }
  }

  function toast(hole, text, gold) {
    const t = document.createElement('div');
    t.className = gold ? 'toast gold' : 'toast';
    t.textContent = text;
    hole.appendChild(t);
    setTimeout(function () { t.remove(); }, 950);
  }

  function updateHUD() {
    const lv = getLevel(S.level);
    el.levelNo.textContent = String(S.level);
    el.score.textContent = String(S.score);
    const p = S.timeLeft / lv.duration;
    el.timeFill.style.width = (p * 100).toFixed(1) + '%';
    el.timeFill.style.background = p > 0.5 ? 'var(--grass)' : (p > 0.25 ? 'var(--time-warn)' : 'var(--time-danger)');
  }

  function hitMole(hole) {
    const lv = getLevel(S.level);
    const gold = hole.classList.contains('gold');
    const gain = gold ? lv.goldValue : 1;
    S.score += gain;
    hole.classList.add('ko');
    burst(hole, gold);
    toast(hole, '+' + gain, gold);
    updateHUD();
    AudioManager.play(gold ? 'gold' : 'hit');
    delay(function () {
      hole.classList.remove('up', 'ko');
    }, 300);
  }

  function stopLevel() {
    S.running = false;
    clearInterval(S.timerId);
    clearTimeout(S.spawnTimeout);
    S.timers.forEach(function (t) { clearTimeout(t); });
    S.timers = [];
  }

  function updateTimer() {
    S.timeLeft--;
    updateHUD();
    if (S.timeLeft <= 0) endLevel();
  }

  function startTimer() {
    const lv = getLevel(S.level);
    S.timeLeft = lv.duration;
    updateHUD();
    S.timerId = setInterval(updateTimer, 1000);
  }

  function endLevel() {
    if (!S.running) return;
    stopLevel();
    $$('.hole.up', el.board).forEach(function (h) { h.classList.remove('up', 'ko'); });
    const lv = getLevel(S.level);
    const win = S.score >= lv.target;
    const stars = win ? (S.score >= lv.target * 3 ? 3 : S.score >= lv.target * 2 ? 2 : 1) : 0;
    if (win) {
      saveStars(S.level, stars);
      if (S.level < 30) {
        if (S.level + 1 > S.unlock) {
          S.unlock = S.level + 1;
          localStorage.setItem('ddsh_unlock', String(S.unlock));
        }
      } else {
        S.unlock = 30;
      }
    }
    showResult(win, stars);
  }

  function showResult(win, stars) {
    const lv = getLevel(S.level);
    el.resultTarget.textContent = String(lv.target);
    el.resultScore.textContent = String(S.score);
    if (win) {
      el.resultStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      el.resultTitle.textContent = stars === 3 ? '超级厉害！' : (stars === 2 ? '真棒！' : '过关啦！');
      el.resultMsg.textContent = S.level >= 30 ? '你打遍了全部 30 关，是打地鼠冠军！' : '休息一下眼睛，再来下一关吧～';
      el.btnNext.style.display = S.level >= 30 ? 'none' : 'inline-block';
      AudioManager.play('win');
    } else {
      el.resultStars.textContent = '🌱';
      el.resultTitle.textContent = '差一点点';
      el.resultMsg.textContent = '再多打几只地鼠就够啦，再试一次！';
      el.btnNext.style.display = 'none';
      AudioManager.play('fail');
    }
    showScreen('result');
  }

  function showIntro() {
    el.introNo.textContent = String(S.level);
    el.intro.classList.add('show');
    clearTimeout(showIntro._t);
    showIntro._t = setTimeout(function () { el.intro.classList.remove('show'); }, 1500);
  }

  function openLevel(n) {
    if (n < 1 || n > 30) return;
    stopLevel();
    S.level = n;
    S.score = 0;
    S.running = true;
    S.lastHole = -1;
    const lv = getLevel(n);
    buildBoard();
    el.prompt.innerHTML = '🎯 目标：拿到 <b>' + lv.target + '</b> 分 · ⏱ 限时 ' + lv.duration + ' 秒';
    updateHUD();
    showScreen('game');
    showIntro();
    startTimer();
    scheduleSpawn();
  }

  function renderMap() {
    el.mapGrid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
      const c = document.createElement('div');
      c.className = 'map-cell';
      c.dataset.level = String(i);
      const st = S.stars[i] || 0;
      if (i > S.unlock) {
        c.classList.add('locked');
        c.innerHTML = '<span class="lock">🔒</span>';
      } else {
        c.classList.add('open');
        if (i === S.level) c.classList.add('cur');
        c.innerHTML = '<span class="cno">' + i + '</span>' + (st ? '<span class="cstars">' + '⭐'.repeat(st) + '</span>' : '');
      }
      el.mapGrid.appendChild(c);
    }
  }

  function goMap() {
    loadSave();
    renderMap();
    showScreen('map');
  }

  function goStart() {
    showScreen('start');
  }

  function swingHammer() {
    el.hammer.classList.remove('hit');
    void el.hammer.offsetWidth;
    el.hammer.classList.add('hit');
  }

  function mountMascot() {
    el.mascot.appendChild($('#tpl-mole').content.cloneNode(true));
  }

  function makeStars() {
    const box = $('#stars');
    for (let i = 0; i < 24; i++) {
      const s = document.createElement('i');
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.top = (Math.random() * 55).toFixed(1) + '%';
      s.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
      box.appendChild(s);
    }
  }

  function syncToggles() {
    el.btnMute.textContent = AudioManager.muted ? '🔇' : '🔊';
    el.btnNight.textContent = document.body.classList.contains('night') ? '☀️' : '🌙';
  }

  function bindEvents() {
    el.btnStart.addEventListener('click', function () {
      AudioManager.ensure();
      AudioManager.play('click');
      goMap();
    });
    el.btnMapFromStart.addEventListener('click', function () {
      AudioManager.play('click');
      goMap();
    });
    el.btnHome.addEventListener('click', function () {
      AudioManager.play('click');
      goStart();
    });
    el.btnHome2.addEventListener('click', function () {
      AudioManager.play('click');
      goStart();
    });
    el.btnMap.addEventListener('click', function () {
      AudioManager.ensure();
      AudioManager.play('click');
      goMap();
    });
    el.btnQuit.addEventListener('click', function () {
      stopLevel();
      goMap();
    });
    el.btnReplay.addEventListener('click', function () {
      AudioManager.play('click');
      openLevel(S.level);
    });
    el.btnNext.addEventListener('click', function () {
      AudioManager.play('click');
      openLevel(S.level + 1);
    });
    el.mapGrid.addEventListener('click', function (e) {
      const cell = e.target.closest('.map-cell');
      if (!cell) return;
      if (cell.classList.contains('locked')) {
        AudioManager.play('click');
        return;
      }
      AudioManager.ensure();
      AudioManager.play('click');
      openLevel(parseInt(cell.dataset.level, 10));
    });
    el.board.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      let x = e.clientX, y = e.clientY;
      if (e.pointerType === 'touch' && !x) {
        x = e.changedTouches ? e.changedTouches[0].clientX : 0;
        y = e.changedTouches ? e.changedTouches[0].clientY : 0;
      }
      el.hammer.style.left = x + 'px';
      el.hammer.style.top = y + 'px';
      swingHammer();
      if (!S.running) return;
      const hole = e.target.closest('.hole');
      if (!hole) {
        AudioManager.play('click');
        return;
      }
      if (hole.classList.contains('up') && !hole.classList.contains('ko')) {
        hitMole(hole);
      } else if (!hole.classList.contains('ko')) {
        AudioManager.play('miss');
      }
    });
    window.addEventListener('pointermove', function (e) {
      if (S.screen !== 'game') return;
      el.hammer.style.left = e.clientX + 'px';
      el.hammer.style.top = e.clientY + 'px';
      el.board.style.cursor = 'none';
    });
    el.btnMute.addEventListener('click', function () {
      AudioManager.ensure();
      AudioManager.toggleMute();
      syncToggles();
      AudioManager.play('click');
    });
    el.btnNight.addEventListener('click', function () {
      AudioManager.ensure();
      AudioManager.play('click');
      const night = document.body.classList.toggle('night');
      localStorage.setItem('ddsh_night', night ? '1' : '0');
      syncToggles();
    });
  }

  function init() {
    cacheEls();
    loadSave();
    makeStars();
    mountMascot();
    syncToggles();
    bindEvents();
    updateHUD();
    if (localStorage.getItem('ddsh_night') === '1') document.body.classList.add('night');
    syncToggles();
    showScreen('start');
    AudioManager.init();
  }

  init();
})();