// ─────────────────────────────────────────────
// 📚 ثقافة عامة — للمراهقين والكبار
// ─────────────────────────────────────────────
const QUIZ_BANK = [
  { ar: 'ما عاصمة السعودية؟', en: 'Capital of Saudi Arabia?', opts: { ar: ['الرياض', 'جدة', 'الدمام'], en: ['Riyadh', 'Jeddah', 'Dammam'] }, a: 0 },
  { ar: 'كم عدد أيام السنة الميلادية؟', en: 'Days in a common year?', opts: { ar: ['365', '360', '300'], en: ['365', '360', '300'] }, a: 0 },
  { ar: 'أي كوكب يُعرف بالكوكب الأحمر؟', en: 'Which planet is the Red Planet?', opts: { ar: ['المريخ', 'الزهرة', 'عطارد'], en: ['Mars', 'Venus', 'Mercury'] }, a: 0 },
  { ar: 'ما أكبر محيط على الأرض؟', en: 'Largest ocean on Earth?', opts: { ar: ['الهادئ', 'الأطلسي', 'الهندي'], en: ['Pacific', 'Atlantic', 'Indian'] }, a: 0 },
  { ar: 'من رسم لوحة الموناليزا؟', en: 'Who painted the Mona Lisa?', opts: { ar: ['ليوناردو دا فينشي', 'بيكاسو', 'فان جوخ'], en: ['Leonardo da Vinci', 'Picasso', 'Van Gogh'] }, a: 0 },
  { ar: 'ما لغة البرمجة الأشهر للويب الأمامي؟', en: 'Most common front-end web language?', opts: { ar: ['JavaScript', 'Python', 'C++'], en: ['JavaScript', 'Python', 'C++'] }, a: 0 },
  { ar: 'كم عدد ألوان قوس قزح؟', en: 'How many rainbow colors?', opts: { ar: ['7', '5', '10'], en: ['7', '5', '10'] }, a: 0 },
  { ar: 'ما الغاز الذي نتنفسه للحياة؟', en: 'Gas we need to breathe?', opts: { ar: ['الأكسجين', 'النيتروجين', 'الهيدروجين'], en: ['Oxygen', 'Nitrogen', 'Hydrogen'] }, a: 0 },
  { ar: 'أين يقع برج خليفة؟', en: 'Where is Burj Khalifa?', opts: { ar: ['دبي', 'الرياض', 'الدوحة'], en: ['Dubai', 'Riyadh', 'Doha'] }, a: 0 },
  { ar: 'ما ناتج 12 × 8؟', en: 'What is 12 × 8?', opts: { ar: ['96', '88', '108'], en: ['96', '88', '108'] }, a: 0 },
  { ar: 'أي حيوان يُلقب بملك الغابة؟', en: 'Animal called king of the jungle?', opts: { ar: ['الأسد', 'النمر', 'الدب'], en: ['Lion', 'Tiger', 'Bear'] }, a: 0 },
  { ar: 'ما أول شهر في السنة؟', en: 'First month of the year?', opts: { ar: ['يناير', 'مارس', 'ديسمبر'], en: ['January', 'March', 'December'] }, a: 0 }
];

let quizState = { q: 0, score: 0, order: [], locked: false };

function quizLang() {
  return document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function initQuiz() {
  const order = QUIZ_BANK.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 8);
  quizState = { q: 0, score: 0, order, locked: false };
  document.getElementById('quizScore').textContent = '0';
  document.getElementById('quizNum').textContent = '1/' + order.length;
  document.getElementById('quizBest').textContent = getStore('best_quiz', 0);
  document.getElementById('quizStartBtn')?.classList.add('d-none');
  document.getElementById('quizPlay')?.classList.remove('d-none');
  if (typeof recordGamePlayed === 'function') recordGamePlayed();
  renderQuiz();
}

function renderQuiz() {
  const idx = quizState.order[quizState.q];
  const item = QUIZ_BANK[idx];
  const lang = quizLang();
  document.getElementById('quizQuestion').textContent = item[lang] || item.ar;
  document.getElementById('quizNum').textContent = (quizState.q + 1) + '/' + quizState.order.length;
  const box = document.getElementById('quizOptions');
  const opts = item.opts[lang] || item.opts.ar;
  box.innerHTML = opts.map((opt, i) =>
    `<button type="button" class="btn quiz-opt" data-a="${i}">${opt}</button>`
  ).join('');
  quizState.locked = false;
  box.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.addEventListener('click', () => quizAnswer(Number(btn.dataset.a), btn));
  });
}

function quizAnswer(ans, btn) {
  if (quizState.locked) return;
  quizState.locked = true;
  const item = QUIZ_BANK[quizState.order[quizState.q]];
  const correct = ans === item.a;
  btn.classList.add(correct ? 'quiz-ok' : 'quiz-bad');
  if (correct) {
    quizState.score += 10;
    document.getElementById('quizScore').textContent = quizState.score;
    if (typeof playSound === 'function') playSound('coin');
  } else if (typeof playSound === 'function') playSound('gameover');
  setTimeout(() => {
    quizState.q++;
    if (quizState.q >= quizState.order.length) quizEnd();
    else renderQuiz();
  }, 650);
}

function quizEnd() {
  document.getElementById('quizPlay')?.classList.add('d-none');
  document.getElementById('quizStartBtn')?.classList.remove('d-none');
  const best = Math.max(getStore('best_quiz', 0), quizState.score);
  setStore('best_quiz', best);
  document.getElementById('quizBest').textContent = best;
  if (typeof submitScore === 'function') submitScore('quiz', quizState.score, false);
  if (typeof addScore === 'function') addScore(quizState.score);
  if (typeof playSound === 'function') playSound('levelup');
  if (typeof showToast === 'function') {
    showToast((quizLang() === 'ar' ? '📚 نتيجتك: ' : '📚 Score: ') + quizState.score);
  }
}

function showQuizLobby() {
  document.getElementById('quizPlay')?.classList.add('d-none');
  document.getElementById('quizStartBtn')?.classList.remove('d-none');
  document.getElementById('quizBest').textContent = getStore('best_quiz', 0);
  document.getElementById('quizScore').textContent = '0';
  document.getElementById('quizQuestion').textContent = quizLang() === 'ar'
    ? 'اختبر معلوماتك العامة في 8 أسئلة!'
    : 'Test your general knowledge in 8 questions!';
}

window.initQuiz = showQuizLobby;
window.startQuiz = initQuiz;
