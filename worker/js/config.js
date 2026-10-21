// Worker app configuration.
// Leave SUPABASE_URL empty to run in demo mode (data stays on this phone only).
// When the Supabase project exists, paste its Project URL and anon public key here.
// Never put the service_role key in this file.
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
export const DEMO = !SUPABASE_URL;

// Check-in is flagged when the phone is farther than this from the job pin.
export const CHECKIN_RADIUS_M = 200;
