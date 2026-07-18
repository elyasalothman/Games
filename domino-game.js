// ─────────────────────────────────────────────
// 🀄 DOMINO (دومينو ضد البوت)
// ─────────────────────────────────────────────

let dominoState = {
  board: [],
  hand: [],
  boneyard: [],
  leftEnd: null,
  rightEnd: null,
  playerTurn: true,
  playerWins: 0,
  botWins: 0,
  active: false
};

function createDominoSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ left: a, right: b, id: `${a}-${b}` });
    }
  }
  return tiles.sort(() => Math.random() - 0.5);
}

function initDomino() {
  dominoState.playerWins = getStore('domino_player_wins', 0);
  dominoState.botWins = getStore('domino_bot_wins', 0);
  document.getElementById('dominoPlayerWins').textContent = dominoState.playerWins;
  document.getElementById('dominoBotWins').textContent = dominoState.botWins;
  document.getElementById('dominoStatus').textContent = '—';
  document.getElementById('dominoBoard').innerHTML = '';
  document.getElementById('dominoHand').innerHTML = '';
  document.getElementById('dominoDrawBtn').disabled = true;
}

function closeDomino() {
  dominoState.active = false;
}

function startDomino() {
  const deck = createDominoSet();
  dominoState.hand = deck.splice(0, 7);
  const botHand = deck.splice(0, 7);
  dominoState.boneyard = deck;
  dominoState.botHand = botHand;
  dominoState.board = [];
  dominoState.leftEnd = null;
  dominoState.rightEnd = null;
  dominoState.playerTurn = true;
  dominoState.active = true;

  document.getElementById('dominoStatus').textContent = 'دورك';
  renderDominoBoard();
  renderDominoHand();
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
}

function renderDominoTile(tile, clickable, side) {
  const el = document.createElement('div');
  el.className = 'domino-tile' + (clickable ? '' : ' disabled');
  el.innerHTML = `<span class="pip-top">${tile.left}</span><span class="pip-divider"></span><span class="pip-bot">${tile.right}</span>`;
  if (clickable) {
    el.onclick = () => playDominoTile(tile, side);
  }
  return el;
}

function renderDominoBoard() {
  const board = document.getElementById('dominoBoard');
  board.innerHTML = '';
  if (dominoState.board.length === 0) {
    board.innerHTML = '<span style="color:var(--text-muted);font-size:14px;">اختر قطعة للبدء</span>';
    return;
  }
  dominoState.board.forEach(t => board.appendChild(renderDominoTile(t, false)));
}

function getValidSides(tile) {
  if (dominoState.board.length === 0) return ['start'];
  const sides = [];
  if (tile.left === dominoState.leftEnd || tile.right === dominoState.leftEnd) sides.push('left');
  if (tile.left === dominoState.rightEnd || tile.right === dominoState.rightEnd) sides.push('right');
  return sides;
}

function renderDominoHand() {
  const hand = document.getElementById('dominoHand');
  hand.innerHTML = '';
  dominoState.hand.forEach(tile => {
    const sides = dominoState.playerTurn ? getValidSides(tile) : [];
    const canPlay = sides.length > 0;
    const el = renderDominoTile(tile, canPlay && dominoState.playerTurn, sides[0]);
    if (!canPlay && dominoState.playerTurn) el.classList.add('disabled');
    hand.appendChild(el);
  });
  document.getElementById('dominoDrawBtn').disabled = !dominoState.playerTurn || !canDrawDomino();
}

function canDrawDomino() {
  if (dominoState.boneyard.length === 0) return false;
  if (dominoState.board.length === 0) return true;
  return dominoState.hand.some(t => getValidSides(t).length > 0) === false;
}

