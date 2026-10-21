import { nav, footer, icon, img, esc, selectField, textField, tag } from '../ui.js';
import { user, update, booking, todayISO, SAVED_ADDRESSES } from '../state.js';

// Quick-book form shared by both home variants. Prefills the booking and jumps into Step 1.
function quickBook(signedIn) {
  const s = booking();
  const where = signedIn ? SAVED_ADDRESSES.map(a => [a.id, `${a.label} · ${a.line}`]) : [['metro-manila', 'Metro Manila'], ['bulacan', 'Bulacan'], ['rizal', 'Rizal']];
  return `<form class="quick-book ${signedIn ? 'qb-signed' : ''}" id="qb">
    <p class="h6 muted">When do you need help?</p>
    <div class="qb-form">
      ${selectField({ id: 'qb-where', label: 'Where', options: where, placeholder: true, value: s.addressId || '' })}
      <div class="when">${textField({ id: 'qb-when', label: 'When', type: 'date', value: s.date || '', attrs: `min="${todayISO()}"` })}</div>
      ${selectField({ id: 'qb-duration', label: 'Duration', options: [['whole', 'Whole day (8 hrs)'], ['half', 'Half day (4 hrs)']], placeholder: true, value: s.time ? s.duration : '' })}
      <button class="btn contained lg" type="submit">Book a Housemaid</button>
    </div>
  </form>`;
}

function steps() {
  const card = (ic, t, d) => `<div class="step-card"><span class="yicon">${icon(ic)}</span><div class="t"><p class="h6">${t}</p><p class="body1 muted">${d}</p></div></div>`;
  return `<section class="wrap-home section">
    <h2 class="h5">Book your housemaid in three easy steps</h2>
    <div class="cards-3">
      ${card('mop', 'Tell us what you need', 'Pick your date and select your custom tasks in seconds.')}
      ${card('woman', 'Pick your housemaid', 'Browse our vetted and trained housemaids.')}
      ${card('credit_card', 'Confirm and pay', 'Upfront pricing and local payment options.')}
    </div>
  </section>`;
}

const promo = () => `<div class="promo">
  <div class="tile">${img('assets/promo-free-one-day.png', 'Free one day: 8 free hours with 3 months membership', '', '<span class="tile-fb">free<br>one<br>day</span>')}</div>
  <div class="copy">
    <p class="h6">Book often? We’ve got 8 hours on us.</p>
    <p class="body1">Get 8 FREE hours with the 3-Month Flexi Plan.</p>
    <a class="terms" href="#/">See terms and conditions</a>
  </div>
  <a class="btn yellow lg cta" href="#/book/plan">See Flexi Plans</a>
</div>`;

function why() {
  const card = (src, t, d) => `<div class="why-card"><div class="photo">${img(src, '', '', '')}</div><div class="t"><p class="h6">${t}</p><p class="body2 muted">${d}</p></div></div>`;
  return `<section class="wrap-home section grey">
    <h2 class="h5">Why choose us</h2>
    <div class="cards-3">
      ${card('assets/why-replacements.png', 'Unlimited replacements', 'Not the right fit? Replace or cancel anytime, with zero fees.')}
      ${card('assets/why-hassle-free.png', 'Hassle-free arrangement', 'Getklean handles the employer side and the contracts, so you don\'t have to.')}
      ${card('assets/why-safety.png', 'Safety for you and your helper', 'Every deployed housemaid is insured, for your peace of mind.')}
    </div>
    <a class="link" href="#/">Compare GetKleanPH with traditional agency</a>
  </section>`;
}

function reviews() {
  const r = (q, name, ini, city) => `<div class="review">
    <div class="stars" aria-label="5 out of 5 stars">${icon('star').repeat(5)}</div>
    <p class="body1">“${q}”</p>
    <a class="link" href="#/">Read full review</a>
    <div class="customer"><span class="avatar">${ini}</span><div><p class="h6">${name}</p>
      <div class="meta-row"><span>${icon('schedule', 's18 fill')} Whole day</span><span>${icon('location_on', 's18')} ${city}</span></div></div></div>
  </div>`;
  return `<section class="wrap-home section">
    <h2 class="h5">What customers say</h2>
    <div class="cards-3">
      ${r('Booked at 9pm, someone was here by 8 the next morning. She knew exactly what to do and I didn’t have to follow her around.', 'Johnson Tang', 'JT', 'Quezon City')}
      ${r('I am very satisfied with the outcome of the cleaning of ate Nely and Dominic. It was superb! They really know what this...', 'Charlie A', 'CA', 'Mandaluyong City')}
      ${r('10/10 ratings for their dedication and hardwork. They rarely talk to each other because they are so busy doing such...', 'Reech May', 'RM', 'Caloocan City')}
    </div>
    <a class="link" href="#/">See all reviews</a>
  </section>`;
}

