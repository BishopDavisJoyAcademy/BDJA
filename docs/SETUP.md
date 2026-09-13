# Setup

Complete setup guide for the BDJA Platform — **v1.0.0**.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A Supabase project ([supabase.com](https://supabase.com))
- Git

## 2. Environment

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Public key — safe for the browser, RLS-enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | **Server only.** Bypasses RLS — never expose |
| `NEXT_PUBLIC_AEVIBRON_API_KEY` | Your AI gateway | Powers Joy AI |

## 3. Database

Apply the migrations **in order (001 → 009)**. Full reference:
[supabase/migrations/MIGRATIONS.md](../supabase/migrations/MIGRATIONS.md).

**Supabase Dashboard (quick):** open the SQL Editor, paste each file in order, run.

**Supabase CLI:**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**After applying:**

1. Create the admin user: Dashboard → Authentication → Add user
   (`bishopdavisjoyacademy@gmail.com`).
2. Set their UUID in `supabase/migrations/003_admin_setup.sql` (find it with
   `SELECT id FROM auth.users WHERE email = 'bishopdavisjoyacademy@gmail.com';`),
   then run that file — it creates the admin profile and grants all permissions.
3. On first login the platform forces a password change.

## 4. Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

## 5. Type generation

`src/types/database.ts` is generated from your live schema. The repo includes a
GitHub Actions workflow (`.github/workflows/generate-types.yml`) that regenerates
and commits it automatically.

**One-time setup (from your phone or any browser):**

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - `SUPABASE_ACCESS_TOKEN` — from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
   - `SUPABASE_PROJECT_ID` — your project ref from the project URL
2. Push any change, then go to **Actions → Generate Supabase Types → Run workflow**.
3. `git pull origin main` — the fresh types are committed.

---

## Deployment

The platform deploys cleanly to **Vercel**: connect the repository, add the same
environment variables, and update Supabase Auth redirect URLs to your domain.
Security headers and CSP are already configured in `next.config.js`.
