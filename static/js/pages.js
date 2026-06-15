/* ================================================================
   resume.js  –  Resume text analyzer
================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('resume-upload-area')) return;
  initResumeUpload();
  loadResumeHistory();
});

function initResumeUpload() {
  const area = document.getElementById('resume-upload-area');
  const fileInput = document.getElementById('resume-file');
  const textarea  = document.getElementById('resume-text');

  area?.addEventListener('click', () => fileInput?.click());
  area?.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area?.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area?.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput?.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });
}

function handleFile(file) {
  const nameEl = document.getElementById('file-name');
  if (nameEl) nameEl.textContent = `📄 ${file.name}`;

  const reader = new FileReader();
  reader.onload = e => {
    const textarea = document.getElementById('resume-text');
    if (textarea) textarea.value = e.target.result;
    Toast.show('File loaded. Click Analyze to proceed.', 'info');
  };
  reader.readAsText(file);
}

async function analyzeResume() {
  const text = document.getElementById('resume-text')?.value || '';
  if (text.trim().length < 30) {
    Toast.show('Please paste your resume text or upload a file.', 'error'); return;
  }
  const btn = document.getElementById('btn-analyze');
  if (btn) { btn.disabled = true; btn.textContent = 'Analyzing…'; }

  try {
    const r = await API.post('/api/resume/analyze', { text });
    renderResumeResult(r);
    document.getElementById('resume-results')?.classList.remove('hidden');
    document.getElementById('resume-input-area')?.classList.add('hidden');
  } catch {
    Toast.show('Analysis failed. Please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Analyze Resume'; }
  }
}

function renderResumeResult(r) {
  // Score circle
  const circle = document.getElementById('resume-score-circle');
  if (circle) { circleProgress(circle, r.overall_score, 120, 11); }
  setTxt('resume-overall-score', r.overall_score);
  setTxt('resume-ats-score',     r.ats_score);

  const badge = document.getElementById('resume-score-badge');
  if (badge) {
    const cls = r.overall_score>=80?'excellent':r.overall_score>=65?'good':r.overall_score>=50?'average':'poor';
    const lbl = r.overall_score>=80?'Excellent':r.overall_score>=65?'Good':r.overall_score>=50?'Average':'Needs Work';
    badge.className = `score-badge ${cls}`; badge.textContent = lbl;
  }

  // Skills found/missing
  const foundEl   = document.getElementById('skills-found');
  const missingEl = document.getElementById('skills-missing');
  if (foundEl)   foundEl.innerHTML   = r.skills_detected.map(s=>`<span class="skill-chip found">✓ ${s}</span>`).join('');
  if (missingEl) missingEl.innerHTML = r.missing_skills.map(s=>`<span class="skill-chip missing">✗ ${s}</span>`).join('');

  // Sections
  const secEl = document.getElementById('resume-sections');
  if (secEl) secEl.innerHTML = Object.entries(r.sections).map(([k,ok])=>`
    <div class="section-check ${ok?'ok':'missing'}">
      <span style="color:${ok?'var(--success)':'var(--danger)'};font-size:16px">${ok?'✓':'✗'}</span>
      <span style="text-transform:capitalize">${k}</span>
    </div>`).join('');

  // Suggestions
  const sugEl = document.getElementById('resume-suggestions');
  if (sugEl) sugEl.innerHTML = r.suggestions.map((s,i)=>`
    <div class="activity-item" style="margin-bottom:8px">
      <div style="width:26px;height:26px;border-radius:50%;background:rgba(79,124,255,.15);
        display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;
        color:var(--accent);flex-shrink:0">${i+1}</div>
      <span style="font-size:13px;color:var(--text2)">${s}</span>
    </div>`).join('');
}

async function loadResumeHistory() {
  const el = document.getElementById('resume-history');
  if (!el) return;
  try {
    const rows = await API.get('/api/resume/history');
    if (!rows.length) { el.innerHTML = '<p class="text-muted text-sm">No previous analyses.</p>'; return; }
    el.innerHTML = rows.map(r=>`
      <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <span class="text-muted text-sm">${timeAgo(r.analyzed_at)}</span>
        <span style="font-weight:700;color:${scoreColor(r.overall_score)}">${r.overall_score}%</span>
      </div>`).join('');
  } catch {}
}

function resetResume() {
  document.getElementById('resume-results')?.classList.add('hidden');
  document.getElementById('resume-input-area')?.classList.remove('hidden');
  const ta = document.getElementById('resume-text');
  if (ta) ta.value = '';
  const fn = document.getElementById('file-name');
  if (fn) fn.textContent = '';
}

function setTxt(id, val) { const e=document.getElementById(id); if(e) e.textContent=val; }

/* ================================================================
   interview.js  –  Mock interview module
================================================================ */

