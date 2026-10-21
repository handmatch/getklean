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
  const today = iso(new Date());
  const when = document.getElementById('q-when');
  when.min = today;
  document.getElementById('yr').textContent = new Date().getFullYear();

  // Prefill the app's booking (same origin, same sessionStorage key) and jump to Step 1.
  document.getElementById('quick').addEventListener('submit', e => {
    e.preventDefault();
    const date = when.value;
    const patch = { duration: document.getElementById('q-dur').value };
    if (date) { patch.date = date; patch.when = date === today ? 'now' : 'later'; patch.type = 'one-time'; }
    try {
      const cur = JSON.parse(sessionStorage.getItem('gk.booking.v1') || '{}');
      sessionStorage.setItem('gk.booking.v1', JSON.stringify({ ...cur, ...patch, time: null }));
    } catch {}
    location.href = 'app/#/book/when';
  });
})();
