// Data layer for the Getklean Work app.
// Demo mode keeps everything in this browser (localStorage). Function names match what the
// Supabase version will provide, so the screens don't change when we switch to real data.
import { DEMO } from './config.js';

const K = { session: 'gkw.session', state: 'gkw.state.v2' };
const z = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const day0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = n => { const d = day0(); d.setDate(d.getDate() + n); return iso(d); };
const ago = (days, h = 9) => { const d = day0(); d.setDate(d.getDate() - days); d.setHours(h); return d.toISOString(); };

export const ROLE_LABEL = { housemaid: 'Housemaid', technician: 'Technician', rider: 'Rider', cleaner: 'Cleaner' };
export const UNIT_LABEL = { housemaid: 'Housemaid On-Demand', aircon: 'Aircon Cleaning', deep: 'Deep Cleaning' };

// ---------- Demo people ----------
export const WORKERS = {
  'w-maria': { id: 'w-maria', name: 'Maria Santos', mobile: '9171234501', email: 'maria.santos@example.com', facebook: 'Maria Santos', city: 'Pasig City', role: 'housemaid', level: 'Regular', nextLevel: 'Expert', nextLevelNeeds: 'Requires Expert training', rating: 4.8, jobsDone: 27, points: 3950, pointsWeek: 12, performance: 69, areas: ['Pasig', 'Mandaluyong', 'San Juan'], training: ['Housekeeping basics', 'Childcare safety'] },
  'w-jun': { id: 'w-jun', name: 'Jun Reyes', mobile: '9171234502', email: 'jun.reyes@example.com', facebook: 'Jun Reyes', city: 'Marikina City', role: 'technician', level: 'Expert', nextLevel: null, nextLevelNeeds: '', rating: 4.9, jobsDone: 214, points: 8120, pointsWeek: 40, performance: 91, areas: ['East Area: Pasig, Marikina, Cainta'], training: ['Split-type service', 'Cassette units', 'Refrigerant handling'] },
  'w-paolo': { id: 'w-paolo', name: 'Paolo Cruz', mobile: '9171234503', email: 'paolo.cruz@example.com', facebook: 'Paolo Cruz', city: 'Cainta, Rizal', role: 'rider', level: 'Regular', nextLevel: null, nextLevelNeeds: '', rating: 4.7, jobsDone: 96, points: 2310, pointsWeek: 30, performance: 84, areas: ['East Area: Pasig, Marikina, Cainta'], training: ['Rider orientation', 'Ladder and safety'] },
  'w-liza': { id: 'w-liza', name: 'Liza Mendoza', mobile: '9171234504', email: 'liza.mendoza@example.com', facebook: 'Liza Mendoza', city: 'Makati City', role: 'cleaner', level: 'Regular', nextLevel: 'Expert', nextLevelNeeds: 'Requires Expert deep-cleaning training', rating: 4.6, jobsDone: 58, points: 1480, pointsWeek: 18, performance: 77, areas: ['Makati', 'Taguig', 'Pasay'], training: ['Deep cleaning basics', 'Chemical safety'] },
};

// Earnings per worker on a job. Demo figures; real ones come from the Super Admin rate table.
const E = (share, transport = 0, company = 0, points = 0, reason = '', payout = 'pending', n = 0) =>
  ({ share, transport, company, points, pointsReason: reason, payout, receipt: `ER26-${String(200 + n).padStart(5, '0')}`, earningId: 40 + n });

