# Getklean website + customer app (front-end)

- `/` main page (brand guidelines 2026: blue #3886c8, yellow #f6e535, navy #0e3b65, cream #f9e8c0; Montserrat stands in for Gotham)
- `/app/` customer booking app
- `brand/` logo files (on-blue, full colour, all-yellow)

Coded front-end of the **Customer App Mock-up** in Figma: Home (guest + signed-in) and the full 8-step booking flow
(When → Where → Select service → Sign-in/OTP → Select housemaid → Select plan → Review & pay → Booked).

- Plain HTML/CSS/JS, no build step. Deploys to Vercel as a static site (Framework preset: **Other**).
- No backend yet: booking state lives in the browser (sessionStorage), sign-in is simulated (any 6-digit code works).
- App design images go in `app/assets/` (`logo.png`, `logo-white.png`, `hero-housemaid.png`, `hero-shape.svg`,
  `promo-free-one-day.png`, `why-*.png`, `housemaid.png`). Until they're added, styled fallbacks show.

Run locally: `python3 -m http.server` and open http://localhost:8000.
Demo promo codes: `GETKLEAN100`, `WELCOME`.

## Worker app (`/worker/`)
Installable mobile web app for Housemaids, Cleaners, Technicians and Riders: jobs, directions, GPS check-in and out,
before/after photos (per aircon unit), cash payment proof, customer sign-off (Deep Cleaning leads), housemaid
availability, earnings and profile. Runs in demo mode until `worker/js/config.js` has the Supabase URL and anon key.

## Database (`supabase/schema.sql`)
Run once in Supabase → SQL Editor. Creates the tables, row-level security per the PRD permissions matrix,
check-in/check-out functions with photo and cash-proof rules, and private storage buckets for photos and documents.
