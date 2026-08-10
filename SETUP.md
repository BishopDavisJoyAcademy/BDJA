# BDJA Platform — Security-Hardened Setup Guide

## 📦 Files in This Package

This ZIP contains all **changed/created files** during the security hardening session.

### Root Configs (merged from baseline + security patches)
- `package.json` — All original dependencies preserved + security packages
- `tsconfig.json` — Original paths + strict settings preserved
- `next.config.js` — Original settings + CSP headers, CORS, security headers
- `tailwind.config.ts` — Original BDJA theme colors preserved
- `postcss.config.js` — Original autoprefixer config

### Database (ONLY 2 migrations needed)
- `supabase/migrations/001_initial_schema.sql` — All 30+ tables, functions, triggers, RLS, indexes, storage
- `supabase/migrations/002_seed_data.sql` — Permissions, categories, default campus, CMS pages, grade levels

### Core Library (security-hardened)
- `src/lib/session.ts` — Token validation, session revocation, lockout checks
- `src/lib/security.ts` — Password hashing, lockout, rate limiting, session recording
- `src/lib/validation.ts` — Zod schemas for passwords, PINs, user creation
- `src/lib/rate-limiter.ts` — DB-backed per-IP rate limiting
- `src/lib/auth.ts` — User creation with role mapping
- `src/lib/permissions.ts` — Permission fetching and checking
- `src/lib/audit.ts` — Audit logging
- `src/lib/supabase.ts` — Browser client
- `src/lib/supabase-server.ts` — Service role admin client
- `src/lib/supabase-client.ts` — SSR cookie-based client
- `src/lib/constants.ts` — Admin segment env var

### API Routes
- `src/app/api/auth/login/route.ts` — Email/password login with rate limiting + session recording
- `src/app/api/auth/student-login/route.ts` — Admission number + PIN login
- `src/app/api/auth/change-password/route.ts` — Password change with history check
- `src/app/api/auth/first-login/route.ts` — First-time password/PIN setup
- `src/app/api/auth/me/route.ts` — Current user profile + permissions
- `src/app/api/auth/permissions/route.ts` — All permissions list
- `src/app/api/auth/logout/route.ts` — Global sign out
- `src/app/api/auth/refresh/route.ts` — Token refresh
- `src/app/api/auth/onboarding/route.ts` — Mark onboarding complete
- `src/app/api/health/route.ts` — Health check endpoint
- `src/app/api/admin/stats/route.ts` — Dashboard stats (students, staff, parents, admissions)

### Hooks & Stores
- `src/hooks/useAuth.ts` — Auth state management
- `src/hooks/useInactivityLogout.ts` — 10-minute inactivity auto-logout
- `src/stores/permissions.ts` — Zustand permission store

### Types
- `src/types/index.ts` — All TypeScript interfaces
- `src/types/joy.ts` — Joy AI types
- `src/types/attachments.ts` — File attachment types

### Dashboard Pages
- `src/app/(dashboard)/layout.tsx` — Sidebar nav with role-based links
- `src/app/(dashboard)/admin/page.tsx` — Admin dashboard with stats
- `src/app/(dashboard)/student/page.tsx` — Student dashboard cards
- `src/app/(dashboard)/teacher/page.tsx` — Teacher dashboard cards

### Middleware
- `src/middleware.ts` — Route protection, admin segment obscurity, static asset bypass

---

## 🗄️ Database Setup (Fresh Supabase Project)

### Step 1: Reset/Create Project
Go to Supabase Dashboard → Database → Reset (or create new project)

### Step 2: Run Migration 001
Open SQL Editor → New query → Paste entire `001_initial_schema.sql` → **Run**
- Creates 30+ tables
- Creates 8 security functions
- Creates single bulletproof auth trigger
- Creates all RLS policies
- Creates indexes
- Sets up storage bucket + policies

### Step 3: Run Migration 002
Paste `002_seed_data.sql` → **Run**
- 6 permission categories
- 31 permissions
- 1 default campus (Main Campus)
- 5 default CMS pages
- 12 grade levels (Playgroup → Grade 9)

### Step 4: Create First Admin
1. Go to **Authentication → Users → Add User**
2. Email: `admin@bdja.ac.ke`
3. Password: `BDJA2026!`
4. In **User Metadata**, paste:
   ```json
   {
     "full_name": "Super Admin",
     "role": "admin",
     "user_category": "admin"
   }
   ```
5. Click **Create User**
6. The trigger auto-creates the profile