function seed() {
  return {
    jobs: [
      { id: 'HM26-00221', unit: 'housemaid', type: 'Regular', date: addDays(0), start: '09:00', end: '17:00', title: 'Whole day housemaid',
        client: 'Ana Villanueva', address: 'Unit 12B, The Grove Tower 1, C5 Road, Ugong, Pasig City', landmark: 'Beside SM Hypermarket C5', lat: 14.5794, lon: 121.0786,
        tasks: ['Housekeeping', 'Laundry', 'Kitchen care'], notes: 'Two small dogs, friendly. Gate code 2408. Please iron the school uniforms first.',
        payment: { type: 'online', method: 'GCash', amount: 1200, status: 'paid' }, team: ['w-maria'], status: 'upcoming',
        earn: { 'w-maria': E(750, 52, 0, 20, 'Completed booking', 'pending', 21) } },
      { id: 'HM26-00225', unit: 'housemaid', type: 'Trial', date: addDays(1), start: '08:00', end: '12:00', title: 'Half day housemaid',
        client: 'Rico Bautista', address: '45 Mahogany St., Valle Verde 2, Pasig City', landmark: 'Near Valle Verde Country Club', lat: 14.5878, lon: 121.0712,
        tasks: ['All-around help'], notes: 'Cash payment on the day.', payment: { type: 'cod', method: 'Cash', amount: 510, status: 'due' }, team: ['w-maria'], status: 'upcoming',
        earn: { 'w-maria': E(510, 52, 0, 150, 'Trial booking bonus', 'pending', 25) } },
      { id: 'HM26-00230', unit: 'housemaid', type: 'Flexi', date: addDays(3), start: '09:00', end: '17:00', title: 'Whole day housemaid',
        client: 'Bea Gonzales', address: 'Tower 3, Kapitolyo Residences, Pasig City', landmark: 'Across Brgy. Kapitolyo hall', lat: 14.5702, lon: 121.0617,
        tasks: ['Housekeeping', 'Cooking'], notes: '', payment: { type: 'online', method: 'Card', amount: 715, status: 'paid' }, team: ['w-maria'], status: 'upcoming',
        earn: { 'w-maria': E(715, 52, 0, 20, 'Completed booking', 'pending', 30) } },
      { id: 'HM26-00214', unit: 'housemaid', type: 'Trial', date: addDays(-5), start: '08:00', end: '16:00', title: 'Whole day housemaid',
        client: 'Vella Dalipe', address: 'Unit 804 Quadrillion Mansion, M. Paterno St., San Juan City', landmark: '', lat: 14.6019, lon: 121.0355,
        tasks: ['Housekeeping'], notes: '', payment: { type: 'cod', method: 'Cash', amount: 650, status: 'verified' }, team: ['w-maria'], status: 'completed',
        checkIn: { at: ago(5, 8) }, checkOut: { at: ago(5, 16) }, earn: { 'w-maria': E(650, 52, 0, 150, 'Trial booking bonus', 'claimed', 14) } },
      { id: 'HM26-00213', unit: 'housemaid', type: 'Regular', date: addDays(-6), start: '08:00', end: '16:00', title: 'Whole day housemaid',
        client: 'Vella Dalipe', address: 'Unit 804 Quadrillion Mansion, M. Paterno St., San Juan City', landmark: '', lat: 14.6019, lon: 121.0355,
        tasks: ['Housekeeping', 'Laundry'], notes: '', payment: { type: 'online', method: 'GCash', amount: 1200, status: 'paid' }, team: ['w-maria'], status: 'completed',
        checkIn: { at: ago(6, 8) }, checkOut: { at: ago(6, 16) }, earn: { 'w-maria': E(850, 52, 0, 150, 'Five-star rating bonus', 'released', 13) } },
      { id: 'HM26-00212', unit: 'housemaid', type: 'Regular', date: addDays(-1), start: '08:00', end: '16:00', title: 'Whole day housemaid',
        client: 'Vella Dalipe', address: 'Unit 804 Quadrillion Mansion, M. Paterno St., San Juan City', landmark: '', lat: 14.6019, lon: 121.0355,
        tasks: ['Housekeeping'], notes: '', payment: { type: 'cod', method: 'Cash', amount: 1200, status: 'proof_uploaded' }, team: ['w-maria'], status: 'for_review',
        checkIn: { at: ago(1, 8) }, checkOut: { at: ago(1, 16) }, earn: { 'w-maria': E(650, 52, 0, 150, 'Completed booking', 'pending', 12) } },
      { id: 'AC26-01002', unit: 'aircon', type: 'Regular', date: addDays(0), start: '10:00', end: '13:00', title: 'Aircon cleaning · 4 units',
        client: 'Carlo Mendoza', address: '12 Sampaguita St., Marikina Heights, Marikina City', landmark: 'Green gate, near the chapel', lat: 14.6507, lon: 121.1029,
        units: [{ id: 'u1', type: 'Split type', room: 'Master bedroom' }, { id: 'u2', type: 'Split type', room: 'Kids room' }, { id: 'u3', type: 'Split type', room: 'Living room' }, { id: 'u4', type: 'Window type', room: 'Guest room' }],
        notes: 'Customer says the living room unit drips water.', payment: { type: 'cod', method: 'Cash', amount: 5770, status: 'due' },
        team: ['w-jun', 'w-paolo'], status: 'upcoming', earn: { 'w-jun': E(1400, 80, 0, 40, 'Completed booking', 'pending', 2), 'w-paolo': E(600, 80, 0, 30, 'Completed booking', 'pending', 3) } },
      { id: 'AC26-01007', unit: 'aircon', type: 'Regular', date: addDays(0), start: '14:30', end: '16:00', title: 'Aircon cleaning · 1 unit',
        client: 'Joy Ramos', address: 'Blk 4 Lot 9, Greenland Executive Village, Cainta, Rizal', landmark: '', lat: 14.5874, lon: 121.1146,
        units: [{ id: 'u1', type: 'Floor mounted', room: 'Sala' }], notes: '', payment: { type: 'online', method: 'Maya', amount: 3100, status: 'paid' },
        team: ['w-jun', 'w-paolo'], status: 'upcoming', earn: { 'w-jun': E(800, 80, 0, 20, 'Completed booking', 'pending', 7), 'w-paolo': E(350, 80, 0, 15, 'Completed booking', 'pending', 8) } },
      { id: 'DC26-00211', unit: 'deep', type: 'Regular', date: addDays(0), start: '08:00', end: '14:00', title: 'Office deep cleaning · 120 sqm',
        client: 'Northwind Trading (Mr. Lim)', address: '18F Alphaland Tower, Ayala Ave., Makati City', landmark: 'Use the service elevator at the back', lat: 14.5573, lon: 121.0244,
        scope: ['Lobby', 'Working areas and cubicles', 'Restrooms', 'Office pantry', 'Conference rooms'], notes: 'Register at the lobby with a valid ID. Crew lead: Liza.',
        payment: { type: 'online', method: 'Card', amount: 11880, status: 'paid' }, team: ['w-liza', 'Rosa Lim (Cleaner)', 'Ben Ocampo (Cleaner)'], lead: 'w-liza', status: 'upcoming',
        earn: { 'w-liza': E(900, 60, 0, 30, 'Crew lead bonus', 'pending', 11) } },
      { id: 'DC26-00188', unit: 'deep', type: 'Regular', date: addDays(-2), start: '09:00', end: '13:00', title: 'Airbnb turnover · 1BR',
        client: 'Kim Navarro', address: 'Unit 2210, Air Residences, Makati City', landmark: '', lat: 14.5643, lon: 121.0166,
        scope: ['Check-out cleaning', 'Laundry', 'Room quality check'], notes: '', payment: { type: 'online', method: 'GCash', amount: 800, status: 'paid' },
        team: ['w-liza'], lead: 'w-liza', status: 'completed', checkIn: { at: ago(2, 9) }, checkOut: { at: ago(2, 13) }, earn: { 'w-liza': E(450, 60, 0, 20, 'Completed booking', 'released', 9) } },
    ],
    photos: {},
    availability: {},
    notifications: [
      { id: 'n1', to: 'w-maria', kind: 'payout', title: 'Payout Update', body: 'Your payout status for booking HM26-00213 is now RELEASED.', at: ago(5, 10), high: true, read: false, link: '#/earning/HM26-00213' },
      { id: 'n2', to: 'w-maria', kind: 'booking', title: 'New Booking Assigned', body: `You have a new booking HM26-00225 on ${addDays(1)}.`, at: ago(1, 18), high: true, read: false, link: '#/job/HM26-00225' },
      { id: 'n3', to: 'w-maria', kind: 'action', title: 'Action Required: Acknowledge Payout', body: 'Friendly reminder: Please acknowledge receipt of your payout for booking HM26-00213 in your earnings tab.', at: ago(4, 9), high: true, read: false, link: '#/earning/HM26-00213' },
      { id: 'n4', to: 'w-maria', kind: 'booking', title: 'New Booking Assigned', body: `You have a new booking HM26-00221 on ${addDays(0)}.`, at: ago(2, 15), high: false, read: true, link: '#/job/HM26-00221' },
      { id: 'n5', to: 'w-jun', kind: 'booking', title: 'New Booking Assigned', body: 'You and Paolo Cruz have booking AC26-01002 today, 4 units.', at: ago(1, 17), high: true, read: false, link: '#/job/AC26-01002' },
      { id: 'n6', to: 'w-paolo', kind: 'booking', title: 'New Booking Assigned', body: 'You are teamed with Jun Reyes on AC26-01002 today.', at: ago(1, 17), high: true, read: false, link: '#/job/AC26-01002' },
      { id: 'n7', to: 'w-liza', kind: 'booking', title: 'Crew Assignment', body: 'Your Supervisor assigned you as crew lead for DC26-00211 today.', at: ago(1, 16), high: true, read: false, link: '#/job/DC26-00211' },
      { id: 'n8', to: 'w-liza', kind: 'action', title: 'Action Required: Acknowledge Payout', body: 'Please acknowledge receipt of your payout for booking DC26-00188.', at: ago(0, 8), high: true, read: false, link: '#/earning/DC26-00188' },
    ],
  };
}

