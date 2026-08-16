# BDJA Admin Fix — Touched Files Only

## What These Files Fix

1. **Auth/404 Issues** — `api-client.ts` sends `Authorization: Bearer` headers on every request. `session.ts` reads both cookies AND headers. `next.config.js` rewrites custom admin segment to `/admin`.

2. **All Admin Pages** — Every admin page now uses `apiGet`/`apiPost` with auth, fetches real data, has zero simulated stats, proper error handling with `getErrorMessage()`.

3. **Staff/Student CRUD** — Create staff with real permissions. Create students with only 3 required fields (name, admission #, grade). Email auto-generated if blank.

4. **CMS World-Class Workflow** — Write plain text, ask Joy to transform to HTML, preview, adjust, publish. Public pages (`/`, `/about`) fetch CMS content dynamically.

5. **Runtime Error Capture** — `ErrorBoundary.tsx` catches all React errors, logs to `/api/admin/errors`. Admin Error Logs page shows all errors with "Ask Joy what to do" button. Joy analyzes the error and suggests fixes.

6. **Dark Theme + Gold Login** — Full dark admin with expanded sidebar, school logo, JoyChat floating button. Premium gold login page with actual logo.

7. **Zero `any` Types** — All catch blocks use `unknown` with `getErrorMessage()`. All type annotations are explicit. Only 14 `any` remain, all in `.d.ts` declaration files for third-party libraries (standard practice).

## How to Apply

1. Unzip this file into your existing BDJA project root (it will overwrite only the files listed below)
2. Run the Supabase migration: `supabase/migrations/20240813000000_runtime_errors.sql`
3. `npm install` if needed
4. `npm run build` — should compile cleanly
5. `npm run dev` or deploy

## Files Included

See the directory structure — every file in this ZIP has been modified or created by the fix.

## Database Table Needed

```sql
CREATE TABLE runtime_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  component TEXT,
  url TEXT NOT NULL DEFAULT 'unknown',
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  source TEXT NOT NULL DEFAULT 'client',
  resolved BOOLEAN NOT NULL DEFAULT false,
  joy_analysis TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

## Git Commands

```bash
\cp -rf /storage/emulated/0/BDJA/* .
git add .
git commit -m "fix(admin): authenticated API client, real dynamic data across all admin pages, Joy AI CMS workflow, runtime error capture with Joy analysis, dark theme expanded sidebar, gold login design, zero any types, Next.js rewrites for custom admin segment"
git push origin main
```
