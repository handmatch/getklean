// Getklean Work: the app for Housemaids, Cleaners, Technicians and Riders.
// Screens and flow follow the existing Getklean Housemaid App (Dashboard, Bookings, Earnings,
// Notifications, Profile), with check-in, photos and cash proof added.
import * as db from './data.js';
import { CHECKIN_RADIUS_M } from './config.js';

const root = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, cls = '') => `<span class="ic ${cls}" aria-hidden="true">${n}</span>`;
const peso = (n, dec = true) => '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
const go = p => { location.hash = p; };
const todayIso = () => db.iso(new Date());
const t12 = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const longDate = d => new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const shortDate = d => new Date(d + 'T00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const timeOf = s => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const agoText = s => { const d = Math.floor((Date.now() - new Date(s)) / 864e5); if (d <= 0) { const h = Math.max(1, Math.floor((Date.now() - new Date(s)) / 36e5)); return `${h} hour${h > 1 ? 's' : ''} ago`; } return `${d} day${d > 1 ? 's' : ''} ago`; };
const initials = n => n.split(' ').map(x => x[0]).slice(0, 2).join('');
const isHousemaidLike = w => ['housemaid', 'cleaner'].includes(w.role);

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- Shell: white header with logo + bell, 5-tab bottom bar with yellow pill ----------
const TABS = [['dashboard', 'Dashboard', 'home'], ['bookings', 'Bookings', 'calendar_today'], ['earnings', 'Earnings', 'currency_ruble'], ['notifications', 'Notifications', 'notifications'], ['profile', 'Profile', 'person']];
function bell() { const n = db.unread(); return `<a class="bell" href="#/notifications" aria-label="Notifications, ${n} unread">${ic('notifications')}${n ? `<b>${n}</b>` : ''}</a>`; }
function shell(active, body, { title = '', back = '' } = {}) {
  const n = db.unread();
  return `${db.isDemo ? '<div class="demo-bar">Demo mode · data stays on this phone</div>' : ''}
  <header class="bar">${back ? `<a class="back" href="${back}" aria-label="Back">${ic('arrow_back')}</a>` : '<span class="bar-side"></span>'}
    ${title ? `<h1 class="bar-title">${esc(title)}</h1>` : `<img class="bar-logo" src="icons/logo.svg" alt="Getklean">`}
    ${bell()}</header>
  <main class="main">${body}</main>
  <nav class="tabs" aria-label="Main">${TABS.map(([k, l, i]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''} aria-label="${l}">
    <span class="tab-ic">${k === 'earnings' ? '<span class="peso">₱</span>' : ic(i)}${k === 'notifications' && n ? `<b>${n}</b>` : ''}</span>${active === k ? `<span>${l}</span>` : ''}</a>`).join('')}</nav>`;
}

// ---------- Sign in (Facebook first, like the current app; mobile OTP to verify) ----------
let login = { step: 'start', mobile: '', err: '' };
function loginView() {
  const demo = Object.values(db.WORKERS);
  const inner = login.step === 'start' ? `
      <h1>Sign in</h1><p class="muted">Welcome to the Getklean Work App!</p>
      <button class="btn fb block" id="fb">${ic('thumb_up', 'fill')} Continue with Facebook</button>
      <p class="center muted">Don't have an account? <a class="strong-link" href="#" id="verify">Verify your account →</a></p>`
    : login.step === 'mobile' ? `
      <h1>Verify your account</h1><p class="muted">Use the mobile number registered with Getklean Operations.</p>
      <form id="lf" novalidate><label class="field"><span>Mobile number</span><div class="phone"><b>+63</b><input id="m" inputmode="numeric" autocomplete="tel-national" placeholder="917 123 4501" value="${esc(login.mobile)}"></div></label>
      ${login.err ? `<p class="err" role="alert">${esc(login.err)}</p>` : ''}<button class="btn primary block" type="submit">Send code</button></form>
      <button class="btn text block" id="back">Back to sign in</button>`
    : login.step === 'otp' ? `
      <h1>Enter your code</h1><p class="muted">We sent a 6-digit code to +63 ${esc(login.mobile)}.</p>
      <form id="lf" novalidate><input id="c" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-label="6-digit code">
      ${login.err ? `<p class="err" role="alert">${esc(login.err)}</p>` : ''}<button class="btn primary block" type="submit">Verify</button></form>
      <button class="btn text block" id="back">Change number</button>`
    : `<h1>Continue with Facebook</h1><p class="muted">Demo: choose which worker account to open.</p>
      ${demo.map(w => `<button class="demo-acct" data-w="${w.id}"><span class="av sm">${initials(w.name)}</span><span><b>${esc(w.name)}</b><small>${db.ROLE_LABEL[w.role]} · ${w.level}</small></span>${ic('chevron_right')}</button>`).join('')}
      <button class="btn text block" id="back">Back</button>`;
  return `<div class="login"><img class="hero" src="icons/hero.jpg" alt="Getklean cleaners in uniform">
    <div class="login-body"><img class="login-logo" src="icons/logo.svg" alt="Getklean · Your space, reclaimed"><hr>${inner}</div></div>`;
}
function mountLogin() {
  root.querySelector('#fb')?.addEventListener('click', () => { login = { step: db.isDemo ? 'pick' : 'start', mobile: '', err: '' }; render(); });
  root.querySelector('#verify')?.addEventListener('click', e => { e.preventDefault(); login = { step: 'mobile', mobile: '', err: '' }; render(); });
  root.querySelector('#back')?.addEventListener('click', () => { login = { step: login.step === 'otp' ? 'mobile' : 'start', mobile: login.mobile, err: '' }; render(); });
  root.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', async () => { await db.signInDemo(b.dataset.w); login = { step: 'start', mobile: '', err: '' }; go('/dashboard'); }));
  (root.querySelector('#m') || root.querySelector('#c'))?.focus();
  root.querySelector('#lf')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      if (login.step === 'mobile') {
        const m = root.querySelector('#m').value.replace(/\D/g, '').replace(/^0?63/, '').replace(/^0/, '');
        if (!/^9\d{9}$/.test(m)) throw new Error('Enter a valid PH mobile number, e.g. 917 123 4501.');
        await db.sendOtp(m); login = { step: 'otp', mobile: m, err: '' };
      } else {
        await db.verifyOtp(login.mobile, root.querySelector('#c').value.trim());
        login = { step: 'start', mobile: '', err: '' }; go('/dashboard'); return;
      }
    } catch (err) { login.err = err.message; }
    render();
  });
}

