// Getklean main page: header, business-unit switching, first-step forms, hotline sheet.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- Header ----------
  const top = $('#top'), menuBtn = $('.menu-btn'), menu = $('#menu');
  const setMenu = open => { menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); $('.ic', menuBtn).textContent = open ? 'close' : 'menu'; };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  const onScroll = () => top.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- Dates ----------
  const z = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  const now = new Date(), today = iso(now);
  const tomorrow = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  $('#yr').textContent = now.getFullYear();
  const dateInput = $('#f-housemaid [name=when]');
  dateInput.min = today; dateInput.value = tomorrow;

  // ---------- Business units ----------
  // Choosing a tile swaps the finder form AND every unit section below the hero.
  // Shared sections (reviews, clients & partners, footer) never change.
  const UNITS = ['housemaid', 'aircon', 'deep'];
  const tabs = $$('.svc');
  function selectUnit(unit, { focusTab = false, updateHash = true } = {}) {
    if (!UNITS.includes(unit)) return;
    tabs.forEach(t => {
      const on = t.dataset.svc === unit;
      t.classList.toggle('on', on); t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    $$('.svc-form').forEach(f => { f.hidden = f.dataset.svc !== unit; });
    $$('.unit').forEach(u => { u.hidden = u.dataset.unit !== unit; });
    $$('[data-unit-link]').forEach(a => a.classList.toggle('active', a.dataset.unitLink === unit));
    document.body.dataset.unit = unit;
    if (updateHash) history.replaceState(null, '', '#book-' + unit);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectUnit(t.dataset.svc));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); selectUnit(tabs[(i + d + tabs.length) % tabs.length].dataset.svc, { focusTab: true });
    });
  });
  const scrollToFinder = () => $('#book').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  // Links like #book-aircon (nav, hero panel, footer, ads) open that unit and jump to its form.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#book-"]'); if (!a) return;
    e.preventDefault();
    selectUnit(a.getAttribute('href').slice(6)); scrollToFinder();
  });
  const fromHash = () => { const m = location.hash.match(/^#book-(\w+)/); if (m && UNITS.includes(m[1])) { selectUnit(m[1], { updateHash: false }); scrollToFinder(); } };
  fromHash(); addEventListener('hashchange', fromHash);

  // ---------- Aircon: live estimate + rate cards ----------
  const acForm = $('#f-aircon');
  const peso = n => 'PHP' + n.toLocaleString('en-US');
  const updateEstimate = () => {
    const price = +acForm.elements.actype.selectedOptions[0].dataset.price;
    $('#ac-est').textContent = peso(price * +acForm.elements.units.value);
  };
  acForm.addEventListener('change', updateEstimate); updateEstimate();
  $$('.ac-card').forEach(c => c.addEventListener('click', () => {
    acForm.elements.actype.value = c.dataset.actype; updateEstimate();
    selectUnit('aircon'); scrollToFinder(); setTimeout(() => acForm.elements.units.focus({ preventScroll: true }), 400);
  }));

  // ---------- Deep cleaning: service cards preselect the space ----------
  const deepForm = $('#f-deep');
  $$('[data-space]').forEach(b => b.addEventListener('click', () => {
    deepForm.elements.space.value = b.dataset.space;
    selectUnit('deep'); scrollToFinder(); setTimeout(() => deepForm.elements.where.focus({ preventScroll: true }), 400);
  }));

  // ---------- Housemaid: plan cards open the plan step with that plan picked ----------
  const saveBooking = patch => {
    try {
      const cur = JSON.parse(sessionStorage.getItem('gk.booking.v1') || '{}');
      sessionStorage.setItem('gk.booking.v1', JSON.stringify({ ...cur, ...patch }));
    } catch {}
  };
  $$('[data-plan]').forEach(a => a.addEventListener('click', () => saveBooking({ planChoice: a.dataset.plan, plan: a.dataset.plan })));

  // ---------- Submit: each unit's first form hands off to its next step ----------
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  $$('.svc-form').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const where = f.elements.where;
    if (where && !where.value) { where.closest('.q-field').classList.add('err'); where.focus(); return; }
    const v = name => f.elements[name]?.value;
    if (f.dataset.svc === 'housemaid') {
      const date = v('when') || tomorrow;
      saveBooking({ date, when: date === today ? 'now' : 'later', type: 'one-time', duration: v('dur'), time: null, address: { city: v('where') }, addressId: null });
      location.href = 'app/#/book/when';
    } else if (f.dataset.svc === 'aircon') {
      // Aircon is booked with the aircon team for now (Messenger, ref carries the details).
      window.open(`https://m.me/getkleanaircon?ref=${slug(`aircon ${v('actype')} x${v('units')}`)}`, '_blank', 'noopener');
    } else {
      const subject = `Deep cleaning quote: ${v('space')} in ${v('where')}`;
      const body = `Hi Getklean Professional,\n\nI'd like a quote for ${v('space').toLowerCase()} cleaning in ${v('where')}.\n\nCompany / space name:\nAddress:\nPreferred schedule:\nContact number:\n\nThank you!`;
      location.href = `mailto:sales@getkleanph.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }));
  $$('.svc-form select').forEach(s => s.addEventListener('change', () => s.closest('.q-field').classList.remove('err')));

  // Bottom bar "Book now": jump to the form of the business you're viewing
  $('.mb-book')?.addEventListener('click', e => { e.preventDefault(); scrollToFinder(); });

  // ---------- Hotline sheet (mobile "Call us") ----------
  const fab = $('.call-fab'), sheet = $('#call-sheet');
  const closeSheet = () => { sheet.hidden = true; fab.focus(); };
  fab.addEventListener('click', () => { sheet.hidden = false; $('a', sheet).focus(); });
  sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.cs-x')) closeSheet(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
})();
