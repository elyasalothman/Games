// ─────────────────────────────────────────────
// 🐍 SNAKE
// ─────────────────────────────────────────────
let snakeGame={running:false,loop:null,snake:[],dir:{x:1,y:0},nextDir:{x:1,y:0},food:{x:0,y:0},score:0,size:16};
const SZ=16, COLS=20, ROWS=20;

function initSnakeDisplay(){
  document.getElementById('snakeBest').textContent=getStore('best_snake',0);
  document.getElementById('snakeScore').textContent=0;
  drawSnakeIdle();
}
function drawSnakeIdle(){
  const canvas=document.getElementById('snakeCanvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,320,320);
  ctx.fillStyle='#0f0f1b'; ctx.fillRect(0,0,320,320); // خلفية أركيد داكنة
  
  // رسم شبكة خفيفة لتسهيل اللعب
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; ctx.lineWidth = 1;
  for(let i=0; i<=COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i*SZ, 0); ctx.lineTo(i*SZ, 320); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*SZ); ctx.lineTo(320, i*SZ); ctx.stroke();
  }

  ctx.fillStyle='#00d2ff'; ctx.font='bold 16px Tajawal'; ctx.textAlign='center';
  ctx.fillText('اضغط ▶ ابدأ للعب', 160, 160);
}
function startSnake(){
  stopSnake();
  snakeGame.snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  snakeGame.dir={x:1,y:0}; snakeGame.nextDir={x:1,y:0};
  snakeGame.score=0; snakeGame.running=true;
  document.getElementById('snakeScore').textContent=0;
  placeSnakeFood();
  // تعديل السرعة هنا (180 بدل 120 ليكون أسهل)
  snakeGame.loop=setInterval(tickSnake,180);
}
function stopSnake(){
  snakeGame.running=false;
  if(snakeGame.loop){clearInterval(snakeGame.loop);snakeGame.loop=null;}
}
function placeSnakeFood(){
  let pos;
  do{pos={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};}
  while(snakeGame.snake.some(s=>s.x===pos.x&&s.y===pos.y));
  snakeGame.food=pos;
}
function snakeDir(dx,dy){
  if(!snakeGame.running){startSnake();return;}
  if(dx===1&&snakeGame.dir.x===-1||dx===-1&&snakeGame.dir.x===1)return;
  if(dy===1&&snakeGame.dir.y===-1||dy===-1&&snakeGame.dir.y===1)return;
  snakeGame.nextDir={x:dx,y:dy};
}
function tickSnake(){
  snakeGame.dir=snakeGame.nextDir;
  const head={x:snakeGame.snake[0].x+snakeGame.dir.x, y:snakeGame.snake[0].y+snakeGame.dir.y};
  
  // تحسين 2: عبور الجدران (الظهور من الجهة المقابلة) بدلاً من الخسارة
  if(head.x < 0) head.x = COLS - 1;
  else if(head.x >= COLS) head.x = 0;
  
  if(head.y < 0) head.y = ROWS - 1;
  else if(head.y >= ROWS) head.y = 0;

  // الخسارة فقط عند الاصطدام بالنفس
  if(snakeGame.snake.some(s=>s.x===head.x&&s.y===head.y)){
    stopSnake(); playSound('gameover');
    submitScore('snake', snakeGame.score, false);
    const best=Math.max(snakeGame.score,getStore('best_snake',0));
    setStore('best_snake',best); document.getElementById('snakeBest').textContent=best;
    addScore(snakeGame.score*10); recordGamePlayed();
    drawSnakeEnd(); return;
  }
  snakeGame.snake.unshift(head);
  if(head.x===snakeGame.food.x&&head.y===snakeGame.food.y){
    snakeGame.score++; playSound('success');
    document.getElementById('snakeScore').textContent=snakeGame.score;
    placeSnakeFood();
  } else { snakeGame.snake.pop(); }
  drawSnake();
}
function drawSnake(){
  const canvas=document.getElementById('snakeCanvas');
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,320,320);
  ctx.fillStyle='#0f0f1b'; ctx.fillRect(0,0,320,320);
  
  // رسم شبكة خفيفة لمساعدة اللاعب في تحديد المسارات
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; ctx.lineWidth = 1;
  for(let i=0; i<=COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i*SZ, 0); ctx.lineTo(i*SZ, 320); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*SZ); ctx.lineTo(320, i*SZ); ctx.stroke();
  }

  ctx.shadowBlur = 10; ctx.shadowColor = '#ff3366'; // توهج الطعام
  ctx.fillStyle='#ff3366'; 
  ctx.beginPath();ctx.arc(snakeGame.food.x*SZ+SZ/2,snakeGame.food.y*SZ+SZ/2,SZ/2-2,0,Math.PI*2);ctx.fill();
  
  ctx.shadowColor = '#00d2ff'; // توهج الثعبان
  ctx.fillStyle='#00d2ff'; 
  snakeGame.snake.forEach((s,i)=>{
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();ctx.roundRect(s.x*SZ+1,s.y*SZ+1,SZ-2,SZ-2,4);ctx.fill();
    } else {
      ctx.fillRect(s.x*SZ+1,s.y*SZ+1,SZ-2,SZ-2);
    }
  });
  ctx.shadowBlur = 0; // إعادة ضبط التوهج
}
function drawSnakeEnd(){
  const canvas=document.getElementById('snakeCanvas');
  const ctx=canvas.getContext('2d');
  drawSnake();
  ctx.fillStyle='rgba(15,15,27,0.8)'; ctx.fillRect(0,0,320,320);
  ctx.fillStyle='#ff3366'; ctx.font='bold 20px Tajawal'; ctx.textAlign='center';
  ctx.fillText('انتهت اللعبة!', 160,140);
  ctx.fillStyle='#fff'; ctx.font='bold 16px Tajawal';
  ctx.fillText('النقاط: '+snakeGame.score, 160, 170);
}
document.addEventListener('keydown',e=>{
  const m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  const d=m[e.key];
  if(d&&document.getElementById('snakeOverlay').classList.contains('active')){e.preventDefault();snakeDir(d[0],d[1]);}
});