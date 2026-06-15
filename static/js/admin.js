/* ================================================================
   admin.js  –  Admin panel logic
================================================================ */

let adminTab = 'overview';

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('admin-page')) return;
  switchAdminTab('overview');
});

/* ── Tab switching ─────────────────────────────────────────── */
function switchAdminTab(tab) {
  adminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('[data-tab-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.tabPanel !== tab);
  });

  // Load data for the active tab
  const loaders = {
    overview:   loadAdminOverview,
    students:   loadAdminStudents,
    questions:  loadAdminQuestions,
    challenges: loadAdminChallenges,
    analytics:  loadAdminAnalytics,
  };
  loaders[tab]?.();
}

/* ── Overview ──────────────────────────────────────────────── */
async function loadAdminOverview() {
  try {
    const s = await API.get('/api/admin/stats');
    const map = {
      'admin-stat-users':       s.total_users,
      'admin-stat-active':      s.active_today,
      'admin-stat-tests':       s.tests_today,
      'admin-stat-submissions': s.submissions_today,
      'admin-stat-avg':         s.avg_score.toFixed(1) + '%',
    };
    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  } catch {
    Toast.show('Failed to load admin stats', 'error');
  }
}

/* ── Students ──────────────────────────────────────────────── */
let studentPage = 1;