function guest() {
  return `<div class="page">${nav('Home')}<main>
    <section class="wrap-home" style="padding-top:var(--s6)">
      <div class="hero">
        ${img('assets/hero-shape.svg', '', 'shape', '')}
        ${img('assets/hero-housemaid.png', 'Getklean housemaid', 'hero-photo', '')}
        <div class="hero-content">
          <div class="headline"><h1>Book a trusted housemaid</h1>
            <p class="body1">Vetted, trained and insured housemaids for a whole day or half day in Metro Manila. See your price before you pay.</p></div>
          <div class="benefits">
            ${['A vetted, trained and background-checked housemaid', 'Free replacement anytime, no fees', 'Choose your own housemaid, or let us match you', 'Government benefits included in the rate']
              .map(b => `<div class="benefit">${icon('check_circle', 'fill')}<span>${b}</span></div>`).join('')}
          </div>
        </div>
      </div>
      ${quickBook(false)}
    </section>
    ${steps()}
    <section class="wrap-home" style="padding-bottom:var(--s6)">${promo()}</section>
    ${why()}
    ${reviews()}
  </main>${footer()}</div>`;
}

function signedIn(u) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const voucher = (t) => `<div class="voucher"><div class="v-amt"><span>PHP</span><b>100</b><span>OFF</span></div>
    <div class="v-body"><p class="h6">${t}</p><p class="caption muted">Min. spend PHP 710. Expires Nov 30, 2026</p>
    <div class="v-actions"><a class="btn outlined sm" href="#/book/when">Use voucher</a><a class="link" href="#/">T&amp;C apply</a></div></div></div>`;
  return `<div class="page">${nav('Home')}<main>
    <section class="wrap-home welcome">
      <h1 class="h4">${greet}, ${esc(u.name.split(' ')[0])}</h1>
      <p class="body2 loc">${icon('location_on', 's18 fill')} <b>Home</b> · ${esc(u.area || 'Pasig, Metro Manila')} · <a class="link" href="#/book/where">Change</a></p>
      ${quickBook(true)}
    </section>
    <section class="wrap-home section">
      <div class="next-booking"><p class="h6">Your next booking</p>
        <div class="nb-row"><span class="yicon sm">${icon('event_available')}</span><div><p class="body1">No upcoming bookings yet</p><p class="body2 muted">Your next one will show up here with the housemaid, time and address</p></div></div>
      </div>
    </section>
    <section class="wrap-home section deals">
      <div class="sec-head"><h2 class="h5">Deals and offers</h2><a class="btn text sm" href="#/">View all deals and offers</a></div>
      <div class="deals-grid">
        <div class="deal-trial">
          ${tag('WEEKDAYS ONLY', 'outline-light')}
          <p class="h6">Give us a try! Weekdays only.</p>
          <p class="body2">Weekday trial, whole day PHP650 and half day PHP510. Book now!</p>
          <div class="trial-opts">
            <div class="trial-opt"><div class="to-head"><span class="h6 primary">Whole day trial</span>${tag('Save PHP550', 'success')}</div><p><b>PHP650</b> <s>PHP1,200</s></p></div>
            <div class="trial-opt"><div class="to-head"><span class="h6 primary">Half day trial</span>${tag('Save PHP390', 'success')}</div><p><b>PHP510</b> <s>PHP900</s></p></div>
          </div>
          <div class="trial-foot"><a class="btn yellow md" href="#/book/when">Book a trial day</a><a class="terms" href="#/">T&amp;C apply</a><span class="caption">*Transportation not included</span></div>
        </div>
        ${promo()}
      </div>
    </section>
    <section class="wrap-home section">
      <div class="sec-head"><h2 class="h5">My vouchers</h2><a class="btn text sm" href="#/">View all vouchers</a></div>
      <div class="cards-3">${voucher('First Booking')}${voucher('Refer a Friend')}${voucher('Weekend Clean')}</div>
    </section>
  </main>${footer()}</div>`;
}

export function render() { const u = user(); return u ? signedIn(u) : guest(); }

export function mount(root, go) {
  root.querySelector('#qb')?.addEventListener('submit', e => {
    e.preventDefault();
    const where = root.querySelector('#qb-where').value;
    const date = root.querySelector('#qb-when').value;
    const dur = root.querySelector('#qb-duration').value;
    const patch = {};
    if (date) { patch.date = date; patch.when = date === todayISO() ? 'now' : 'later'; }
    if (dur) patch.duration = dur;
    const saved = SAVED_ADDRESSES.find(a => a.id === where);
    if (saved) { patch.addressId = saved.id; patch.address = { label: saved.label, line: saved.line }; }
    update(patch);
    go('/book/when');
  });
}
