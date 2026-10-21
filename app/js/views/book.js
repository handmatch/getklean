// Booking flow: When → Where → Select service → Sign-in → Select housemaid → Select plan → Review and pay → Booked
import {
  bookingPage, radioCard, checkCard, textField, selectField, chip, tag, dot, icon, img, esc, actions, summary,
  shortName, addressLine, toast, initials,
} from '../ui.js';
import {
  booking, update, user, setUser, resetBooking, todayISO, addDays, fmt, dayLabel, isWeekend, fromISO,
  START_TIMES, endTime, durationLabel, PLANS, PRICES, TASK_GROUPS, HOUSEMAIDS, SAVED_ADDRESSES, php, visitPrice, total, trialEligible,
} from '../state.js';

const errorBox = msg => msg ? `<div class="alert-error" role="alert">${icon('error')}<span>${msg}</span></div>` : '';
let errors = {};               // per-render validation messages
const setErrors = e => { errors = e; };

// =====================================================================
// Step 1 — When
// =====================================================================
const FREQ = { 'Once a week': 1, 'Twice a week': 2, 'Thrice a week': 3, 'Once a month': 1, 'Twice a month': 2 };
const DAYS = [['M', 'Mon'], ['T', 'Tue'], ['W', 'Wed'], ['Th', 'Thu'], ['F', 'Fri'], ['Sa', 'Sat'], ['Su', 'Sun']];

function timeAvailable(t, s) {
  if (!t) return false;
  if (s.when !== 'now' || s.date !== todayISO()) return true;
  const m = t.match(/(\d+):\d+(AM|PM)/); const h = (+m[1] % 12) + (m[2] === 'PM' ? 12 : 0);
  return h > new Date().getHours() + 1;   // need at least ~1 hour lead time
}

function when() {
  const s = booking(); const today = todayISO(); const tom = addDays(today, 1);
  if (!s.date) update({ date: s.when === 'now' ? today : tom });
  const d = booking().date;
  const needDays = FREQ[s.frequency] || 1;

  const dateBlock = s.when === 'now' ? `
    <div class="field"><p class="label">Select date</p>
      <div class="radio-row tight">
        ${radioCard({ name: 'nowdate', value: today, checked: d === today, label: 'Today', caption: `${fmt.dow(today)}${dot()}${fmt.med(today)}` })}
        ${radioCard({ name: 'nowdate', value: tom, checked: d === tom, label: 'Tomorrow', caption: `${fmt.dow(tom)}${dot()}${fmt.med(tom)}` })}
      </div>
      <div class="date-display"><span class="icon-bubble">${icon('event')}</span><span class="body1"><b>${dayLabel(d)}</b>, ${fmt.long(d)}</span></div>
    </div>` : `
    <div class="field"><p class="label">Booking type</p>
      <div class="radio-row">
        ${radioCard({ name: 'type', value: 'one-time', checked: s.type === 'one-time', label: 'One-time', caption: 'Single booking on a date you choose' })}
        ${radioCard({ name: 'type', value: 'recurring', checked: s.type === 'recurring', label: 'Recurring', caption: 'Repeats on a schedule' })}
      </div>
    </div>
    ${s.type === 'one-time' ? `
      <div class="field"><p class="label">Select date</p>
        <div class="inline-2">${textField({ id: 'date', label: 'Date', type: 'date', value: d, attrs: `min="${tom}"`, error: errors.date })}</div>
      </div>` : `
      <div class="field"><p class="label">Select date</p>
        <div class="inline-2">
          ${textField({ id: 'date', label: 'Start date', type: 'date', value: d, attrs: `min="${tom}"`, error: errors.date })}
          ${textField({ id: 'endDate', label: 'End date', type: 'date', value: s.endDate || '', attrs: `min="${addDays(d, 7)}"`, error: errors.endDate })}
        </div>
      </div>
      <div class="field"><p class="label">Select frequency</p>
        <div class="chip-row">${Object.keys(FREQ).map(f => chip(f, s.frequency === f, `data-freq="${f}"`)).join('')}</div>
      </div>
      <div class="field"><p class="label">Select ${needDays} day${needDays > 1 ? 's' : ''}</p>
        <div class="days" role="group" aria-label="Days of the week">${DAYS.map(([k, l]) => `<button type="button" class="day ${s.days.includes(k) ? 'on' : ''}" data-day="${k}" aria-label="${l}" aria-pressed="${s.days.includes(k)}">${k}</button>`).join('')}</div>
        ${errors.days ? `<p class="helper-error">${errors.days}</p>` : ''}
      </div>`}`;

  const times = START_TIMES.map(t => {
    const ok = timeAvailable(t, booking());
    return chip(t, s.time === t, `data-time="${t}" ${ok ? '' : 'disabled title="Too soon for today"'}`);
  }).join('');

  return bookingPage({
    step: 1, title: 'When do you need us?', subtitle: 'Pick a day, how long, and a start time.',
    body: `<form id="f" class="book-form" novalidate>
      ${errorBox(errors.form)}
      <div class="form-card">
        <h2 class="h5">When do you need the service?</h2>
        <div class="radio-row">
          ${radioCard({ name: 'when', value: 'now', checked: s.when === 'now', label: 'Book now', caption: 'Single booking today' })}
          ${radioCard({ name: 'when', value: 'later', checked: s.when === 'later', label: 'Book later', caption: 'One-time or recurring' })}
        </div>
        ${dateBlock}
      </div>
      <div class="form-card">
        <h2 class="h5">How long, and what time?</h2>
        <div class="field"><p class="label">Service duration</p>
          <div class="radio-row">
            ${radioCard({ name: 'duration', value: 'half', checked: s.duration === 'half', label: 'Half day', caption: '4hrs service' })}
            ${radioCard({ name: 'duration', value: 'whole', checked: s.duration === 'whole', label: 'Whole day', caption: '7hrs service + 1hr break' })}
          </div>
        </div>
        <div class="field"><p class="label">Start time</p>
          <div class="chips">${times}</div>
          ${errors.time ? `<p class="helper-error">${errors.time}</p>` : ''}
          ${s.time ? `<div class="info">${icon('schedule', 's20 fill')}<span>Your service will start from ${s.time} and will end at ${endTime(s.time, s.duration)}.</span></div>` : ''}
        </div>
      </div>
      ${actions({ back: null })}
    </form>`,
  });
}

