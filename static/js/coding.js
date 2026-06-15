/* ================================================================
   coding.js  –  Coding challenges list + editor + submission
================================================================ */

let codingState = {
  view: 'list',       // list | problem
  challenge: null,
  filter: 'all',
};

document.addEventListener('DOMContentLoaded', () => {
  showCodingView('list');
  loadChallenges();

  // Filter buttons
  document.querySelectorAll('[data-diff-filter]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-diff-filter]').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      codingState.filter = btn.dataset.diffFilter;
      loadChallenges();
    }));
});

function showCodingView(v) {
  codingState.view = v;
  document.getElementById('view-list')?.classList.toggle('hidden', v !== 'list');
  document.getElementById('view-problem')?.classList.toggle('hidden', v !== 'problem');
}

/* ── Load challenge list ───────────────────────────────────── */
async function loadChallenges() {
  const el = document.getElementById('challenge-list');
  if (!el) return;
  el.innerHTML = '<div class="flex-center" style="padding:40px"><div class="spinner"></div></div>';

  const diff = codingState.filter !== 'all' ? `&difficulty=${codingState.filter}` : '';
  try {
    const data = await API.get(`/api/coding/challenges?${diff}`);
    if (!data.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">💻</div><p>No problems found.</p></div>';
      return;
    }
    el.innerHTML = data.map(c => `
      <div class="challenge-list-item fade-in" onclick="openChallenge(${c.id})">
        <div class="challenge-solved-dot ${c.solved ? 'solved' : 'unsolved'}">
          ${c.solved ? '✓' : c.id}
        </div>
        <div class="challenge-meta">
          <div class="challenge-title">${c.title}</div>
          <div class="challenge-tags">
            ${diffBadge(c.difficulty)}
            <span class="badge badge-blue">${c.category}</span>
          </div>
        </div>
        <span style="color:var(--text3);font-size:14px">→</span>
      </div>`).join('');
  } catch {
    Toast.show('Failed to load challenges', 'error');
  }
}

/* ── Open a problem ────────────────────────────────────────── */
async function openChallenge(id) {
  try {
    const c = await API.get(`/api/coding/challenge/${id}`);
    codingState.challenge = c;
    renderProblem(c);
    loadSubmissionHistory(id);
    showCodingView('problem');
  } catch {
    Toast.show('Failed to load problem', 'error');
  }
}

function renderProblem(c) {
  setText('prob-title',        c.title);
  setHTML('prob-difficulty',   diffBadge(c.difficulty));
  setHTML('prob-category',     `<span class="badge badge-blue">${c.category}</span>`);
  setText('prob-description',  c.description);
  setText('prob-sample-input', c.sample_input);
  setText('prob-sample-output',c.sample_output);
  setText('prob-constraints',  c.constraints);
  setText('prob-hints',        c.hints);

  const editor = document.getElementById('code-editor');
  if (editor && !editor.value.trim()) {
    editor.value = getStarterCode(document.getElementById('lang-select')?.value || 'python', c.title);
  }

  const solvedBanner = document.getElementById('solved-banner');
  if (solvedBanner) solvedBanner.classList.toggle('hidden', !c.solved);
}

function getStarterCode(lang, title) {
  const starters = {
    python: `# ${title}\ndef solution():\n    # Write your code here\n    pass\n`,
    java:   `// ${title}\npublic class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`,
    cpp:    `// ${title}\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`,
    javascript: `// ${title}\nfunction solution() {\n    // Write your code here\n}\n`,
  };
  return starters[lang] || starters.python;
}

/* ── Language change ───────────────────────────────────────── */
function onLangChange(sel) {
  const editor = document.getElementById('code-editor');
  if (editor && codingState.challenge) {
    if (confirm('Changing language will reset your code. Continue?')) {
      editor.value = getStarterCode(sel.value, codingState.challenge.title);
    } else {
      sel.value = 'python'; // revert
    }
  }
}

/* ── Submit code ───────────────────────────────────────────── */
async function submitCode() {
  const code = document.getElementById('code-editor')?.value || '';
  const lang = document.getElementById('lang-select')?.value || 'python';
  const btn  = document.getElementById('btn-submit-code');

  if (!code.trim()) { Toast.show('Write some code first!', 'error'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }

  try {
    const res = await API.post('/api/coding/submit', {
      challenge_id: codingState.challenge.id,
      code, language: lang,
    });

    const resultEl = document.getElementById('submit-result');
    if (resultEl) {
      resultEl.className = `alert ${res.status === 'accepted' ? 'alert-success' : 'alert-danger'} mt-12`;
      resultEl.innerHTML = `<strong>${res.status === 'accepted' ? '✓ Accepted' : '✗ Wrong Answer'}</strong> – ${res.message}`;
      resultEl.classList.remove('hidden');
    }

    if (res.status === 'accepted') {
      Toast.show('All test cases passed! 🎉', 'success');
      // mark solved in list
      const dot = document.querySelector(`.challenge-solved-dot[data-id="${codingState.challenge.id}"]`);
      if (dot) { dot.classList.add('solved'); dot.textContent = '✓'; }
      loadSubmissionHistory(codingState.challenge.id);
    } else {
      Toast.show('Some test cases failed. Try again.', 'error');
    }
  } catch {
    Toast.show('Submission failed. Please retry.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶  Run & Submit'; }
  }
}

/* ── Submission history ────────────────────────────────────── */
async function loadSubmissionHistory(cid) {
  const el = document.getElementById('submission-history');
  if (!el) return;
  try {
    const rows = await API.get(`/api/coding/submissions/${cid}`);
    if (!rows.length) { el.innerHTML = '<p class="text-muted text-sm">No submissions yet.</p>'; return; }
    el.innerHTML = `<table style="width:100%">
      <thead><tr>
        <th>Language</th><th>Status</th><th>Time</th>
      </tr></thead>
      <tbody>${rows.map(r => `
        <tr>
          <td>${r.language}</td>
          <td><span class="badge ${r.status==='accepted'?'badge-green':'badge-red'}">${r.status}</span></td>
          <td class="text-muted text-xs">${timeAgo(r.submitted_at)}</td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch {}
}

/* ── Hint toggle ───────────────────────────────────────────── */
function toggleHint() {
  const el  = document.getElementById('hint-box');
  const btn = document.getElementById('btn-hint');
  if (!el) return;
  const shown = !el.classList.contains('hidden');
  el.classList.toggle('hidden', shown);
  if (btn) btn.textContent = shown ? '💡 Show Hint' : '🙈 Hide Hint';
}

/* ── Helpers ───────────────────────────────────────────────── */
function setText(id, val) { const e = document.getElementById(id); if (e) e.textContent = val || ''; }
function setHTML(id, val) { const e = document.getElementById(id); if (e) e.innerHTML  = val || ''; }