const ivState = {
  view: 'select',
  type: 'technical',
  questions: [],
  answers: {},
  currentQ: 0,
};

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('iv-view-select')) return;
  showIvView('select');
  loadIvHistory();
});

function showIvView(v) {
  ivState.view = v;
  ['select','session','result'].forEach(id => {
    document.getElementById(`iv-view-${id}`)?.classList.toggle('hidden', id !== v);
  });
}

async function startInterview(type) {
  ivState.type    = type;
  ivState.answers = {};
  ivState.currentQ= 0;

  try {
    ivState.questions = await API.get(`/api/interview/questions?type=${type}&limit=5`);
  } catch { Toast.show('Failed to load questions', 'error'); return; }

  if (!ivState.questions.length) { Toast.show('No questions available', 'error'); return; }

  showIvView('session');
  renderIvQuestion();
}

function renderIvQuestion() {
  const i   = ivState.currentQ;
  const q   = ivState.questions[i];
  const tot = ivState.questions.length;

  setIvTxt('iv-q-num',  i + 1);
  setIvTxt('iv-q-total', tot);
  setIvTxt('iv-question', q.question);
  setIvTxt('iv-q-type',   q.type);
  setIvTxt('iv-q-diff',   q.difficulty);

  const pb = document.getElementById('iv-progress');
  if (pb) pb.style.width = `${((i)/tot)*100}%`;

  const ta = document.getElementById('iv-answer');
  if (ta) ta.value = ivState.answers[q.id] || '';

  const sampleBox = document.getElementById('sample-answer');
  if (sampleBox) { sampleBox.classList.remove('visible'); sampleBox.textContent = q.sample_ans; }

  const prevBtn = document.getElementById('iv-btn-prev');
  const nextBtn = document.getElementById('iv-btn-next');
  const subBtn  = document.getElementById('iv-btn-submit');
  if (prevBtn) prevBtn.disabled = i === 0;
  if (nextBtn) nextBtn?.classList.toggle('hidden', i === tot - 1);
  if (subBtn)  subBtn?.classList.toggle('hidden',  i !== tot - 1);
}

function saveCurrentAnswer() {
  const q  = ivState.questions[ivState.currentQ];
  const ta = document.getElementById('iv-answer');
  if (q && ta) ivState.answers[q.id] = ta.value;
}

function ivPrev() { saveCurrentAnswer(); ivState.currentQ--; renderIvQuestion(); }
function ivNext() { saveCurrentAnswer(); ivState.currentQ++; renderIvQuestion(); }

function toggleSampleAnswer() {
  const box = document.getElementById('sample-answer');
  const btn = document.getElementById('btn-sample');
  if (!box) return;
  const shown = box.classList.toggle('visible');
  if (btn) btn.textContent = shown ? '🙈 Hide Sample' : '💡 Sample Answer';
}

async function submitInterview() {
  saveCurrentAnswer();
  const answers = ivState.questions.map(q => ({
    question_id: q.id,
    answer_text: ivState.answers[q.id] || '',
  }));

  try {
    const res = await API.post('/api/interview/submit', { type: ivState.type, answers });
    showIvView('result');
    renderIvResult(res);
  } catch { Toast.show('Submission failed', 'error'); }
}

