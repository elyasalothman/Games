// ─────────────────────────────────────────────
// ⚡ REACTION TIME
// ─────────────────────────────────────────────
let reactionState={phase:'idle',timeout:null,startTime:0,round:0,times:[],maxRounds:5};
function initReaction(){
  reactionState={phase:'idle',timeout:null,startTime:0,round:0,times:[],maxRounds:5};
  document.getElementById('reactionBest').textContent=getStore('best_reaction','-');
  document.getElementById('reactionAvg').textContent='-'; document.getElementById('reactionRound').textContent='1/5';
  document.getElementById('reactionResult').textContent='';
  const zone=document.getElementById('reactionZone');
  zone.className = 'reaction-zone idle';
  zone.textContent='انقر للبدء';
}
function handleReaction(){
  const zone=document.getElementById('reactionZone'); const res=document.getElementById('reactionResult');
  if(reactionState.phase==='idle'){
    zone.className = 'reaction-zone waiting'; zone.textContent='انتظر... لا تضغط!';
    res.textContent=''; const delay=1500+Math.random()*3000;
    reactionState.timeout=setTimeout(()=>{
      reactionState.phase='ready'; reactionState.startTime=performance.now();
      zone.className = 'reaction-zone ready'; zone.textContent='اضغط الآن! ⚡';
    },delay);
    reactionState.phase='waiting';
  } else if(reactionState.phase==='waiting'){
    clearTimeout(reactionState.timeout); playSound('gameover');
    zone.className = 'reaction-zone too-soon'; zone.textContent='مبكر جداً! انقر مجدداً';
    reactionState.phase='idle'; res.textContent='❌ تعجّلت!';
  } else if(reactionState.phase==='ready'){
    playSound('coin');
    const ms=Math.round(performance.now()-reactionState.startTime);
    reactionState.times.push(ms); reactionState.round++; res.textContent=`${ms} مللي ثانية`;
    const best=Math.min(ms,getStore('best_reaction',9999));
    setStore('best_reaction',best); document.getElementById('reactionBest').textContent=best+' ms';
    if(reactionState.round<reactionState.maxRounds){
      document.getElementById('reactionRound').textContent=`${reactionState.round+1}/5`;
      zone.className = 'reaction-zone idle'; zone.textContent='انقر مجدداً';
      reactionState.phase='idle';
    } else {
      const avg=Math.round(reactionState.times.reduce((a,b)=>a+b,0)/reactionState.times.length);
      document.getElementById('reactionAvg').textContent=avg+' ms';
      zone.className = 'reaction-zone finished'; zone.textContent='انقر لبدء جولة جديدة';
      res.textContent=`متوسطك: ${avg} ms`;
      submitScore('reaction', avg, true);
      addScore(100); recordGamePlayed(); reactionState.phase='idle'; reactionState.round=0; reactionState.times=[];
      document.getElementById('reactionRound').textContent='1/5';
    }
  }
}