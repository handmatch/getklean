// Getklean worker app: Housemaids, Cleaners, Technicians and Riders.
import * as db from './data.js';
import { CHECKIN_RADIUS_M } from './config.js';

const root = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, cls = '') => `<span class="ic ${cls}" aria-hidden="true">${n}</span>`;
const peso = n => '₱' + Number(n).toLocaleString('en-US');
const go = p => { location.hash = p; };
const todayIso = () => db.iso(new Date());
const t12 = hhmm => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const dayName = d => { const t = todayIso(); if (d === t) return 'Today'; const x = new Date(d + 'T00:00'); const diff = Math.round((x - new Date(t + 'T00:00')) / 864e5); if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday'; return x.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
const timeOf = isoStr => new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- Shell ----------
function shell(active, body, { title = '', back = '' } = {}) {
  const w = db.me();
  const tabs = [['jobs', 'Jobs', 'work'], ...(w.role === 'housemaid' ? [['availability', 'Availability', 'event_available']] : []), ['earnings', 'Earnings', 'payments'], ['profile', 'Profile', 'person']];
  return `${db.isDemo ? '<div class="demo-bar">Demo mode · data stays on this phone</div>' : ''}
  <header class="bar">${back ? `<a class="bar-back" href="${back}" aria-label="Back">${ic('arrow_back')}</a>` : `<img class="bar-logo" src="icons/logo-on-blue.svg" alt="Getklean">`}
    ${title ? `<h1 class="bar-title">${esc(title)}</h1>` : `<span class="bar-who">${esc(w.name.split(' ')[0])} · ${db.ROLE_LABEL[w.role]}</span>`}</header>
  <main class="main">${body}</main>
  <nav class="tabs" aria-label="Main">${tabs.map(([k, l, i]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}" ${active === k ? 'aria-current="page"' : ''}>${ic(i, active === k ? 'fill' : '')}<span>${l}</span></a>`).join('')}</nav>`;
}

// ---------- Sign in ----------
let login = { step: 'mobile', mobile: '', err: '' };
function loginView() {
  const demo = Object.values(db.WORKERS);
  return `<div class="login">
    <img class="login-logo" src="icons/logo-on-blue.svg" alt="Getklean">
    <div class="card login-card">
      <h1>${login.step === 'mobile' ? 'Worker sign in' : 'Enter your code'}</h1>
      <p class="muted">${login.step === 'mobile' ? 'Use the mobile number registered with Getklean Operations.' : `We sent a 6-digit code to +63 ${esc(login.mobile)}.`}</p>
      <form id="lf" novalidate>
        ${login.step === 'mobile'
          ? `<label class="field"><span>Mobile number</span><div class="phone"><b>+63</b><input id="m" inputmode="numeric" autocomplete="tel-national" placeholder="917 123 4501" value="${esc(login.mobile)}"></div></label>`
          : `<label class="field"><span>6-digit code</span><input id="c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" class="otp"></label>`}
        ${login.err ? `<p class="err" role="alert">${esc(login.err)}</p>` : ''}
        <button class="btn primary block" type="submit">${login.step === 'mobile' ? 'Send code' : 'Sign in'}</button>
        ${login.step === 'otp' ? `<button class="btn ghost block" type="button" id="chg">Change number</button>` : ''}
      </form>
    </div>
    ${db.isDemo ? `<div class="card demo-pick"><p class="label">Demo accounts (any 6-digit code works)</p>
      ${demo.map(w => `<button class="demo-acct" data-m="${w.mobile}"><span>${esc(w.name)}</span><small>${db.ROLE_LABEL[w.role]} · ${w.level}</small></button>`).join('')}</div>` : ''}
  </div>`;
}
function mountLogin() {
  const f = root.querySelector('#lf');
  root.querySelector('#chg')?.addEventListener('click', () => { login = { step: 'mobile', mobile: login.mobile, err: '' }; render(); });
  root.querySelectorAll('.demo-acct').forEach(b => b.addEventListener('click', () => { login = { step: 'otp', mobile: b.dataset.m, err: '' }; render(); }));
  (root.querySelector('#m') || root.querySelector('#c'))?.focus();
  f.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      if (login.step === 'mobile') {
        const m = root.querySelector('#m').value.replace(/\D/g, '').replace(/^0?63/, '').replace(/^0/, '');
        if (!/^9\d{9}$/.test(m)) throw new Error('Enter a valid PH mobile number, e.g. 917 123 4501.');
        await db.sendOtp(m); login = { step: 'otp', mobile: m, err: '' };
      } else {
        await db.verifyOtp(login.mobile, root.querySelector('#c').value.trim());
        login = { step: 'mobile', mobile: '', err: '' }; go('/jobs'); return;
      }
    } catch (err) { login.err = err.message; }
    render();
  });
}

// ---------- Jobs list ----------
let jobsTab = 'today';
function statusChip(j) {
  const m = { scheduled: ['Scheduled', ''], in_progress: ['In progress', 'blue'], completed: ['Done', 'green'] }[j.status];
  return `<span class="chip ${m[1]}">${m[0]}</span>`;
}
function payChip(j) {
  if (j.payment.type === 'cod') return j.payment.status === 'due' ? `<span class="chip amber">${ic('payments', 's16')} Collect ${peso(j.payment.amount)} cash</span>` : `<span class="chip green">${ic('check', 's16')} Cash proof sent</span>`;
  return `<span class="chip">${ic('credit_card', 's16')} Paid online</span>`;
}
function jobCard(j) {
  return `<a class="card job" href="#/job/${j.id}">
    <div class="job-top"><span class="job-time">${dayName(j.date)} · ${t12(j.start)}–${t12(j.end)}</span>${statusChip(j)}</div>
    <h2>${esc(j.title)}</h2>
    <p class="muted">${ic('location_on', 's16')} ${esc(j.address)}</p>
    <div class="chips">${payChip(j)}${j.team.length > 1 ? `<span class="chip">${ic('group', 's16')} Team of ${j.team.length}</span>` : ''}</div>
  </a>`;
}
function jobsView() {
  const w = db.me(), all = db.myJobs(), t = todayIso();
  const lists = { today: all.filter(j => j.date === t && j.status !== 'completed'), upcoming: all.filter(j => j.date > t && j.status !== 'completed'), done: all.filter(j => j.status === 'completed').reverse() };
  const list = lists[jobsTab];
  const hour = new Date().getHours(), greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return shell('jobs', `
    <section class="hello"><h1>${greet}, ${esc(w.name.split(' ')[0])}</h1>
      <p><span class="chip ${w.level === 'Expert' ? 'blue' : ''}">${ic('workspace_premium', 's16')} ${w.level}</span> <span class="muted">${lists.today.length} job${lists.today.length === 1 ? '' : 's'} today</span></p></section>
    <div class="seg" role="tablist">${[['today', 'Today'], ['upcoming', 'Upcoming'], ['done', 'Done']].map(([k, l]) => `<button role="tab" aria-selected="${jobsTab === k}" class="${jobsTab === k ? 'on' : ''}" data-tab="${k}">${l} <b>${lists[k].length}</b></button>`).join('')}</div>
    <div class="list">${list.length ? list.map(jobCard).join('') : `<div class="empty">${ic('event_busy')}<p>${jobsTab === 'today' ? 'No jobs left today.' : jobsTab === 'upcoming' ? 'No upcoming jobs yet.' : 'No finished jobs yet.'}</p>${w.role === 'housemaid' && jobsTab !== 'done' ? '<a class="btn ghost" href="#/availability">Update my availability</a>' : ''}</div>`}</div>`);
}
function mountJobs() { root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { jobsTab = b.dataset.tab; render(); })); }

// ---------- Job detail ----------
function photoGrid(jobId, kind, unitId, canEdit) {
  const ps = db.photos(jobId).filter(p => p.kind === kind && (p.unitId || '') === (unitId || ''));
  return `<div class="photos">${ps.map(p => `<figure><img src="${p.data}" alt="${kind} photo">${canEdit ? `<button class="rm" data-rm="${p.id}" aria-label="Remove photo">${ic('close', 's16')}</button>` : ''}</figure>`).join('')}
    ${canEdit ? `<label class="add-photo">${ic('add_a_photo')}<span>${kind === 'cash' ? 'Add payment photo' : kind === 'before' ? 'Before' : 'After'}</span><input type="file" accept="image/*" capture="environment" data-kind="${kind}" data-unit="${unitId || ''}" hidden></label>` : ''}</div>`;
}
function checklist(j) {
  const w = db.me(), ps = db.photos(j.id), has = (k, u) => ps.some(p => p.kind === k && (p.unitId || '') === (u || ''));
  const items = [];
  if (j.unit === 'aircon' && w.role === 'technician') j.units.forEach(u => items.push([`${u.type} · ${u.room}: before and after photos`, has('before', u.id) && has('after', u.id)]));
  if (j.unit !== 'aircon') items.push(['At least one after photo', has('after')]);
  if (j.payment.type === 'cod') items.push([`Photo of the ${peso(j.payment.amount)} cash payment`, has('cash')]);
  if (j.unit === 'deep' && j.lead === w.id) items.push(['Customer sign-off', !!signoff.ok && signoff.name.trim().length > 1]);
  return items;
}
let signoff = { ok: false, name: '' };
function jobView(id) {
  const j = db.job(id), w = db.me();
  if (!j || !j.team.includes(w.id)) return null;
  const isToday = j.date === todayIso(), active = j.status === 'in_progress', done = j.status === 'completed';
  const canPhoto = active && !(j.unit === 'aircon' && w.role === 'rider');
  const items = active ? checklist(j) : [];
  const ready = items.every(i => i[1]);
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lon}`;
  return shell('jobs', `
    <section class="card status-card ${j.status}">
      <div class="job-top"><span class="job-time">${dayName(j.date)} · ${t12(j.start)}–${t12(j.end)}</span>${statusChip(j)}</div>
      <h2>${esc(j.title)}</h2><p class="muted">${db.UNIT_LABEL[j.unit]} · ${esc(j.id)}</p>
      ${j.checkIn ? `<p class="stamp">${ic('login', 's16')} Checked in ${timeOf(j.checkIn.at)}${j.checkIn.far ? ` <span class="chip amber">${Math.round(j.checkIn.far)} m from pin</span>` : ''}${j.checkIn.noGps ? ' <span class="chip amber">No GPS</span>' : ''}</p>` : ''}
      ${j.checkOut ? `<p class="stamp">${ic('logout', 's16')} Checked out ${timeOf(j.checkOut.at)}</p>` : ''}
    </section>

    <section class="card">
      <p class="label">Customer</p><p class="big">${esc(j.customer)}</p>
      <p class="label">Address</p><p>${esc(j.address)}</p>${j.landmark ? `<p class="muted">${ic('flag', 's16')} ${esc(j.landmark)}</p>` : ''}
      <div class="row-btns"><a class="btn ghost" href="${dir}" target="_blank" rel="noopener">${ic('directions')} Directions</a>
        <a class="btn ghost" href="tel:+639674753848">${ic('support_agent')} Call Ops</a></div>
    </section>

    <section class="card">
      ${j.tasks ? `<p class="label">Tasks</p><ul class="ticks">${j.tasks.map(t => `<li>${ic('check_circle', 's18')} ${esc(t)}</li>`).join('')}</ul>` : ''}
      ${j.scope ? `<p class="label">Scope</p><ul class="ticks">${j.scope.map(t => `<li>${ic('check_circle', 's18')} ${esc(t)}</li>`).join('')}</ul>` : ''}
      ${j.units ? `<p class="label">Aircon units (${j.units.length})</p><ul class="ticks">${j.units.map(u => `<li>${ic('ac_unit', 's18')} ${esc(u.type)} · ${esc(u.room)}</li>`).join('')}</ul>` : ''}
      ${j.notes ? `<p class="label">Notes</p><p class="note">${esc(j.notes)}</p>` : ''}
      ${j.team.length > 1 ? `<p class="label">Team</p><ul class="ticks">${db.teammates(j).map(t => `<li>${ic('person', 's18')} ${esc(t)}</li>`).join('')}</ul>` : ''}
      <p class="label">Payment</p><p>${payChip(j)}</p>
    </section>

    ${active ? `
    <section class="card">
      <h3>Photos</h3>
      ${j.unit === 'aircon' && w.role === 'rider' ? '<p class="muted">The Technician takes the photos for each unit.</p>' : ''}
      ${j.unit === 'aircon' && w.role === 'technician' ? j.units.map(u => `<div class="unit-photos"><p class="sub">${esc(u.type)} · ${esc(u.room)}</p>
          <p class="label">Before</p>${photoGrid(j.id, 'before', u.id, true)}<p class="label">After</p>${photoGrid(j.id, 'after', u.id, true)}</div>`).join('') : ''}
      ${j.unit !== 'aircon' ? `<p class="label">Before</p>${photoGrid(j.id, 'before', '', canPhoto)}<p class="label">After</p>${photoGrid(j.id, 'after', '', canPhoto)}` : ''}
    </section>
    ${j.payment.type === 'cod' ? `<section class="card cash"><h3>${ic('payments')} Cash payment</h3>
      <p>Collect <b>${peso(j.payment.amount)}</b> from the customer, then take a photo of the cash or the transfer screenshot.</p>${photoGrid(j.id, 'cash', '', true)}</section>` : ''}
    ${j.unit === 'deep' && j.lead === w.id ? `<section class="card"><h3>Customer sign-off</h3>
      <label class="check"><input type="checkbox" id="so" ${signoff.ok ? 'checked' : ''}><span>The customer checked the work and is satisfied</span></label>
      <label class="field"><span>Customer or site contact name</span><input id="son" value="${esc(signoff.name)}" placeholder="Full name"></label></section>` : ''}
    <section class="card"><h3>Before you check out</h3><ul class="todo">${items.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}">${ic(ok ? 'check_circle' : 'radio_button_unchecked', 's18')} ${esc(t)}</li>`).join('')}</ul></section>` : ''}

    <div class="sticky-act">
      ${!active && !done ? `<button class="btn primary block" id="in" ${isToday ? '' : 'disabled'}>${ic('login')} ${isToday ? 'Check in' : `Check in opens on ${dayName(j.date)}`}</button>` : ''}
      ${active ? `<button class="btn primary block" id="out" ${ready ? '' : 'disabled'}>${ic('logout')} Check out</button>` : ''}
      ${done ? `<p class="done-note">${ic('verified', 'fill')} Job completed${j.earnings?.[w.id] ? ` · you earned ${peso(j.earnings[w.id])}` : ''}</p>` : ''}
    </div>`, { title: 'Job details', back: '#/jobs' });
}
function compress(file, max = 1280, quality = 0.7) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file isn’t a photo.')); };
    img.src = url;
  });
}
function distanceM(a, b) {
  const R = 6371e3, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function mountJob(id) {
  const j = db.job(id); if (!j) return;
  root.querySelectorAll('input[type=file]').forEach(inp => inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      // Demo mode keeps photos on the phone, so store them smaller; Supabase will hold full size.
      const data = await compress(f, db.isDemo ? 720 : 1280, db.isDemo ? 0.6 : 0.7);
      db.addPhoto(id, { kind: inp.dataset.kind, unitId: inp.dataset.unit || '', data }); toast('Photo added'); render();
    } catch (e) { toast(e.message); }
  }));
  root.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); db.removePhoto(id, b.dataset.rm); render(); }));
  root.querySelector('#so')?.addEventListener('change', e => { signoff.ok = e.target.checked; render(); });
  root.querySelector('#son')?.addEventListener('change', e => { signoff.name = e.target.value; render(); });
  root.querySelector('#in')?.addEventListener('click', e => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = `${ic('my_location')} Getting your location…`;
    const finish = loc => { db.checkIn(id, loc); toast(loc.far ? `Checked in. You are about ${Math.round(loc.far)} m from the pin; Ops has been notified.` : 'Checked in. Have a great job!'); render(); };
    if (!navigator.geolocation) return finish({ noGps: true });
    navigator.geolocation.getCurrentPosition(p => {
      const here = { lat: p.coords.latitude, lon: p.coords.longitude }, d = distanceM(here, j);
      finish({ ...here, accuracy: p.coords.accuracy, ...(d > CHECKIN_RADIUS_M ? { far: d } : {}) });
    }, () => {
      if (confirm('Location is off. Check in without GPS? Operations will see that no location was recorded.')) finish({ noGps: true });
      else render();
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  });
  root.querySelector('#out')?.addEventListener('click', () => {
    db.checkOut(id, j.unit === 'deep' ? { signoff: signoff.name } : {}); signoff = { ok: false, name: '' };
    toast('Checked out. Thank you!'); render();
  });
}

// ---------- Availability (housemaids) ----------
const AV = [['whole', 'Whole day'], ['am', 'Morning'], ['pm', 'Afternoon'], ['off', 'Off']];
function availabilityView() {
  const w = db.me();
  if (w.role !== 'housemaid') return shell('availability', `<div class="empty">${ic('event')}<p>Your schedule is set by your Supervisor or Operations.</p></div>`, { title: 'Availability' });
  const av = db.availability(), days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return db.iso(d); });
  const booked = new Set(db.myJobs().filter(j => j.status !== 'completed').map(j => j.date));
  const open = days.filter(d => (av[d] || 'off') !== 'off').length;
  return shell('availability', `
    <section class="hello"><p class="muted">Customers can book you on the days you mark available. You have <b>${open}</b> open day${open === 1 ? '' : 's'} in the next 2 weeks.</p></section>
    <div class="quick"><button class="btn ghost" id="all-wd">Weekdays: whole day</button><button class="btn ghost" id="all-off">Clear all</button></div>
    <div class="list">${days.map(d => {
      const v = av[d] || 'off', b = booked.has(d), x = new Date(d + 'T00:00');
      return `<div class="card day ${v !== 'off' ? 'open' : ''}"><div class="day-h"><b>${dayName(d)}</b>${['Today', 'Tomorrow'].includes(dayName(d)) ? `<span class="muted">${x.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>` : ''}${b ? '<span class="chip blue">Booked</span>' : ''}</div>
        <div class="av-opts" role="radiogroup" aria-label="Availability on ${d}">${AV.map(([k, l]) => `<button role="radio" aria-checked="${v === k}" class="${v === k ? 'on' : ''}" data-d="${d}" data-v="${k}" ${b && k === 'off' ? 'disabled title="You have a booking this day"' : ''}>${l}</button>`).join('')}</div></div>`;
    }).join('')}</div>`, { title: 'Availability' });
}
function mountAvailability() {
  root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { db.setAvailability(b.dataset.d, b.dataset.v); render(); }));
  root.querySelector('#all-wd')?.addEventListener('click', () => {
    for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() + i); const k = db.iso(d), dow = d.getDay(); if (dow !== 0 && dow !== 6) db.setAvailability(k, 'whole'); }
    toast('Weekdays set to whole day'); render();
  });
  root.querySelector('#all-off')?.addEventListener('click', () => {
    const booked = new Set(db.myJobs().filter(j => j.status !== 'completed').map(j => j.date));
    for (let i = 0; i < 14; i++) { const d = new Date(); d.setDate(d.getDate() + i); const k = db.iso(d); if (!booked.has(k)) db.setAvailability(k, 'off'); }
    render();
  });
}

// ---------- Earnings ----------
function earningsView() {
  const e = db.earnings(), total = e.reduce((s, x) => s + x.amount, 0);
  return shell('earnings', `
    <section class="card earn-total"><p class="label">Completed jobs this pay period</p><p class="amount">${peso(total)}</p><p class="muted">${e.length} job${e.length === 1 ? '' : 's'} · paid out by Finance on the next payout run</p>
      ${db.isDemo ? '<p class="muted small">Demo rates. Real rates come from the Super Admin rate table.</p>' : ''}</section>
    <div class="list">${e.length ? e.map(({ job: j, amount }) => `<a class="card earn" href="#/job/${j.id}"><div><b>${esc(j.title)}</b><p class="muted">${dayName(j.date)} · ${esc(j.id)}</p></div><span class="amt">${peso(amount)}</span></a>`).join('') : `<div class="empty">${ic('payments')}<p>Finish a job to see your earnings here.</p></div>`}</div>`, { title: 'Earnings' });
}

// ---------- Profile ----------
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (location.hash.includes('profile')) render(); });
function profileView() {
  const w = db.me();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return shell('profile', `
    <section class="card prof"><span class="avatar">${esc(w.name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span><div><h2>${esc(w.name)}</h2><p class="muted">+63 ${esc(w.mobile)}</p>
      <p><span class="chip">${db.ROLE_LABEL[w.role]}</span> <span class="chip ${w.level === 'Expert' ? 'blue' : ''}">${ic('workspace_premium', 's16')} ${w.level}</span></p></div></section>
    <section class="card"><p class="label">Service areas</p><ul class="ticks">${w.areas.map(a => `<li>${ic('location_on', 's18')} ${esc(a)}</li>`).join('')}</ul>
      <p class="label">Training completed</p><ul class="ticks">${w.training.map(t => `<li>${ic('school', 's18')} ${esc(t)}</li>`).join('')}</ul>
      <p class="muted small">Your level is updated by your Supervisor after training.</p></section>
    ${standalone ? '' : `<section class="card install"><h3>${ic('install_mobile')} Install the app</h3>
      ${installEvt ? '<p>Add Getklean Work to your home screen for faster access.</p><button class="btn primary block" id="inst">Install</button>'
        : '<p>Open your browser menu and tap <b>Add to Home screen</b> (Android) or <b>Share → Add to Home Screen</b> (iPhone).</p>'}</section>`}
    <section class="card"><a class="row-link" href="tel:+639674753848">${ic('support_agent')} Call Operations <span class="muted">(0967) 475-3848</span></a></section>
    ${db.isDemo ? '<button class="btn ghost block" id="reset">Reset demo data</button>' : ''}
    <button class="btn danger block" id="so-btn">Sign out</button>`, { title: 'Profile' });
}
function mountProfile() {
  root.querySelector('#inst')?.addEventListener('click', async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(); });
  root.querySelector('#reset')?.addEventListener('click', () => { if (confirm('Reset all demo jobs, photos and availability?')) { db.resetDemo(); toast('Demo data reset'); render(); } });
  root.querySelector('#so-btn').addEventListener('click', () => { db.signOut(); go('/login'); });
}

// ---------- Router ----------
function render() {
  const hash = location.hash.replace(/^#/, '') || '/jobs';
  const [, page, arg] = hash.split('/');
  if (!db.me() && page !== 'login') { go('/login'); return; }
  if (db.me() && page === 'login') { go('/jobs'); return; }
  let html, mount;
  switch (page) {
    case 'login': html = loginView(); mount = mountLogin; break;
    case 'job': html = jobView(arg); mount = () => mountJob(arg); break;
    case 'availability': html = availabilityView(); mount = mountAvailability; break;
    case 'earnings': html = earningsView(); break;
    case 'profile': html = profileView(); mount = mountProfile; break;
    default: html = jobsView(); mount = mountJobs;
  }
  if (html == null) { go('/jobs'); return; }
  const y = scrollY, same = render._last === hash; render._last = hash;
  root.innerHTML = html; mount?.();
  scrollTo(0, same ? y : 0);
}
addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