// ---------- Shared booking pieces ----------
const STATUS = { upcoming: ['Upcoming', 'soft'], in_progress: ['In Progress', 'amber'], for_review: ['For Review', 'orange'], completed: ['Completed', 'blue'] };
const statusPill = j => `<span class="pill ${STATUS[j.status][1]}">${STATUS[j.status][0]}</span>`;
function bookingCard(j) {
  return `<a class="card bk" href="#/job/${j.id}">
    <div class="bk-top"><span class="code">${esc(j.id)}</span>${ic('chevron_right', 'chev')}</div>
    <h3>${esc(j.client)}</h3>
    <div class="pills">${statusPill(j)}${j.payment.type === 'cod' && j.payment.status === 'due' ? `<span class="pill amber">Collect ${peso(j.payment.amount, false)} cash</span>` : ''}</div>
    <p class="muted">${longDate(j.date)}, ${t12(j.start)} - ${t12(j.end)}</p>
    <p class="muted">${esc(j.address)}</p></a>`;
}
const empty = msg => `<div class="card empty-card">${esc(msg)}</div>`;

// ---------- Dashboard ----------
let dashTab = 'today';
function dashboardView() {
  const all = db.myJobs(), t = todayIso(), month = t.slice(0, 7);
  const today = all.filter(j => j.date === t && ['upcoming', 'in_progress'].includes(j.status));
  const upcoming = all.filter(j => j.date > t && j.status === 'upcoming');
  const review = all.filter(j => j.status === 'for_review');
  const e = db.earnings(), monthDone = all.filter(j => j.date.startsWith(month) && ['for_review', 'completed'].includes(j.status)).length;
  const total = e.reduce((s, x) => s + db.net(x.e), 0);
  const list = dashTab === 'today' ? today : upcoming;
  return shell('dashboard', `
    <h2 class="page-h">Quick Stats</h2>
    <div class="stats">
      <a class="card stat" href="#/bookings"><span class="sq blue">${ic('calendar_today')}</span><b>${today.length}</b><span>Today's Jobs</span></a>
      <a class="card stat" href="#/bookings?tab=review"><span class="sq orange">${ic('schedule')}</span><b>${review.length}</b><span>For Review</span></a>
      <a class="card stat" href="#/earnings"><span class="sq plain"><span class="peso">₱</span></span><b>${peso(total, false)}</b><span>Earnings</span></a>
      <div class="card stat"><span class="sq green">${ic('check_circle')}</span><b>${monthDone}</b><span>This Month</span></div>
    </div>
    <div class="seg two" role="tablist">${[['today', 'Today'], ['upcoming', 'Upcoming']].map(([k, l]) => `<button role="tab" aria-selected="${dashTab === k}" class="${dashTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="list">${list.length ? list.map(bookingCard).join('') : empty(dashTab === 'today' ? 'No bookings for today' : 'No upcoming bookings')}</div>`);
}
function mountDashboard() { root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { dashTab = b.dataset.tab; render(); })); }

