// Hash router for the Getklean customer app (static, no backend).
import * as home from './views/home.js';
import { routes as bookRoutes, clearErrors } from './views/book.js';
import { nav, footer, textField, icon, toast } from './ui.js';
import { booking, setUser, user, resetBooking } from './state.js';

const root = document.getElementById('app');
const go = path => { if (location.hash === '#' + path) render(); else location.hash = path; };

// ---------- standalone log in (nav "Sign in") ----------
let login = { step: 'mobile', mobile: '', err: '' };
const loginView = {
  render: () => `<div class="page">${nav('')}<main class="wrap login">
    <form id="f" class="form-card login-card" novalidate>
      <span class="icon-bubble lg">${icon(login.step === 'mobile' ? 'person' : 'sms')}</span>
      <h1 class="h5">${login.step === 'mobile' ? 'Log in to GetKlean' : 'Enter the code we sent to your mobile number.'}</h1>
      ${login.step === 'mobile'
        ? textField({ id: 'mobile', label: 'Mobile number', type: 'tel', start: '+63', value: login.mobile, error: login.err, helper: 'We will send you a 6-digit code.', attrs: 'inputmode="numeric" autocomplete="tel-national"' })
        : `<div class="otp">${Array.from({ length: 6 }, (_, i) => `<input class="otp-box ${login.err ? 'err' : ''}" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}">`).join('')}</div>
           ${login.err ? `<p class="helper-error">${login.err}</p>` : ''}<p class="caption muted">Demo: any 6 digits work.</p>`}
      <button class="btn contained lg wide" type="submit">${login.step === 'mobile' ? 'Send code' : 'Verify &amp; log in'}</button>
      <p class="body2 muted">New to GetKlean? <a class="lnk" href="#/book/when">Book your first housemaid</a></p>
    </form></main>${footer()}</div>`,
  mount(r) {
    const boxes = [...r.querySelectorAll('.otp-box')];
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => { b.value = b.value.replace(/\D/g, '').slice(-1); if (b.value) boxes[i + 1]?.focus(); });
      b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value) boxes[i - 1]?.focus(); });
    });
    (boxes[0] || r.querySelector('#mobile'))?.focus();
    r.querySelector('#f').addEventListener('submit', e => {
      e.preventDefault();
      if (login.step === 'mobile') {
        const m = r.querySelector('#mobile').value.replace(/\D/g, '').replace(/^0?63/, '').replace(/^0/, '');
        login = /^9\d{9}$/.test(m) ? { step: 'otp', mobile: m, err: '' } : { ...login, mobile: m, err: 'Enter a valid PH mobile number, e.g. 909 876 5432.' };
      } else {
        if (boxes.map(b => b.value).join('').length < 6) login.err = 'Enter all 6 digits.';
        else { setUser({ name: 'Maria Santos', email: 'maria@example.com', mobile: login.mobile, area: 'Pasig, Metro Manila' }); login = { step: 'mobile', mobile: '', err: '' }; toast('Welcome back!'); go('/'); return; }
      }
      render();
    });
  },
};

const notFound = { render: () => `<div class="page">${nav('')}<main class="wrap login"><div class="form-card login-card"><h1 class="h5">Page not found</h1><a class="btn contained lg" href="#/">Go home</a></div></main>${footer()}</div>` };

const table = { '/': home, '/sign-in': loginView, ...bookRoutes };
let lastPath = null;

function render() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const view = table[path] || notFound;
  if (path !== lastPath) clearErrors();
  // Guard: steps that need earlier answers send you back to Step 1.
  const s = booking();
  if (view.needs && view.needs.some(k => !s[k])) { go('/book/when'); return; }
  const html = view.render();
  if (html == null) { go(view.redirect || '/'); return; }
  root.innerHTML = html;
  const scroll = path !== lastPath;
  lastPath = path;
  view.mount?.(root, go, render);
  if (scroll) window.scrollTo(0, 0);
  document.title = path === '/' ? 'GetKlean · Book a trusted housemaid' : `GetKlean · ${root.querySelector('h1')?.textContent?.trim() || 'Book'}`;
}

document.addEventListener('click', e => {
  const menuBtn = e.target.closest('[data-action="menu"]');
  if (menuBtn) { const n = document.getElementById('nav'); const o = n.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); menuBtn.querySelector('.ic').textContent = o ? 'close' : 'menu'; return; }
  const ddBtn = e.target.closest('[data-action="dd"]');
  const dd = document.querySelector('.gk-dd');
  if (ddBtn) { const o = dd.classList.toggle('open'); ddBtn.setAttribute('aria-expanded', o); return; }
  if (dd && !dd.contains(e.target)) dd.classList.remove('open');
  if (e.target.closest('[data-action="signout"]')) { setUser(null); resetBooking(); toast('You’re signed out.'); go('/'); }
});
window.addEventListener('hashchange', render);
render();
