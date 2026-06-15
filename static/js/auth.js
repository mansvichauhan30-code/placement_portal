/* ================================================================
   auth.js  –  Login & Signup form logic
================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  Theme.init();

  /* ── Login form ──────────────────────────────────────────── */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl    = document.getElementById('login-error');
      const btn      = loginForm.querySelector('[type=submit]');

      clearError(errEl);
      if (!email || !password) { showError(errEl, 'Please fill in all fields'); return; }

      btn.disabled = true;
      btn.textContent = 'Logging in…';

      try {
        const res = await API.post('/api/login', { email, password });
        if (res.ok) window.location.href = res.redirect || '/dashboard';
      } catch (err) {
        showError(errEl, err.error || 'Invalid email or password');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Login to Dashboard';
      }
    });
  }

  /* ── Signup form ─────────────────────────────────────────── */
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name     = document.getElementById('su-name').value.trim();
      const email    = document.getElementById('su-email').value.trim();
      const password = document.getElementById('su-password').value;
      const confirm  = document.getElementById('su-confirm').value;
      const college  = document.getElementById('su-college').value.trim();
      const year     = document.getElementById('su-year').value;
      const errEl    = document.getElementById('signup-error');
      const btn      = signupForm.querySelector('[type=submit]');

      clearError(errEl);

      if (!name || !email || !password) { showError(errEl, 'Name, email and password are required'); return; }
      if (password.length < 6)          { showError(errEl, 'Password must be at least 6 characters'); return; }
      if (password !== confirm)          { showError(errEl, 'Passwords do not match'); return; }
      if (!validateEmail(email))         { showError(errEl, 'Please enter a valid email address'); return; }

      btn.disabled = true;
      btn.textContent = 'Creating account…';

      try {
        const res = await API.post('/api/signup', { name, email, password, college, year });
        if (res.ok) window.location.href = res.redirect || '/dashboard';
      } catch (err) {
        showError(errEl, err.error || 'Signup failed. Please try again.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }

  /* ── Password visibility toggle ─────────────────────────── */
  document.querySelectorAll('[data-toggle-pwd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePwd);
      if (!input) return;
      const shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      btn.textContent = shown ? '👁' : '🙈';
    });
  });

  /* ── Theme toggle on auth pages ──────────────────────────── */
  document.querySelectorAll('[data-theme-toggle]').forEach(btn =>
    btn.addEventListener('click', Theme.toggle));
});

function showError(el, msg) { if (el) { el.textContent = msg; el.classList.remove('hidden'); } }
function clearError(el)     { if (el) { el.textContent = '';  el.classList.add('hidden');    } }
function validateEmail(e)   { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
