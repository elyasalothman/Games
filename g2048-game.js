// ─────────────────────────────────────────────
// 🔲 2048 — لغز الدمج الشهير (لوحة مفاتيح + سحب باللمس)
// ─────────────────────────────────────────────
let g2048State = { board: [], score: 0, over: false, won: false };
let g2048Touch = { x: 0, y: 0 };
let g2048KeysBound = false;

function initG2048() {
  g2048NewGame();
  if (!g2048KeysBound) {
    g2048KeysBound = true;
    document.addEventListener('keydown', g2048HandleKey);
    const board = document.getElementById('g2048Board');
    if (board) {
      board.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        g2048Touch = { x: t.clientX, y: t.clientY };
      }, { passive: true });
      board.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - g2048Touch.x;
        const dy = t.clientY - g2048Touch.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        e.preventDefault();
        if (Math.abs(dx) > Math.abs(dy)) g2048Move(dx > 0 ? 'right' : 'left');
        else g2048Move(dy > 0 ? 'down' : 'up');
      }, { passive: false });
    }
  }
}

function g2048NewGame() {
  g2048State = { board: Array.from({ length: 4 }, () => Array(4).fill(0)), score: 0, over: false, won: false };
  g2048AddTile();
  g2048AddTile();
  g2048Render();
  const msg = document.getElementById('g2048Message');
  if (msg) msg.textContent = '';
}

function g2048AddTile() {
  const empty = [];
  g2048State.board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  g2048State.board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function g2048SlideRow(row) {
  const vals = row.filter(Boolean);
  let gained = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i] === vals[i + 1]) {
      vals[i] *= 2;
      gained += vals[i];
      if (vals[i] === 2048) g2048State.won = true;
      vals.splice(i + 1, 1);
    }
  }
  while (vals.length < 4) vals.push(0);
  return { row: vals, gained };
}

function g2048Move(dir) {
  if (g2048State.over) return;
  const b = g2048State.board;
  const before = JSON.stringify(b);
  let gained = 0;

  const getLine = (i) => {
    if (dir === 'left') return b[i].slice();
    if (dir === 'right') return b[i].slice().reverse();
    const col = [b[0][i], b[1][i], b[2][i], b[3][i]];
    return dir === 'up' ? col : col.reverse();
  };
  const setLine = (i, line) => {
    if (dir === 'left') { b[i] = line; return; }
    if (dir === 'right') { b[i] = line.slice().reverse(); return; }
    const col = dir === 'up' ? line : line.slice().reverse();
    for (let r = 0; r < 4; r++) b[r][i] = col[r];
  };

  for (let i = 0; i < 4; i++) {
    const res = g2048SlideRow(getLine(i));
    gained += res.gained;
    setLine(i, res.row);
  }

  if (JSON.stringify(b) === before) return;
  g2048State.score += gained;
  if (gained > 0 && typeof playSound === 'function') playSound('coin');
  else if (typeof playSound === 'function') playSound('blip');
  g2048AddTile();
  g2048Render();

  if (g2048State.won) {
    const msg = document.getElementById('g2048Message');
    if (msg && !msg.textContent) msg.textContent = '🎉 وصلت إلى 2048! أكمل للمزيد';
  }
  if (!g2048CanMove()) g2048End();
}

function g2048CanMove() {
  const b = g2048State.board;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!b[r][c]) return true;
      if (c < 3 && b[r][c] === b[r][c + 1]) return true;
      if (r < 3 && b[r][c] === b[r + 1][c]) return true;
    }
  }
  return false;
}

function g2048End() {
  g2048State.over = true;
  const msg = document.getElementById('g2048Message');
  if (msg) msg.textContent = '💀 انتهت اللعبة! النقاط: ' + g2048State.score;
  const best = Math.max(getStore('best_g2048', 0), g2048State.score);
  setStore('best_g2048', best);
  document.getElementById('g2048Best').textContent = best;
  if (typeof submitScore === 'function') submitScore('g2048', g2048State.score, false);
  if (typeof addScore === 'function') addScore(Math.min(120, Math.floor(g2048State.score / 40)));
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
  if (typeof playSound === 'function') playSound('gameover');
}

function g2048HandleKey(e) {
  const overlay = document.getElementById('g2048Overlay');
  if (!overlay || !overlay.classList.contains('active')) return;
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
  const dir = map[e.key];
  if (!dir) return;
  e.preventDefault();
  g2048Move(dir);
}

function g2048Render() {
  const board = document.getElementById('g2048Board');
  if (!board) return;
  board.innerHTML = g2048State.board.flat().map((v) =>
    `<div class="g2048-tile${v ? ' g2048-v' + Math.min(v, 4096) : ''}">${v || ''}</div>`
  ).join('');
  document.getElementById('g2048Score').textContent = g2048State.score;
  document.getElementById('g2048Best').textContent = Math.max(getStore('best_g2048', 0), g2048State.score);
}

window.initG2048 = initG2048;
window.g2048NewGame = g2048NewGame;
window.g2048Move = g2048Move;