// ---------- Bookings: search, week strip, Upcoming / For Review / Completed ----------
let bk = { date: todayIso(), all: false, tab: 'upcoming', q: '', weekStart: null };
function weekStartOf(d) { const x = new Date(d + 'T00:00'); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return db.iso(x); }
function addD(d, n) { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + n); return db.iso(x); }
function bookingsView(params) {
  if (params.get('tab') === 'review') { bk.tab = 'review'; bk.all = true; }
  bk.weekStart ||= weekStartOf(bk.date);
  const w = db.me(), all = db.myJobs();
  const days = Array.from({ length: 7 }, (_, i) => addD(bk.weekStart, i)), has = new Set(all.map(j => j.date));
  const q = bk.q.trim().toLowerCase();
  const scoped = all.filter(j => (bk.all || j.date === bk.date) && (!q || j.id.toLowerCase().includes(q) || j.client.toLowerCase().includes(q)));
  const groups = { upcoming: scoped.filter(j => ['upcoming', 'in_progress'].includes(j.status)), review: scoped.filter(j => j.status === 'for_review'), completed: scoped.filter(j => j.status === 'completed') };
  const list = groups[bk.tab];
  return shell('bookings', `
    <div class="bk-head"><h2 class="page-h blue">${ic('calendar_today')} Bookings</h2>${w.role === 'housemaid' ? `<a class="btn ghost sm" href="#/availability">${ic('edit_calendar')} Set Availability</a>` : ''}</div>
    <label class="search">${ic('search')}<input id="q" type="search" placeholder="Booking code, Client name" value="${esc(bk.q)}" aria-label="Search bookings"></label>
    <div class="week"><button class="all ${bk.all ? 'on' : ''}" id="alld">All Dates</button><button class="arrow" id="prevw" aria-label="Previous week">${ic('chevron_left')}</button>
      <div class="days">${days.map(d => { const x = new Date(d + 'T00:00'); return `<button class="day ${!bk.all && d === bk.date ? 'on' : ''}" data-d="${d}"><small>${x.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</small><b>${x.getDate()}</b>${has.has(d) ? '<i></i>' : '<i class="no"></i>'}</button>`; }).join('')}</div>
      <button class="arrow" id="nextw" aria-label="Next week">${ic('chevron_right')}</button></div>
    <h3 class="date-h">${bk.all ? 'All dates' : longDate(bk.date)}</h3>
    <div class="seg three" role="tablist">${[['upcoming', 'Upcoming'], ['review', 'For Review'], ['completed', 'Completed']].map(([k, l]) => `<button role="tab" aria-selected="${bk.tab === k}" class="${bk.tab === k ? 'on' : ''}" data-tab="${k}">${l} (${groups[k].length})</button>`).join('')}</div>
    <div class="list">${list.length ? list.map(bookingCard).join('') : empty('No bookings here')}</div>`);
}
function mountBookings() {
  if (location.hash.includes('?')) history.replaceState(null, '', '#/bookings');
  root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { bk.tab = b.dataset.tab; render(); }));
  root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { bk.date = b.dataset.d; bk.all = false; render(); }));
  root.querySelector('#alld').addEventListener('click', () => { bk.all = !bk.all; render(); });
  root.querySelector('#prevw').addEventListener('click', () => { bk.weekStart = addD(bk.weekStart, -7); render(); });
  root.querySelector('#nextw').addEventListener('click', () => { bk.weekStart = addD(bk.weekStart, 7); render(); });
  const q = root.querySelector('#q'); q.addEventListener('input', () => { bk.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { render(); const n = root.querySelector('#q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
}

// ---------- Booking details: check in, photos, cash proof, check out ----------
let signoff = { ok: false, name: '' };
function photoGrid(jobId, kind, unitId, canEdit) {
  const ps = db.photos(jobId).filter(p => p.kind === kind && (p.unitId || '') === (unitId || ''));
  return `<div class="photos">${ps.map(p => `<figure><img src="${p.data}" alt="${kind} photo">${canEdit ? `<button class="rm" data-rm="${p.id}" aria-label="Remove photo">${ic('close')}</button>` : ''}</figure>`).join('')}
    ${canEdit ? `<label class="add-photo">${ic('add_a_photo')}<span>${kind === 'cash' ? 'Payment photo' : kind === 'before' ? 'Before' : 'After'}</span><input type="file" accept="image/*" capture="environment" data-kind="${kind}" data-unit="${unitId || ''}" hidden></label>` : ''}</div>`;
}
function checklist(j) {
  const w = db.me(), ps = db.photos(j.id), has = (k, u) => ps.some(p => p.kind === k && (p.unitId || '') === (u || ''));
  const items = [];
  if (j.unit === 'aircon' && w.role === 'technician') j.units.forEach(u => items.push([`${u.type} · ${u.room}: before and after photos`, has('before', u.id) && has('after', u.id)]));
  if (j.unit !== 'aircon') items.push(['At least one after photo', has('after')]);
  if (j.payment.type === 'cod') items.push([`Photo of the ${peso(j.payment.amount, false)} cash payment`, has('cash')]);
  if (j.unit === 'deep' && j.lead === w.id) items.push(['Customer sign-off', signoff.ok && signoff.name.trim().length > 1]);
  return items;
}
function section(title, inner) { return `<section class="card sec"><p class="sec-h">${title}</p>${inner}</section>`; }
function row(icon, label, value) { return `<div class="kv">${ic(icon)}<div><small>${label}</small><b>${value}</b></div></div>`; }
function jobView(id) {
  const j = db.job(id), w = db.me();
  if (!j || !j.team.includes(w.id)) return null;
  const isToday = j.date === todayIso(), active = j.status === 'in_progress';
  const canPhoto = active && !(j.unit === 'aircon' && w.role === 'rider');
  const items = active ? checklist(j) : [], ready = items.every(i => i[1]);
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lon}`;
  const payTxt = j.payment.type === 'cod'
    ? ({ due: `Collect ${peso(j.payment.amount)} in cash`, proof_uploaded: 'Cash proof sent, waiting for Finance', verified: 'Cash verified by Finance' })[j.payment.status]
    : `Paid online (${j.payment.method})`;
  return shell('bookings', `
    <section class="card head-card"><span class="code blue">${esc(j.id)}</span><h2>${esc(j.client)}</h2>
      <div class="pills">${statusPill(j)}<span class="pill soft">${esc(j.type)}</span></div>
      <p class="muted">${longDate(j.date)}, ${t12(j.start)} - ${t12(j.end)}</p>
      ${j.checkIn ? `<p class="stamp">${ic('login')} Checked in ${timeOf(j.checkIn.at)}${j.checkIn.far ? ` <span class="pill amber">${Math.round(j.checkIn.far)} m from pin</span>` : ''}${j.checkIn.noGps ? ' <span class="pill amber">No GPS</span>' : ''}</p>` : ''}
      ${j.checkOut ? `<p class="stamp">${ic('logout')} Checked out ${timeOf(j.checkOut.at)}</p>` : ''}</section>
    ${section('BOOKING INFORMATION', `
      ${row('location_on', 'ADDRESS', esc(j.address))}${j.landmark ? row('flag', 'LANDMARK', esc(j.landmark)) : ''}
      <div class="two-btn"><a class="btn ghost" href="${dir}" target="_blank" rel="noopener">${ic('directions')} Directions</a><a class="btn ghost" href="tel:+639674753848">${ic('call')} Call Ops</a></div>
      ${row('category', 'SERVICE', `${db.UNIT_LABEL[j.unit]} · ${esc(j.title)}`)}
      ${j.team.length > 1 ? row('group', 'TEAM', db.teammates(j).map(esc).join('<br>')) : ''}
      ${row(j.payment.type === 'cod' ? 'account_balance_wallet' : 'credit_card', 'PAYMENT', payTxt)}`)}
    ${section(j.units ? `AIRCON UNITS (${j.units.length})` : j.scope ? 'SCOPE' : 'TASKS', `<ul class="ticks">${(j.units ? j.units.map(u => `${u.type} · ${u.room}`) : j.scope || j.tasks).map(t => `<li>${ic('check_circle')} ${esc(t)}</li>`).join('')}</ul>
      ${j.notes ? `<div class="note"><b>Note:</b> ${esc(j.notes)}</div>` : ''}`)}
    ${active ? `
      ${section('PHOTOS', `${j.unit === 'aircon' && w.role === 'rider' ? '<p class="muted">The Technician takes the photos for each unit.</p>' : ''}
        ${j.unit === 'aircon' && w.role === 'technician' ? j.units.map(u => `<div class="unit-ph"><b>${esc(u.type)} · ${esc(u.room)}</b><small>BEFORE</small>${photoGrid(j.id, 'before', u.id, true)}<small>AFTER</small>${photoGrid(j.id, 'after', u.id, true)}</div>`).join('') : ''}
        ${j.unit !== 'aircon' ? `<small class="ph-l">BEFORE</small>${photoGrid(j.id, 'before', '', canPhoto)}<small class="ph-l">AFTER</small>${photoGrid(j.id, 'after', '', canPhoto)}` : ''}`)}
      ${j.payment.type === 'cod' ? `<section class="card sec cash"><p class="sec-h">CASH PAYMENT</p><p>Collect <b>${peso(j.payment.amount)}</b>, then take a photo of the cash or the transfer screenshot.</p>${photoGrid(j.id, 'cash', '', true)}</section>` : ''}
      ${j.unit === 'deep' && j.lead === w.id ? section('CUSTOMER SIGN-OFF', `<label class="check"><input type="checkbox" id="so" ${signoff.ok ? 'checked' : ''}><span>The customer checked the work and is satisfied</span></label>
        <label class="field"><span>Customer or site contact name</span><input id="son" value="${esc(signoff.name)}" placeholder="Full name"></label>`) : ''}
      ${section('BEFORE YOU CHECK OUT', `<ul class="todo">${items.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}">${ic(ok ? 'check_circle' : 'radio_button_unchecked')} ${esc(t)}</li>`).join('')}</ul>`)}` : ''}
    <div class="sticky-act">
      ${j.status === 'upcoming' ? `<button class="btn primary block" id="in" ${isToday ? '' : 'disabled'}>${ic('login')} ${isToday ? 'Check In' : `Check-in opens on ${longDate(j.date)}`}</button>` : ''}
      ${active ? `<button class="btn primary block" id="out" ${ready ? '' : 'disabled'}>${ic('logout')} Check Out</button>` : ''}
      ${j.status === 'for_review' ? `<p class="state-note orange">${ic('schedule')} For review: Operations is checking your photos${j.payment.type === 'cod' ? ' and cash proof' : ''}.</p>` : ''}
      ${j.status === 'completed' ? `<a class="state-note blue" href="#/earning/${j.id}">${ic('verified', 'fill')} Completed · see earnings ${ic('chevron_right')}</a>` : ''}
    </div>`, { title: 'Booking Details', back: '#/bookings' });
}
function compress(file, max, quality) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', quality)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file isn’t a photo.')); };
    img.src = url;
  });
}
function distanceM(a, b) { const R = 6371e3, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
function mountJob(id) {
  const j = db.job(id); if (!j) return;
  root.querySelectorAll('input[type=file]').forEach(inp => inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return;
    try { const data = await compress(f, db.isDemo ? 720 : 1280, db.isDemo ? 0.6 : 0.7); db.addPhoto(id, { kind: inp.dataset.kind, unitId: inp.dataset.unit || '', data }); toast('Photo added'); render(); }
    catch (e) { toast(e.message); }
  }));
  root.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); db.removePhoto(id, b.dataset.rm); render(); }));
  root.querySelector('#so')?.addEventListener('change', e => { signoff.ok = e.target.checked; render(); });
  root.querySelector('#son')?.addEventListener('change', e => { signoff.name = e.target.value; render(); });
  root.querySelector('#in')?.addEventListener('click', e => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = `${ic('my_location')} Getting your location…`;
    const finish = loc => { db.checkIn(id, loc); toast(loc.far ? `Checked in. You are about ${Math.round(loc.far)} m from the pin; Operations will see this.` : 'Checked in. Have a great job!'); render(); };
    if (!navigator.geolocation) return finish({ noGps: true });
    navigator.geolocation.getCurrentPosition(p => { const here = { lat: p.coords.latitude, lon: p.coords.longitude }, d = distanceM(here, j); finish({ ...here, accuracy: p.coords.accuracy, ...(d > CHECKIN_RADIUS_M ? { far: d } : {}) }); },
      () => { if (confirm('Location is off. Check in without GPS? Operations will see that no location was recorded.')) finish({ noGps: true }); else render(); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
  root.querySelector('#out')?.addEventListener('click', () => { db.checkOut(id, j.unit === 'deep' ? { signoff: signoff.name } : {}); signoff = { ok: false, name: '' }; toast('Checked out. Sent for review.'); render(); });
}

// ---------- Career progress card (shared by Earnings and Profile) ----------
function career(w) {
  const perfLabel = w.performance >= 90 ? ['EXCELLENT', 'green'] : w.performance >= 75 ? ['GOOD', 'blue'] : ['NEEDS IMPROVEMENT', 'blue'];
  return `<section class="card sec"><p class="sec-h">CAREER PROGRESS</p>
    <div class="cp">${ic('workspace_premium')}<span>${db.ROLE_LABEL[w.role]} Level</span><span class="pill soft">${w.level}</span></div>
    ${w.nextLevel ? `<div class="cp">${ic('arrow_upward', 'blue-ic')}<span>Next Milestone</span><b>${w.nextLevel.toUpperCase()}</b></div><div class="cp-note">${ic('info')} ${esc(w.nextLevelNeeds)}</div>` : ''}
    <div class="cp">${ic('star', 'gold')}<span>Asenso Points</span><span class="pill gold">+${w.pointsWeek} this week</span><b>${w.points.toLocaleString('en-US')} pts</b></div>
    <div class="cp">${ic('trending_up', 'blue-ic')}<span>Performance</span><b>${w.performance} / 100</b></div><div class="cp-sub"><span class="pill ${perfLabel[1]} caps">${perfLabel[0]}</span></div></section>`;
}

// ---------- Earnings ----------
let earnTab = 'all';
function earningsView() {
  const w = db.me(), all = db.earnings(), t = todayIso();
  const weekStart = weekStartOf(t), month = t.slice(0, 7);
  const sum = f => all.filter(f).reduce((s, x) => s + db.net(x.e), 0);
  const list = earnTab === 'all' ? all : all.filter(x => x.e.payout !== 'claimed');
  const label = { pending: ['PENDING', 'soft'], released: ['ACKNOWLEDGE PAYOUT', 'orange'], claimed: ['PAYOUT CLAIMED', 'blue'] };
  return shell('earnings', `
    <h2 class="page-h">Summary</h2>${career(w)}
    <div class="stats three">
      <div class="card stat"><span class="sq plain"><span class="peso">₱</span></span><b>${sum(x => x.job.date === t).toFixed(2)}</b><span>Today</span></div>
      <div class="card stat"><span class="sq plain">${ic('trending_up')}</span><b>${sum(x => x.job.date >= weekStart).toFixed(2)}</b><span>This Week</span></div>
      <div class="card stat"><span class="sq blue">${ic('calendar_today')}</span><b>${sum(x => x.job.date.startsWith(month)).toFixed(2)}</b><span>This Month</span></div>
    </div>
    <div class="seg two" role="tablist">${[['all', 'All'], ['pending', 'Pending']].map(([k, l]) => `<button role="tab" aria-selected="${earnTab === k}" class="${earnTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="list">${list.length ? list.map(({ job: j, e }) => `<a class="card earn" href="#/earning/${j.id}">
      <div><span class="code">${esc(j.id)}</span><h3>${esc(j.client)}</h3><p class="muted">${shortDate(j.date)}</p>
        <div class="pills"><span class="pill ${label[e.payout][1]} caps">${label[e.payout][0]}</span>${j.payment.type === 'cod' ? `<span class="rcpt" title="Cash proof on file">${ic('receipt_long')}</span>` : ''}</div></div>
      <div class="earn-r"><b>${peso(db.net(e))}</b>${e.points ? `<span class="pts">+${e.points} <small>PTS</small></span>` : ''}</div></a>`).join('') : empty('No earnings here yet')}</div>`, { title: 'Earnings' });
}
function mountEarnings() { root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { earnTab = b.dataset.tab; render(); })); }

function earningView(id) {
  const j = db.job(id), w = db.me(); if (!j || !j.earn?.[w.id]) return null;
  const e = j.earn[w.id], label = { pending: ['PENDING', 'soft'], released: ['PAYOUT RELEASED', 'orange'], claimed: ['PAYOUT CLAIMED', 'blue'] }[e.payout];
  return shell('earnings', `
    <section class="card earn-head"><span class="code blue">${esc(j.id)}</span><b class="amount">${peso(db.net(e))}</b><span class="muted">Your Total Earnings</span><span class="pill ${label[1]} caps">${label[0]}</span>
      ${e.payout === 'released' ? '<button class="btn primary block" id="ack">I received my payout</button>' : ''}</section>
    <section class="card sec"><p class="sec-h">INCOME BREAKDOWN</p>
      <div class="line-item"><i class="bar-c blue"></i><div><b>Your Share (${db.ROLE_LABEL[w.role] === 'Housemaid' ? 'HM' : db.ROLE_LABEL[w.role]})</b><small>BASE SERVICE RATE</small></div><span class="v blue">${peso(e.share)}</span></div>
      ${e.transport ? `<div class="line-item"><i class="bar-c red"></i><div><b>Transportation Cost</b></div><span class="v red">${peso(e.transport)}</span></div>` : ''}
      <div class="line-item"><i class="bar-c grey"></i><div><b>Company Share (GK)</b><small>PLATFORM FEE</small></div><span class="v grey">${peso(e.company)}</span></div>
      ${e.points ? `<div class="pts-box">${ic('star', 'fill')}<div><b>Points Earned</b><small>${esc(e.pointsReason.toUpperCase())}</small></div><span><b>+${e.points}</b> PTS</span></div>` : ''}
      <div class="note"><b>Note:</b> Weekend surge (+10%), extension earnings, and transportation costs are fully credited to your account.</div></section>
    <section class="card sec"><p class="sec-h">TRANSACTION DETAILS</p>
      <div class="tr"><span>Receipt Number</span><code>${esc(e.receipt)}</code></div>
      <div class="tr"><span>Earning ID</span><code>${e.earningId}</code></div>
      <div class="tr"><span>Booking Type</span><b>${esc(j.type)}</b></div>
      <div class="tr strong"><span>Client Payment</span><b>${peso(j.payment.amount)}</b></div>
      <div class="tr red"><span>Less: Company Share</span><b>- ${peso(e.company)}</b></div>
      <div class="tr total"><span>Your Net Earnings</span><b>${peso(db.net(e))}</b></div></section>
    <section class="card sec"><p class="sec-h">PAYMENT INFORMATION</p>
      ${row(j.payment.type === 'cod' ? 'account_balance_wallet' : 'credit_card', 'PAYMENT METHOD', esc(j.payment.method))}
      ${row('calendar_today', 'TRANSACTION DATE', longDate(j.date))}</section>
    <section class="card sec"><p class="sec-h">BOOKING INFORMATION</p>
      ${row('person', 'CLIENT', esc(j.client))}${row('location_on', 'ADDRESS', esc(j.address))}
      <a class="row-link" href="#/job/${j.id}">${ic('description')} View booking ${ic('chevron_right')}</a></section>`, { title: 'Earning Details', back: '#/earnings' });
}
function mountEarning(id) { root.querySelector('#ack')?.addEventListener('click', () => { db.acknowledgePayout(id); toast('Thank you! Payout marked as claimed.'); render(); }); }

// ---------- Notifications ----------
function notificationsView() {
  const ns = db.notifications();
  const icon = { payout: 'calendar_today', booking: 'check_circle', action: 'calendar_today' };
  return shell('notifications', `
    <div class="bk-head"><h2 class="page-h">Notifications</h2>${ns.some(n => !n.read) ? '<button class="link-btn" id="mar">Mark all read</button>' : ''}</div>
    <div class="list">${ns.length ? ns.map(n => `<a class="card notif ${n.read ? '' : 'unread'}" href="${n.link}" data-n="${n.id}">
      ${ic(icon[n.kind], n.kind === 'booking' ? 'green-ic' : 'blue-ic')}
      <div><div class="n-top"><b>${esc(n.title)}</b><span class="muted">${agoText(n.at)}</span>${n.read ? '' : '<i class="dot"></i>'}</div>
        <p>${esc(n.body)}</p>${n.high ? '<span class="pill red">High Priority</span>' : ''}</div></a>`).join('') : empty('No notifications yet')}</div>`, { title: '' });
}
function mountNotifications() {
  root.querySelector('#mar')?.addEventListener('click', () => { db.markAllRead(); render(); });
  root.querySelectorAll('[data-n]').forEach(a => a.addEventListener('click', () => db.markRead(a.dataset.n)));
}

// ---------- Profile ----------
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (location.hash.includes('profile')) render(); });
function profileView() {
  const w = db.me(), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return shell('profile', `
    <div class="prof-banner"></div>
    <div class="prof-id"><span class="av big">${initials(w.name)}</span><h2>${esc(w.name)}</h2><p>${ic('star', 'fill gold')} <b>${w.rating}</b> <span class="muted">(${w.jobsDone} jobs)</span></p></div>
    ${career(w)}
    <section class="card sec"><p class="sec-h">CONTACT INFORMATION</p>
      <div class="ci">${ic('call')} +63${esc(w.mobile)}</div><div class="ci">${ic('mail')} ${esc(w.email)}</div>
      <div class="ci">${ic('thumb_up')} ${esc(w.facebook)}</div><div class="ci">${ic('location_on')} ${esc(w.city)}</div></section>
    ${w.role === 'housemaid' ? `<a class="card menu-row" href="#/availability">${ic('calendar_today', 'blue-ic')} Manage Availability ${ic('chevron_right', 'chev')}</a>` : ''}
    <a class="card menu-row" href="#/performance">${ic('bar_chart', 'blue-ic')} Performance Reports ${ic('chevron_right', 'chev')}</a>
    ${standalone ? '' : `<button class="card menu-row" id="inst">${ic('install_mobile', 'blue-ic')} ${installEvt ? 'Install the app' : 'Add to Home screen'} ${ic('chevron_right', 'chev')}</button>`}
    <a class="card menu-row" href="tel:+639674753848">${ic('support_agent', 'blue-ic')} Call Operations ${ic('chevron_right', 'chev')}</a>
    ${db.isDemo ? '<button class="card menu-row" id="reset">' + ic('restart_alt', 'blue-ic') + ' Reset demo data ' + ic('chevron_right', 'chev') + '</button>' : ''}
    <button class="card menu-row logout" id="lo">${ic('logout')} Logout</button>`, { title: 'Profile' });
}
function mountProfile() {
  root.querySelector('#inst')?.addEventListener('click', async () => {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); }
    else toast('Open your browser menu, then tap “Add to Home screen”.');
  });
  root.querySelector('#reset')?.addEventListener('click', () => { if (confirm('Reset all demo bookings, photos and availability?')) { db.resetDemo(); toast('Demo data reset'); render(); } });
  root.querySelector('#lo').addEventListener('click', () => { db.signOut(); go('/login'); });
}

