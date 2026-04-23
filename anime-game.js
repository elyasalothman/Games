// ─────────────────────────────────────────────
// 🎌 ANIME TRIVIA GAME (تحدي الأنمي)
// ─────────────────────────────────────────────

// تمت إضافة خاصية الصعوبة (difficulty) وإمكانية إضافة رابط صورة (image) لكل سؤال
const ANIME_QUESTIONS = [
    { q: "من هو بطل أنمي ون بيس (One Piece)؟", options: ["زورو", "سانجي", "لوفي", "غوكو"], answer: "لوفي", difficulty: "easy", image: "https://upload.wikimedia.org/wikipedia/en/a/a4/Monkey_D._Luffy_%28post-timeskip%29.png" },
    { q: "ما اسم النينجا الذي يطمح أن يكون الهوكاجي؟", options: ["ساسكي", "ناروتو", "كاكاشي", "إيتاتشي"], answer: "ناروتو", difficulty: "easy", image: "https://upload.wikimedia.org/wikipedia/en/9/94/NarutoCoverTankobon1.jpg" },
    { q: "في أنمي هجوم العمالقة، ما اسم البطل الرئيسي؟", options: ["ليفاي", "إيرين", "أرمين", "راينر"], answer: "إيرين", difficulty: "medium" },
    { q: "ما اسم الشينيغامي البديل في أنمي بليتش (Bleach)؟", options: ["إيتشيغو", "بياكويا", "رينجي", "آيزن"], answer: "إيتشيغو", difficulty: "medium" },
    { q: "من هو صاحب مذكرة الموت (Death Note)؟", options: ["إل (L)", "ريوك", "لايت", "نير"], answer: "لايت", difficulty: "easy" },
    { q: "ما هو اسم بطل أكاديمية بطلي (My Hero Academia)؟", options: ["باكوغو", "ميدوريا", "تودوروكي", "أول مايت"], answer: "ميدوريا", difficulty: "easy" },
    { q: "في دراغون بول، ما اسم كوكب غوكو الأصلي؟", options: ["ناميك", "فيجيتا", "الأرض", "السايان"], answer: "فيجيتا", difficulty: "medium" },
    { q: "من هو أقوى رجل في العالم في أنمي ون بنش مان؟", options: ["غارو", "سايتاما", "جينوس", "بانغ"], answer: "سايتاما", difficulty: "easy" },
    { q: "ما اسم بطل قاتل الشياطين (Demon Slayer)؟", options: ["زينيتسو", "إينوسكي", "تانجيرو", "موزان"], answer: "تانجيرو", difficulty: "medium" },
    { q: "من هو الشخص الذي فقد ذراعه وساقه في خيميائي الفولاذ؟", options: ["إدوارد", "ألفونس", "روي", "هوينهايم"], answer: "إدوارد", difficulty: "hard" },
    { q: "في أنمي هنتر x هنتر، من هو صديق غون المفضل؟", options: ["هيسوكا", "كيلوا", "كورابيكا", "ليوريو"], answer: "كيلوا", difficulty: "hard" },
    { q: "ما هو اسم الجاسوس الذي يحمل اسم 'الشفق' في سباي فاملي؟", options: ["يور", "آنيا", "لويد", "فرانكي"], answer: "لويد", difficulty: "hard" }
];

let animeState = { score: 0, qIndex: 0, active: false, questions: [] };

