# BDJA — Type Generation Setup (No PC Needed)

## The Problem
`supabase gen types` requires a desktop OS (Linux/macOS/Windows). Termux (Android) is not supported.

## The Solution: GitHub Actions
Every time you push a migration change, GitHub automatically generates the correct `src/types/database.ts` and commits it back.

## Setup Steps (do this ONCE on GitHub.com via your phone browser):

### 1. Add Secrets to Your GitHub Repo
Go to: `https://github.com/BishopDavisJoyAcademy/BDJA/settings/secrets/actions`

Click "New repository secret" and add:

**Name:** `SUPABASE_ACCESS_TOKEN`
**Value:** Your Supabase personal access token
- Get it from: https://supabase.com/dashboard/account/tokens
- Click "Generate new token" → name it "GitHub Actions" → copy the token

**Name:** `SUPABASE_PROJECT_ID`
**Value:** `nsuxgoiccuiiddkswano` (your project ID from the URL)

### 2. Push This Workflow
The `.github/workflows/generate-types.yml` file is already in this ZIP.

### 3. Trigger It
After pushing, go to:
`https://github.com/BishopDavisJoyAcademy/BDJA/actions`

Click "Generate Supabase Types" → "Run workflow" → "Run workflow"

### 4. Wait 30 seconds
GitHub will:
- Install the Supabase CLI on a Linux server
- Connect to your project
- Generate the exact types from your live database
- Commit `src/types/database.ts` back to your repo

### 5. Pull the changes
```bash
git pull origin main
```

Now `src/types/database.ts` has the REAL types. The `db-helpers.ts` casts become unnecessary — you can replace `dbInsert("x", payload)` with `admin.from("x").insert(payload)` and TypeScript will validate everything.

## Until Then
Use `dbInsert()`, `dbUpdate()`, `dbUpsert()` from `src/lib/db-helpers.ts` in all API routes. They encapsulate the type cast in ONE place, so when real types arrive, you only change the helpers — not 30+ files.
