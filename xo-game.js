// ─────────────────────────────────────────────
// ❌⭕ إكس أو — كلاسيكية للعائلة
// ─────────────────────────────────────────────
let xoState = { board: Array(9).fill(''), turn: 'X', over: false, mode: 'bot' };

function initXO() {
  xoState = { board: Array(9).fill(''), turn: 'X', over: false, mode: document.getElementById('xoMode')?.value || 'bot' };
  document.getElementById('xoStatus').textContent = 'دورك X';
  document.getElementById('xoWins').textContent = getStore('xo_player_wins', 0);
  renderXO();
}

function renderXO() {
  const grid = document.getElementById('xoGrid');
  if (!grid) return;
  grid.innerHTML = xoState.board.map((cell, i) =>
    `<button type="button" class="xo-cell${cell ? ' filled' : ''}" data-i="${i}">${cell}</button>`
  ).join('');
  grid.querySelectorAll('.xo-cell').forEach(btn => {
    btn.addEventListener('click', () => xoPlay(Number(btn.dataset.i)));
  });
}

function xoWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : null;
}

function xoPlay(i) {
  if (xoState.over || xoState.board[i]) return;
  if (xoState.mode === 'bot' && xoState.turn !== 'X') return;
  xoState.board[i] = xoState.turn;
  if (typeof playSound === 'function') playSound('blip');
  const w = xoWinner(xoState.board);
  if (w) return xoEnd(w);
  xoState.turn = xoState.turn === 'X' ? 'O' : 'X';
  document.getElementById('xoStatus').textContent = xoState.turn === 'X' ? 'دورك X' : (xoState.mode === 'bot' ? 'دور الكمبيوتر…' : 'دور O');
  renderXO();
  if (xoState.mode === 'bot' && xoState.turn === 'O' && !xoState.over) {
    setTimeout(xoBotMove, 380);
  }
}

function xoBotMove() {
  const empties = xoState.board.map((v, i) => v ? null : i).filter(v => v !== null);
  if (!empties.length) return;
  // try win / block
  let choice = empties[Math.floor(Math.random() * empties.length)];
  for (const mark of ['O', 'X']) {
    for (const i of empties) {
      const trial = xoState.board.slice();
      trial[i] = mark;
      if (xoWinner(trial) === mark) { choice = i; break; }
    }
  }
  xoState.board[choice] = 'O';
  const w = xoWinner(xoState.board);
  if (w) return xoEnd(w);
  xoState.turn = 'X';
  document.getElementById('xoStatus').textContent = 'دورك X';
  renderXO();
}

function xoEnd(result) {
  xoState.over = true;
  renderXO();
  if (result === 'draw') {
    document.getElementById('xoStatus').textContent = 'تعادل!';
    if (typeof playSound === 'function') playSound('blip');
  } else if (result === 'X') {
    document.getElementById('xoStatus').textContent = '🎉 فزت!';
    const wins = getStore('xo_player_wins', 0) + 1;
    setStore('xo_player_wins', wins);
    setStore('best_xo', wins);
    document.getElementById('xoWins').textContent = wins;
    if (typeof playSound === 'function') playSound('levelup');
    if (typeof addScore === 'function') addScore(40);
    if (typeof submitScore === 'function') submitScore('xo', wins, false);
  } else {
    document.getElementById('xoStatus').textContent = 'خسرت هذه الجولة';
    if (typeof playSound === 'function') playSound('gameover');
  }
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
}

window.initXO = initXO;
window.startXO = initXO;
