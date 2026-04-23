// ─────────────────────────────────────────────
// 🤔 NUMBER GUESSER
// ─────────────────────────────────────────────
let guessState={secret:0, attempts:0};
function initGuesser(){
  guessState.secret = Math.floor(Math.random() * 100) + 1;
  guessState.attempts = 0;
  document.getElementById('guessAttempts').textContent = 0;
  document.getElementById('guessBest').textContent = getStore('best_guess', '-');
  document.getElementById('guessMessage').textContent = 'أنا أفكر في رقم بين 1 و 100';
  document.getElementById('guessMessage').style.color = 'var(--text-main)';
  document.getElementById('guessInput').value = '';
  document.getElementById('guessInput').disabled = false;
}
function checkGuess(){
  const input = document.getElementById('guessInput');
  const msg = document.getElementById('guessMessage');
  const val = parseInt(input.value);
  if(isNaN(val) || val < 1 || val > 100) {
    msg.textContent = 'الرجاء إدخال رقم صحيح من 1 إلى 100!';
    playSound('gameover'); return;
  }
  guessState.attempts++;
  document.getElementById('guessAttempts').textContent = guessState.attempts;
  
  if(val === guessState.secret){
    playSound('levelup');
    msg.textContent = `🎉 صحيح! الرقم هو ${guessState.secret}`;
    msg.style.color = 'var(--accent-green)';
    input.disabled = true;
    submitScore('guesser', guessState.attempts, true);
    const best = getStore('best_guess', 999);
    if(guessState.attempts < best) { setStore('best_guess', guessState.attempts); document.getElementById('guessBest').textContent = guessState.attempts; }
    addScore(100 - (guessState.attempts * 5)); recordGamePlayed();
  } else if (val < guessState.secret) {
    playSound('blip'); msg.textContent = '⬆️ الرقم السري أكبر!'; msg.style.color = 'var(--accent-blue)';
  } else {
    playSound('blip'); msg.textContent = '⬇️ الرقم السري أصغر!'; msg.style.color = 'var(--accent-orange)';
  }
  input.value = ''; input.focus();
}