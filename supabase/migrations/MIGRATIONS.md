# Migrations

Database migrations for the BDJA Platform — **Version 1.0.0**.

Nine ordered files that build the complete platform schema from scratch.
Every historical bug-fix has been folded into the correct base definition —
there are **no create-then-fix chains**. See the provenance note at the bottom
for how this folder maps to the legacy 25-file history.

---

## How to run

### Fresh project (recommended)
Run the files **in order, 001 → 009**, in the Supabase SQL Editor
(or `supabase db push` if you use the Supabase CLI with a linked project).

```bash
# CLI
supabase link --project-ref <your-project-ref>
supabase db push          # applies supabase/migrations/*.sql in name order
```

> **Order matters.** Each file assumes the previous ones have been applied.

### After running
1. **Create the admin auth user** in Supabase Dashboard → Authentication → Add user
   (`bishopdavisjoyacademy@gmail.com`).
2. **Run `003_admin_setup.sql`** so the profile + full permission grant exist.
   Update the UUID in that file to match the real `auth.users` id:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'bishopdavisjoyacademy@gmail.com';
   ```
3. Verify: `SELECT COUNT(*) FROM staff_permissions;` should equal the total permission count.

---

## What each file contains

| File | Domain | Contents |
|------|--------|----------|
| `001_core_schema.sql` | Core schema | All tables (auth, profiles, academics, finance, CMS, library, messaging, timetable), RLS policies, functions, triggers, auth hooks, security layer (login attempts, account lockouts, audit log, sessions, password history), `attachments` storage bucket |
| `002_seed_data.sql` | Seed data | Permission categories & permissions (all groups), campuses, subjects, CMS pages, homepage content (stats, carousel, director message, notices, quick links) |
| `003_admin_setup.sql` | Admin bootstrap | Canonical admin profile + grant of **all** permissions to admin. Deployment-specific — edit the UUID |
| `004_joy_ai.sql` | Joy AI | Audit log, analytics, guardrail violations, knowledge base (+default seeds), page assistants (+default seeds), admin request system, page interactions, parent communication drafts, auto-grading submissions, timetable suggestions |
| `005_parent_experience.sql` | Parent experience | Parent-teacher messaging, announcements, announcement read receipts, staff activity logs, fee-payment flexibility (`fee_payments.fee_structure_id` nullable) |
| `006_academic_operations.sql` | Academic ops | School-wide timetable configuration (single-row, seeded with defaults), admin-configurable admission custom fields, `timetable_slots`, fee reminders, library fines, class/subject lookup indexes |
| `007_reporting_and_imports.sql` | Reporting & data movement | Report cards (with AI narrative columns built-in), per-subject report entries, report templates, data exports, CSV import batches/rows, `updated_at` maintenance triggers |
| `008_platform_operations.sql` | Platform ops | Global school settings (`platform_settings`), inventory/asset management, runtime error capture (admin-visible, open insert for client-side reporting) |
| `009_storage.sql` | Storage | `bdja-uploads` bucket — created with the **correct `id = name`** from the start — plus RLS policies (authenticated upload/select/delete-own, public read) and verification queries |

---

## Important notes

- **Idempotency** — safe to re-run: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING/UPDATE`,
  and guarded `DO` blocks throughout.
- **Two storage buckets by design** — `attachments` (core schema, general files) and
  `bdja-uploads` (009, avatars & attachments). Do not merge them.
- **RLS is enforced on every table.** Server-side API routes additionally check
  permissions via `requireAuth` / `requirePermission` (see `src/lib/session.ts`).
- **Backups** — before applying to a project with data, export first:
  `supabase db dump --linked > backup.sql`.
- **Regenerate types after applying** —
  `supabase gen types typescript --linked > src/types/database.ts`.
- **Fresh vs. live** — this sequence builds a clean database. A live project that already
  has the final schema does not need to re-run these; they are the source of truth for
  new environments.

---

## Provenance (legacy → v1.0.0)

This folder consolidates the previous 25 migration files. Mappings:
`001`/`002`/`003` → merged into `001`–`003` here · `004` → split across `001`–`003` ·
`005` → `008` · `006`/`009` → merged into `009` (bucket created correctly the first time) ·
`007` (diagnostic) → verification queries inside `009` · `008` → folded into `assignments`
in `001` · `010` → `007` · `011`/`012` → `004` · `013` → split across `004`/`007` ·
`014` → folded into `joy_user_preferences` in `001` · `015`/`016` → merged into `002` ·
`017` → `005` + folded into `students` in `001` · `20240813…` → `008` · `20240905…` → `005` ·
`20240907…` (all four) → `006` + folds into `001` · `20250907…` → `006`/`007`.

A full programmatic audit confirmed **zero lost statements**; every difference traces to
an intentional fold, merge, or a no-op backfill made redundant by a folded-in `DEFAULT`.
