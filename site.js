// Main page behaviour: mobile menu, header shadow, quick-book hand-off into the booking app.
(() => {
  const top = document.getElementById('top');
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.querySelector('.ic').textContent = open ? 'close' : 'menu';
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', false); btn.querySelector('.ic').textContent = 'menu'; } });
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const z = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  const now = new Date(); const today = iso(now);
  const tomorrow = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  document.getElementById('yr').textContent = now.getFullYear();
  const dateInput = document.querySelector('#f-housemaid [name=when]');
  dateInput.min = today; dateInput.value = tomorrow;

  // ---- Service tiles (Expedia-style tabs) ----
  const tabs = [...document.querySelectorAll('.svc')];
  const select = (svc, focus = false) => {
    tabs.forEach(t => {
      const on = t.dataset.svc === svc;
      t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    document.querySelectorAll('.svc-form').forEach(f => { f.hidden = f.dataset.svc !== svc; });
    history.replaceState(null, '', '#book-' + svc);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.svc));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length].dataset.svc, true);
    });
  });
  // Deep links: #book-aircon etc. (e.g. from the El Niño banner or ads)
  const openFromHash = () => {
    const m = location.hash.match(/^#book-(\w+)/);
    if (m && tabs.some(t => t.dataset.svc === m[1])) { select(m[1]); document.getElementById('book').scrollIntoView({ block: 'center' }); }
  };
  openFromHash(); addEventListener('hashchange', openFromHash);

  // ---- Submit: each service's first form hands off to the next step ----
  const saveBooking = patch => {
    try {
      const cur = JSON.parse(sessionStorage.getItem('gk.booking.v1') || '{}');
      sessionStorage.setItem('gk.booking.v1', JSON.stringify({ ...cur, ...patch }));
    } catch {}
  };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.querySelectorAll('.svc-form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const where = f.elements.where;
    if (where && !where.value) { where.closest('.q-field').classList.add('err'); where.focus(); return; }
    const v = name => f.elements[name]?.value;
    switch (f.dataset.svc) {
      case 'housemaid': {
        const date = v('when') || tomorrow;
        saveBooking({ date, when: date === today ? 'now' : 'later', type: 'one-time', duration: v('dur'), time: null,
          address: { city: v('where') }, addressId: null });
        location.href = 'app/#/book/when'; break;
      }
      case 'flexi':
        saveBooking({ planChoice: v('plan'), plan: v('plan'), cmp: { duration: 'whole', day: 'weekday', per: +v('per') } });
        location.href = 'app/#/book/plan'; break;
      default: // Aircon and deep cleaning are booked with our team on Messenger for now.
        window.open(`https://m.me/getkleanph?ref=${slug([f.dataset.svc, v('where'), v('units') || v('size')].join(' '))}`, '_blank', 'noopener');
    }
  }));
  document.querySelectorAll('.svc-form select').forEach(s => s.addEventListener('change', () => s.closest('.q-field').classList.remove('err')));
})();
// Re-open the tab even if the hash is already #book-…
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#book-"]'); if (!a) return;
  e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); dispatchEvent(new HashChangeEvent('hashchange'));
});
// Hotline sheet (mobile "Call us" button)
(() => {
  const fab = document.querySelector('.call-fab'), sheet = document.getElementById('call-sheet');
  if (!fab) return;
  const close = () => { sheet.hidden = true; fab.focus(); };
  fab.addEventListener('click', () => { sheet.hidden = false; sheet.querySelector('a').focus(); });
  sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.cs-x')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
})();
