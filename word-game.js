// ─────────────────────────────────────────────
// 📝 WORD SCRAMBLE
// ─────────────────────────────────────────────
const WORDS=[
  {word:'تفاحة',hint:'🍎 فاكهة حمراء'},{word:'بحر',hint:'🌊 مسطح مائي ضخم'},
  {word:'شمس',hint:'☀️ نجم يضيء نهارنا'},{word:'كتاب',hint:'📖 نقرأ منه'},
  {word:'مدرسة',hint:'🏫 مكان للتعلم'},{word:'سيارة',hint:'🚗 وسيلة مواصلات'}
];
let wordState={score:0,num:0,answer:[],tiles:[],usedIdx:[],current:null};
function initWord(){
  wordState={score:0,num:0,answer:[],tiles:[],usedIdx:[],current:null};
  document.getElementById('wordScore').textContent=0;
  document.getElementById('wordBest').textContent=getStore('best_word',0);
  loadNextWord();
}
function loadNextWord(){
  const w=WORDS[wordState.num%WORDS.length]; wordState.current=w;
  wordState.answer=new Array(w.word.length).fill(null); wordState.usedIdx=[];
  const scrambled=w.word.split('').sort(()=>Math.random()-0.5);
  wordState.tiles=scrambled;
  document.getElementById('wordNum').textContent=wordState.num+1;
  document.getElementById('wordHint').textContent=w.hint;
  renderWord();
}
function renderWord(){
  const slots=document.getElementById('answerSlots'); const letters=document.getElementById('wordLetters');
  slots.innerHTML='';
  wordState.answer.forEach((l,i)=>{
    const d=document.createElement('div'); d.className='answer-slot';
    d.textContent=l||''; if(l) d.onclick=()=>removeFromAnswer(i);
    slots.appendChild(d);
  });
  letters.innerHTML='';
  wordState.tiles.forEach((l,i)=>{
    const d=document.createElement('div');
    d.className = 'word-letter';
    if(wordState.usedIdx.includes(i)) d.classList.add('used');
    d.textContent=l; if(!wordState.usedIdx.includes(i)) d.onclick=()=>addToAnswer(i,l);
    letters.appendChild(d);
  });
}
function addToAnswer(idx,letter){
  playSound('blip');
  const emptySlot=wordState.answer.indexOf(null); if(emptySlot===-1)return;
  wordState.answer[emptySlot]=letter; wordState.usedIdx.push(idx); renderWord();
  if(!wordState.answer.includes(null)) checkWord();
}
function removeFromAnswer(i){
  playSound('blip');
  const letter=wordState.answer[i];
  const tileIdx=wordState.tiles.findIndex((t,ti)=>t===letter&&wordState.usedIdx.includes(ti)&&!wordState.answer.slice(0,i).includes(t));
  wordState.answer[i]=null; wordState.usedIdx.splice(wordState.usedIdx.indexOf(tileIdx),1); renderWord();
}
function clearAnswer(){wordState.answer=new Array(wordState.current.word.length).fill(null);wordState.usedIdx=[];renderWord();}
function checkWord(){
  if(wordState.answer.join('')===wordState.current.word){
    playSound('levelup'); wordState.score+=10; document.getElementById('wordScore').textContent=wordState.score;
    submitScore('word', wordState.score, false);
    const best=Math.max(wordState.score,getStore('best_word',0));
    setStore('best_word',best); document.getElementById('wordBest').textContent=best;
    addScore(10); recordGamePlayed(); wordState.num++; setTimeout(loadNextWord,800);
  } else { playSound('gameover'); showToast('❌ خطأ، حاول مجدداً'); setTimeout(clearAnswer,800); }
}
function skipWord(){wordState.num++;loadNextWord();}