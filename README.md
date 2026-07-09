# Rekko Admin

Internal-only admin dashboard for Rekko (metrics, feedback). Not linked from
the public marketing site. React + Vite, deployed to GitHub Pages.

- **Auth**: Supabase Auth (email/password), single admin account
  (`developer@userekko.com`). No sign-up flow.
- **Data**: `supabase.rpc('get_admin_dashboard_stats')` (Postgres function,
  hard-gated server-side to the admin's UUID) and the `get-crash-stats` Edge
  Function (Sentry crash-free rate, same admin gating).
- Real authorization lives entirely server-side. The client-side email check
  in `App.jsx` is only a UX nicety — a non-admin who somehow got a valid
  session would still get `unauthorized` from both server calls.

## Manual setup required

**Sentry crash-free rate needs a secret added before it will work:**

```
supabase secrets set SENTRY_AUTH_TOKEN=<your Sentry auth token> --project-ref bvsxuhyotpwhcapgnwyp
```

The token needs `org:read` (or `org:admin`/`org:write`) scope for the
`rekko-dq` organization. Until this is set, the Stability section will show
a message saying the secret is missing rather than a number — that's
expected, not a bug.

## Local development

```
npm install
npm run dev
```

## Deployment

Push to `main` — GitHub Actions (`.github/workflows/deploy.yml`) builds and
publishes to GitHub Pages automatically.
