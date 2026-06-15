/* ================================================================
   aptitude.js  –  Timed MCQ test engine
================================================================ */

let state = {
  view: 'select',   // select | test | result
  category: null,
  questions: [],
  current: 0,
  answers: {},      // { question_id: chosen_option }
  timer: 0,
  timerInterval: null,
  startTime: null,
};

document.addEventListener('DOMContentLoaded', () => {
  showView('select');
  loadHistory();

  document.querySelectorAll('[data-cat]').forEach(btn =>
    btn.addEventListener('click', () => startTest(btn.dataset.cat)));
});

/* ── Views ─────────────────────────────────────────────────── */
function showView(v) {
  state.view = v;
  ['view-select','view-test','view-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !id.endsWith(v));
  });
}

/* ── Start test ────────────────────────────────────────────── */
async function startTest(category) {
  state.category = category;
  state.current  = 0;
  state.answers  = {};

  const limit = 10;
  try {
    state.questions = await API.get(`/api/aptitude/questions?category=${category}&limit=${limit}`);
  } catch {
    Toast.show('Failed to load questions', 'error'); return;
  }

  if (!state.questions.length) { Toast.show('No questions available', 'error'); return; }

  state.timer = 60 * limit;   // 1 min per question
  state.startTime = Date.now();
  showView('test');
  renderQuestion();
  startTimer();
}

/* ── Timer ─────────────────────────────────────────────────── */
function startTimer() {
  clearInterval(state.timerInterval);
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timer--;
    updateTimerDisplay();
    if (state.timer <= 0) {
      clearInterval(state.timerInterval);
      submitTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const m = Math.floor(state.timer / 60), s = state.timer % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.parentElement.className = 'timer-display' +
    (state.timer < 30 ? ' danger' : state.timer < 60 ? ' warning' : '');
}

/* ── Render question ───────────────────────────────────────── */
function renderQuestion() {
  const q   = state.questions[state.current];
  const tot = state.questions.length;
  const pct = (state.current / tot) * 100;

  // Header info
  const qNum = document.getElementById('q-num');
  const qTot = document.getElementById('q-tot');
  if (qNum) qNum.textContent = state.current + 1;
  if (qTot) qTot.textContent = tot;

  // Progress bar
  const pb = document.getElementById('quiz-progress');
  if (pb) pb.style.width = pct + '%';

  // Question text
  const qt = document.getElementById('question-text');
  if (qt) qt.textContent = q.question;

  // Difficulty
  const dEl = document.getElementById('q-difficulty');
  if (dEl) dEl.innerHTML = diffBadge(q.difficulty);

  // Options
  const opts = document.getElementById('options-container');
  if (!opts) return;
  const chosen = state.answers[q.id];
  opts.innerHTML = ['a','b','c','d'].map((l, i) => {
    const letter = l.toUpperCase();
    const txt    = q[`option_${l}`];
    const isSel  = chosen === letter;
    return `
      <button class="option-btn ${isSel ? 'selected' : ''}" onclick="selectOption('${letter}')">
        <span class="option-letter">${letter}</span>
        <span>${txt}</span>
      </button>`;
  }).join('');

  // Buttons
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const subBtn  = document.getElementById('btn-submit');
  if (prevBtn) prevBtn.disabled = state.current === 0;
  if (nextBtn) nextBtn.classList.toggle('hidden', state.current === tot - 1);
  if (subBtn)  subBtn.classList.toggle('hidden',  state.current !== tot - 1);
}

function selectOption(letter) {
  const q = state.questions[state.current];
  state.answers[q.id] = letter;

  // update UI
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    const opt = ['A','B','C','D'][i];
    btn.classList.toggle('selected', opt === letter);
    btn.querySelector('.option-letter').textContent = opt;
  });
}

/* ── Navigation ────────────────────────────────────────────── */
function prevQuestion() {
  if (state.current > 0) { state.current--; renderQuestion(); }
}
function nextQuestion() {
  if (state.current < state.questions.length - 1) { state.current++; renderQuestion(); }
}

/* ── Submit ────────────────────────────────────────────────── */
async function submitTest() {
  clearInterval(state.timerInterval);
  const timeTaken = Math.floor((Date.now() - state.startTime) / 1000);
  try {
    const res = await API.post('/api/aptitude/submit', {
      category:   state.category,
      answers:    state.answers,
      time_taken: timeTaken,
    });
    showView('result');
    renderResult(res);
  } catch {
    Toast.show('Failed to submit. Please try again.', 'error');
  }
}

/* ── Render result ─────────────────────────────────────────── */
function renderResult(res) {
  const pct = Math.round(res.percentage);

  // Score display
  const scoreEl = document.getElementById('result-score');
  if (scoreEl) scoreEl.textContent = pct + '%';
  const msgEl = document.getElementById('result-msg');
  if (msgEl) {
    if (pct >= 80) msgEl.textContent = 'Excellent! 🏆 You\'re well prepared.';
    else if (pct >= 60) msgEl.textContent = 'Good job! 👍 Keep practising.';
    else msgEl.textContent = 'Keep going! 💪 Review the topics.';
  }

  const correctEl = document.getElementById('result-correct');
  const totalEl   = document.getElementById('result-total');
  if (correctEl) correctEl.textContent = res.score;
  if (totalEl)   totalEl.textContent   = res.total;

  // Answer review
  const reviewEl = document.getElementById('answer-review');
  if (!reviewEl) return;
  reviewEl.innerHTML = res.results.map((r, i) => {
    const q = state.questions.find(x => x.id === r.id);
    const chosenOpt = state.answers[r.id];
    const chosenTxt = q ? q[`option_${chosenOpt?.toLowerCase()}`] : '–';
    const correctTxt= q ? q[`option_${r.correct_ans.toLowerCase()}`] : r.correct_ans;
    return `
      <div class="result-answer-review ${r.correct ? 'correct' : 'wrong'} fade-in" style="animation-delay:${i*0.05}s">
        <div style="display:flex;gap:8px;margin-bottom:6px">
          <span style="font-weight:700;color:${r.correct?'var(--success)':'var(--danger)'};flex-shrink:0">${r.correct?'✓':'✗'}</span>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${q?.question||'Question'}</div>
        </div>
        <div style="font-size:12px;color:var(--text2);padding-left:16px">
          Your answer: <strong style="color:${r.correct?'var(--success)':'var(--danger)'}">${chosenTxt || 'Not answered'}</strong>
          ${!r.correct ? `· Correct: <strong style="color:var(--success)">${correctTxt}</strong>` : ''}
        </div>
        ${r.explanation ? `<div style="font-size:11px;color:var(--text3);margin-top:6px;padding-left:16px">💡 ${r.explanation}</div>` : ''}
      </div>`;
  }).join('');
}

/* ── History ───────────────────────────────────────────────── */
async function loadHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  try {
    const rows = await API.get('/api/aptitude/history');
    if (!rows.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>No tests taken yet.</p></div>';
      return;
    }
    el.innerHTML = rows.map(r => `
      <div class="activity-item" style="margin-bottom:6px">
        <div class="activity-icon test">📝</div>
        <div class="activity-body">
          <div class="activity-desc">${r.category} – ${r.score}/${r.total} correct</div>
          <div class="activity-meta">
            <span class="activity-time">${timeAgo(r.taken_at)}</span>
            <span class="activity-score" style="color:${scoreColor(r.percentage)}">${Math.round(r.percentage)}%</span>
          </div>
        </div>
      </div>`).join('');
  } catch {}
}
