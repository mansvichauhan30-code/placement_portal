/* ================================================================
   dashboard.js  –  Student dashboard logic
================================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboard();
});

async function loadDashboard() {
  try {
    const s = await API.get('/api/dashboard/stats');
    renderStats(s);
    renderReadiness(s.readiness);
    renderActivity(s.recent_activity);
    renderSubjectBars(s);
  } catch (e) {
    Toast.show('Failed to load dashboard data', 'error');
  }
}

function renderStats(s) {
  const map = {
    'stat-tests':      s.tests_attempted,
    'stat-avg':        s.avg_score.toFixed(1) + '%',
    'stat-problems':   s.problems_solved,
    'stat-interviews': s.interviews_done,
    'stat-rank':       s.rank > 0 ? '#' + s.rank : '–',
    'stat-readiness':  s.readiness + '%',
  };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

function renderReadiness(pct) {
  const el = document.getElementById('readiness-circle');
  if (!el) return;
  circleProgress(el, pct, 100, 10);
  const txt = document.getElementById('readiness-text');
  if (txt) txt.textContent = pct + '%';

  const label = document.getElementById('readiness-label');
  if (label) {
    if (pct >= 80) label.textContent = 'Placement Ready 🎯';
    else if (pct >= 60) label.textContent = 'Good Progress 👍';
    else label.textContent = 'Keep Practising 💪';
  }
}

function renderActivity(activities) {
  const el = document.getElementById('activity-feed');
  if (!el) return;
  if (!activities || !activities.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No activity yet. Start a test!</p></div>`;
    return;
  }
  const icons = { test: '📝', code: '💻', interview: '🎙️' };
  const labels = { test: 'Test', code: 'Coding', interview: 'Interview' };
  el.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-icon ${a.type}">${icons[a.type] || '📌'}</div>
      <div class="activity-body">
        <div class="activity-desc">${labels[a.type] || a.type} – ${a.info}</div>
        <div class="activity-meta">
          <span class="activity-time">${timeAgo(a.time)}</span>
          ${a.score != null ? `<span class="activity-score" style="color:${scoreColor(a.score)}">${Math.round(a.score)}%</span>` : ''}
        </div>
      </div>
    </div>`).join('');
}

function renderSubjectBars(s) {
  const subs = [
    { label: 'Aptitude',       pct: s.avg_score  || 0, color: '#4f7cff' },
    { label: 'Coding',         pct: Math.min((s.problems_solved / 30) * 100, 100), color: '#00d4aa' },
    { label: 'Interviews',     pct: s.interviews_done > 0 ? Math.min(s.interviews_done * 12, 100) : 0, color: '#a07cff' },
    { label: 'Readiness',      pct: s.readiness  || 0, color: '#ffb830' },
  ];
  const el = document.getElementById('subject-bars');
  if (!el) return;
  el.innerHTML = subs.map(s => `
    <div style="margin-bottom:14px">
      <div class="flex-between text-sm mb-8">
        <span class="text-muted">${s.label}</span>
        <span class="fw-600">${Math.round(s.pct)}%</span>
      </div>
      <div class="progress-wrap" style="height:7px">
        <div class="progress-bar" style="width:${s.pct}%;background:linear-gradient(90deg,${s.color}88,${s.color})"></div>
      </div>
    </div>`).join('');
}