function initAnime() {
    // إنشاء واجهة اللعبة برمجياً إذا لم تكن موجودة مسبقاً (تسهيلاً لعدم تعديل HTML)
    if (!document.getElementById('animeOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'animeOverlay';
        overlay.className = 'overlay';
        overlay.innerHTML = `
            <div class="game-modal anime-modal">
                <div class="modal-header">
                    <h2 class="modal-title">🎌 تحدي الأنمي</h2>
                    <button class="close-btn" onclick="closeGame('anime')">✖</button>
                </div>
                <div class="score-display">
                    <div class="score-box">
                        <div class="score-label">النقاط</div>
                        <div class="score-value" id="animeScore">0</div>
                    </div>
                    <div class="score-box">
                        <div class="score-label">أفضل نتيجة</div>
                        <div class="score-value" id="animeBest">0</div>
                    </div>
                </div>
                <div style="text-align:center; padding: 20px 0;">
                    <div id="animeDifficultySelection">
                        <p style="margin-bottom:15px; font-size:18px; font-weight:bold;">اختر مستوى الصعوبة:</p>
                        <div class="flex-center-wrap">
                            <button class="btn btn-green" onclick="startAnime('easy')">🟢 سهل</button>
                            <button class="btn btn-orange" onclick="startAnime('medium')">🟠 متوسط</button>
                            <button class="btn btn-red" onclick="startAnime('hard')">🔴 صعب</button>
                        </div>
                    </div>
                    <div id="animeGameArea" style="display:none;">
                        <img id="animeImage" class="anime-img" src="" alt="صورة توضيحية">
                        <div id="animeQuestion" style="font-size:22px; font-weight:bold; margin-bottom:24px; color:var(--text-main); line-height:1.4;"></div>
                        <div id="animeOptions" style="display:flex; flex-direction:column; gap:12px;"></div>
                    </div>
                    <button id="animeStartBtn" class="btn primary" style="margin-top:20px; width:100%; font-size:18px; padding:15px; display:none;" onclick="showAnimeDifficulties()">▶ العب جولة جديدة</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    animeState = { score: 0, qIndex: 0, active: false, questions: [] };
    document.getElementById('animeScore').textContent = 0;
    document.getElementById('animeBest').textContent = getStore('best_anime', 0);
    
    // عرض شاشة اختيار الصعوبة عند الفتح
    showAnimeDifficulties();
    
    document.getElementById('animeOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAnime() {
    const overlay = document.getElementById('animeOverlay');
    if(overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    animeState.active = false;
}

function showAnimeDifficulties() {
    document.getElementById('animeDifficultySelection').style.display = 'block';
    document.getElementById('animeGameArea').style.display = 'none';
    document.getElementById('animeStartBtn').style.display = 'none';
}

function startAnime(difficulty) {
    animeState.active = true;
    animeState.score = 0;
    document.getElementById('animeScore').textContent = 0;
    document.getElementById('animeStartBtn').style.display = 'none';
    document.getElementById('animeDifficultySelection').style.display = 'none';
    document.getElementById('animeGameArea').style.display = 'block';
    
    // تصفية الأسئلة حسب مستوى الصعوبة المختار
    let filteredQuestions = ANIME_QUESTIONS.filter(q => q.difficulty === difficulty);
    
    // إذا لم يكن هناك أسئلة كافية في التصنيف، أكملها عشوائياً
    if (filteredQuestions.length < 5) {
        const otherQuestions = ANIME_QUESTIONS.filter(q => q.difficulty !== difficulty).sort(() => Math.random() - 0.5);
        filteredQuestions = filteredQuestions.concat(otherQuestions.slice(0, 5 - filteredQuestions.length));
    }

    animeState.questions = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, 5);
    animeState.qIndex = 0;
    
    nextAnimeQ();
}

function nextAnimeQ() {
    if (animeState.qIndex >= animeState.questions.length) {
        endAnime();
        return;
    }

    const qData = animeState.questions[animeState.qIndex];
    const qElem = document.getElementById('animeQuestion');
    const imgElem = document.getElementById('animeImage');
    
    // عرض الصورة إذا كانت مرفقة بالسؤال، أو إخفاؤها
    if (qData.image) {
        imgElem.src = qData.image;
        imgElem.style.display = 'inline-block';
    } else {
        imgElem.style.display = 'none';
    }
    
    qElem.textContent = `السؤال ${animeState.qIndex + 1}: ${qData.q}`;
    qElem.style.transform = 'scale(0.95)';
    qElem.style.opacity = '0.5';
    setTimeout(() => {
        qElem.style.transition = 'all 0.3s';
        qElem.style.transform = 'scale(1)';
        qElem.style.opacity = '1';
    }, 50);
    
    const optionsContainer = document.getElementById('animeOptions');
    optionsContainer.innerHTML = '';
    
    // خلط الخيارات
    const shuffledOptions = [...qData.options].sort(() => Math.random() - 0.5);
    
    shuffledOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'anime-opt-btn';
        btn.textContent = opt;
        btn.onclick = () => answerAnime(btn, opt, qData.answer);
        optionsContainer.appendChild(btn);
    });
}

function answerAnime(btn, chosen, correct) {
    const allBtns = document.querySelectorAll('.anime-opt-btn');
    allBtns.forEach(b => b.onclick = null); // تعطيل كل الأزرار لمنع النقر المزدوج

    if (chosen === correct) {
        if(typeof playSound === 'function') playSound('coin');
        btn.style.background = 'var(--accent-green)';
        btn.style.borderColor = 'var(--accent-green)';
        btn.style.color = '#fff';
        animeState.score += 20;
        document.getElementById('animeScore').textContent = animeState.score;
    } else {
        if(typeof playSound === 'function') playSound('gameover');
        btn.style.background = 'var(--accent-red)';
        btn.style.borderColor = 'var(--accent-red)';
        btn.style.color = '#fff';
        
        // إظهار الإجابة الصحيحة باللون الأخضر
        allBtns.forEach(b => {
            if (b.textContent === correct) {
                b.style.background = 'var(--accent-green)';
                b.style.borderColor = 'var(--accent-green)';
                b.style.color = '#fff';
            }
        });
    }

    animeState.qIndex++;
    setTimeout(nextAnimeQ, 1200); // الانتقال للسؤال التالي بعد ثانية تقريباً
}

function endAnime() {
    animeState.active = false;
    if(typeof playSound === 'function') playSound('levelup');
    
    if(typeof submitScore === 'function') submitScore('anime', animeState.score, false);
    
    const best = Math.max(animeState.score, typeof getStore === 'function' ? getStore('best_anime', 0) : 0);
    if(typeof setStore === 'function') setStore('best_anime', best);
    document.getElementById('animeBest').textContent = best;
    
    if(typeof addScore === 'function') addScore(animeState.score);
    if(typeof recordGamePlayed === 'function') recordGamePlayed();
    
    document.getElementById('animeQuestion').textContent = `انتهى التحدي! حصلت على ${animeState.score} نقطة 🎌`;
    document.getElementById('animeOptions').innerHTML = '';
    document.getElementById('animeImage').style.display = 'none';
    
    const startBtn = document.getElementById('animeStartBtn');
    startBtn.style.display = 'inline-block';
    startBtn.textContent = '▶ العب جولة جديدة';
}