function renderIvResult(res) {
  const pct = Math.round(res.percentage);
  setIvTxt('iv-result-score', pct + '%');
  setIvTxt('iv-result-feedback', res.feedback);

  const circle = document.getElementById('iv-score-circle');
  if (circle) circleProgress(circle, pct, 110, 10);

  const breakdown = document.getElementById('iv-breakdown');
  if (breakdown) {
    breakdown.innerHTML = [
      ['Answers Given', res.total],
      ['Well Answered', res.score],
      ['Needs Work',   res.total - res.score],
    ].map(([l,v]) => `
      <div style="text-align:center;padding:12px">
        <div style="font-family:var(--font-head);font-weight:800;font-size:22px;color:var(--text)">${v}</div>
        <div style="font-size:11px;color:var(--text2)">${l}</div>
      </div>`).join('');
  }
}

async function loadIvHistory() {
  const el = document.getElementById('iv-history');
  if (!el) return;
  try {
    const rows = await API.get('/api/interview/history');
    if (!rows.length) { el.innerHTML = '<p class="text-muted text-sm">No sessions yet.</p>'; return; }
    el.innerHTML = rows.map(r => {
      const pct = r.total_qs > 0 ? Math.round((r.score/r.total_qs)*100) : 0;
      return `<div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
        <span class="text-muted text-sm">${r.type} – ${timeAgo(r.completed_at)}</span>
        <span style="font-weight:700;color:${scoreColor(pct)}">${pct}%</span>
      </div>`;
    }).join('');
  } catch {}
}

function setIvTxt(id, val) { const e=document.getElementById(id); if(e) e.textContent=val||''; }

