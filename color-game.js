// ─────────────────────────────────────────────
// 🎨 COLOR MATCH
// ─────────────────────────────────────────────
const COLORS=[
  {name:'أحمر', hex:'#ff3b30'},{name:'أزرق', hex:'#007aff'},
  {name:'أخضر', hex:'#34c759'},{name:'أصفر', hex:'#ffcc00'},
  {name:'بنفسجي', hex:'#af52de'},{name:'برتقالي', hex:'#ff9500'}
];
let colorState={score:0,wrong:0,timer:null,active:false,correctColor:null};
function initColor(){
  colorState={score:0,wrong:0,timer:null,active:false,correctColor:null};
  document.getElementById('colorScore').textContent=0; document.getElementById('colorWrong').textContent=0;
  document.getElementById('colorBest').textContent=getStore('best_color',0);
  const colorWordEl = document.getElementById('colorWord');
  colorWordEl.className = 'color-word';
  colorWordEl.textContent='لعبة الألوان';
  colorWordEl.style.color = 'var(--text-main)';
  document.getElementById('colorOptions').innerHTML='';
  document.getElementById('colorStartBtn').classList.remove('d-none');
  document.getElementById('timerBar').style.width='100%';
}
function startColor(){
  colorState.active=true; colorState.score=0; colorState.wrong=0;
  document.getElementById('colorStartBtn').classList.add('d-none');
  nextColorQ();
}
function stopColor(){if(colorState.timer)clearInterval(colorState.timer);colorState.active=false;}
function nextColorQ(){
  if(!colorState.active)return;
  const displayColor=COLORS[Math.floor(Math.random()*COLORS.length)];
  const textColor=COLORS[Math.floor(Math.random()*COLORS.length)];
  colorState.correctColor=textColor;
  document.getElementById('colorWord').textContent=displayColor.name;
  document.getElementById('colorWord').style.color=textColor.hex;
  const shuffled=COLORS.sort(()=>Math.random()-0.5).slice(0,4);
  if(!shuffled.some(c=>c.name===textColor.name)) shuffled[0]=textColor;
  shuffled.sort(()=>Math.random()-0.5);
  const opts=document.getElementById('colorOptions'); opts.innerHTML='';
  shuffled.forEach(c=>{
    const btn=document.createElement('button');
    btn.className = 'color-opt-btn';
    btn.style.background = c.hex;
    btn.textContent=c.name; btn.onclick=()=>answerColor(c.name===textColor.name,btn);
    opts.appendChild(btn);
  });
  startColorTimer();
}
function startColorTimer(){
  if(colorState.timer)clearInterval(colorState.timer);
  let t=100; const bar=document.getElementById('timerBar');
  bar.style.width='100%'; bar.style.backgroundColor='var(--accent-blue)';
  colorState.timer=setInterval(()=>{
    t-=1; // كان 2، الآن أبطأ بالنصف (وقت أكثر)
    bar.style.width=t+'%';
    if(t<30) bar.style.backgroundColor='var(--accent-red)';
    if(t<=0){
      clearInterval(colorState.timer); playSound('gameover'); colorState.wrong++;
      document.getElementById('colorWrong').textContent=colorState.wrong;
      if(colorState.wrong>=3) endColor(); else nextColorQ();
    }
  },100);
}
function answerColor(correct,btn){
  clearInterval(colorState.timer);
  document.querySelectorAll('#colorOptions button').forEach(b=>b.onclick=null);
  if(correct){
    playSound('coin'); colorState.score++; document.getElementById('colorScore').textContent=colorState.score;
    const best=Math.max(colorState.score,getStore('best_color',0));
    setStore('best_color',best); document.getElementById('colorBest').textContent=best;
    setTimeout(nextColorQ,400);
  } else {
    playSound('gameover'); colorState.wrong++; document.getElementById('colorWrong').textContent=colorState.wrong;
    btn.classList.add('answered-wrong');
    if(colorState.wrong>=3) setTimeout(endColor,400); else setTimeout(nextColorQ,400);
  }
}
function endColor(){
  colorState.active=false; addScore(colorState.score*10); recordGamePlayed();
  submitScore('color', colorState.score, false);
  const colorWordEl = document.getElementById('colorWord');
  colorWordEl.textContent='انتهت اللعبة!';
  colorWordEl.classList.add('ended');
  document.getElementById('colorOptions').innerHTML='';
  document.getElementById('colorStartBtn').classList.remove('d-none'); document.getElementById('colorStartBtn').textContent='▶ العب مجدداً';
}