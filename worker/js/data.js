// Data layer for the worker app.
// Demo mode keeps everything in this browser (localStorage). The function names match
// what the Supabase version will provide, so the screens don't change when we switch.
import { DEMO } from './config.js';

const K = { session: 'gkw.session', state: 'gkw.state.v1' };
const z = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addDays = (n) => { const d = today(); d.setDate(d.getDate() + n); return iso(d); };

// ---------- Demo people ----------
// Demo pay rates are placeholders until Super Admin sets the real table.
export const WORKERS = {
  'w-maria': { id: 'w-maria', name: 'Maria Santos', mobile: '9171234501', role: 'housemaid', level: 'Expert', areas: ['Pasig', 'Mandaluyong', 'San Juan'], training: ['Housekeeping basics', 'Expert housekeeping', 'Childcare safety'] },
  'w-jun': { id: 'w-jun', name: 'Jun Reyes', mobile: '9171234502', role: 'technician', level: 'Expert', areas: ['East Area: Pasig, Marikina, Cainta'], training: ['Split-type service', 'Cassette units', 'Refrigerant handling'] },
  'w-paolo': { id: 'w-paolo', name: 'Paolo Cruz', mobile: '9171234503', role: 'rider', level: 'Regular', areas: ['East Area: Pasig, Marikina, Cainta'], training: ['Rider orientation', 'Ladder and safety'] },
  'w-liza': { id: 'w-liza', name: 'Liza Mendoza', mobile: '9171234504', role: 'cleaner', level: 'Regular', areas: ['Makati', 'Taguig', 'Pasay'], training: ['Deep cleaning basics', 'Chemical safety'] },
};
export const ROLE_LABEL = { housemaid: 'Housemaid', technician: 'Technician', rider: 'Rider', cleaner: 'Cleaner' };
export const UNIT_LABEL = { housemaid: 'Housemaid On-Demand', aircon: 'Aircon Cleaning', deep: 'Deep Cleaning' };

function seed() {
  return {
    jobs: [
      { id: 'J-24081', unit: 'housemaid', date: addDays(0), start: '09:00', end: '17:00', title: 'Whole day housemaid',
        customer: 'Ana', address: 'Unit 12B, The Grove Tower 1, C5 Road, Ugong, Pasig', landmark: 'Beside SM Hypermarket C5', lat: 14.5794, lon: 121.0786,
        tasks: ['Housekeeping', 'Laundry', 'Kitchen care'], notes: 'Two small dogs, friendly. Gate code 2408. Please iron the school uniforms first.',
        payment: { type: 'online', amount: 1200, status: 'paid' }, team: ['w-maria'], status: 'scheduled', earnings: { 'w-maria': 750 } },
      { id: 'J-24095', unit: 'housemaid', date: addDays(1), start: '08:00', end: '12:00', title: 'Half day housemaid',
        customer: 'Rico', address: '45 Mahogany St., Valle Verde 2, Pasig', landmark: 'Near Valle Verde Country Club', lat: 14.5878, lon: 121.0712,
        tasks: ['All-around help'], notes: 'Cash payment on the day.',
        payment: { type: 'cod', amount: 900, status: 'due' }, team: ['w-maria'], status: 'scheduled', earnings: { 'w-maria': 450 } },
      { id: 'J-24110', unit: 'housemaid', date: addDays(3), start: '09:00', end: '17:00', title: 'Whole day housemaid',
        customer: 'Bea', address: 'Tower 3, Kapitolyo Residences, Pasig', landmark: 'Across Brgy. Kapitolyo hall', lat: 14.5702, lon: 121.0617,
        tasks: ['Housekeeping', 'Cooking'], notes: '', payment: { type: 'online', amount: 1390, status: 'paid' }, team: ['w-maria'], status: 'scheduled', earnings: { 'w-maria': 800 } },
      { id: 'J-31002', unit: 'aircon', date: addDays(0), start: '10:00', end: '13:00', title: 'Aircon cleaning · 4 units',
        customer: 'Carlo', address: '12 Sampaguita St., Marikina Heights, Marikina', landmark: 'Green gate, near the chapel', lat: 14.6507, lon: 121.1029,
        units: [{ id: 'u1', type: 'Split type', room: 'Master bedroom' }, { id: 'u2', type: 'Split type', room: 'Kids room' }, { id: 'u3', type: 'Split type', room: 'Living room' }, { id: 'u4', type: 'Window type', room: 'Guest room' }],
        notes: 'Customer says the living room unit drips water.', payment: { type: 'cod', amount: 5770, status: 'due' },
        team: ['w-jun', 'w-paolo'], status: 'scheduled', earnings: { 'w-jun': 1400, 'w-paolo': 600 } },
      { id: 'J-31007', unit: 'aircon', date: addDays(0), start: '14:30', end: '16:00', title: 'Aircon cleaning · 1 unit',
        customer: 'Joy', address: 'Blk 4 Lot 9, Greenland Executive Village, Cainta, Rizal', landmark: '', lat: 14.5874, lon: 121.1146,
        units: [{ id: 'u1', type: 'Floor mounted', room: 'Sala' }], notes: '', payment: { type: 'online', amount: 3100, status: 'paid' },
        team: ['w-jun', 'w-paolo'], status: 'scheduled', earnings: { 'w-jun': 800, 'w-paolo': 350 } },
      { id: 'D-50211', unit: 'deep', date: addDays(0), start: '08:00', end: '14:00', title: 'Office deep cleaning · 120 sqm',
        customer: 'Northwind Trading (site contact: Mr. Lim)', address: '18F Alphaland Tower, Ayala Ave., Makati', landmark: 'Use the service elevator at the back', lat: 14.5573, lon: 121.0244,
        scope: ['Lobby', 'Working areas and cubicles', 'Restrooms', 'Office pantry', 'Conference rooms'], notes: 'Register at the lobby with a valid ID. Crew lead: Liza.',
        payment: { type: 'online', amount: 11880, status: 'paid' }, team: ['w-liza', 'Rosa Lim (Cleaner)', 'Ben Ocampo (Cleaner)'], lead: 'w-liza', status: 'scheduled', earnings: { 'w-liza': 900 } },
      { id: 'D-50188', unit: 'deep', date: addDays(-2), start: '09:00', end: '13:00', title: 'Airbnb turnover · 1BR',
        customer: 'Kim', address: 'Unit 2210, Air Residences, Makati', landmark: '', lat: 14.5643, lon: 121.0166,
        scope: ['Check-out cleaning', 'Laundry', 'Room quality check'], notes: '', payment: { type: 'online', amount: 800, status: 'paid' },
        team: ['w-liza'], lead: 'w-liza', status: 'completed', checkIn: { at: addDays(-2) + 'T08:55' }, checkOut: { at: addDays(-2) + 'T12:40' }, earnings: { 'w-liza': 450 } },
      { id: 'J-23990', unit: 'housemaid', date: addDays(-1), start: '09:00', end: '17:00', title: 'Whole day housemaid',
        customer: 'Lea', address: 'San Antonio Village, Pasig', landmark: '', lat: 14.5815, lon: 121.0601, tasks: ['Housekeeping'], notes: '',
        payment: { type: 'online', amount: 1200, status: 'paid' }, team: ['w-maria'], status: 'completed', checkIn: { at: addDays(-1) + 'T08:52' }, checkOut: { at: addDays(-1) + 'T17:03' }, earnings: { 'w-maria': 750 } },
    ],
    photos: {},        // jobId -> [{id, kind:'before'|'after'|'cash', unitId?, data, at}]
    availability: {},  // workerId -> { 'YYYY-MM-DD': 'whole'|'am'|'pm'|'off' }
  };
}

