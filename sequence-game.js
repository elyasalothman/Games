// ─────────────────────────────────────────────
// 🧩 SEQUENCE / SIMON SAYS (لعبة جديدة)
// ─────────────────────────────────────────────
let seqState = { sequence: [], playerStep: 0, level: 1, playing: false };
function initSequence(){
  seqState = { sequence: [], playerStep: 0, level: 1, playing: false };
  document.getElementById('seqLevel').textContent = '1';
  document.getElementById('seqBest').textContent = getStore('best_seq', 0);
  document.getElementById('seqStartBtn').classList.remove('d-none');
}
function startSequence(){
  document.getElementById('seqStartBtn').classList.add('d-none');
  seqState.sequence = []; seqState.level = 1; document.getElementById('seqLevel').textContent = seqState.level;
  nextSeqLevel();
}
function nextSeqLevel(){
  seqState.playerStep = 0;
  seqState.playing = true;
  seqState.sequence.push(Math.floor(Math.random() * 4)); // 0 to 3
  playSequence();
}
function playSequence(){
  let i = 0;
  const interval = setInterval(() => {
    flashSeqBtn(seqState.sequence[i]);
    i++;
    if(i >= seqState.sequence.length) {
      clearInterval(interval);
      seqState.playing = false; // Player's turn
    }
  }, 800);
}
function flashSeqBtn(id){
  const btn = document.getElementById('seq'+id);
  playSound('blip');
  btn.style.opacity = '1';
  btn.style.transform = 'scale(1.05)';
  setTimeout(() => {
    btn.style.opacity = '0.5';
    btn.style.transform = 'scale(1)';
  }, 400);
}
function handleSeqClick(id){
  if(seqState.playing || seqState.sequence.length === 0) return;
  
  flashSeqBtn(id);
  if(id === seqState.sequence[seqState.playerStep]) {
    seqState.playerStep++;
    if(seqState.playerStep === seqState.sequence.length) {
      playSound('levelup');
      seqState.level++; document.getElementById('seqLevel').textContent = seqState.level;
      const best = Math.max(seqState.level - 1, getStore('best_seq', 0));
      setStore('best_seq', best); document.getElementById('seqBest').textContent = best;
      setTimeout(nextSeqLevel, 1000);
    }
  } else {
    playSound('gameover');
    addScore(seqState.level * 10); recordGamePlayed();
    submitScore('sequence', seqState.level - 1, false);
    const startBtn = document.getElementById('seqStartBtn');
    startBtn.classList.remove('d-none');
    startBtn.textContent = '▶ إعادة المحاولة';
    seqState.sequence = [];
    showToast('❌ تسلسل خاطئ!');
  }
}