/* ================================================================
   progress.js  –  Analytics & charts
================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('progress-page')) return;
  loadProgress();
});

async function loadProgress() {
  try {
    const data = await API.get('/api/progress/overview');
    renderAptitudeByCategory(data.aptitude_by_category);
    renderWeeklyChart(data.weekly_scores);
    renderCodingDiff(data.coding_by_difficulty);
    generateHeatmap();
  } catch {
    Toast.show('Failed to load progress data', 'error');
  }
}

function renderAptitudeByCategory(rows) {
  const el = document.getElementById('apt-category-bars');
  if (!el) return;
  if (!rows.length) { el.innerHTML = '<p class="text-muted text-sm">No test data yet.</p>'; return; }
  el.innerHTML = rows.map(r => `
    <div style="margin-bottom:14px">
      <div class="flex-between text-sm mb-8">
        <span class="text-muted" style="text-transform:capitalize">${r.category}</span>
        <span class="fw-600">${r.avg.toFixed(1)}% <span class="text-muted text-xs">(${r.cnt} tests)</span></span>
      </div>
      <div class="progress-wrap" style="height:7px">
        <div class="progress-bar" style="width:${r.avg}%"></div>
      </div>
    </div>`).join('');
}

function renderWeeklyChart(rows) {
  const el = document.getElementById('weekly-chart');
  if (!el) return;
  if (!rows.length) {
    // fill with demo data
    rows = [
      {day:'Mon',avg:60},{day:'Tue',avg:70},{day:'Wed',avg:65},
      {day:'Thu',avg:80},{day:'Fri',avg:75},{day:'Sat',avg:85},{day:'Sun',avg:90}
    ];
  }
  const labels = rows.map(r => {
    const d = new Date(r.day || r.day);
    return isNaN(d) ? r.day : d.toLocaleDateString('en',{weekday:'short'});
  });
  miniBarChart(el, rows.map(r=>r.avg), labels);
}

function renderCodingDiff(rows) {
  const el = document.getElementById('coding-diff-bars');
  if (!el) return;
  const diffs = {easy:0, medium:0, hard:0};
  rows.forEach(r => { diffs[r.difficulty] = r.cnt; });
  const total = Math.max(Object.values(diffs).reduce((a,b)=>a+b,0), 1);
  el.innerHTML = Object.entries(diffs).map(([d,cnt]) => {
    const colors = {easy:'var(--success)',medium:'var(--warning)',hard:'var(--danger)'};
    return `
      <div style="margin-bottom:12px">
        <div class="flex-between text-sm mb-8">
          <span style="text-transform:capitalize;color:${colors[d]}">${d}</span>
          <span class="fw-600">${cnt} solved</span>
        </div>
        <div class="progress-wrap" style="height:6px">
          <div class="progress-bar" style="width:${(cnt/total)*100}%;background:${colors[d]}"></div>
        </div>
      </div>`;
  }).join('');
}

function generateHeatmap() {
  const el = document.getElementById('activity-heatmap');
  if (!el) return;
  // Generate 35-day mock heatmap
  const cells = Array.from({length:35}, (_,i) => {
    const r = Math.random();
    const lvl = r > 0.85 ? 'l4' : r > 0.6 ? 'l3' : r > 0.4 ? 'l2' : r > 0.2 ? 'l1' : '';
    return `<div class="heatmap-cell ${lvl}" title="Day ${i+1}"></div>`;
  });
  el.innerHTML = cells.join('');
}

/* ================================================================
   leaderboard.js
================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('leaderboard-table')) return;
  loadLeaderboard();
  setupLbFilters();
});

async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-table');
  const podium = document.getElementById('lb-podium');
  if (!tbody) return;

  try {
    const data = await API.get('/api/leaderboard');
    const { board, my_rank } = data;

    // My rank
    const myRankEl = document.getElementById('my-rank');
    if (myRankEl) myRankEl.textContent = my_rank > 0 ? '#' + my_rank : '–';

    // Podium top 3
    if (podium && board.length >= 3) renderPodium(podium, board);

    // Table
    tbody.innerHTML = board.map((s, i) => {
      const isMe = s.rank_position === my_rank && my_rank > 0;
      const rankCls = i===0?'lb-rank-1':i===1?'lb-rank-2':i===2?'lb-rank-3':'lb-rank-n';
      return `
        <tr class="${isMe ? 'lb-my-row' : ''}">
          <td><div class="lb-rank-cell ${rankCls}">${i+1}</div></td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-g);
                display:flex;align-items:center;justify-content:center;
                font-weight:800;font-size:13px;color:#fff;flex-shrink:0">
                ${s.avatar || s.name[0]}
              </div>
              <span class="fw-600">${s.name}${isMe?' (You)':''}</span>
            </div>
          </td>
          <td class="text-muted text-sm">${s.college||'–'}</td>
          <td><span style="font-family:var(--font-head);font-weight:800;font-size:15px;
            background:var(--accent-g);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
            background-clip:text">${s.total_score}</span></td>
          <td class="text-muted">${s.tests_done}</td>
          <td class="text-muted">${s.problems_solved}</td>
        </tr>`;
    }).join('');
  } catch {
    Toast.show('Failed to load leaderboard', 'error');
  }
}

function renderPodium(el, board) {
  const order = [board[1], board[0], board[2]];
  const heights = ['140px','168px','120px'];
  const bgColors = [
    'linear-gradient(180deg,#c0c0c0,#909090)',
    'linear-gradient(180deg,#ffd700,#ffaa00)',
    'linear-gradient(180deg,#cd7f32,#8b5a2b)',
  ];
  const badges = ['🥈','🏆','🥉'];

  el.innerHTML = order.map((s, i) => `
    <div class="podium-item">
      <div style="font-size:22px;margin-bottom:4px">${badges[i]}</div>
      <div class="podium-avatar">${s.avatar || s.name[0]}</div>
      <div class="podium-name">${s.name}</div>
      <div class="podium-college">${s.college||''}</div>
      <div class="podium-block" style="height:${heights[i]};background:${bgColors[i]}">
        <div class="podium-score">${s.total_score}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.7)">#${s.rank_position}</div>
      </div>
    </div>`).join('');
}

function setupLbFilters() {
  document.querySelectorAll('[data-lb-filter]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-lb-filter]').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      // In production this would re-fetch with a filter param
      Toast.show('Filter applied', 'info');
    }));
}

/* ================================================================
   resources.js
================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('resources-grid')) return;
  loadResources();

  document.querySelectorAll('[data-res-cat]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-res-cat]').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      loadResources(btn.dataset.resCat === 'all' ? null : btn.dataset.resCat);
    }));
});

async function loadResources(category = null) {
  const el = document.getElementById('resources-grid');
  if (!el) return;
  el.innerHTML = '<div class="flex-center" style="padding:40px"><div class="spinner"></div></div>';

  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  try {
    const data = await API.get(`/api/resources${q}`);
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No resources found.</p></div>';
      return;
    }
    el.innerHTML = data.map(r => `
      <a href="${r.url}" class="resource-card fade-in" target="_blank" rel="noopener">
        <div class="resource-icon-wrap">${r.icon}</div>
        <div class="resource-body">
          <div class="resource-title">${r.title}</div>
          <div class="resource-desc">${r.description}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="badge badge-blue">${r.category}</span>
            <span class="badge badge-purple">${r.type}</span>
          </div>
        </div>
      </a>`).join('');
  } catch {
    Toast.show('Failed to load resources', 'error');
  }
}

/* ================================================================
   profile.js
================================================================ */

