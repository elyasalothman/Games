// ─────────────────────────────────────────────
// 🔢 MATH
// ─────────────────────────────────────────────
let mathState={score:0,q:0,total:10,timer:null,timerVal:0,active:false};
function initMath() {
  document.getElementById('mathScore').textContent = 0;
  document.getElementById('mathQ').textContent = 1;
  document.getElementById('mathBest').textContent = getStore('best_math', 0);
}
function startMath(){
  mathState={score:0,q:0,total:10,timer:null,timerVal:0,active:true};
  document.getElementById('mathStartBtn').classList.add('d-none');
  nextMathQ();
}
function stopMath(){if(mathState.timer)clearInterval(mathState.timer);mathState.active=false;}
function nextMathQ(){
  if(mathState.q>=mathState.total){endMath();return;}
  mathState.q++; document.getElementById('mathQ').textContent=mathState.q;
  const ops=['+','-','×']; const op=ops[Math.floor(Math.random()*ops.length)];
  let a=Math.floor(Math.random()*10)+2,b=Math.floor(Math.random()*10)+2,ans;
  if(op==='+')ans=a+b; else if(op==='-'){if(a<b){const t=a;a=b;b=t;}ans=a-b;} else ans=a*b;
  document.getElementById('mathQuestion').textContent=`${a} ${op} ${b} = ?`;
  const opts=new Set([ans]);
  while(opts.size<4){const w=ans+Math.floor(Math.random()*10)-5;if(w!==ans&&w>=0)opts.add(w);}
  const shuffled=[...opts].sort(()=>Math.random()-0.5);
  const cont=document.getElementById('mathOptions'); cont.innerHTML='';
  shuffled.forEach(o=>{
    const btn=document.createElement('button');
    btn.className='math-opt btn'; btn.textContent=o; // .math-opt is new
    btn.onclick=()=>answerMath(btn,o,ans);
    cont.appendChild(btn);
  });
  startMathTimer(ans);
}
function startMathTimer(correctAns){
  if(mathState.timer)clearInterval(mathState.timer);
  let t=100; const bar=document.getElementById('timerBar');
  bar.style.width='100%'; bar.style.backgroundColor='var(--accent-blue)';
  mathState.timer=setInterval(()=>{
    t-=0.7; // كان 1.4، الآن أبطأ بالنصف (وقت أكثر)
    bar.style.width=t+'%';
    if(t<30) bar.style.backgroundColor='var(--accent-red)';
    if(t<=0){clearInterval(mathState.timer); playSound('gameover'); wrongFlash(correctAns); setTimeout(nextMathQ,800);}
  },70);
}
function answerMath(btn,chosen,correct){
  clearInterval(mathState.timer);
  document.querySelectorAll('.math-opt').forEach(b=>b.onclick=null);
  btn.classList.remove('primary', 'danger'); // Reset any previous state
  if(chosen===correct){
    playSound('coin'); btn.classList.add('btn-green');
    mathState.score++; document.getElementById('mathScore').textContent=mathState.score;
    setTimeout(nextMathQ,500);
  } else {
    playSound('gameover'); btn.classList.add('danger');
    wrongFlash(correct); setTimeout(nextMathQ,800);
  }
}
function wrongFlash(correct){
  document.querySelectorAll('.math-opt').forEach(b=>{
    if(parseInt(b.textContent)===correct){ b.classList.add('btn-green'); }
  });
}
function endMath(){
  mathState.active=false;
  submitScore('math', mathState.score, false);
  const best=Math.max(mathState.score,getStore('best_math',0));
  setStore('best_math',best); document.getElementById('mathBest').textContent=best;
  addScore(mathState.score*10); recordGamePlayed();
  document.getElementById('mathQuestion').textContent='انتهى التحدي!';
  document.getElementById('mathOptions').innerHTML='';
  const startBtn = document.getElementById('mathStartBtn');
  startBtn.classList.remove('d-none');
  startBtn.textContent='▶ العب مجدداً';
}