let state = load();
function load() { try { return JSON.parse(localStorage.getItem(K.state)) || seed(); } catch { return seed(); } }
function save() { try { localStorage.setItem(K.state, JSON.stringify(state)); return true; } catch { return false; } }
export function resetDemo() { state = seed(); save(); }

// ---------- Session ----------
export function session() { try { return JSON.parse(localStorage.getItem(K.session)); } catch { return null; } }
export function me() { const s = session(); return s ? WORKERS[s.workerId] : null; }
export async function sendOtp(mobile) {
  const w = Object.values(WORKERS).find(x => x.mobile === mobile);
  if (!w) throw new Error('This number isn’t registered as a Getklean worker. Ask Operations to add you.');
  return true;
}
export async function verifyOtp(mobile, code) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code.');
  const w = Object.values(WORKERS).find(x => x.mobile === mobile);
  try { localStorage.setItem(K.session, JSON.stringify({ workerId: w.id, at: Date.now() })); } catch {}
  return w;
}
export function signOut() { try { localStorage.removeItem(K.session); } catch {} }

// ---------- Jobs ----------
export function myJobs() {
  const w = me(); if (!w) return [];
  return state.jobs.filter(j => j.team.includes(w.id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
export const job = id => state.jobs.find(j => j.id === id);
export const teammates = j => j.team.map(t => WORKERS[t] ? `${WORKERS[t].name} (${ROLE_LABEL[WORKERS[t].role]})` : t);
export function photos(jobId) { return state.photos[jobId] || []; }
export function addPhoto(jobId, p) {
  (state.photos[jobId] ||= []).push({ id: Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), ...p });
  if (!save()) { state.photos[jobId].pop(); throw new Error('This phone is out of space for photos. Delete some and try again.'); }
}
export function removePhoto(jobId, id) { state.photos[jobId] = photos(jobId).filter(p => p.id !== id); save(); }
export function checkIn(jobId, loc) { const j = job(jobId); j.status = 'in_progress'; j.checkIn = { at: new Date().toISOString(), ...loc }; save(); }
export function checkOut(jobId, extra = {}) {
  const j = job(jobId); j.status = 'completed'; j.checkOut = { at: new Date().toISOString(), ...extra };
  if (j.payment.type === 'cod') j.payment.status = 'proof_uploaded';
  save();
}

// ---------- Availability (housemaids) ----------
export function availability() { const w = me(); return (state.availability[w.id] ||= {}); }
export function setAvailability(date, value) { availability()[date] = value; save(); }

// ---------- Earnings ----------
export function earnings() {
  const w = me();
  return myJobs().filter(j => j.status === 'completed').map(j => ({ job: j, amount: j.earnings?.[w.id] || 0 }));
}
export const isDemo = DEMO;