### Step 5: Grant All Permissions
Replace `ADMIN_UUID` with the actual UUID from auth.users:
```sql
INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT 'ADMIN_UUID', id, 'ADMIN_UUID'
FROM permissions
ON CONFLICT DO NOTHING;
```

Or use the API after first login at:
```
POST /api/admin/staff/permissions
Body: { "profileId": "ADMIN_UUID", "permissionIds": ["..."] }
```

---

## 🔐 Security Features Verified

| Feature | Status |
|---|---|
| Account lockout (5 fails → 30min) | ✅ |
| Rate limiting per IP | ✅ |
| Password history (last 5) | ✅ |
| Session tracking + revocation | ✅ |
| RLS on ALL tables | ✅ |
| CSP headers | ✅ |
| Inactivity logout (10min) | ✅ |
| Admin impersonation with audit | ✅ |
| Force logout all sessions | ✅ |
| PIN login for students | ✅ |
| Password complexity rules | ✅ |
| Role-based route protection | ✅ |
| Admin segment obscurity | ✅ |

---

## 🗑️ Migrations to DELETE

**Keep ONLY:**
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_data.sql
```

**Delete ALL of these:**
```
003_cleanup_existing.sql
003_security_updates.sql
004_homepage_and_teacher_tools.sql
005_cms_pages.sql
006_fix_service_role_permissions.sql
007_auth_security_overhaul.sql
008_permissions_system.sql
009_data_migration.sql
010_schema_cleanup.sql
011_role_simplification.sql
011_role_simplification_emergency.sql
012_suggestions_system.sql
013_security_enhancements.sql
014_joy_system.sql
015_storage_bucket.sql
016_vora_content.sql
017_fix_auth_trigger.sql
018_fix_permissions_and_auth.sql
019_nuclear_fix.sql
020_final_fix.sql
021_student_pin_system.sql
022_fix_password_loop.sql
023_first_login_hardening.sql
```

---

## 🚀 Deploy

```bash
# 1. Copy all files from this ZIP into your project
# 2. Install dependencies
npm install

# 3. Create .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AEVIBRON_API_KEY=your_aevibron_key
NEXT_PUBLIC_APP_URL=https://bdja.ac.ke

# 4. Run dev
npm run dev
```

---

## 👤 Role Capabilities

### Admin (`user_category = 'admin'`)
- Full access to ALL permissions automatically
- Create/edit staff, students, parents
- Manage permissions for staff
- Edit CMS pages
- Manage calendar, timetable, admissions
- View audit logs, analytics
- Impersonate users
- Force logout sessions

### Staff (with specific permissions)
- `grades.manage` → Enter/edit student grades
- `fees.manage` → Record/manage fee payments
- `assignments.manage` → Create class assignments
- `attendance.manage` → Record attendance
- `timetable.manage` → Create timetables
- `library.manage` → Add/manage books
- `messages.send` → Send messages
- `staff.manage` → Manage other staff
- `students.manage` → Manage students

### Students
- View own grades
- View class timetable
- View class assignments
- View own fee payments
- Send/receive messages
- Use Joy AI
- Browse library catalog
- View VORA content

### Parents
- View linked children's grades
- View linked children's fees
- View calendar events
- Send/receive messages

---

## 🧪 Teacher → Student Flow Verification

1. **Teacher** with `assignments.manage` creates an assignment:
   ```sql
   INSERT INTO assignments (class_id, subject_id, teacher_id, title, description, due_date, status)
   VALUES ('class-uuid', 'subject-uuid', 'teacher-uuid', 'Math Homework', 'Page 42', '2026-08-15', 'published');
   ```

2. **Student** in that class views assignments via `/api/assignments`:
   - RLS policy `assignments_student` allows SELECT where `students.class_id = assignments.class_id`
   - Student sees the assignment in their dashboard

3. **Teacher** enters grades via `/api/grades`:
   - RLS policy `assessments_staff` allows INSERT with `grades.manage`
   - Student sees their grade via `assessments_own` (student_id = auth.uid())

4. **Parent** views child's grades:
   - Joins `parent_students` → `assessments` via child_id
   - RLS on parent_students ensures only their own links

---

## 📞 Support

If anything fails after setup:
1. Check Supabase Auth → Users → confirm profile was created by trigger
2. Run: `SELECT * FROM profiles WHERE email = 'admin@bdja.ac.ke'`
3. Run: `SELECT * FROM staff_permissions WHERE profile_id = 'admin-uuid'`
4. Check browser console for API errors
5. Check Vercel/terminal logs for server errors
