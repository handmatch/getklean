# GetKlean customer app (front-end)

Coded front-end of the **Customer App Mock-up** in Figma: Home (guest + signed-in) and the full 8-step booking flow
(When → Where → Select service → Sign-in/OTP → Select housemaid → Select plan → Review & pay → Booked).

- Plain HTML/CSS/JS, no build step. Deploys to Vercel as a static site (Framework preset: **Other**).
- No backend yet: booking state lives in the browser (sessionStorage), sign-in is simulated (any 6-digit code works).
- Design images go in `assets/` (`logo.png`, `logo-white.png`, `hero-housemaid.png`, `hero-shape.svg`,
  `promo-free-one-day.png`, `why-*.png`, `housemaid.png`). Until they're added, styled fallbacks show.

Run locally: `python3 -m http.server` and open http://localhost:8000.
Demo promo codes: `GETKLEAN100`, `WELCOME`.
