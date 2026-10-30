# Vercel 12-hour redirect system

## Behaviour
- First visit for a visitor ID → `LINK_1`.
- Every later visit within 12 hours of that first visit → `LINK_2`.
- Once the 12-hour window expires, the next visit → `LINK_1` and starts a new 12-hour window.
- The database is authoritative; browser storage such as `localStorage` is not used.

## Important identity limitation
This project uses a signed, HTTP-only cookie containing a random visitor ID, with the visit state stored in Neon Postgres. It survives browser restarts and keeps state on the server. If a visitor clears cookies/site data, uses another browser/device, or blocks cookies, the site cannot reliably know it is the same person without login. IP-only identification is not recommended because many people share IPs and IPs can change.

## 1. Create a GitHub repository
1. Sign in to GitHub.
2. Create a new repository named `vercel-12h-redirect`.
3. Upload all files from this project, keeping the folder structure.
   - Do not upload `.env` or real secrets.

## 2. Create the database through Vercel
1. Sign in to Vercel and choose **Storage** / **Marketplace** (the menu wording can change).
2. Add a Neon Postgres database/integration to your Vercel account.
3. Connect it to the `vercel-12h-redirect` project after importing the GitHub repository.
4. In the database SQL editor, run:

```sql
CREATE TABLE IF NOT EXISTS visitor_visits (
  visitor_id UUID PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

5. Copy the connection string exposed by the Neon integration. Use the pooled/runtime connection string if the integration provides one.

## 3. Deploy to Vercel
1. In Vercel, click **Add New → Project**.
2. Import the GitHub repository.
3. Framework should be detected as Next.js.
4. Add these Environment Variables before deploying:

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `LINK_1` | Your first destination URL |
| `LINK_2` | Your second destination URL |
| `COOKIE_SECRET` | A long random secret, at least 32 characters |

Generate a secret locally with `openssl rand -hex 32`, or use another secure random generator. Keep it private.

5. Deploy the project.

## 4. Test
Open `https://YOUR-PROJECT.vercel.app/api/redirect`:
- First request in a fresh browser profile → Link 1.
- Refresh/open the same endpoint again → Link 2.
- Further requests during the 12-hour window → Link 2.
- After 12 hours, the next request → Link 1.

To test the first visit again, use a separate fresh browser profile. Do not clear cookies if you want to test the same visitor's repeat visit.

## 5. Use it
Use this as your public redirect URL:

`https://YOUR-PROJECT.vercel.app/api/redirect`

You can share that URL or place it behind a button on your site.

## Security and operations
- Keep `DATABASE_URL` and `COOKIE_SECRET` out of GitHub.
- If you change environment variables, redeploy the project.
- This implementation uses an atomic Postgres UPSERT to reduce race conditions for simultaneous visits.
- Add a privacy notice if you use persistent visitor identifiers, and comply with applicable privacy/cookie laws.
