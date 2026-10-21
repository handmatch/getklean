// Shared UI building blocks (MUI-style components from the Getklean design system).
import { booking, user, fmt, dayLabel, endTime, durationLabel, durationDetail, visitPrice, planFee, total, php, PLANS, HOUSEMAIDS, isWeekend } from './state.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (name, cls = '') => `<span class="ic ${cls}" aria-hidden="true">${name}</span>`;

// Images from the design live in /assets. Until a file is present, show a styled fallback.
export const img = (src, alt, cls = '', fallback = '') =>
  `<img src="${src}" alt="${esc(alt)}" class="${cls}" loading="lazy" onerror="this.outerHTML=this.dataset.fb||''" data-fb="${esc(fallback)}">`;

export const logo = (variant = 'blue') => img(
  variant === 'white' ? 'assets/logo-white.svg' : 'assets/logo.svg', 'GetKlean',
  '', `<span class="wordmark">GET<b>KLEAN</b></span>`);

// ---------- Nav (same header as the main site) ----------
const HOTLINES = [['Housemaid', '(0967) 475-3848', '+639674753848'], ['Aircon', '(0931) 728-8845', '+639317288845'], ['Deep cleaning', '(0967) 475-3848', '+639674753848']];
export function nav() {
  const u = user();
  return `<div class="gk-hot" role="region" aria-label="Hotlines"><div class="gk-wrap gk-hot-in">
      <span class="gk-hot-lbl">${icon('call', 'fill')}Hotlines</span>
      ${HOTLINES.map(([l, n, t]) => `<span>${l} <a href="tel:${t}">${n}</a></span>`).join('')}
      <a class="gk-hot-mail" href="mailto:sales@getkleanph.com">sales@getkleanph.com</a>
    </div></div>
    <header class="gk-top" id="nav"><div class="gk-wrap gk-top-in">
      <a class="gk-brand" href="../" aria-label="Getklean home"><img src="assets/logo-white.svg" alt="Getklean · Your space, reclaimed" width="192" height="41"></a>
      <button class="gk-menu-btn" aria-label="Menu" aria-expanded="false" data-action="menu">${icon('menu')}</button>
      <nav class="gk-menu" aria-label="Main">
        <div class="gk-dd">
          <button class="gk-dd-btn" type="button" aria-expanded="false" data-action="dd">Services ${icon('expand_more')}</button>
          <div class="gk-dd-menu">
            <a href="#/book/when" class="active">${icon('cleaning_services')}<span><b>Housemaid On-Demand</b><small>Half or whole day, from PHP510</small></span></a>
            <a href="../#book-aircon">${icon('ac_unit')}<span><b>Aircon Cleaning</b><small>All unit types, from PHP970</small></span></a>
            <a href="../#book-deep">${icon('sanitizer')}<span><b>Deep Cleaning</b><small>Offices, restaurants, Airbnbs</small></span></a>
          </div>
        </div>
        <a href="../about">About</a>
        ${u ? `<a href="#/">My bookings</a>` : ''}
        ${u ? `<button class="gk-avatar" title="${esc(u.name)} · Sign out" data-action="signout">${esc(initials(u.name))}</button>`
            : `<a class="gk-btn ghost" href="#/sign-in">Sign in</a>`}
        <a class="gk-btn yellow" href="#/book/when">Book now</a>
      </nav>
    </div></header>`;
}
export const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

// ---------- Footer (same as the main site) ----------
export function footer() {
  return `<footer class="gk-foot"><div class="gk-wrap gk-foot-in">
      <div class="gk-foot-brand">
        <img src="assets/logo-yellow.svg" alt="Getklean" width="192" height="41">
        <p>Housemaids, aircon cleaning and deep cleaning for homes and businesses. Unit 804 Quadrillion Mansion, M. Paterno St., San Juan, Metro Manila.</p>
        <a class="gk-btn yellow" href="https://m.me/getklean.housemaids" target="_blank" rel="noopener">${icon('chat')} Chat on Messenger</a>
      </div>
      <nav aria-label="Services"><p>Services</p><a href="#/book/when">Housemaid On-Demand</a><a href="../#book-aircon">Aircon Cleaning</a><a href="../#book-deep">Deep Cleaning</a><a href="#/book/plan">Flexi Plans</a><a href="../about">About Getklean</a></nav>
      <nav aria-label="Follow us"><p>Follow us</p><a href="https://www.facebook.com/getklean.housemaids" target="_blank" rel="noopener">Facebook · Housemaids</a><a href="https://www.facebook.com/getkleanaircon" target="_blank" rel="noopener">Facebook · Aircon</a><a href="https://www.facebook.com/getkleanhomecleaning" target="_blank" rel="noopener">Facebook · Deep Cleaning</a><a href="https://www.instagram.com/getkleanofficial" target="_blank" rel="noopener">Instagram</a><a href="https://www.tiktok.com/@getkleanofficial" target="_blank" rel="noopener">TikTok</a></nav>
      <div class="gk-foot-hot"><p>Hotlines</p>
        <a href="tel:+639674753848"><small>Housemaid On-Demand</small>(0967) 475-3848</a>
        <a href="tel:+639317288845"><small>Aircon Cleaning</small>(0931) 728-8845</a>
        <a href="tel:+639674753848"><small>Deep &amp; Professional Cleaning</small>(0967) 475-3848</a>
        <a href="mailto:sales@getkleanph.com"><small>Email</small>sales@getkleanph.com</a>
      </div>
    </div>
    <div class="gk-wrap gk-legal">© ${new Date().getFullYear()} GetKleanPH. All rights reserved.</div>
  </footer>`;
}

