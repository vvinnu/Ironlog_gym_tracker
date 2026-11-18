# IronLog — Personal Gym Tracker

A dark, mobile-first workout tracker built with React, Vite and Supabase. It is designed to be installed on an iPhone Home Screen as a PWA.

## Included in this first build

- Email/password sign-up and sign-in through Supabase Auth
- Cloud-backed workout sessions and set-by-set logging
- Exercise library grouped by muscle
- Body-weight check-ins
- Dashboard, recent sessions, volume totals and best logged weights
- Progress charts and workout history
- Responsive iPhone layout and PWA manifest/service worker

## 1. Create the free cloud database

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor** in your new project.
3. Open `supabase/schema.sql` from this project, paste it into the SQL Editor and run it.
4. In Supabase, open **Project Settings → API** (or **Data API**) and copy the Project URL and `anon` / publishable key.
5. In Supabase **Authentication → URL Configuration**, set your Site URL to the eventual deployed app URL. Add the local development URL `http://localhost:5173` to Redirect URLs while testing.

The schema enables Row Level Security and restricts each user's records to their own account. Never put a Supabase `service_role` key in this frontend app.

## 2. Run locally

Install Node.js (LTS), then in this folder:

```bash
npm install
cp .env.example .env
```

Edit `.env` and fill in:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

Then run:

```bash
npm run dev
```

Open the local URL shown by Vite. Create your account in the app. If email confirmation is enabled, confirm the email before signing in.

## 3. Deploy free

A straightforward option is Vercel or Netlify:

1. Push this folder to a private GitHub repository.
2. Import that repository into Vercel or Netlify.
3. Set the build command to `npm run build` and output directory to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as deployment environment variables.
5. Deploy, then add the deployed URL to Supabase Authentication → URL Configuration (Site URL and Redirect URLs).

The app is a static frontend, so it can use free static hosting. Supabase free-tier limits and inactivity/pause rules may change; check the current Supabase plan before relying on it long-term.

## 4. Install on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap **Share** → **Add to Home Screen**.
3. Enable **Open as Web App** if iOS offers the option.
4. Tap **Add**. IronLog will appear on your Home Screen.

## Data model

- `workouts`: one row per training session
- `workout_sets`: one row per exercise set, linked to a workout
- `bodyweight_logs`: dated body-weight entries

All data tables have Row Level Security policies keyed to the signed-in user.

## Current scope / next improvements

This is the working first version of the complete core tracker. A sensible next pass is to add editable/deletable workout history, exercise-specific PR and estimated 1RM charts, workout templates/splits, rest timer, measurement logs, and richer muscle-group volume analytics.