async function loadAdminStudents(page = 1) {
  studentPage = page;
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px"><div class="spinner" style="margin:auto"></div></td></tr>';

  try {
    const data = await API.get(`/api/admin/users?page=${page}`);
    const { users, total } = data;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td class="fw-600">${u.id}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--accent-g);
              display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff">
              ${u.name[0]}
            </div>
            <span>${u.name}</span>
          </div>
        </td>
        <td class="text-muted">${u.email}</td>
        <td class="text-muted">${u.college || '–'}</td>
        <td>${u.year || '–'}</td>
        <td>
          <span class="badge ${u.is_active ? 'badge-green' : 'badge-red'}">
            ${u.is_active ? 'Active' : 'Blocked'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-ghost"
              onclick="toggleUser(${u.id}, this)">
              ${u.is_active ? '🚫 Block' : '✅ Activate'}
            </button>
          </div>
        </td>
      </tr>`).join('');

    // Pagination
    const pagEl = document.getElementById('students-pagination');
    if (pagEl) {
      const totalPages = Math.ceil(total / 20);
      pagEl.innerHTML = Array.from({length: totalPages}, (_, i) => `
        <button class="btn btn-sm ${i+1===page?'btn-primary':'btn-ghost'}"
          onclick="loadAdminStudents(${i+1})">${i+1}</button>`).join('');
    }
  } catch {
    Toast.show('Failed to load students', 'error');
  }
}

async function toggleUser(uid, btn) {
  try {
    await API.post(`/api/admin/user/${uid}/toggle`, {});
    Toast.show('User status updated', 'success');
    loadAdminStudents(studentPage);
  } catch {
    Toast.show('Failed to update user', 'error');
  }
}

/* ── Questions ─────────────────────────────────────────────── */
async function loadAdminQuestions() {
  const tbody = document.getElementById('questions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px"><div class="spinner" style="margin:auto"></div></td></tr>';

  try {
    const rows = await API.get('/api/admin/questions');
    tbody.innerHTML = rows.map(q => `
      <tr>
        <td class="fw-600">${q.id}</td>
        <td style="text-transform:capitalize">
          <span class="badge badge-blue">${q.category}</span>
        </td>
        <td>${diffBadge(q.difficulty)}</td>
        <td style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${q.question}
        </td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${q.id}, this)">
            🗑 Delete
          </button>
        </td>
      </tr>`).join('');
  } catch {
    Toast.show('Failed to load questions', 'error');
  }
}

async function deleteQuestion(qid, btn) {
  if (!confirm('Delete this question?')) return;
  btn.disabled = true;
  try {
    await API.del(`/api/admin/questions/${qid}`);
    Toast.show('Question deleted', 'success');
    loadAdminQuestions();
  } catch {
    Toast.show('Failed to delete question', 'error');
    btn.disabled = false;
  }
}

async function addQuestion() {
  const get = id => document.getElementById(id)?.value?.trim();
  const data = {
    category:    get('aq-category'),
    difficulty:  get('aq-difficulty'),
    question:    get('aq-question'),
    option_a:    get('aq-opt-a'),
    option_b:    get('aq-opt-b'),
    option_c:    get('aq-opt-c'),
    option_d:    get('aq-opt-d'),
    correct_ans: get('aq-correct'),
    explanation: get('aq-explanation'),
  };

  if (!data.question || !data.option_a || !data.correct_ans) {
    Toast.show('Fill all required fields', 'error'); return;
  }

  try {
    await API.post('/api/admin/questions/add', data);
    Toast.show('Question added successfully!', 'success');
    closeModal('add-question-modal');
    // clear form
    ['aq-question','aq-opt-a','aq-opt-b','aq-opt-c','aq-opt-d','aq-explanation']
      .forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
    loadAdminQuestions();
  } catch {
    Toast.show('Failed to add question', 'error');
  }
}

/* ── Challenges ────────────────────────────────────────────── */
async function loadAdminChallenges() {
  const el = document.getElementById('challenges-list');
  if (!el) return;
  el.innerHTML = '<div class="flex-center" style="padding:24px"><div class="spinner"></div></div>';
  try {
    const rows = await API.get('/api/coding/challenges');
    el.innerHTML = rows.map(c => `
      <div class="challenge-list-item" style="cursor:default">
        <div class="challenge-solved-dot unsolved">${c.id}</div>
        <div class="challenge-meta">
          <div class="challenge-title">${c.title}</div>
          <div class="challenge-tags">
            ${diffBadge(c.difficulty)}
            <span class="badge badge-blue">${c.category}</span>
          </div>
        </div>
      </div>`).join('');
  } catch {
    Toast.show('Failed to load challenges', 'error');
  }
}

async function addChallenge() {
  const get = id => document.getElementById(id)?.value?.trim();
  const data = {
    title:          get('ch-title'),
    category:       get('ch-category'),
    difficulty:     get('ch-difficulty'),
    description:    get('ch-description'),
    sample_input:   get('ch-sample-input'),
    sample_output:  get('ch-sample-output'),
    constraints:    get('ch-constraints'),
    hints:          get('ch-hints'),
  };
  if (!data.title || !data.description) {
    Toast.show('Title and description are required', 'error'); return;
  }
  try {
    await API.post('/api/admin/challenges/add', data);
    Toast.show('Challenge added!', 'success');
    closeModal('add-challenge-modal');
    loadAdminChallenges();
  } catch {
    Toast.show('Failed to add challenge', 'error');
  }
}

/* ── Analytics ─────────────────────────────────────────────── */
function loadAdminAnalytics() {
  // Score distribution bars
  const distEl = document.getElementById('score-distribution');
  if (distEl) {
    const dist = [
      {range:'90–100', label:'Elite',        pct:8,  cls:'success'},
      {range:'70–89',  label:'Good',         pct:35, cls:''},
      {range:'50–69',  label:'Average',      pct:42, cls:'warning'},
      {range:'0–49',   label:'Needs Work',   pct:15, cls:'danger'},
    ];
    distEl.innerHTML = dist.map(d => `
      <div style="margin-bottom:14px">
        <div class="flex-between text-sm mb-8">
          <span><strong>${d.range}</strong> <span class="text-muted">${d.label}</span></span>
          <span class="fw-600">${d.pct}%</span>
        </div>
        <div class="progress-wrap" style="height:7px">
          <div class="progress-bar ${d.cls}" style="width:${d.pct}%"></div>
        </div>
      </div>`).join('');
  }

  // Module usage
  const modEl = document.getElementById('module-usage');
  if (modEl) {
    const mods = [
      {name:'Aptitude Tests',    pct:78},
      {name:'Coding Practice',   pct:65},
      {name:'Mock Interviews',   pct:42},
      {name:'Resume Analyzer',   pct:58},
      {name:'Study Resources',   pct:31},
    ];
    modEl.innerHTML = mods.map(m => `
      <div class="flex-between" style="margin-bottom:14px">
        <span class="text-sm text-muted">${m.name}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:100px;background:var(--bg3);border-radius:20px;height:5px;overflow:hidden">
            <div style="width:${m.pct}%;height:100%;background:var(--accent-g)"></div>
          </div>
          <span class="fw-600 text-sm">${m.pct}%</span>
        </div>
      </div>`).join('');
  }
}

/* ── Announcement ──────────────────────────────────────────── */
async function sendAnnouncement() {
  const title = document.getElementById('ann-title')?.value?.trim();
  const body  = document.getElementById('ann-body')?.value?.trim();
  if (!title || !body) { Toast.show('Fill in title and message', 'error'); return; }
  try {
    await API.post('/api/admin/announcements', { title, body });
    Toast.show('Announcement sent to all students!', 'success');
    closeModal('announcement-modal');
    const t=document.getElementById('ann-title'); if(t) t.value='';
    const b=document.getElementById('ann-body');  if(b) b.value='';
  } catch {
    Toast.show('Failed to send announcement', 'error');
  }
}