// ---------- Availability (housemaids) ----------
const AV = [['whole', 'Whole day'], ['am', 'Morning'], ['pm', 'Afternoon'], ['off', 'Off']];
function availabilityView() {
  const w = db.me();
  if (w.role !== 'housemaid') return shell('profile', empty('Your schedule is set by your Supervisor or Operations.'), { title: 'Availability', back: '#/profile' });
  const av = db.availability(), days = Array.from({ length: 14 }, (_, i) => addD(todayIso(), i));
  const booked = new Set(db.myJobs().filter(j => ['upcoming', 'in_progress'].includes(j.status)).map(j => j.date));
  const open = days.filter(d => (av[d] || 'off') !== 'off').length;
  return shell('bookings', `
    <p class="muted">Clients can book you on the days you mark available. You have <b>${open}</b> open day${open === 1 ? '' : 's'} in the next 2 weeks.</p>
    <div class="two-btn"><button class="btn ghost" id="all-wd">Weekdays: whole day</button><button class="btn ghost" id="all-off">Clear all</button></div>
    <div class="list">${days.map(d => { const v = av[d] || 'off', b = booked.has(d), x = new Date(d + 'T00:00');
      return `<div class="card av-card ${v !== 'off' ? 'open' : ''}"><div class="av-h"><b>${x.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</b>${d === todayIso() ? '<span class="muted">Today</span>' : ''}${b ? '<span class="pill blue">Booked</span>' : ''}</div>
        <div class="av-opts" role="radiogroup" aria-label="Availability on ${d}">${AV.map(([k, l]) => `<button role="radio" aria-checked="${v === k}" class="${v === k ? 'on' : ''}" data-av="${d}" data-v="${k}" ${b && k === 'off' ? 'disabled' : ''}>${l}</button>`).join('')}</div></div>`; }).join('')}</div>`,
    { title: 'Set Availability', back: '#/bookings' });
}
function mountAvailability() {
  root.querySelectorAll('[data-av]').forEach(b => b.addEventListener('click', () => { db.setAvailability(b.dataset.av, b.dataset.v); render(); }));
  root.querySelector('#all-wd')?.addEventListener('click', () => { for (let i = 0; i < 14; i++) { const k = addD(todayIso(), i), dow = new Date(k + 'T00:00').getDay(); if (dow && dow !== 6) db.setAvailability(k, 'whole'); } toast('Weekdays set to whole day'); render(); });
  root.querySelector('#all-off')?.addEventListener('click', () => { const booked = new Set(db.myJobs().filter(j => ['upcoming', 'in_progress'].includes(j.status)).map(j => j.date)); for (let i = 0; i < 14; i++) { const k = addD(todayIso(), i); if (!booked.has(k)) db.setAvailability(k, 'off'); } render(); });
}

// ---------- Performance report ----------
function performanceView() {
  const w = db.me(), done = db.myJobs().filter(j => ['for_review', 'completed'].includes(j.status));
  const onTime = done.filter(j => j.checkIn && new Date(j.checkIn.at) <= new Date(`${j.date}T${j.start}:00`).getTime() + 15 * 6e4).length;
  return shell('profile', `${career(w)}
    <div class="stats">
      <div class="card stat"><span class="sq gold-bg">${ic('star', 'fill')}</span><b>${w.rating}</b><span>Average rating</span></div>
      <div class="card stat"><span class="sq green">${ic('check_circle')}</span><b>${w.jobsDone}</b><span>Jobs completed</span></div>
      <div class="card stat"><span class="sq blue">${ic('schedule')}</span><b>${done.length ? Math.round(onTime / done.length * 100) : 100}%</b><span>On-time check-ins</span></div>
      <div class="card stat"><span class="sq orange">${ic('workspace_premium')}</span><b>${w.level}</b><span>Current level</span></div>
    </div>
    <p class="muted small">Performance is scored from ratings, punctuality, completed checklists and complaints. Your Supervisor reviews it monthly.</p>`, { title: 'Performance Reports', back: '#/profile' });
}

// ---------- Router ----------
function render() {
  const raw = location.hash.replace(/^#/, '') || '/dashboard';
  const [path, qs] = raw.split('?'), params = new URLSearchParams(qs || '');
  const [, page, arg] = path.split('/');
  if (!db.me() && page !== 'login') { go('/login'); return; }
  if (db.me() && page === 'login') { go('/dashboard'); return; }
  let html, mount;
  switch (page) {
    case 'login': html = loginView(); mount = mountLogin; break;
    case 'bookings': html = bookingsView(params); mount = mountBookings; break;
    case 'job': html = jobView(arg); mount = () => mountJob(arg); break;
    case 'earnings': html = earningsView(); mount = mountEarnings; break;
    case 'earning': html = earningView(arg); mount = () => mountEarning(arg); break;
    case 'notifications': html = notificationsView(); mount = mountNotifications; break;
    case 'profile': html = profileView(); mount = mountProfile; break;
    case 'availability': html = availabilityView(); mount = mountAvailability; break;
    case 'performance': html = performanceView(); break;
    default: html = dashboardView(); mount = mountDashboard;
  }
  if (html == null) { go('/dashboard'); return; }
  const y = scrollY, same = render._last === raw; render._last = raw;
  root.innerHTML = html; mount?.();
  scrollTo(0, same ? y : 0);
}
addEventListener('hashchange', render);
render();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