// ---------- Stepper ----------
export const STEPS = ['When', 'Where', 'Select service', 'Sign-in', 'Select housemaid', 'Select plan', 'Review and pay', 'Booked'];
export const STEP_ROUTES = ['when', 'where', 'service', 'sign-in', 'housemaid', 'plan', 'review', 'booked'];
export function stepper(current) { // current: 1-based
  return `<div class="stepper" aria-label="Booking progress">${STEPS.map((s, i) => {
    const n = i + 1, done = n < current, on = n === current;
    const step = `<${done ? `a href="#/book/${STEP_ROUTES[i]}"` : 'div'} class="step ${done ? 'done' : ''} ${on ? 'on' : ''}" ${on ? 'aria-current="step"' : ''}>
      <span class="num">${done ? icon('check') : n}</span><span class="lbl">${s}</span></${done ? 'a' : 'div'}>`;
    return step + (n < STEPS.length ? '<span class="connector"></span>' : '');
  }).join('')}</div>`;
}

// ---------- Form controls ----------
export function radioCard({ name, value, checked, label, caption = '', iconName = '', badge = '', extra = '', cls = '' }) {
  return `<label class="radio-card ${checked ? 'checked' : ''} ${cls}">
    <input type="radio" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}>
    ${iconName ? `<span class="rc-icon">${icon(iconName, 's20')}</span>` : ''}
    <span class="rc-text">
      <span class="rc-label">${label}${badge}</span>
      ${caption ? `<span class="rc-caption">${caption}</span>` : ''}
      ${extra}
    </span>
    <span class="radio-dot" aria-hidden="true"></span>
  </label>`;
}
export function checkCard({ name, value, checked, label, caption = '', iconName = '', fill = false }) {
  return `<label class="radio-card check-card ${checked ? 'checked' : ''}">
    <input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}>
    ${iconName ? `<span class="rc-icon">${icon(iconName, 's20' + (fill ? ' fill' : ''))}</span>` : ''}
    <span class="rc-text"><span class="rc-label">${label}</span>${caption ? `<span class="rc-caption">${caption}</span>` : ''}</span>
    <span class="check-box" aria-hidden="true">${icon('check')}</span>
  </label>`;
}
export function textField({ id, label, value = '', type = 'text', helper = '', error = '', start = '', end = '', required = false, attrs = '', multiline = false }) {
  const control = multiline
    ? `<textarea id="${id}" name="${id}" placeholder=" " ${attrs}>${esc(value)}</textarea>`
    : `<input id="${id}" name="${id}" type="${type}" value="${esc(value)}" placeholder=" " ${required ? 'required' : ''} ${attrs}>`;
  return `<div class="tf ${error ? 'err' : ''} ${start ? 'has-start' : ''} ${multiline ? 'multi' : ''}">
    <div class="tf-box">${start ? `<span class="tf-start">${start}</span>` : ''}${control}<label for="${id}">${label}</label>${end ? `<span class="tf-end">${end}</span>` : ''}</div>
    ${error ? `<p class="tf-help err">${error}</p>` : helper ? `<p class="tf-help">${helper}</p>` : ''}
  </div>`;
}
export function selectField({ id, label, value = '', options = [], placeholder = '' }) {
  return `<div class="tf select ${value ? '' : 'empty'}">
    <div class="tf-box">
      <select id="${id}" name="${id}">${placeholder ? `<option value="" ${value ? '' : 'selected'} disabled hidden></option>` : ''}${options.map(o => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`;
      }).join('')}</select>
      <label for="${id}">${label}</label><span class="tf-end">${icon('arrow_drop_down')}</span>
    </div>
  </div>`;
}
export const chip = (label, on, attrs = '') => `<button type="button" class="chip ${on ? 'on' : ''}" aria-pressed="${!!on}" ${attrs}>${esc(label)}</button>`;
export const tag = (label, kind = 'default') => `<span class="tag ${kind}">${esc(label)}</span>`;
export const dot = () => '<span class="dot-sep" aria-hidden="true"></span>';

export function actions({ back = null, next = 'Continue', disabled = false, nextIcon = true, nextId = 'next' }) {
  return `<div class="actions">
    ${back ? `<a class="btn outlined lg" href="${back}">Back</a>` : `<span class="btn outlined lg spacer" aria-hidden="true">Back</span>`}
    <button class="btn contained lg" id="${nextId}" type="submit" ${disabled ? 'disabled' : ''}>${next}${nextIcon ? icon('arrow_forward', 's20') : ''}</button>
  </div>`;
}

// ---------- Booking summary ("Your booking") ----------
export function summary() {
  const s = booking();
  const rows = [];
  const row = (ic, k, v, sub = '', big = false) => rows.push(`<div class="sum-row"><span class="bubble">${icon(ic)}</span><div class="t"><p class="k ${big ? 'lg' : ''}">${k}</p><div class="v">${v}</div>${sub ? `<p class="sub">${sub}</p>` : ''}</div></div>`);
  row('cleaning_services', 'Service', 'Housemaid On Demand', '', true);
  if (s.date) {
    const v = s.when === 'later' && s.type === 'recurring'
      ? `${esc(s.frequency)}${s.days.length ? dot() + s.days.join(', ') : ''}`
      : `${dayLabel(s.date)}${dot()}${fmt.med(s.date)}`;
    row('event', 'Date', v, s.when === 'later' && s.type === 'recurring' && s.endDate ? `${fmt.med(s.date)} – ${fmt.med(s.endDate)}` : '');
  }
  if (s.time) row('schedule', 'Time', `${durationLabel(s.duration)}${dot()}${s.time} - ${endTime(s.time, s.duration)}`, durationDetail(s.duration));
  if (s.address) s.address.label ? row('location_on', 'Service Address', esc(s.address.label), esc(addressLine(s.address))) : row('location_on', 'Service Area', esc(addressLine(s.address)));
  if (s.housemaid) {
    const h = HOUSEMAIDS.find(x => x.id === s.housemaid);
    if (h) row('woman', 'Preferred Housemaid', `${esc(shortName(h.name))}${dot()}${icon('star', 's15 fill star')} ${h.rating}${dot()}<span class="lnk">${h.booked ? h.booked + ' booking' + (h.booked > 1 ? 's' : '') + ' with you' : 'New to you'}</span>`);
  }
  let breakdown = '';
  if (s.plan && s.time) {
    const vp = visitPrice(s); const fee = planFee(s); const day = s.date && isWeekend(s.date) ? 'Weekend' : 'Weekday';
    breakdown = `<div class="breakdown">
      <div class="price-line"><span class="lbl">${durationLabel(s.duration)}${dot()}${s.plan === 'trial' ? 'First booking promo' : fee ? `${day} Member Rate` : `${day} rate`}</span><span>${vp.price !== vp.regular ? `<span class="was">${php(vp.regular)}</span>` : ''}${php(vp.price)}</span></div>
      <div class="price-line"><span class="lbl">Insurance, up to PHP 20,000</span><span class="free">Free</span></div>
      ${fee ? `<div class="price-line"><span class="lbl">${esc(PLANS[s.plan].name)} (one-off)</span><span>${PLANS[s.plan].was ? `<span class="was">${php(PLANS[s.plan].was)}</span>` : ''}${php(fee)}</span></div>` : ''}
    </div>
    <div class="total"><span class="body1">Total to pay</span><span class="amt">${php(total(s))}</span></div>
    ${fee ? `<p class="caption muted">Your membership is charged once today and is valid for ${PLANS[s.plan].months} month${PLANS[s.plan].months > 1 ? 's' : ''}. You can extend or upgrade your membership anytime.</p>` : ''}`;
  }
  return `<aside class="summary" aria-label="Your booking"><h2 class="h6">Your booking</h2><div class="sum-rows">${rows.join('')}</div>${breakdown}
    <a class="sum-help" href="tel:+639674753848">${icon('call', 's20 fill')}<span>Need help booking? Call <b>(0967) 475-3848</b></span></a></aside>`;
}
export const shortName = n => { const p = n.split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : n; };
export function addressLine(a) {
  if (!a) return '';
  if (a.line) return a.line;
  return [a.unit, a.building, a.street, a.city].filter(Boolean).join(', ') || a.search || '';
}

// ---------- Page shells ----------
export function bookingPage({ step, title, subtitle = '', body, aside = summary() }) {
  return `<div class="page">${nav()}${stepper(step)}
    <main>
      <div class="wrap book-head"><h1 class="h4">${title}</h1>${subtitle ? `<p class="body1">${subtitle}</p>` : ''}</div>
      <div class="wrap book-body"><div class="book-main">${body}</div><div class="book-side">${aside}</div></div>
    </main>${footer()}</div>`;
}

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
