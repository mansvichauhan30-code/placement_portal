/* ================================================================
   core.js  –  Shared utilities for every page
================================================================ */

/* ── Theme ─────────────────────────────────────────────────── */
const Theme = (() => {
  const key = 'pp_theme';
  function apply(mode) {
    document.body.classList.toggle('light', mode === 'light');
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.textContent = mode === 'light' ? '🌙' : '☀️';
    });
    localStorage.setItem(key, mode);
  }
  function init() {
    apply(localStorage.getItem(key) || 'dark');
  }
  function toggle() {
    const cur = localStorage.getItem(key) || 'dark';
    apply(cur === 'dark' ? 'light' : 'dark');
  }
  return { init, toggle, apply };
})();

/* ── Toast notifications ───────────────────────────────────── */
const Toast = (() => {
  function ensure() {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    return c;
  }
  function show(msg, type = 'info', duration = 3200) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    ensure().appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0'; t.style.transform = 'translateX(20px)';
      t.style.transition = '.3s'; setTimeout(() => t.remove(), 300);
    }, duration);
  }
  return { show };
})();

/* ── API helper ────────────────────────────────────────────── */
const API = (() => {
  async function request(url, opts = {}) {
    const defaults = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    const res = await fetch(url, { ...defaults, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, ...(typeof data === 'object' ? data : {}) };
    return data;
  }
  const get  = url        => request(url);
  const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) });
  const del  = url        => request(url, { method: 'DELETE' });
  return { get, post, del };
})();

/* ── Sidebar toggle ────────────────────────────────────────── */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const hamburger= document.getElementById('hamburger');
  if (!sidebar) return;

  function open()  { sidebar.classList.add('open'); overlay && overlay.classList.add('active'); }
  function close() { sidebar.classList.remove('open'); overlay && overlay.classList.remove('active'); }

  hamburger  && hamburger.addEventListener('click', open);
  overlay    && overlay.addEventListener('click', close);

  // highlight active nav link
  const cur = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(a => {
    if (a.getAttribute('href') === cur) a.classList.add('active');
  });
}

/* ── Topbar user info ──────────────────────────────────────── */
async function loadTopbarUser() {
  try {
    const u = await API.get('/api/me');
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = u.name);
    document.querySelectorAll('[data-user-avatar]').forEach(el => {
      if (el.tagName === 'DIV') {
        el.textContent = u.avatar || u.name[0].toUpperCase();
      }
    });
  } catch {}
}

/* ── Logout ────────────────────────────────────────────────── */
async function logout() {
  await API.post('/api/logout', {});
  window.location.href = '/';
}

/* ── Format helpers ────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function diffBadge(diff) {
  const map = { easy: 'badge-green', medium: 'badge-orange', hard: 'badge-red' };
  return `<span class="badge ${map[diff] || 'badge-blue'}">${diff}</span>`;
}

function scoreColor(pct) {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

/* ── Circle progress SVG ───────────────────────────────────── */
function circleProgress(container, pct, size = 90, stroke = 9) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  container.innerHTML = `
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <defs>
        <linearGradient id="cpg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f7cff"/>
          <stop offset="100%" stop-color="#7c4fff"/>
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none"
        stroke="rgba(79,124,255,.15)" stroke-width="${stroke}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none"
        stroke="url(#cpg)" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${off}"
        stroke-linecap="round" style="transition:stroke-dashoffset .6s"/>
    </svg>`;
}

/* ── Mini bar chart ────────────────────────────────────────── */
function miniBarChart(container, data, labels = []) {
  const max = Math.max(...data, 1);
  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:5px;height:100px;padding:8px 8px 0">
      ${data.map((v, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <span style="font-size:9px;color:var(--text3)">${Math.round(v)}%</span>
          <div style="width:100%;background:${i===data.length-1?'#4f7cff':'rgba(79,124,255,.35)'};
            border-radius:3px 3px 0 0;height:${Math.max((v/max)*80,3)}px;transition:height .4s"></div>
        </div>`).join('')}
    </div>
    ${labels.length ? `<div style="display:flex;gap:5px;padding:0 8px">
      ${labels.map(l=>`<div style="flex:1;text-align:center;font-size:9px;color:var(--text3)">${l}</div>`).join('')}
    </div>` : ''}`;
}

/* ── Progress bar ──────────────────────────────────────────── */
function setProgressBar(el, pct, cls = '') {
  el.style.width = `${pct}%`;
  if (cls) el.className = `progress-bar ${cls}`;
}

/* ── Modal helpers ─────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
  if (e.target.classList.contains('modal-close')) {
    e.target.closest('.modal-overlay')?.classList.remove('active');
  }
});

/* ── Init on DOMContentLoaded ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initSidebar();
  loadTopbarUser();

  // Theme toggle buttons
  document.querySelectorAll('[data-theme-toggle]').forEach(btn =>
    btn.addEventListener('click', Theme.toggle));

  // Logout buttons
  document.querySelectorAll('[data-logout]').forEach(btn =>
    btn.addEventListener('click', logout));
});