let state = load();
function load() { try { return JSON.parse(localStorage.getItem(K.state)) || seed(); } catch { return seed(); } }
function save() { try { localStorage.setItem(K.state, JSON.stringify(state)); return true; } catch { return false; } }
export function resetDemo() { state = seed(); save(); }

// ---------- Session ----------
export function session() { try { return JSON.parse(localStorage.getItem(K.session)); } catch { return null; } }
export function me() { const s = session(); return s ? WORKERS[s.workerId] : null; }
function startSession(w) { try { localStorage.setItem(K.session, JSON.stringify({ workerId: w.id, at: Date.now() })); } catch {} return w; }
export async function signInDemo(workerId) { return startSession(WORKERS[workerId]); }
export async function sendOtp(mobile) {
  if (!Object.values(WORKERS).some(x => x.mobile === mobile)) throw new Error('This number isn’t registered as a Getklean worker. Ask Operations to add you.');
  return true;
}
export async function verifyOtp(mobile, code) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.');
  return startSession(Object.values(WORKERS).find(x => x.mobile === mobile));
}
export function signOut() { try { localStorage.removeItem(K.session); } catch {} }

// ---------- Jobs ----------
export function myJobs() {
  const w = me(); if (!w) return [];
  return state.jobs.filter(j => j.team.includes(w.id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
export const job = id => state.jobs.find(j => j.id === id);
export const teammates = j => j.team.map(t => WORKERS[t] ? `${WORKERS[t].name} (${ROLE_LABEL[WORKERS[t].role]})` : t);
export const photos = jobId => state.photos[jobId] || [];
export function addPhoto(jobId, p) {
  (state.photos[jobId] ||= []).push({ id: Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), ...p });
  if (!save()) { state.photos[jobId].pop(); throw new Error('This phone is out of space for photos. Delete some and try again.'); }
}
export function removePhoto(jobId, id) { state.photos[jobId] = photos(jobId).filter(p => p.id !== id); save(); }
export function checkIn(jobId, loc) { const j = job(jobId); j.status = 'in_progress'; j.checkIn = { at: new Date().toISOString(), ...loc }; save(); }
// After check-out a job waits "For Review" until Operations / Finance verify it (photos, cash proof).
export function checkOut(jobId, extra = {}) {
  const j = job(jobId); j.status = 'for_review'; j.checkOut = { at: new Date().toISOString(), ...extra };
  if (j.payment.type === 'cod') j.payment.status = 'proof_uploaded';
  save();
}

// ---------- Availability (housemaids) ----------
export function availability() { const w = me(); return (state.availability[w.id] ||= {}); }
export function setAvailability(date, value) { availability()[date] = value; save(); }

// ---------- Earnings ----------
export const net = e => e.share - e.company;   // as in the current app: total = your share; transport shown on its own line
export function earnings() {
  const w = me();
  return myJobs().filter(j => ['for_review', 'completed'].includes(j.status) && j.earn?.[w.id]).map(j => ({ job: j, e: j.earn[w.id] })).reverse();
}
export function acknowledgePayout(jobId) {
  const w = me(), j = job(jobId); j.earn[w.id].payout = 'claimed';
  state.notifications.forEach(n => { if (n.to === w.id && n.kind === 'action' && n.link.endsWith(jobId)) n.read = true; });
  save();
}

// ---------- Notifications ----------
export function notifications() { const w = me(); return state.notifications.filter(n => n.to === w.id).sort((a, b) => b.at.localeCompare(a.at)); }
export const unread = () => notifications().filter(n => !n.read).length;
export function markRead(id) { const n = state.notifications.find(x => x.id === id); if (n) { n.read = true; save(); } }
export function markAllRead() { notifications().forEach(n => { n.read = true; }); save(); }

export const isDemo = DEMO;
