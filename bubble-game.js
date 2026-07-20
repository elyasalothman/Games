// ─────────────────────────────────────────────
// 🫧 فقاعات الألوان — للأطفال
// ─────────────────────────────────────────────
let bubbleState = { score: 0, lives: 3, running: false, timer: null, spawn: null };

function initBubble() {
  bubbleState = { score: 0, lives: 3, running: false, timer: null, spawn: null };
  const area = document.getElementById('bubbleArea');
  if (area) area.innerHTML = '';
  document.getElementById('bubbleScore').textContent = '0';
  document.getElementById('bubbleLives').textContent = '3';
  document.getElementById('bubbleBest').textContent = getStore('best_bubble', 0);
  document.getElementById('bubbleStartBtn')?.classList.remove('d-none');
}

function startBubble() {
  stopBubble();
  bubbleState = { score: 0, lives: 3, running: true, timer: null, spawn: null };
  document.getElementById('bubbleScore').textContent = '0';
  document.getElementById('bubbleLives').textContent = '3';
  document.getElementById('bubbleStartBtn')?.classList.add('d-none');
  document.getElementById('bubbleArea').innerHTML = '';
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
  bubbleState.spawn = setInterval(spawnBubble, 700);
  bubbleState.timer = setInterval(() => {
    if (!bubbleState.running) return;
    // miss bubbles that reached top already handled on click miss via timeout
  }, 1000);
}

function spawnBubble() {
  if (!bubbleState.running) return;
  const area = document.getElementById('bubbleArea');
  if (!area) return;
  const colors = ['#ff7b6b', '#6ec8ff', '#5eeaa0', '#ffc857', '#c77dff', '#ff9ecd'];
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'bubble-orb';
  el.style.background = colors[Math.floor(Math.random() * colors.length)];
  el.style.left = (8 + Math.random() * 78) + '%';
  el.style.animationDuration = (2.8 + Math.random() * 2.2) + 's';
  const size = 42 + Math.floor(Math.random() * 36);
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.setAttribute('aria-label', 'فقّاعة');
  let popped = false;
  el.onclick = () => {
    if (popped || !bubbleState.running) return;
    popped = true;
    bubbleState.score += Math.max(5, 50 - Math.floor(size / 2));
    document.getElementById('bubbleScore').textContent = bubbleState.score;
    el.classList.add('pop');
    if (typeof playSound === 'function') playSound('coin');
    setTimeout(() => el.remove(), 180);
  };
  el.addEventListener('animationend', () => {
    if (popped || !bubbleState.running) { el.remove(); return; }
    popped = true;
    el.remove();
    bubbleState.lives--;
    document.getElementById('bubbleLives').textContent = bubbleState.lives;
    if (typeof playSound === 'function') playSound('blip');
    if (bubbleState.lives <= 0) endBubble();
  });
  area.appendChild(el);
}

function endBubble() {
  bubbleState.running = false;
  stopBubble();
  document.getElementById('bubbleStartBtn')?.classList.remove('d-none');
  const best = Math.max(getStore('best_bubble', 0), bubbleState.score);
  setStore('best_bubble', best);
  document.getElementById('bubbleBest').textContent = best;
  if (typeof submitScore === 'function') submitScore('bubble', bubbleState.score, false);
  if (typeof addScore === 'function') addScore(Math.min(80, Math.floor(bubbleState.score / 5)));
  if (typeof playSound === 'function') playSound('gameover');
  if (typeof showToast === 'function') showToast('🫧 انتهت الجولة! النقاط: ' + bubbleState.score);
}

function stopBubble() {
  clearInterval(bubbleState.spawn);
  clearInterval(bubbleState.timer);
  bubbleState.spawn = null;
  bubbleState.timer = null;
  bubbleState.running = false;
}

window.initBubble = initBubble;
window.startBubble = startBubble;
window.stopBubble = stopBubble;