function playDominoTile(tile, side) {
  if (!dominoState.playerTurn || !dominoState.active) return;
  const idx = dominoState.hand.findIndex(t => t.id === tile.id);
  if (idx === -1) return;

  if (dominoState.board.length === 0) {
    dominoState.board.push(tile);
    dominoState.leftEnd = tile.left;
    dominoState.rightEnd = tile.right;
  } else if (side === 'left') {
    let placed = { ...tile };
    if (placed.right === dominoState.leftEnd) {
      dominoState.leftEnd = placed.left;
    } else if (placed.left === dominoState.leftEnd) {
      placed = { left: placed.right, right: placed.left, id: placed.id };
      dominoState.leftEnd = placed.left;
    } else return;
    dominoState.board.unshift(placed);
  } else {
    let placed = { ...tile };
    if (placed.left === dominoState.rightEnd) {
      dominoState.rightEnd = placed.right;
    } else if (placed.right === dominoState.rightEnd) {
      placed = { left: placed.right, right: placed.left, id: placed.id };
      dominoState.rightEnd = placed.right;
    } else return;
    dominoState.board.push(placed);
  }

  dominoState.hand.splice(idx, 1);
  if (typeof playSound === 'function') playSound('card');
  renderDominoBoard();
  renderDominoHand();

  if (dominoState.hand.length === 0) {
    endDominoRound(true);
    return;
  }
  dominoState.playerTurn = false;
  document.getElementById('dominoStatus').textContent = 'دور البوت...';
  setTimeout(botDominoTurn, 800);
}

function drawDominoTile() {
  if (!dominoState.playerTurn || dominoState.boneyard.length === 0) return;
  dominoState.hand.push(dominoState.boneyard.pop());
  if (typeof playSound === 'function') playSound('blip');
  renderDominoHand();
}

function botDominoTurn() {
  if (!dominoState.active) return;
  const bot = dominoState.botHand;

  for (let i = 0; i < bot.length; i++) {
    const tile = bot[i];
    const sides = getValidSides(tile);
    if (sides.length > 0) {
      bot.splice(i, 1);
      const side = sides[0];
      if (dominoState.board.length === 0) {
        dominoState.board.push(tile);
        dominoState.leftEnd = tile.left;
        dominoState.rightEnd = tile.right;
      } else if (side === 'left') {
        let placed = { ...tile };
        if (placed.right === dominoState.leftEnd) dominoState.leftEnd = placed.left;
        else { placed = { left: placed.right, right: placed.left, id: placed.id }; dominoState.leftEnd = placed.left; }
        dominoState.board.unshift(placed);
      } else {
        let placed = { ...tile };
        if (placed.left === dominoState.rightEnd) dominoState.rightEnd = placed.right;
        else { placed = { left: placed.right, right: placed.left, id: placed.id }; dominoState.rightEnd = placed.right; }
        dominoState.board.push(placed);
      }
      renderDominoBoard();
      if (bot.length === 0) { endDominoRound(false); return; }
      dominoState.playerTurn = true;
      document.getElementById('dominoStatus').textContent = 'دورك';
      renderDominoHand();
      return;
    }
  }

  if (dominoState.boneyard.length > 0) {
    bot.push(dominoState.boneyard.pop());
    setTimeout(botDominoTurn, 400);
    return;
  }

  dominoState.playerTurn = true;
  document.getElementById('dominoStatus').textContent = 'تعادل — دورك';
  renderDominoHand();
}

function endDominoRound(playerWon) {
  dominoState.active = false;
  if (playerWon) {
    dominoState.playerWins++;
    setStore('domino_player_wins', dominoState.playerWins);
    document.getElementById('dominoStatus').textContent = '🎉 فزت!';
    if (typeof playSound === 'function') playSound('levelup');
    if (typeof addScore === 'function') addScore(50);
  } else {
    dominoState.botWins++;
    setStore('domino_bot_wins', dominoState.botWins);
    document.getElementById('dominoStatus').textContent = '🤖 البوت فاز';
    if (typeof playSound === 'function') playSound('gameover');
  }
  document.getElementById('dominoPlayerWins').textContent = dominoState.playerWins;
  document.getElementById('dominoBotWins').textContent = dominoState.botWins;
  const best = Math.max(dominoState.playerWins, getStore('best_domino', 0));
  setStore('best_domino', best);
  if (typeof submitScore === 'function') submitScore('domino', dominoState.playerWins, false);
}
