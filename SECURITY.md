# BDJA Platform - Security & Access Control

## Authentication Flow

1. **Login**: User enters email + password → Supabase Auth validates → JWT cookie set
2. **Middleware Check**: Every request checks session validity via `src/middleware.ts`
3. **Role Redirect**: On dashboard load, user is redirected to their role-appropriate portal
4. **Password Policy**: Default password `BDJA2026!` forces immediate change on first login
5. **Onboarding**: New users get a 6-step guided tour before accessing the platform

## Access Revocation

### When a Teacher Leaves:
1. Admin goes to **Admin Portal → Users**
2. Click the red **UserX** button next to the teacher's name
3. This sets `profiles.is_active = false`
4. The teacher is immediately locked out — middleware rejects their session
5. All their class assignments remain in database for records, but they cannot log in

### When a Student Leaves/Transfers:
1. Admin goes to **Admin Portal → Users** or **Admissions**
2. Set student status to `transferred` or `graduated` in the `students` table
3. Their parent links are preserved for record-keeping
4. If the student has a profile account, deactivate `profiles.is_active = false`

### When a Parent Should Lose Access:
1. Deactivate their `profiles.is_active`
2. All `parent_children` links remain for audit trail

## Permission System

- Each role has a `DEFAULT_PERMISSIONS` map in `src/lib/permissions.ts`
- Admin can create custom `staff_roles` entries with overridden permissions
- The `hasPermission()` function checks both role defaults AND custom overrides
- Frontend UI elements are conditionally rendered based on `hasPermission()`
- API routes should also verify permissions server-side (currently client-gated via UI)

## Audit Logging

Every significant action is logged to `audit_logs` table:
- Grade changes (with reason required)
- Fee payment verifications
- User activations/deactivations
- Admission status changes
- Timetable modifications

## Data Security

- **Supabase RLS** is enabled on all tables with basic policies
- **Service Role Key** is server-only, never exposed to browser
- **Anon Key** is public-safe, used for client-side queries
- **Environment variables** for secrets (Aevibron key, Supabase keys) are never in source code
- **Passwords** are hashed by Supabase Auth (bcrypt) — we never store plain text

## Best Practices for School Admins

1. **Never share super_admin credentials** — create separate principal accounts per campus
2. **Deactivate, don't delete** — always set `is_active = false` instead of deleting users
3. **Review audit logs weekly** — check the Audit Logs page for suspicious activity
4. **Change default passwords immediately** — all new users must change `BDJA2026!` on first login
5. **Assign staff roles carefully** — use the Staff Roles system to grant only needed permissions

## Joy AI Security

- Joy connects to Aevibron Gateway via server-side API route (`/api/chat`)
- The Aevibron API key is stored in server environment variables only
- Joy has a system prompt that enforces BDJA Christian values and prevents harmful content
- Joy receives user context (name, role, campus) but never sees passwords or payment data
