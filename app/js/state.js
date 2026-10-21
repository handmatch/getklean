// Booking state for the customer flow. Kept in sessionStorage so a refresh
// doesn't lose the booking in progress. No backend yet: this is the front-end only.

const KEY = 'gk.booking.v1';
const USER_KEY = 'gk.user.v1';

export const PRICES = {
  regular: { weekday: { half: 900, whole: 1200 }, weekend: { half: 990, whole: 1390 } },
  member: { weekday: { half: 510, whole: 650 }, weekend: { half: 561, whole: 715 } },
  trial: { half: 510, whole: 650 }, // first booking promo, weekdays only
};

export const PLANS = {
  '1m': { id: '1m', label: '1 month', title: '1 MONTH FLEXI PLAN', name: '1-month Flexi Plan', months: 1, price: 1790, was: null, save: null },
  '3m': { id: '3m', label: '3 months', title: '3 MONTH FLEXI PLAN', name: '3-month Flexi Plan', months: 3, price: 4990, was: 5370, save: 7, bonus: 'plus 1 free visit worth PHP650' },
  '6m': { id: '6m', label: '6 months', title: '6 MONTH FLEXI PLAN', name: '6-month Flexi Plan', months: 6, price: 8490, was: 10740, save: 20 },
  '12m': { id: '12m', label: 'Annual', title: 'ANNUAL FLEXI PLAN', name: 'Annual Flexi Plan', months: 12, price: 13990, was: 21480, save: 35 },
};

export const TASK_GROUPS = [
  { name: 'Home and Kitchen', tasks: [
    { id: 'housekeeping', icon: 'event_note', label: 'Housekeeping', caption: 'Sweeping, mopping, dusting, bathrooms, beds' },
    { id: 'kitchen', icon: 'countertops', label: 'Kitchen care', caption: 'Dishes, counters, stove, fridge wipe-down' },
    { id: 'cooking', icon: 'cooking', label: 'Cooking', caption: 'Meal prep and cooking with your ingredients' },
  ] },
  { name: 'Clothes', tasks: [
    { id: 'laundry', icon: 'local_laundry_service', label: 'Laundry', caption: 'Wash, dry, fold' },
    { id: 'ironing', icon: 'iron', label: 'Ironing', caption: 'Press, hang or fold clothes' },
  ] },
  { name: 'Care', tasks: [
    { id: 'childcare', icon: 'child_care', label: 'Childcare', caption: 'Supervising, feeding and playtime' },
    { id: 'elderly', icon: 'elderly', label: 'Elderly care', caption: 'Companionship and daily routine' },
    { id: 'pets', icon: 'pets', label: 'Pet care', caption: 'Feeding, walking, litter and cleanup', fill: true },
  ] },
  { name: 'Outdoor', tasks: [
    { id: 'gardening', icon: 'local_florist', label: 'Gardening', caption: 'Watering, weeding, trimming' },
    { id: 'outdoor', icon: 'light_mode', label: 'Outdoor care', caption: 'Garage, Patio, terrace' },
    { id: 'errands', icon: 'storefront', label: 'Errands', caption: 'Grocery' },
  ] },
];

export const HOUSEMAIDS = [
  { id: 'amy', name: 'Amy Rosales', level: 'Expert', rating: 4.8, km: 2.7, booked: 1, group: 'recommended' },
  { id: 'ailyn', name: 'Ailyn Gonzales', level: 'Regular', rating: 4.8, km: 2.8, booked: 0, group: 'recommended' },
  { id: 'marichu', name: 'Marichu Lacson', level: 'Expert', rating: 4.8, km: 5.5, booked: 0, group: 'recommended', unavailable: true },
  { id: 'irish', name: 'Irish Manansala', level: 'Regular', rating: 4.8, km: 6.0, booked: 0, group: 'other' },
  { id: 'arlene', name: 'Arlene Santos', level: 'Regular', rating: 4.8, km: 6.2, booked: 0, group: 'other' },
  { id: 'quennie', name: 'Quennie Dela Cruz', level: 'Regular', rating: 4.8, km: 6.5, booked: 0, group: 'other', unavailable: true },
  { id: 'rhea', name: 'Rhea Bautista', level: 'Regular', rating: 4.7, km: 7.1, booked: 0, group: 'more' },
  { id: 'joy', name: 'Joy Villanueva', level: 'Expert', rating: 4.9, km: 7.4, booked: 0, group: 'more' },
];

