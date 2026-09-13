# Security

BDJA Platform security model — **v1.0.0**.

---

## Threat model

We defend a multi-tenant school platform holding minors' personal data, financial
records, staff data and academic records. Primary threats:

| Threat | Example | Primary controls |
|--------|---------|------------------|
| Unauthorized access | Stolen session, replayed token | Bearer + cookie dual auth, lockouts, session audit |
| Privilege escalation | Student calling admin API | Server-side `requirePermission` on all 117 routes |
| IDOR | Reading another family's fees/messages | Queries scoped by `user_id` / `campus_id` from the verified session, never from request bodies |
| Stored XSS via CMS | `<script>` in a page or announcement | DOMPurify sanitization at render + at editor output |
| Brute force / credential stuffing | Login spraying | Login-attempt logging, account lockout, password history |
| Data exfiltration | Service-role key leak | Server-only env vars; anon key safe under RLS |
| Supply chain | Malicious dependency | Lockfile committed; no postinstall surprises |

---

## Controls

### Authentication & sessions
- Supabase Auth (email/password) with custom `profiles` extension.
- Every API route verifies the caller: `Authorization: Bearer` via
  `supabase.auth.getUser(token)` **and/or** Supabase SSR cookies — never trusting
  client-sent identity fields.
- `record_login_attempt` + `account_lockouts` (progressive lockout) + `password_history`
  (prevents reuse) + `user_sessions` (revocable) + `audit_logs` (immutable trail).
- Forced password change on first login; default credentials cannot persist.

### Authorization
- Granular permission catalog seeded in `002_seed_data.sql` (~90 permissions in
  categories: users, campuses, academics, finance, library, CMS, Joy AI, audit…).
- Enforced twice: RLS policies (database) **and** `requirePermission` in route handlers.
- User categories: `admin`, `staff`, `student`, `parent` — routes and UI gate on both.

### Data protection
- **RLS enabled on every table** (`001_core_schema.sql`).
- All multi-tenant reads filter by the authenticated identity from the session.
- Service-role key is server-only (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`).

### Web hardening
- Strict CSP + security headers in `next.config.js` (X-Frame-Options/frame-ancestors,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Rate limiting on sensitive endpoints (`src/lib/rate-limiter.ts`) with client-IP hashing.
- DOMPurify on all rich-text render paths (`CmsPageContent`, `RichTextEditor` output)
  with `javascript:`-URL blocking on link/image insertion.
- Standalone print documents escape all user-supplied values.

### PWA & transport
- HTTPS only (Vercel); cookies are SameSite=Lax via Supabase SSR defaults.
- Install prompt is UX-only — it grants no privileges.

---

## Audit checklist (run quarterly)

- [ ] `SELECT COUNT(*) FROM pg_policies;` — no table without policies
- [ ] Review `audit_logs` for anomalies (failed logins, permission denials)
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` and API keys
- [ ] Confirm no secrets in repo: `grep -rInE "(service_role|sk-|AIza)" src/`
- [ ] Review admin list + staff permissions grants
- [ ] Test lockout: 6 bad logins → locked, `unlock_account` flow works
- [ ] Verify CSP still blocks inline scripts on `/`, `/login`, `/admissions`

## Reporting

Found a vulnerability? Email **bishopdavisjoyacademy@gmail.com** — do not open a
public issue for security matters.
