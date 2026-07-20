// ─────────────────────────────────────────────
// 🌸 حديقة الألوان — هادئة ومناسبة للبنات والعائلة
// ─────────────────────────────────────────────
const GARDEN_FLOWERS = ['🌹', '🌷', '🌻', '🌼', '🌺', '💐', '🪷', '🌸'];
let gardenState = { pairs: [], flipped: [], matched: 0, moves: 0, lock: false };

function initGarden() {
  const icons = GARDEN_FLOWERS.slice(0, 6);
  const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
  gardenState = { pairs: deck, flipped: [], matched: 0, moves: 0, lock: false };
  document.getElementById('gardenMoves').textContent = '0';
  document.getElementById('gardenMatched').textContent = '0';
  document.getElementById('gardenBest').textContent = getStore('best_garden', '-');
  const grid = document.getElementById('gardenGrid');
  if (!grid) return;
  grid.innerHTML = deck.map((icon, i) =>
    `<button type="button" class="garden-card" data-i="${i}" aria-label="وردة">
      <span class="garden-back">🌿</span>
      <span class="garden-front">${icon}</span>
    </button>`
  ).join('');
  grid.querySelectorAll('.garden-card').forEach(btn => {
    btn.addEventListener('click', () => gardenFlip(Number(btn.dataset.i), btn));
  });
}

function gardenFlip(i, btn) {
  if (gardenState.lock || btn.classList.contains('flipped') || btn.classList.contains('matched')) return;
  btn.classList.add('flipped');
  gardenState.flipped.push({ i, btn, icon: gardenState.pairs[i] });
  if (typeof playSound === 'function') playSound('blip');
  if (gardenState.flipped.length < 2) return;

  gardenState.moves++;
  document.getElementById('gardenMoves').textContent = gardenState.moves;
  gardenState.lock = true;
  const [a, b] = gardenState.flipped;
  if (a.icon === b.icon) {
    a.btn.classList.add('matched');
    b.btn.classList.add('matched');
    gardenState.matched++;
    document.getElementById('gardenMatched').textContent = gardenState.matched;
    gardenState.flipped = [];
    gardenState.lock = false;
    if (typeof playSound === 'function') playSound('coin');
    if (gardenState.matched >= 6) gardenWin();
  } else {
    setTimeout(() => {
      a.btn.classList.remove('flipped');
      b.btn.classList.remove('flipped');
      gardenState.flipped = [];
      gardenState.lock = false;
    }, 650);
  }
}

function gardenWin() {
  if (typeof playSound === 'function') playSound('levelup');
  const best = getStore('best_garden', 999);
  if (gardenState.moves < best) {
    setStore('best_garden', gardenState.moves);
    document.getElementById('gardenBest').textContent = gardenState.moves;
  }
  if (typeof submitScore === 'function') submitScore('garden', gardenState.moves, true);
  if (typeof addScore === 'function') addScore(Math.max(20, 120 - gardenState.moves * 4));
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
  if (typeof showToast === 'function') showToast('🌸 أحسنت! حديقتك اكتملت');
}

window.initGarden = initGarden;
