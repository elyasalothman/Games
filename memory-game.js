// ─────────────────────────────────────────────
// 🧠 MEMORY
// ─────────────────────────────────────────────
const MEM_EMOJIS=['🌟','🦋','🎸','🍕','🌈','🦊','🎮','🌺'];
let memState={cards:[],flipped:[],matched:0,attempts:0,locked:false};
function initMemory(){
  const pairs=[...MEM_EMOJIS,...MEM_EMOJIS].sort(()=>Math.random()-0.5);
  memState={cards:pairs.map((e,i)=>({id:i,emoji:e,flipped:false,matched:false})),flipped:[],matched:0,attempts:0,locked:false};
  document.getElementById('memAttempts').textContent=0;
  document.getElementById('memMatched').textContent=0;
  document.getElementById('memBest').textContent=getStore('best_memory','-');
  renderMemory();
}
function renderMemory(){
  const g=document.getElementById('memoryGrid'); g.innerHTML='';
  memState.cards.forEach((c,i)=>{
    const d=document.createElement('div');
    d.className='mem-card';
    if (c.flipped) d.classList.add('flipped');
    if (c.matched) d.classList.add('matched');
    d.innerHTML=`<span>${c.emoji}</span>`;
    if(!c.matched) d.onclick=()=>flipCard(i);
    g.appendChild(d);
  });
}
function flipCard(i){
  if(memState.locked||memState.cards[i].flipped||memState.cards[i].matched)return;
  playSound('blip');
  memState.cards[i].flipped=true; memState.flipped.push(i); renderMemory();
  if(memState.flipped.length===2){
    memState.attempts++; document.getElementById('memAttempts').textContent=memState.attempts;
    memState.locked=true;
    const [a,b]=memState.flipped;
    if(memState.cards[a].emoji===memState.cards[b].emoji){
      playSound('coin');
      memState.cards[a].matched=memState.cards[b].matched=true;
      memState.matched++; document.getElementById('memMatched').textContent=memState.matched;
      memState.flipped=[]; memState.locked=false; renderMemory();
      if(memState.matched===8){
        playSound('levelup');
        submitScore('memory', memState.attempts, true);
        const best=getStore('best_memory',999);
        if(memState.attempts<best){setStore('best_memory',memState.attempts);document.getElementById('memBest').textContent=memState.attempts;}
        addScore(100); recordGamePlayed(); showToast('🎉 أحسنت!');
      }
    } else {
      setTimeout(()=>{
        memState.cards[a].flipped=memState.cards[b].flipped=false;
        memState.flipped=[]; memState.locked=false; renderMemory();
      },800);
    }
  }
}