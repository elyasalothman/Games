// ─────────────────────────────────────────────
// 🔨 اضرب الخُلد — لعبة سرعة وردة فعل للعائلة
// ─────────────────────────────────────────────
let moleState = { score: 0, time: 30, running: false, spawnTimer: null, clockTimer: null, activeCells: {} };
let moleSpawnSeq = 0;

function initMole() {
  stopMole();
  moleState = { score: 0, time: 30, running: false, spawnTimer: null, clockTimer: null, activeCells: {} };
  document.getElementById('moleScore').textContent = '0';
  document.getElementById('moleTime').textContent = '30';
  document.getElementById('moleBest').textContent = getStore('best_mole', 0);
  renderMoleGrid();
  const btn = document.getElementById('moleStartBtn');
  if (btn) { btn.disabled = false; btn.textContent = '▶ ابدأ اللعب'; }
}

function renderMoleGrid() {
  const grid = document.getElementById('moleGrid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 9 }, (_, i) =>
    `<button type="button" class="mole-hole" data-i="${i}" aria-label="حفرة ${i + 1}"><span class="mole-face"></span></button>`
  ).join('');
  grid.querySelectorAll('.mole-hole').forEach((cell) => {
    cell.addEventListener('click', () => whackMole(Number(cell.dataset.i)));
  });
}

function startMole() {
  stopMole();
  moleState = { score: 0, time: 30, running: true, spawnTimer: null, clockTimer: null, activeCells: {} };
  document.getElementById('moleScore').textContent = '0';
  document.getElementById('moleTime').textContent = '30';
  renderMoleGrid();
  const btn = document.getElementById('moleStartBtn');
  if (btn) { btn.disabled = true; btn.textContent = '🔨 اضرب!'; }
  if (typeof recordGamePlayed === 'function') recordGamePlayed();

  moleState.spawnTimer = setInterval(spawnMole, 650);
  moleState.clockTimer = setInterval(() => {
    if (!moleState.running) return;
    moleState.time--;
    document.getElementById('moleTime').textContent = moleState.time;
    if (moleState.time <= 0) endMole();
  }, 1000);
}

function spawnMole() {
  if (!moleState.running) return;
  const grid = document.getElementById('moleGrid');
  if (!grid) return;
  const free = Array.from({ length: 9 }, (_, i) => i).filter((i) => !moleState.activeCells[i]);
  if (!free.length) return;
  const i = free[Math.floor(Math.random() * free.length)];
  const cell = grid.querySelector(`.mole-hole[data-i="${i}"]`);
  if (!cell) return;

  // 15% قنبلة تخصم نقاطاً، والباقي خُلد عادي أو ذهبي نادر
  const roll = Math.random();
  const kind = roll < 0.15 ? 'bomb' : roll < 0.25 ? 'gold' : 'mole';
  const seq = ++moleSpawnSeq;
  moleState.activeCells[i] = { kind, seq };
  cell.classList.add('up', kind);
  cell.querySelector('.mole-face').textContent = kind === 'bomb' ? '💣' : kind === 'gold' ? '👑' : '🐹';

  const hideAfter = kind === 'gold' ? 1000 : 1500;
  setTimeout(() => {
    // لا تُخفِ خُلداً جديداً ظهر في نفس الحفرة بعد ضرب القديم
    if (moleState.activeCells[i] && moleState.activeCells[i].seq === seq) hideMole(i);
  }, hideAfter);
}

function hideMole(i) {
  if (!moleState.activeCells[i]) return;
  delete moleState.activeCells[i];
  const cell = document.querySelector(`#moleGrid .mole-hole[data-i="${i}"]`);
  if (cell) {
    cell.classList.remove('up', 'mole', 'gold', 'bomb', 'hit');
    const face = cell.querySelector('.mole-face');
    if (face) face.textContent = '';
  }
}

function whackMole(i) {
  if (!moleState.running) return;
  const active = moleState.activeCells[i];
  if (!active) return;
  const kind = active.kind;
  const cell = document.querySelector(`#moleGrid .mole-hole[data-i="${i}"]`);
  if (kind === 'bomb') {
    moleState.score = Math.max(0, moleState.score - 20);
    if (typeof playSound === 'function') playSound('gameover');
    if (cell) cell.classList.add('boom');
    setTimeout(() => cell && cell.classList.remove('boom'), 300);
  } else {
    moleState.score += kind === 'gold' ? 30 : 10;
    if (typeof playSound === 'function') playSound(kind === 'gold' ? 'levelup' : 'coin');
    if (cell) cell.classList.add('hit');
  }
  document.getElementById('moleScore').textContent = moleState.score;
  hideMole(i);
}

function endMole() {
  moleState.running = false;
  clearInterval(moleState.spawnTimer);
  clearInterval(moleState.clockTimer);
  Object.keys(moleState.activeCells).forEach((i) => hideMole(Number(i)));
  const btn = document.getElementById('moleStartBtn');
  if (btn) { btn.disabled = false; btn.textContent = '▶ جولة جديدة'; }
  const best = Math.max(getStore('best_mole', 0), moleState.score);
  setStore('best_mole', best);
  document.getElementById('moleBest').textContent = best;
  if (typeof submitScore === 'function') submitScore('mole', moleState.score, false);
  if (typeof addScore === 'function') addScore(Math.min(100, Math.floor(moleState.score / 4)));
  if (typeof playSound === 'function') playSound('gameover');
  if (typeof showToast === 'function') showToast('🔨 انتهى الوقت! نقاطك: ' + moleState.score);
}

function stopMole() {
  clearInterval(moleState.spawnTimer);
  clearInterval(moleState.clockTimer);
  moleState.spawnTimer = null;
  moleState.clockTimer = null;
  moleState.running = false;
}

window.initMole = initMole;
window.startMole = startMole;
window.stopMole = stopMole;