let profileUser = {};
const AVATARS = ['🎓','🧑‍💻','👨‍🎓','👩‍🎓','🦸','🧑‍🔬','🧑‍💼','🦊','🐉','⚡'];

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('profile-page')) return;
  loadProfile();
  loadProfileStats();
  setupAvatarPicker();
});

async function loadProfile() {
  try {
    profileUser = await API.get('/api/me');
    fillProfile(profileUser);
  } catch {
    Toast.show('Failed to load profile', 'error');
  }
}

function fillProfile(u) {
  const fields = ['name','email','college','year','branch','phone'];
  fields.forEach(f => {
    const el = document.getElementById(`profile-${f}`);
    if (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') el.value = u[f] || '';
      else el.textContent = u[f] || '–';
    }
  });
  const av = document.getElementById('profile-avatar');
  if (av) av.textContent = u.avatar || u.name?.[0] || '🎓';

  const joinEl = document.getElementById('profile-joined');
  if (joinEl) joinEl.textContent = u.joined_at ? new Date(u.joined_at).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}) : '–';
}

async function saveProfile() {
  const data = {
    name:    document.getElementById('profile-name')?.value,
    college: document.getElementById('profile-college')?.value,
    year:    document.getElementById('profile-year')?.value,
    branch:  document.getElementById('profile-branch')?.value,
    phone:   document.getElementById('profile-phone')?.value,
    avatar:  document.getElementById('profile-avatar')?.textContent,
  };
  try {
    await API.post('/api/profile/update', data);
    Toast.show('Profile updated successfully!', 'success');
    document.querySelectorAll('[data-user-name]').forEach(e => e.textContent = data.name);
  } catch {
    Toast.show('Update failed. Please try again.', 'error');
  }
}

async function changePassword() {
  const current  = document.getElementById('pwd-current')?.value;
  const newPwd   = document.getElementById('pwd-new')?.value;
  const confirm  = document.getElementById('pwd-confirm')?.value;

  if (!current || !newPwd) { Toast.show('Please fill all password fields', 'error'); return; }
  if (newPwd !== confirm)  { Toast.show('New passwords do not match', 'error'); return; }
  if (newPwd.length < 6)   { Toast.show('Password must be at least 6 characters', 'error'); return; }

  try {
    await API.post('/api/profile/password', { current, new: newPwd });
    Toast.show('Password changed successfully!', 'success');
    ['pwd-current','pwd-new','pwd-confirm'].forEach(id => {
      const e = document.getElementById(id); if (e) e.value = '';
    });
    closeModal('pwd-modal');
  } catch (err) {
    Toast.show(err.error || 'Failed to change password', 'error');
  }
}

function setupAvatarPicker() {
  const picker = document.getElementById('avatar-picker');
  if (!picker) return;
  picker.innerHTML = AVATARS.map(a => `
    <div class="avatar-opt" onclick="selectAvatar('${a}')">${a}</div>`).join('');
}

function selectAvatar(emoji) {
  document.querySelectorAll('.avatar-opt').forEach(o => {
    o.classList.toggle('selected', o.textContent === emoji);
  });
  const av = document.getElementById('profile-avatar');
  if (av) av.textContent = emoji;
}

async function loadProfileStats() {
  try {
    const s = await API.get('/api/dashboard/stats');
    setTxtSafe('ps-tests',      s.tests_attempted);
    setTxtSafe('ps-problems',   s.problems_solved);
    setTxtSafe('ps-interviews', s.interviews_done);
    setTxtSafe('ps-readiness',  s.readiness + '%');
  } catch {}
}

function setTxtSafe(id, val) { const e=document.getElementById(id); if(e) e.textContent=val; }
