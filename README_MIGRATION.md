# BDJA Schema Migration v4.0 — Complete Corrected Schema

## What This Fixes

Your old `001_initial_schema.sql` created **29 tables** with wrong column names.
Your codebase expects **61 tables** with specific columns.

This package replaces everything with the correct schema generated from `src/types/database.ts`.

## Files in this package

| File | Path in repo | Purpose |
|------|-------------|---------|
| `001_initial_schema.sql` | `supabase/migrations/001_initial_schema.sql` | Complete schema: 61 tables, FKs, indexes, functions, triggers, RLS, storage |
| `002_seed_data.sql` | `supabase/migrations/002_seed_data.sql` | Seed data: permissions, campuses, grade levels, subjects, CMS pages, homepage content |
| `003_admin_setup.sql` | `supabase/migrations/003_admin_setup.sql` | Creates your admin user profile and grants all permissions |
| `004_complete_reset.sql` | `supabase/migrations/004_complete_reset.sql` | **ONE FILE TO RUN** — standalone, includes drops + schema + seed + admin setup |

## Steps to Apply

### Step 1: Extract ZIP to your repo

From Termux:
```bash
cd /path/to/your/BDJA/repo
\cp -rf /storage/emulated/0/BDJA/* .
```

### Step 2: Run the standalone reset script in Supabase

Go to: https://supabase.com/dashboard/project/gtszxijmtxnupxyrvqsp/sql/new

Open `supabase/migrations/004_complete_reset.sql` and click **Run**.

This single file will:
1. Drop all old tables, functions, triggers, policies
2. Create all 61 correct tables
3. Seed permissions and default data
4. Set up your admin user

### Step 3: Verify

```sql
SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';
-- Should return 61

SELECT COUNT(*) as total_permissions FROM staff_permissions
WHERE profile_id = 'ced464c1-a700-4808-9f49-da62942e2e50';
-- Should return ~35
```

### Step 4: Regenerate types via GitHub Action

Go to: https://github.com/BishopDavisJoyAcademy/BDJA/actions

Click **"Generate Supabase Types"** → **"Run workflow"** → **"Run workflow"**

Wait 30 seconds, then in Termux:
```bash
git pull origin main
```

### Step 5: Commit & push

```bash
git add .
git commit -m "fix(types/database): remove __InternalSupabase key — root cause of all SupabaseClient .from()/.rpc() type errors"
git push origin main
```

### Step 6: Test login

Once lockout expires, log in with:
- Email: `bishopdavisjoyacademy@gmail.com`
- Password: `@Academy.Joy.Dav1s.B1shop.Adm1n.`

## After Migration — Delete Old Corrupted Files

Once this migration succeeds, delete these from your repo:
- `supabase/migrations/001_initial_schema.sql` (old corrupted version)
- `supabase/migrations/002_seed_data.sql` (old version)
- `supabase/migrations/002_seed_super_admin.sql`
- `supabase/migrations/003_bug_fixes.sql`

Keep only the new v4 files.