export const SAVED_ADDRESSES = [
  { id: 'home', label: 'Home', icon: 'home', line: '123 Mahogany St., Pasig, Metro Manila', isDefault: true, lat: 14.5764, lon: 121.0851 },
  { id: 'work', label: 'Work', icon: 'business_center', line: 'Fintech Philippines Association, Makati City', lat: 14.5547, lon: 121.0244 },
];

const blank = () => ({
  when: 'now',            // 'now' | 'later'
  type: 'one-time',       // 'one-time' | 'recurring' (Book later)
  date: null,             // ISO yyyy-mm-dd
  endDate: null,
  frequency: 'Once a week',
  days: [],
  duration: 'whole',      // 'half' | 'whole'
  time: null,             // '7:00AM'
  addressId: null,
  address: null,          // { label, unit, building, street, city, landmark, search, isDefault }
  allAround: false,
  tasks: [],
  something: false,
  somethingText: '',
  instructions: '',
  dispatch: 'regular',
  housemaid: null,
  housemaidDateShift: false,
  ride: false,
  plan: null,             // 'trial' | '1m' | '3m' | '6m' | '12m' | 'existing'
  payment: 'visa',
  promo: '',
  consent: true,
  bookingId: null,
});

let state = load();

function load() {
  try { return { ...blank(), ...(JSON.parse(sessionStorage.getItem(KEY)) || {}) }; } catch { return blank(); }
}
function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

export const booking = () => state;
export function update(patch) { state = { ...state, ...patch }; save(); return state; }
export function resetBooking() { state = blank(); save(); }

export function user() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }
export function setUser(u) { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch {} }

// ---------- dates ----------
export const todayISO = () => toISO(new Date());
export function toISO(d) { const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
export function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(iso, n) { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
export const fmt = {
  long: iso => fromISO(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  med: iso => fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  dow: iso => fromISO(iso).toLocaleDateString('en-US', { weekday: 'short' }),
  full: iso => fromISO(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
};
export function isWeekend(iso) { const d = fromISO(iso).getDay(); return d === 0 || d === 6; }
export function dayLabel(iso) {
  if (iso === todayISO()) return 'Today';
  if (iso === addDays(todayISO(), 1)) return 'Tomorrow';
  return fmt.dow(iso);
}

// ---------- times ----------
export const START_TIMES = ['7:00AM', '8:00AM', '9:00AM', '10:00AM', '11:00AM', '12:00PM', '1:00PM', '2:00PM', '3:00PM'];
export function endTime(start, duration) {
  const m = start.match(/(\d+):(\d+)(AM|PM)/); let h = +m[1] % 12 + (m[3] === 'PM' ? 12 : 0);
  h += duration === 'half' ? 4 : 8;
  const ap = h >= 12 && h < 24 ? 'PM' : 'AM'; const hh = ((h + 11) % 12) + 1;
  return `${hh}:00${ap}`;
}
export const durationLabel = d => (d === 'half' ? 'Half day' : 'Whole day');
export const durationDetail = d => (d === 'half' ? '4hrs service' : '7hrs service including 1hr break (8hrs in total)');

// ---------- money ----------
export const php = n => 'PHP' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

export function visitPrice(s = state) {
  const day = s.date && isWeekend(s.date) ? 'weekend' : 'weekday';
  const regular = PRICES.regular[day][s.duration];
  if (s.plan === 'trial') return { regular, price: PRICES.trial[s.duration], label: 'First booking promo' };
  if (s.plan && s.plan !== 'trial') return { regular, price: PRICES.member[day][s.duration], label: `${day === 'weekday' ? 'Weekday' : 'Weekend'} Member Rate` };
  return { regular, price: regular, label: `${day === 'weekday' ? 'Weekday' : 'Weekend'} rate` };
}
export function planFee(s = state) { return s.plan && PLANS[s.plan] ? PLANS[s.plan].price : 0; }
export function total(s = state) { return visitPrice(s).price + planFee(s); }
export function trialEligible(s = state) { return !s.date || !isWeekend(s.date); }