function mountWhen(root, go, rerender) {
  const f = root.querySelector('#f');
  f.addEventListener('change', e => {
    const t = e.target, s = booking();
    if (t.name === 'when') update({ when: t.value, date: t.value === 'now' ? todayISO() : addDays(todayISO(), 1), time: null });
    else if (t.name === 'nowdate') update({ date: t.value, time: timeAvailable(s.time || '', { ...s, date: t.value }) ? s.time : null });
    else if (t.name === 'type') update({ type: t.value });
    else if (t.name === 'duration') update({ duration: t.value });
    else if (t.id === 'date') update({ date: t.value || addDays(todayISO(), 1) });
    else if (t.id === 'endDate') update({ endDate: t.value || null });
    else return;
    setErrors({}); rerender();
  });
  f.addEventListener('click', e => {
    const b = e.target.closest('button[data-time],button[data-freq],button[data-day]'); if (!b) return;
    const s = booking();
    if (b.dataset.time) update({ time: b.dataset.time });
    if (b.dataset.freq) update({ frequency: b.dataset.freq, days: s.days.slice(0, FREQ[b.dataset.freq]) });
    if (b.dataset.day) {
      const k = b.dataset.day, max = FREQ[s.frequency] || 1;
      let days = s.days.includes(k) ? s.days.filter(x => x !== k) : [...s.days, k];
      if (days.length > max) days = days.slice(-max);
      update({ days });
    }
    setErrors({}); rerender();
  });
  f.addEventListener('submit', e => {
    e.preventDefault(); const s = booking(); const err = {};
    if (!s.time) err.time = 'Choose a start time.';
    if (s.when === 'later' && s.type === 'recurring') {
      const need = FREQ[s.frequency] || 1;
      if (s.days.length !== need) err.days = `Select ${need} day${need > 1 ? 's' : ''}.`;
      if (!s.endDate) err.endDate = 'Choose an end date.';
      else if (s.endDate <= s.date) err.endDate = 'End date must be after the start date.';
    }
    if (Object.keys(err).length) { err.form = 'Please complete the highlighted fields.'; setErrors(err); rerender(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrors({}); go('/book/where');
  });
}

// =====================================================================
// Step 2 — Where
// =====================================================================
const mapEmbed = (lat = 14.5764, lon = 121.0851) => {
  const d = 0.008;
  return `<iframe class="map" title="Map of your address" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${lon - d * 1.6},${lat - d},${lon + d * 1.6},${lat + d}&layer=mapnik&marker=${lat},${lon}"></iframe>`;
};
const mapBlock = (lat, lon) => `<div class="field map-field">
  <div class="map-head body1"><span>Is the pin on your door?</span><span>Move the pin if it’s off</span></div>
  ${mapEmbed(lat, lon)}
  <p class="body2 secure">${icon('verified_user', 's20')} Your exact address is shared only with your assigned housemaid.</p>
</div>`;

function where() {
  const s = booking(); const u = user();
  const a = s.address && !s.addressId ? s.address : {};
  const showSaved = u && !s.newAddress;
  let body;
  if (showSaved) {
    const sel = SAVED_ADDRESSES.find(x => x.id === s.addressId) || null;
    body = `<div class="form-card">
      <h2 class="h5">Select service address</h2>
      <div class="field">
        ${SAVED_ADDRESSES.map(x => radioCard({ name: 'addr', value: x.id, checked: s.addressId === x.id, label: x.label, caption: esc(x.line), iconName: x.icon, badge: x.isDefault ? tag('Default', 'yellow') : '' })).join('')}
        <button type="button" class="add-dashed" id="add-new"><span class="icon-bubble sm">${icon('add', 's20')}</span>Add new address</button>
        ${errors.addr ? `<p class="helper-error">${errors.addr}</p>` : ''}
      </div>
      ${mapBlock(sel?.lat, sel?.lon)}
    </div>`;
  } else {
    body = `<div class="form-card">
      <h2 class="h5">Find your address</h2>
      ${textField({ id: 'search', label: 'Search address', value: a.search || '', end: icon('search'), error: errors.search })}
      ${mapBlock()}
      <div class="field gap3">
        <h3 class="h6">Help your housemaid find you</h3>
        ${selectField({ id: 'label', label: 'Save this address as', value: a.label || 'Home', options: ['Home', 'Work', 'Parents', 'Other'] })}
        <div class="inline-2">
          ${textField({ id: 'unit', label: 'Unit/Floor (optional)', value: a.unit || '' })}
          ${textField({ id: 'building', label: 'Building name (optional)', value: a.building || '' })}
        </div>
        <div class="inline-2">
          ${textField({ id: 'street', label: 'Street', value: a.street || '', error: errors.street })}
          ${textField({ id: 'city', label: 'City/Municipality', value: a.city || '', error: errors.city })}
        </div>
        ${textField({ id: 'landmark', label: 'Landmark (optional)', value: a.landmark || '' })}
        <label class="checkbox"><input type="checkbox" id="isDefault" ${a.isDefault !== false ? 'checked' : ''}><span class="cb">${icon('check')}</span>Set as default address</label>
      </div>
      ${u ? `<button type="button" class="btn text md" id="use-saved">${icon('arrow_back', 's18')} Use a saved address</button>` : ''}
    </div>`;
  }
  return bookingPage({
    step: 2, title: 'Where should we clean?', subtitle: 'We’ll match you with housemaids who serve your area.',
    body: `<form id="f" class="book-form" novalidate>${errorBox(errors.form)}${body}${actions({ back: '#/book/when' })}</form>`,
  });
}

function mountWhere(root, go, rerender) {
  const f = root.querySelector('#f');
  const readForm = () => {
    const v = id => root.querySelector('#' + id)?.value?.trim() || '';
    return { search: v('search'), label: v('label') || 'Home', unit: v('unit'), building: v('building'), street: v('street'), city: v('city'), landmark: v('landmark'), isDefault: !!root.querySelector('#isDefault')?.checked };
  };
  f.addEventListener('input', () => { if (!booking().addressId && root.querySelector('#street')) update({ address: readForm() }); });
  f.addEventListener('change', e => {
    if (e.target.name === 'addr') {
      const x = SAVED_ADDRESSES.find(a => a.id === e.target.value);
      update({ addressId: x.id, address: { label: x.label, line: x.line } }); setErrors({}); rerender();
    }
  });
  root.querySelector('#add-new')?.addEventListener('click', () => { update({ newAddress: true, addressId: null, address: null }); rerender(); });
  root.querySelector('#use-saved')?.addEventListener('click', () => { update({ newAddress: false }); rerender(); });
  f.addEventListener('submit', e => {
    e.preventDefault(); const s = booking(); const err = {};
    if (user() && !s.newAddress) { if (!s.addressId) err.addr = 'Choose an address, or add a new one.'; }
    else {
      const a = readForm();
      if (!a.street) err.street = 'Enter your street.';
      if (!a.city) err.city = 'Enter your city or municipality.';
      update({ address: a, addressId: null });
    }
    if (Object.keys(err).length) { err.form = 'We need your address to match you with nearby housemaids.'; setErrors(err); rerender(); return; }
    setErrors({}); go('/book/service');
  });
}

// =====================================================================
// Step 3 — Select service
// =====================================================================
function service() {
  const s = booking(); const n = s.tasks.length + (s.something ? 1 : 0);
  return bookingPage({
    step: 3, title: 'What should your housemaid do?', subtitle: 'Pick every task you need. We use this to match you with a housemaid who has the right experience.',
    body: `<form id="f" class="book-form" novalidate>
      ${errorBox(errors.form)}
      ${radioCard({ name: 'allaround', value: '1', checked: s.allAround, label: 'All-around help', caption: 'Your housemaid helps wherever needed during the visit', iconName: 'category', cls: 'compact' })}
      <div class="form-card">
        <div class="tasks-head"><h2 class="h5">Or pick specific tasks</h2>
          <div class="th-actions"><span class="body2">${n} task${n === 1 ? '' : 's'} selected</span><button type="button" class="btn text md" id="clear" ${n ? '' : 'disabled'}>Clear all</button></div></div>
        ${TASK_GROUPS.map(g => `<div class="field"><h3 class="h6">${g.name}</h3><div class="grid-2">
          ${g.tasks.map(t => checkCard({ name: 'task', value: t.id, checked: s.tasks.includes(t.id), label: t.label, caption: t.caption, iconName: t.icon, fill: t.fill })).join('')}
        </div></div>`).join('')}
        <div class="field"><h3 class="h6">Others</h3><div class="grid-2">
          ${checkCard({ name: 'something', value: '1', checked: s.something, label: 'Something else', caption: 'Tell us what you need', iconName: 'add' })}
        </div>
          ${s.something ? textField({ id: 'somethingText', label: 'What else do you need?', value: s.somethingText, error: errors.something }) : ''}
        </div>
        ${textField({ id: 'instructions', label: 'Additional instructions (optional)', value: s.instructions, multiline: true, helper: 'Special instructions, house rules, gate codes, or anything we should know' })}
      </div>
      ${actions({ back: '#/book/where' })}
    </form>`,
  });
}

function mountService(root, go, rerender) {
  const f = root.querySelector('#f');
  f.addEventListener('change', e => {
    const t = e.target; const s = booking();
    if (t.name === 'allaround') update({ allAround: true, tasks: [], something: false });
    else if (t.name === 'task') update({ allAround: false, tasks: t.checked ? [...s.tasks, t.value] : s.tasks.filter(x => x !== t.value) });
    else if (t.name === 'something') update({ allAround: false, something: t.checked });
    else return;
    setErrors({}); rerender();
  });
  f.addEventListener('input', e => {
    if (e.target.id === 'instructions') update({ instructions: e.target.value });
    if (e.target.id === 'somethingText') update({ somethingText: e.target.value });
  });
  root.querySelector('#clear')?.addEventListener('click', () => { update({ tasks: [], something: false, somethingText: '' }); rerender(); });
  f.addEventListener('submit', e => {
    e.preventDefault(); const s = booking(); const err = {};
    if (!s.allAround && !s.tasks.length && !s.something) err.form = 'Choose All-around help, or pick at least one task.';
    if (s.something && !s.somethingText.trim()) { err.something = 'Tell us what you need.'; err.form = err.form || 'Tell us what “Something else” means.'; }
    if (Object.keys(err).length) { setErrors(err); rerender(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrors({}); go(user() ? '/book/housemaid' : '/book/sign-in');
  });
}

// =====================================================================
// Step 4 — Sign-in (details + OTP)
// =====================================================================
let pending = null;  // details awaiting OTP
let otpTimer = null;

function signIn() {
  const p = pending || {};
  return bookingPage({
    step: 4, title: 'Let’s get you set-up',
    subtitle: `We just need a few details to confirm your booking. Already have an account? <a href="#/sign-in" class="lnk">Log in</a>`,
    body: `<form id="f" class="book-form" novalidate>
      ${errorBox(errors.form)}
      <div class="form-card">
        <h2 class="h5">Please input your details</h2>
        <div class="field gap3">
          ${textField({ id: 'name', label: 'Full name', value: p.name || '', error: errors.name, attrs: 'autocomplete="name"' })}
          ${textField({ id: 'email', label: 'Email address', type: 'email', value: p.email || '', helper: 'Your booking confirmation and receipt go here.', error: errors.email, attrs: 'autocomplete="email"' })}
          ${textField({ id: 'mobile', label: 'Mobile number', type: 'tel', value: p.mobile || '', start: '+63', helper: 'We will send the 6-digit OTP and your housemaid may call this number.', error: errors.mobile, attrs: 'autocomplete="tel-national" inputmode="numeric" placeholder="9XX XXX XXXX"' })}
        </div>
      </div>
      <p class="body1">By continuing, you agree to GetKlean PH's <a class="lnk" href="#/">Terms</a> and <a class="lnk" href="#/">Privacy Policy</a>.</p>
      ${actions({ back: '#/book/service' })}
    </form>`,
  });
}

function mountSignIn(root, go, rerender) {
  root.querySelector('#f').addEventListener('submit', e => {
    e.preventDefault();
    const v = id => root.querySelector('#' + id).value.trim();
    const p = { name: v('name'), email: v('email'), mobile: v('mobile').replace(/\D/g, '').replace(/^0?63/, '').replace(/^0/, '') };
    const err = {};
    if (p.name.split(/\s+/).length < 2) err.name = 'Enter your first and last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) err.email = 'Enter a valid email address.';
    if (!/^9\d{9}$/.test(p.mobile)) err.mobile = 'Enter a valid PH mobile number, e.g. 909 876 5432.';
    pending = p;
    if (Object.keys(err).length) { err.form = 'Please check the highlighted fields.'; setErrors(err); rerender(); return; }
    setErrors({}); go('/book/verify');
  });
}

function verify() {
  if (!pending) return null;
  const m = pending.mobile;
  return bookingPage({
    step: 4, title: 'Let’s get you set-up',
    subtitle: `We just need a few details to confirm your booking. Already have an account? <a href="#/sign-in" class="lnk">Log in</a>`,
    body: `<form id="f" class="book-form" novalidate>
      <div class="form-card otp-card">
        <span class="icon-bubble lg">${icon('sms')}</span>
        <h2 class="h6">Enter the code we sent to your mobile number.</h2>
        <p class="body2 muted">Sent to +63 ${m.slice(0, 3)} ${m.slice(3, 6)} ${m.slice(6)} · <a class="lnk" href="#/book/sign-in">Change</a></p>
        <div class="otp" role="group" aria-label="6-digit code">${Array.from({ length: 6 }, (_, i) => `<input class="otp-box ${errors.otp ? 'err' : ''}" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}" data-i="${i}">`).join('')}</div>
        ${errors.otp ? `<p class="helper-error">${errors.otp}</p>` : ''}
        <p class="body2 muted" id="expiry">Code expires in 5:00 minutes</p>
        <button class="btn contained lg wide" type="submit">Verify &amp; continue</button>
        <button class="btn text lg" type="button" id="resend" disabled>Resend code</button>
        <p class="caption muted">Demo: any 6 digits work.</p>
      </div>
      <div class="actions"><a class="btn outlined lg" href="#/book/sign-in">Back</a><button class="btn contained lg" type="button" disabled>Continue${icon('arrow_forward', 's20')}</button></div>
    </form>`,
  });
}

function mountVerify(root, go, rerender) {
  if (!pending) { go('/book/sign-in'); return; }
  const boxes = [...root.querySelectorAll('.otp-box')];
  boxes[0]?.focus();
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => { b.value = b.value.replace(/\D/g, '').slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); });
    b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
    b.addEventListener('paste', e => {
      const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!d) return;
      e.preventDefault(); d.split('').forEach((c, j) => { if (boxes[j]) boxes[j].value = c; }); boxes[Math.min(d.length, 5)].focus();
    });
  });
  let left = 300; clearInterval(otpTimer);
  const exp = root.querySelector('#expiry'), resend = root.querySelector('#resend');
  otpTimer = setInterval(() => {
    left--; if (!document.body.contains(exp)) { clearInterval(otpTimer); return; }
    exp.textContent = left > 0 ? `Code expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} minutes` : 'Code expired. Request a new one.';
    if (left <= 240) resend.disabled = false;
    if (left <= 0) clearInterval(otpTimer);
  }, 1000);
  resend.addEventListener('click', () => { toast('We sent a new code.'); left = 300; resend.disabled = true; });
  root.querySelector('#f').addEventListener('submit', e => {
    e.preventDefault();
    const code = boxes.map(b => b.value).join('');
    if (code.length < 6) { setErrors({ otp: 'Enter all 6 digits.' }); rerender(); return; }
    clearInterval(otpTimer); setErrors({});
    setUser({ name: pending.name, email: pending.email, mobile: pending.mobile, area: booking().address ? addressLine(booking().address) : '' });
    pending = null; toast('You’re signed in.');
    go('/book/housemaid');
  });
}

// =====================================================================
// Step 5 — Select housemaid
// =====================================================================
const favs = () => { try { return JSON.parse(localStorage.getItem('gk.favs') || '[]'); } catch { return []; } };
const setFavs = f => { try { localStorage.setItem('gk.favs', JSON.stringify(f)); } catch {} };

function maidCard(h, s, f) {
  const selected = s.housemaid === h.id; const fav = f.includes(h.id);
  const next = addDays(s.date || todayISO(), 1);
  const levelTag = h.unavailable ? tag('Not available') : tag(h.level, h.level === 'Expert' ? 'info' : 'default');
  return `<article class="maid ${selected ? 'selected' : ''} ${h.unavailable ? 'unavail' : ''}">
    <div class="maid-top">
      <span class="maid-photo">${img('assets/housemaid.png', h.name, '', `<span class="maid-ini">${initials(h.name)}</span>`)}</span>
      <div class="maid-info">
        <p class="body1"><b class="nm">${esc(h.name)}</b> ${levelTag}</p>
        <p class="body2 muted meta">${icon('star', 's18 fill star')} ${h.rating}/5${dot()}${h.km}KM${h.km < 3 ? ' from you' : ''}${dot()}Booked ${h.booked} time${h.booked === 1 ? '' : 's'}</p>
        <button type="button" class="btn text sm" data-profile="${h.id}">View profile</button>
      </div>
      ${selected ? `<span class="sel-badge">${icon('check_circle', 'fill')} Selected</span>` : ''}
    </div>
    ${h.unavailable ? `<div class="maid-warn">
        <p class="body1 warn-title">Not free on ${fmt.full(s.date || todayISO()).replace(/, \d{4}$/, '')}</p>
        <p class="body2">She is free on ${fmt.full(next).replace(/, \d{4}$/, '')}</p>
        <div class="maid-actions">
          <button type="button" class="btn outlined md fav ${fav ? 'on' : ''}" data-fav="${h.id}">${icon('favorite', 's18' + (fav ? ' fill' : ''))} ${fav ? 'Saved' : 'Save as favorite'}</button>
          <button type="button" class="btn warning md grow" data-pick="${h.id}" data-shift="1">Select ${esc(h.name.split(' ')[0])} on ${fmt.full(next).replace(/, \d{4}$/, '')}</button>
        </div>
        <p class="caption">This will change your booking date. We will show the new date before you pay.</p>
      </div>` : `<div class="maid-actions">
        <button type="button" class="btn outlined md fav ${fav ? 'on' : ''}" data-fav="${h.id}">${icon('favorite', 's18' + (fav ? ' fill' : ''))} ${fav ? 'Saved' : 'Save as favorite'}</button>
        <button type="button" class="btn ${selected ? 'outlined' : 'contained flat'} md grow" data-pick="${h.id}">${selected ? 'Selected' : 'Select ' + esc(h.name.split(' ')[0])}</button>
      </div>`}
  </article>`;
}

function housemaid() {
  const s = booking(); const f = favs();
  const pool = HOUSEMAIDS.filter(h => s.showMore || h.group !== 'more');
  const favList = HOUSEMAIDS.filter(h => f.includes(h.id));
  const d = s.date || todayISO();
  return bookingPage({
    step: 5, title: 'Select preferred housemaid',
    body: `<form id="f" class="book-form" novalidate>
      ${errorBox(errors.form)}
      <div class="info-panel">
        <span class="icon-bubble">${icon('event')}</span>
        <div><p class="body1">${fmt.full(d)}</p><p class="body2 muted">${durationLabel(s.duration)} (${s.duration === 'whole' ? '7hrs + 1hr break' : '4hrs'})${dot()}${s.time ? `${s.time} - ${endTime(s.time, s.duration)}` : 'Time not set'}</p></div>
        <a class="btn text md" href="#/book/when">Change</a>
      </div>
      <div class="field"><p class="label">Dispatch level</p>
        <div class="seg" role="radiogroup" aria-label="Dispatch level">
          <button type="button" role="radio" aria-checked="${s.dispatch === 'regular'}" class="${s.dispatch === 'regular' ? 'on' : ''}" data-dispatch="regular">Regular</button>
          <button type="button" role="radio" aria-checked="${s.dispatch === 'expert'}" class="${s.dispatch === 'expert' ? 'on' : ''}" data-dispatch="expert">Expert (+Php100)</button>
        </div>
        <p class="caption muted">Regular requests may be filled by an Expert housemaid at no extra charge.</p>
      </div>
      <section class="form-card tight">
        <div><h2 class="h5">Your favorite housemaids (${favList.length}/3)</h2><p class="body2 muted">The people you saved as favorite</p></div>
        ${favList.length ? favList.map(h => maidCard(h, s, f)).join('') : `<div class="empty-fav">${icon('favorite', 'fill')}<div><p class="body1">You have no favorites yet</p><p class="body2">When you find a housemaid you like, tap “Save as favorite” on her card. She will be here the next time you book.</p></div></div>`}
      </section>
      <section class="form-card tight">
        <div><h2 class="h5">Recommended for you</h2><p class="body2 muted">Matched based on service area, availability, tier, rating, distance and workload.</p></div>
        ${pool.filter(h => h.group === 'recommended' && !f.includes(h.id)).map(h => maidCard(h, s, f)).join('')}
      </section>
      <section class="form-card tight">
        <h2 class="h5">Other recommendations</h2>
        ${pool.filter(h => h.group !== 'recommended' && !f.includes(h.id)).map(h => maidCard(h, s, f)).join('')}
        <p class="body2 secure">${icon('verified_user', 's20')} All housemaids are vetted, trained, and background checked.</p>
        ${s.showMore ? '' : `<button type="button" class="btn text md center" id="more">Show more housemaids ${icon('expand_more', 's20')}</button>`}
      </section>
      <label class="switch-card">
        <span><span class="body1">Can the housemaid book a ride to your location?</span><span class="body2 muted">If you agree, the ride fare will be charged to you. The housemaid will reimburse you and provide the ride receipt for reference.</span></span>
        <input type="checkbox" id="ride" role="switch" ${s.ride ? 'checked' : ''}><span class="switch" aria-hidden="true"></span>
      </label>
      ${actions({ back: user() ? '#/book/service' : '#/book/sign-in', disabled: !s.housemaid })}
    </form>`,
  });
}

function mountHousemaid(root, go, rerender) {
  const f = root.querySelector('#f');
  f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.dispatch) { update({ dispatch: b.dataset.dispatch }); rerender(); }
    else if (b.dataset.pick) {
      const s = booking(); const patch = { housemaid: b.dataset.pick };
      if (b.dataset.shift && !s.housemaidDateShift) { patch.date = addDays(s.date || todayISO(), 1); patch.housemaidDateShift = true; toast('Booking date moved to ' + fmt.full(patch.date)); }
      update(patch); setErrors({}); rerender();
    }
    else if (b.dataset.fav) {
      let fl = favs(); const id = b.dataset.fav;
      if (fl.includes(id)) fl = fl.filter(x => x !== id); else if (fl.length >= 3) { toast('You can save up to 3 favorites.'); return; } else fl.push(id);
      setFavs(fl); rerender();
    }
    else if (b.dataset.profile) toast('Housemaid profiles are coming soon.');
    else if (b.id === 'more') { update({ showMore: true }); rerender(); }
  });
  root.querySelector('#ride').addEventListener('change', e => update({ ride: e.target.checked }));
  f.addEventListener('submit', e => { e.preventDefault(); if (!booking().housemaid) return; go('/book/plan'); });
}

// =====================================================================
// Step 6 — Select plan
// =====================================================================
const INCLUSIONS = [
  ['all_inclusive', 'Unlimited bookings', 'Book as many times as you need within your plan'],
  ['event_available', 'Locked schedule', 'Lock in your chosen housemaid’s schedule'],
  ['edit_calendar', 'Free reschedule', 'Change your schedule for free, up to once a month'],
  ['swap_horiz', 'Free housemaid replacement', 'Not a right fit? We will find you a replacement housemaid at no extra cost'],
  ['verified_user', 'Insurance coverage', 'Every booking is covered up to Php20,000: theft, housemaid injuries and more.'],
];

function plan() {
  const s = booking();
  const sel = s.planChoice || '3m';
  const P = PLANS[sel];
  const cmp = s.cmp || { duration: 'whole', day: 'weekday', per: 6 };
  const reg = PRICES.regular[cmp.day][cmp.duration], mem = PRICES.member[cmp.day][cmp.duration];
  const oneTime = cmp.per * reg, monthlyFee = P.price / P.months, flexi = cmp.per * mem + monthlyFee, saveMo = oneTime - flexi;
  const r2 = n => Math.round(n * 100) / 100;
  const trial = trialEligible(s);
  const visit = PRICES.regular[s.date && isWeekend(s.date) ? 'weekend' : 'weekday'][s.duration];
  const rateRow = (ic, label, r, m) => `<div class="rate-row"><span class="rr-l">${icon(ic, 's20')} ${label}</span>
    <span><s>${php(r)}</s><small>REGULAR RATE</small></span><span class="mem"><b>${php(m)}</b><small>MEMBER RATE</small></span>${tag('Save ' + php(r - m), 'success')}</div>`;

  return bookingPage({
    step: 6, title: 'Choose your plan', subtitle: 'Pay per visit, or get a Flexi Plan and pay less every time you book.',
    body: `<form id="f" class="book-form" novalidate>
      ${errorBox(errors.form)}
      <div class="field"><h2 class="h5">Pay per visit</h2>
        ${trial
          ? radioCard({ name: 'plan', value: 'trial', checked: s.plan === 'trial', label: 'First booking Promo', cls: 'price-card',
            caption: `Try GetKleanPH for just ${php(PRICES.trial[s.duration])} instead of ${php(PRICES.regular.weekday[s.duration])}. Enjoy your first housemaid booking at a special introductory rate! Weekdays only.`,
            extra: '', badge: '' }).replace('<span class="radio-dot"', `<span class="pc-price"><b>Php${PRICES.trial[s.duration]}</b>${tag('Save ' + php(PRICES.regular.weekday[s.duration] - PRICES.trial[s.duration]), 'success')}</span><span class="radio-dot"`)
          : radioCard({ name: 'plan', value: 'payg', checked: s.plan === 'payg', label: 'One-time booking', caption: 'Pay the regular rate for this visit.' }).replace('<span class="radio-dot"', `<span class="pc-price"><b>${php(visit)}</b></span><span class="radio-dot"`)}
      </div>
      <div class="field"><h2 class="h5">Or save on every visit with a Flexi Plan</h2>
        <p class="body2 muted">Choose how long you want lower member rates:</p>
        <div class="seg chips-seg">${Object.values(PLANS).map(p => `<button type="button" class="${sel === p.id ? 'on' : ''}" data-choice="${p.id}">${p.label}</button>`).join('')}</div>
      </div>
      <div class="form-card flexi">
        ${radioCard({ name: 'plan', value: sel, checked: s.plan === sel, label: `<span class="overline">${P.title}</span>`, cls: 'plan-card',
          caption: `<span class="plan-price"><b>${php(P.price)}</b>${P.was ? `<s>${php(P.was)}</s>${tag('Save ' + P.save + '%', 'success')}` : ''}</span>` })}
        <div class="info">${icon('info', 's20')}<span><b>The plan fee doesn’t include cleaning visits.</b> It unlocks member rates. You still pay for each visit you book, at the lower rates below.</span></div>
        <details class="acc" open><summary class="body1">What you pay per visit ${icon('expand_more')}</summary>
          <div class="acc-body"><p class="h6">What you pay per visit</p><p class="body2 muted">Member rates apply to every visit while your plan is active.</p>
            <div class="rate-group"><p class="rg-h">Weekdays</p>${rateRow('wb_twilight', 'Half day', 900, 510)}${rateRow('light_mode', 'Whole day', 1200, 650)}</div>
            <div class="rate-group"><p class="rg-h">Weekends</p>${rateRow('wb_twilight', 'Half day', 990, 561)}${rateRow('light_mode', 'Whole day', 1390, 715)}</div>
            <p class="caption muted">Regular rate is the price per visit without a plan.</p></div>
        </details>
        <details class="acc" open><summary class="body1">Also included with your plan ${icon('expand_more')}</summary>
          <div class="acc-body incl">${INCLUSIONS.map(([ic, t, d]) => `<div class="incl-row"><span class="bubble">${icon(ic, 's18')}</span><div><p class="body2"><b>${t}</b></p><p class="caption muted">${d}</p></div></div>`).join('')}</div>
        </details>
      </div>
      <div class="form-card calc">
        <div><h2 class="h6">Will Flexi Plan save me money?</h2><p class="body2 muted">Tell us how you usually book and we’ll compare your monthly cost.</p></div>
        <div class="calc-inputs">
          <div class="seg chips-seg sm">${[['half', 'Half day'], ['whole', 'Whole day']].map(([v, l]) => `<button type="button" class="${cmp.duration === v ? 'on' : ''}" data-cmp="duration" data-v="${v}">${l}</button>`).join('')}</div>
          <div class="seg chips-seg sm">${[['weekday', 'Weekday'], ['weekend', 'Weekend']].map(([v, l]) => `<button type="button" class="${cmp.day === v ? 'on' : ''}" data-cmp="day" data-v="${v}">${l}</button>`).join('')}</div>
          ${selectField({ id: 'per', label: 'Booking per month', value: cmp.per, options: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] })}
        </div>
        <div class="example">
          <p class="h6 center">Example savings</p><p class="body2 muted center">Your monthly cost for ${cmp.per} ${cmp.duration === 'whole' ? 'whole-day' : 'half-day'} ${cmp.day} visit${cmp.per > 1 ? 's' : ''}</p>
          <div class="ex-cols">
            <div class="ex-col"><p class="body2"><b>One-time Booking</b></p>
              <p class="ex-line"><span>${cmp.per} × ${php(reg)} (Regular rate)</span><span>${php(oneTime)}</span></p>
              <p class="ex-line"><span>Plan fee</span><span>0</span></p>
              <div class="ex-total grey"><b>${php(oneTime)}</b><small>YOU PAY PER MONTH</small></div></div>
            <div class="ex-col"><p class="body2"><b>${P.name}</b></p>
              <p class="ex-line"><span>${cmp.per} × ${php(mem)} (Member rate)</span><span>${php(cmp.per * mem)}</span></p>
              <p class="ex-line"><span>Plan fee${P.months > 1 ? ` (${php(P.price)}/${P.months})` : ''}</span><span>${php(r2(monthlyFee))}</span></p>
              <div class="ex-total green"><b>${php(r2(flexi))}</b><small>YOU PAY PER MONTH</small></div></div>
          </div>
          ${saveMo > 0
            ? `<p class="h6 center">You save ${php(r2(saveMo))} a month with the Flexi Plan</p><p class="body2 muted center">${P.months > 1 ? `That’s ${php(r2(saveMo * P.months))} in total savings over ${P.months} months${P.bonus ? ', ' + P.bonus : ''}.` : `${php(oneTime)} paying per visit vs ${php(r2(flexi))} with the plan.`}</p>`
            : `<p class="h6 center">Paying per visit is cheaper at ${cmp.per} visit${cmp.per > 1 ? 's' : ''} a month</p><p class="body2 muted center">A Flexi Plan starts saving you money once you book more often.</p>`}
          <p class="caption muted">To compare fairly, the plan fee is split evenly across the months it covers. You pay the full plan fee once, when you sign up.</p>
        </div>
      </div>
      ${actions({ back: '#/book/housemaid' })}
    </form>`,
  });
}

function mountPlan(root, go, rerender) {
  const f = root.querySelector('#f');
  f.addEventListener('change', e => {
    if (e.target.name === 'plan') { update({ plan: e.target.value }); setErrors({}); rerender(); }
    if (e.target.id === 'per') { update({ cmp: { ...(booking().cmp || { duration: 'whole', day: 'weekday', per: 6 }), per: +e.target.value } }); rerender(); }
  });
  f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.choice) { const s = booking(); update({ planChoice: b.dataset.choice, plan: s.plan && s.plan !== 'trial' && s.plan !== 'payg' ? b.dataset.choice : s.plan }); rerender(); }
    if (b.dataset.cmp) { update({ cmp: { ...(booking().cmp || { duration: 'whole', day: 'weekday', per: 6 }), [b.dataset.cmp]: b.dataset.v } }); rerender(); }
  });
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!booking().plan) { setErrors({ form: 'Choose pay per visit or a Flexi Plan to continue.' }); rerender(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrors({}); go('/book/review');
  });
}

// =====================================================================
// Step 7 — Review and pay
// =====================================================================
function review() {
  const s = booking(); const u = user() || {}; const h = HOUSEMAIDS.find(x => x.id === s.housemaid);
  const tasks = s.allAround ? 'All-around help' : [...TASK_GROUPS.flatMap(g => g.tasks).filter(t => s.tasks.includes(t.id)).map(t => t.label), ...(s.something ? [s.somethingText || 'Something else'] : [])].join(', ');
  const card = (k, main, sub, to) => `<div class="review-card"><div><p class="overline-sm">${k}</p><p class="body1">${main}</p>${sub ? `<p class="body2 muted">${sub}</p>` : ''}</div><a class="btn text lg" href="#/book/${to}">Edit</a></div>`;
  const dateMain = s.when === 'later' && s.type === 'recurring'
    ? `${esc(s.frequency)}${s.days.length ? dot() + s.days.join(', ') : ''}${dot()}${s.time} - ${endTime(s.time, s.duration)}`
    : `${fmt.full(s.date)}${dot()}${s.time} - ${endTime(s.time, s.duration)}`;
  return bookingPage({
    step: 7, title: 'Review your booking', subtitle: 'Double-check everything before you pay. You can edit any part without starting over.',
    body: `<div class="book-form">
      <div class="review-list">
        ${card('SERVICE', 'Housemaid On-Demand', `${durationLabel(s.duration)}${dot()}${s.duration === 'whole' ? '8 hours (7hrs work + 1 hr break)' : '4 hours'}`, 'service')}
        ${card('DATE &amp; TIME', dateMain, s.when === 'later' && s.type === 'recurring' && s.endDate ? `${fmt.med(s.date)} – ${fmt.med(s.endDate)}` : '', 'when')}
        ${card('ADDRESS', esc(`${s.address?.label || 'Address'}, ${addressLine(s.address)}`), esc(s.address?.landmark || ''), 'where')}
        ${card('HOUSEMAID', h ? esc(shortName(h.name)) : 'Best match', h ? `${icon('star', 's18 fill star')} ${h.rating}${dot()}${s.dispatch === 'expert' ? 'Expert dispatch' : 'Regular dispatch'}` : '', 'housemaid')}
        ${card('TASKS', esc(tasks || '—'), esc(s.instructions), 'service')}
        ${card('CONTACT', esc(u.name || ''), `${esc(u.email || '')}${dot()}+63 ${esc(u.mobile || '')}`, 'sign-in')}
      </div>
      <div class="protect"><span class="shield">${icon('shield', 'fill')}</span><div>
        <p class="h6">GetKlean Protect is included free on every booking ${tag('FREE', 'success-solid')}</p>
        <p class="body1">Theft and accidental damage up to PHP20,000, plus medical cover if your housemaid is hurt on the job.</p>
        <a class="link" href="#/">See what's covered</a></div></div>
      <div class="info">${icon('info', 's20')}<span>Free cancellation up to 24 hrs before each visit. Flexi includes a free reschedule once a month and free replacement if the housemaid isn't a good fit.</span></div>
      <div class="actions"><a class="btn outlined lg" href="#/book/plan">Back</a><a class="btn contained lg" href="#/book/pay">Continue to payment${icon('arrow_forward', 's20')}</a></div>
    </div>`,
  });
}

function pay() {
  const s = booking();
  const methods = [['visa', 'Visa •••• 1234', 'Expires 08/29', 'credit_card'], ['gcash', 'GCash', 'E-wallet', 'account_balance_wallet'], ['maya', 'Maya', 'E-wallet', 'account_balance_wallet']];
  return bookingPage({
    step: 7, title: 'Payment', subtitle: 'Choose how you\'d like to pay. Your card details are encrypted.',
    body: `<form id="f" class="book-form" novalidate>
      ${errorBox(errors.form)}
      <div class="field"><h2 class="h5">Saved payment methods</h2>
        ${methods.map(([v, l, c, ic]) => radioCard({ name: 'pm', value: v, checked: s.payment === v, label: l, caption: c, iconName: ic, cls: 'pm lead-radio' })).join('')}
        <button type="button" class="btn text md start" id="addpm">+ Add payment method</button>
      </div>
      <div class="field gap2"><h2 class="h5 inline">Discounts ${tag('One per booking', 'yellow')}</h2>
        <div class="promo-row">${textField({ id: 'promo', label: 'Promo code', value: s.promo, error: errors.promo, helper: errors.promoOk ? '' : '' })}<button type="button" class="btn outlined lg" id="apply">Apply</button></div>
        ${s.promoApplied ? `<p class="body2 ok">${icon('check_circle', 's18 fill')} Promo code ${esc(s.promoApplied)} applied.</p>` : ''}
        <p class="body2 muted">Or use your vouchers or points</p>
        <div class="inline-2">
          ${selectField({ id: 'voucher', label: 'Voucher', value: s.voucher || '', options: [['', 'Choose a voucher · 3 available'], ['first', 'First Booking · PHP100 off'], ['refer', 'Refer a Friend · PHP100 off'], ['weekend', 'Weekend Clean · PHP100 off']] })}
          ${selectField({ id: 'points', label: 'Reward points', value: s.points || '', options: [['', 'Use points · 1,250 available'], ['500', 'Use 500 points · PHP500 off']] })}
        </div>
        <p class="caption muted">One discount per booking: a promo code, a voucher or points. Discounts apply to the service, not the Flexi membership fee.</p>
      </div>
      <label class="checkbox"><input type="checkbox" id="consent" ${s.consent ? 'checked' : ''}><span class="cb">${icon('check')}</span>I agree to the <a class="lnk" href="#/">Terms</a>, the cancellation policy and Flexi auto-renewal (turn off anytime).</label>
      ${errors.consent ? `<p class="helper-error">${errors.consent}</p>` : ''}
      ${actions({ back: '#/book/review', next: `Pay ${php(total(s) - discount(s))} and book` })}
    </form>`,
  });
}
export function discount(s = booking()) {
  if (s.promoApplied) return 100;
  if (s.voucher) return 100;
  if (s.points) return Math.min(500, visitPrice(s).price);
  return 0;
}

function mountPay(root, go, rerender) {
  const f = root.querySelector('#f');
  f.addEventListener('change', e => {
    const t = e.target;
    if (t.name === 'pm') { update({ payment: t.value }); rerender(); }
    if (t.id === 'voucher') { update({ voucher: t.value, points: '', promoApplied: null }); if (t.value) toast('Voucher applied. Only one discount per booking.'); rerender(); }
    if (t.id === 'points') { update({ points: t.value, voucher: '', promoApplied: null }); rerender(); }
    if (t.id === 'consent') update({ consent: t.checked });
  });
  root.querySelector('#apply').addEventListener('click', () => {
    const code = root.querySelector('#promo').value.trim().toUpperCase();
    if (!code) { setErrors({ promo: 'Enter a promo code.' }); rerender(); return; }
    if (code === 'GETKLEAN100' || code === 'WELCOME') { update({ promo: code, promoApplied: code, voucher: '', points: '' }); setErrors({}); rerender(); }
    else { update({ promo: code }); setErrors({ promo: 'That code isn’t valid. Check it and try again.' }); rerender(); }
  });
  root.querySelector('#addpm').addEventListener('click', () => toast('Adding a new card is coming soon.'));
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!booking().consent) { setErrors({ consent: 'Please agree to the terms to book.' }); rerender(); return; }
    const id = 'BK-' + (240000 + Math.floor(Math.random() * 9999));
    update({ bookingId: id, paid: total(booking()) - discount(booking()) }); setErrors({});
    go('/book/booked');
  });
}

// =====================================================================
// Step 8 — Booked
// =====================================================================
function booked() {
  const s = booking(); if (!s.bookingId) return null;
  const h = HOUSEMAIDS.find(x => x.id === s.housemaid);
  const who = h ? shortName(h.name) : 'Your housemaid';
  const arrive = s.time ? `${s.time} - ${s.time.replace(':00', ':30')}` : '';
  const row = (k, v) => `<div class="conf-row"><span class="muted">${k}</span><span>${v}</span></div>`;
  const plan = s.plan && PLANS[s.plan] ? PLANS[s.plan].name : s.plan === 'trial' ? 'First booking promo' : 'Pay per visit';
  return `${bookingPage({
    step: 8, title: '', aside: '',
    body: `<div class="confirm">
      <span class="ok-circle">${icon('check', 'fill')}</span>
      <h1 class="h5">Your booking has been created</h1>
      <p class="body2 muted">We’ve let ${esc(who)} know, you’re all set.</p>
      ${tag('Booking #' + s.bookingId, 'primary-solid')}
      <div class="conf-rows">
        ${row('Service', 'Book a housemaid')}
        ${row('Schedule', `${s.date ? fmt.full(s.date) : ''}${dot()}${s.time} - ${endTime(s.time, s.duration)}`)}
        ${row('Duration', s.duration === 'whole' ? 'Whole day (7 hrs + 1 hr break)' : 'Half day (4 hrs)')}
        ${row('Housemaid', `${esc(who)}${dot()}Arrival ${arrive}`)}
        ${row('Dispatch level', s.dispatch === 'expert' ? 'Expert' : 'Regular, Expert level matched, no extra charge')}
        ${row('Plan', esc(plan))}
        ${row('Address', esc(`${s.address?.label || ''}, ${addressLine(s.address)}`))}
        ${row('Total paid', php(s.paid ?? total(s)))}
      </div>
      <div class="next"><p class="body1"><b>What’s next?</b></p>
        ${[`${esc(who)} will arrive between ${arrive.replace(' - ', ' and ')}.`, 'You’ll get a reminder 1 hour before arrival.',
          PLANS[s.plan] ? 'Your membership covers every future booking at member rates.' : 'Book again anytime from your home screen.',
          'Reschedule once a month for free, or request a replacement any time.']
          .map(t => `<p class="body1 nx">${icon('check_circle', 'fill')}<span>${t}</span></p>`).join('')}
      </div>
      <div class="conf-actions">
        <a class="btn contained lg pill" href="#/" id="done">View my booking</a>
        <a class="btn outlined lg pill dark" id="ics" href="#" download="getklean-booking.ics">Add to calendar</a>
        <a class="btn outlined lg pill dark" href="https://m.me/getklean.housemaids" target="_blank" rel="noopener">Contact us</a>
      </div>
    </div>`,
  })}`;
}

function mountBooked(root) {
  const s = booking();
  const ics = root.querySelector('#ics');
  if (ics && s.date && s.time) {
    const m = s.time.match(/(\d+):\d+(AM|PM)/); const h = (+m[1] % 12) + (m[2] === 'PM' ? 12 : 0);
    const d = s.date.replace(/-/g, ''); const z = n => String(n).padStart(2, '0');
    const end = h + (s.duration === 'whole' ? 8 : 4);
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GetKlean//Booking//EN', 'BEGIN:VEVENT', `UID:${s.bookingId}@getklean.ph`,
      `DTSTART:${d}T${z(h)}0000`, `DTEND:${d}T${z(end)}0000`, `SUMMARY:GetKlean housemaid (${s.bookingId})`,
      `LOCATION:${addressLine(s.address).replace(/,/g, '\\,')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    ics.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }
  root.querySelector('#done')?.addEventListener('click', () => resetBooking());
}

// ---------- route table ----------
export const routes = {
  '/book/when': { render: when, mount: mountWhen },
  '/book/where': { render: where, mount: mountWhere, needs: ['time'] },
  '/book/service': { render: service, mount: mountService, needs: ['time', 'address'] },
  '/book/sign-in': { render: () => (user() ? null : signIn()), mount: mountSignIn, needs: ['time', 'address'], redirect: '/book/housemaid' },
  '/book/verify': { render: verify, mount: mountVerify, needs: ['time', 'address'], redirect: '/book/sign-in' },
  '/book/housemaid': { render: () => (user() ? housemaid() : null), mount: mountHousemaid, needs: ['time', 'address'], redirect: '/book/sign-in' },
  '/book/plan': { render: plan, mount: mountPlan },
  '/book/review': { render: review, needs: ['time', 'address', 'housemaid', 'plan'] },
  '/book/pay': { render: pay, mount: mountPay, needs: ['time', 'address', 'housemaid', 'plan'] },
  '/book/booked': { render: booked, mount: mountBooked, redirect: '/' },
};
export const clearErrors = () => setErrors({});
