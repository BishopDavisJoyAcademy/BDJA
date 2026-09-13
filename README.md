<div align="center">

<img src="public/logo-official.png" alt="Bishop Davis Joy Academy" width="150" />

# BDJA PLATFORM

<h3>Prayer, Commitment and Hard Work for Success</h3>

<p>
The complete school operating system — admissions, academics, finance, communication,
library, e-learning and an embedded AI assistant, in one installable platform.
</p>

<p>
<img src="https://img.shields.io/badge/version-1.0.0-D4AF37?style=for-the-badge" alt="v1.0.0" />
<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
<img src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react" alt="React 19" />
<img src="https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?style=for-the-badge&logo=supabase" alt="Supabase" />
<img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
<img src="https://img.shields.io/badge/PWA-installable-5a0fc8?style=for-the-badge&logo=pwa" alt="PWA" />
<img src="https://img.shields.io/badge/security-hardened-10b981?style=for-the-badge&logo=shield" alt="Security" />
</p>

</div>

<img src="public/slides/hero-1.jpg" alt="Bishop Davis Joy Academy" width="100%" style="border-radius: 16px;" />

---

## The Platform at a Glance

| | |
|---|---|
| **102 pages** | Role-tailored dashboards for admin, staff, teachers, students & parents |
| **117 API routes** | Every route auth-verified and permission-checked, server-side |
| **60+ tables** | Full relational schema with Row Level Security on every table |
| **~90 permissions** | Granular capability catalog across 9 categories |
| **Joy AI** | Page-aware assistant with guardrails, knowledge base & audit trail |
| **VORA E-Learning** | Curated, grade-aligned video lessons with admin publishing |
| **PWA** | Installs to the home screen, launches at login, works like a native app |

---

## One Platform, Every Role

| Role | Their world |
|------|-------------|
| **Admin** | Full control — users, campuses, permissions, CMS, audit logs, backups, imports, analytics, Joy AI governance |
| **Teacher** | Timetable, attendance, assignments & auto-grading, gradebook, mark sheets, parent messaging, class reports |
| **Student** | Timetable, assignments, CATs & exams, grades with AI narrative report cards, library, VORA lessons, announcements |
| **Parent** | Linked children, fees & receipts, attendance, grades, school calendar, direct teacher messaging, announcements |
| **Accountant** | Fee structures, payments, arrears aging, reminders, finance dashboards |
| **Librarian** | Catalog, borrowing, fines, barcodes |

---

## Capabilities

<details open>
<summary><b>Admissions</b></summary>

- Public application form with a **standalone print document** — clean official letterhead generated from form state, ready for the parent's records
- Admin-configurable **custom fields** per school requirements
- Full pipeline: `pending → approved → enrolled`, with automatic admission numbers
- Manual entry for walk-in applications, with campus-aware selection

</details>

<details>
<summary><b>Academics</b></summary>

- **Timetable builder** — campus/class/teacher/subject aware, conflict detection, multiple printable layouts
- **Attendance** — daily registers, trends, per-student history
- **Assignments** — creation, submission, AI-assisted auto-grading
- **Gradebook & mark sheets** — CATs, exams, weightings
- **Report cards** — per-subject entries, PDF archive, **AI-generated narrative**, review & publish workflow

</details>

<details>
<summary><b>Finance</b></summary>

- Fee structures per class, payments & receipts, arrears aging dashboard, automated reminders

</details>

<details>
<summary><b>Communication</b></summary>

- Announcements with read receipts, parent-teacher messaging, notifications center, suggestion box

</details>

<details>
<summary><b>Library & Inventory</b></summary>

- Catalog with categories, borrowing cycles, fines, barcode support — plus a full asset/inventory register

</details>

<details>
<summary><b>CMS & Public Site</b></summary>

- Staff-editable pages and homepage sections (hero, stats, carousel, notices, quick links) — no code required

</details>

<details>
<summary><b>Joy AI</b></summary>

- Page-aware chat assistant, knowledge base, page assistants, guardrails with violation logging,
  conversation audit, admin approval workflow, analytics

</details>

<details>
<summary><b>Platform Operations</b></summary>

- Global settings, runtime error capture, CSV import, data export, report templates, audit logs,
  login lockouts, session management, backups

</details>

---

## Architecture

**Next.js 15 (App Router)** on the surface, **Supabase (PostgreSQL)** underneath.
Server route handlers own all data access; the browser never holds elevated credentials.

```
Browser (PWA) ──► Next.js route handlers ──► Supabase (Postgres + RLS + Auth + Storage)
                      │  requireAuth()            │
                      │  requirePermission()      ▼
                      └─────► audit, rate-limit, lockout checks
```

- **Auth** — Supabase Auth + custom `profiles`, with Bearer-token and cookie dual verification on every request
- **Authorization** — permission catalog enforced twice: RLS policies (database) *and* route guards (application)
- **Real-time data integrity** — triggers for timestamps, admission numbers, cascades and security event recording

### Repository structure

```
bdja/
├── public/                  # official logo, PWA icons, manifest, hero slides, e-learning content
├── src/
│   ├── app/
│   │   ├── (auth)/          # login + password reset — the PWA entry point
│   │   ├── (dashboard)/     # every role dashboard, grouped by domain
│   │   ├── admissions/      # public application + standalone print
│   │   └── api/             # 117 route handlers, all auth + permission guarded
│   ├── components/          # ui kit, layouts, Joy AI, PWA install prompt
│   ├── hooks/  lib/  types/ # auth, api-client, security, generated DB types
│   └── middleware.ts        # route protection
├── supabase/migrations/     # 9 ordered migrations (001 → 009)
├── docs/                    # SECURITY.md · SETUP.md
└── .github/workflows/       # CI + auto type generation
```

<details>
<summary><b>Complete file tree (655 entries)</b></summary>

```
bdja/
├── .github/
│   └── workflows/
│       ├── generate-types.yml
│       ├── pr-comment.yml
│       └── ultimate-ci.yml
├── content/
│   └── youtube/
│       ├── README.md
│       ├── grade1.json
│       ├── grade2.json
│       ├── grade3.json
│       ├── grade4.json
│       ├── grade5.json
│       ├── grade6.json
│       ├── playgroup.json
│       ├── pp1.json
│       └── pp2.json
├── public/
│   ├── grades/
│   │   ├── grade1-icon.png
│   │   ├── grade2-icon.png
│   │   ├── grade3-icon.png
│   │   ├── grade4-icon.png
│   │   ├── grade5-icon.png
│   │   ├── grade6-icon.png
│   │   ├── playgroup-icon.png
│   │   ├── pp1-icon.png
│   │   └── pp2-icon.png
│   ├── slides/
│   │   ├── README.md
│   │   ├── hero-1.jpg
│   │   ├── hero-2.jpg
│   │   └── hero-3.jpg
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── joy-logo.png
│   ├── logo-official.png
│   ├── logo.png
│   └── manifest.json
├── server/
│   └── index.js
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   ├── error.tsx
│   │   │   ├── layout.tsx
│   │   │   └── loading.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   │   ├── admissions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── audit/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── backup/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── campuses/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── classes/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── content/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── errors/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── fees/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── import/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── ims/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── joy-analytics/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── joy-assistants/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── joy-communication/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── joy-knowledge/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── joy-reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── joy-requests/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── library/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── parents/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── setup/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── sovereign-view/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── staff/
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── edit/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── students/
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── edit/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── subjects/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── suggestions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── timetable-builder/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── vora/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── assignments/
│   │   │   │   └── page.tsx
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx
│   │   │   ├── fees/
│   │   │   │   └── page.tsx
│   │   │   ├── grades/
│   │   │   │   └── page.tsx
│   │   │   ├── manage/
│   │   │   │   ├── admissions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── calendar/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── library/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── vora/
│   │   │   │       └── page.tsx
│   │   │   ├── messages/
│   │   │   │   └── page.tsx
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   ├── parent/
│   │   │   │   ├── announcements/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── assignments/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── attendance/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── calendar/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── child-profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── fees/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── grades/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── messages/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── timetable/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   ├── student/
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── announcements/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── assignments/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── attendance/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── calendar/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── fees/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── grades/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── parent/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── report-card/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── timetable/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── teacher/
│   │   │   │   ├── assignments/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── class-dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── marks/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── registers/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── students/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── timetables/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── vora/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── timetable/
│   │   │   │   └── page.tsx
│   │   │   ├── unauthorized/
│   │   │   │   └── page.tsx
│   │   │   ├── error.tsx
│   │   │   ├── layout.tsx
│   │   │   └── loading.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── academics/
│   │   │   └── page.tsx
│   │   ├── admissions/
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── audit/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── backup/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── campuses/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── classes/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── errors/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── fees/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── impersonate/
│   │   │   │   │   └── exit/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── import/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── ims/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── library/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── pages/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── parents/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── recover/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── reports/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── sessions/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── settings/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── setup/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── sovereign-view/
│   │   │   │   │   ├── activity/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── permissions/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── staff/
│   │   │   │   │   ├── credentials/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── permissions/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── stats/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── students/
│   │   │   │   │   ├── bulk/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── credentials/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── subjects/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── suggestions/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── timetable-builder/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── timetable-config/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── users/
│   │   │   │   │   └── route.ts
│   │   │   │   └── vora/
│   │   │   │       └── route.ts
│   │   │   ├── admissions/
│   │   │   │   └── route.ts
│   │   │   ├── announcements/
│   │   │   │   └── route.ts
│   │   │   ├── assignments/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── submissions/
│   │   │   │   │   │   ├── grade/
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── attendance/
│   │   │   │   └── route.ts
│   │   │   ├── auth/
│   │   │   │   ├── change-password/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── first-login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── me/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── onboarding/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── permissions/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── refresh/
│   │   │   │   │   └── route.ts
│   │   │   │   └── student-login/
│   │   │   │       └── route.ts
│   │   │   ├── calendar/
│   │   │   │   └── route.ts
│   │   │   ├── chat/
│   │   │   │   └── route.ts
│   │   │   ├── conversations/
│   │   │   │   └── route.ts
│   │   │   ├── fees/
│   │   │   │   └── route.ts
│   │   │   ├── grades/
│   │   │   │   └── route.ts
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   ├── joy/
│   │   │   │   ├── actions/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── admin-requests/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── anomalies/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── attendance/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── grades/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── audit/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── communication/
│   │   │   │   │   └── draft/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── context/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── draw/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── extract/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── knowledge/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── messages/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── page-assistants/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── page-interactions/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── preferences/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── public-chat/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── reports/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── generate/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   └── search/
│   │   │   │       └── route.ts
│   │   │   ├── library/
│   │   │   │   └── route.ts
│   │   │   ├── messages/
│   │   │   │   └── route.ts
│   │   │   ├── notifications/
│   │   │   │   └── route.ts
│   │   │   ├── onboarding/
│   │   │   │   ├── create-headteacher/
│   │   │   │   │   └── route.ts
│   │   │   │   └── setup-super-admin/
│   │   │   │       └── route.ts
│   │   │   ├── pages/
│   │   │   │   └── public/
│   │   │   │       └── route.ts
│   │   │   ├── parent/
│   │   │   │   ├── announcements/
│   │   │   │   │   ├── read/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── assignments/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── attendance/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── calendar/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── child-profile/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── children/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── fees/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── grades/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── messages/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── teachers/
│   │   │   │   │   └── route.ts
│   │   │   │   └── timetable/
│   │   │   │       └── route.ts
│   │   │   ├── profile/
│   │   │   │   └── related/
│   │   │   │       └── route.ts
│   │   │   ├── public/
│   │   │   │   ├── admissions/
│   │   │   │   │   └── route.ts
│   │   │   │   └── campuses/
│   │   │   │       └── route.ts
│   │   │   ├── settings/
│   │   │   │   ├── preferences/
│   │   │   │   │   └── route.ts
│   │   │   │   └── profile/
│   │   │   │       └── route.ts
│   │   │   ├── student/
│   │   │   │   ├── fees/
│   │   │   │   │   └── route.ts
│   │   │   │   └── report-card/
│   │   │   │       └── route.ts
│   │   │   ├── suggestions/
│   │   │   │   └── route.ts
│   │   │   ├── teacher/
│   │   │   │   ├── class-dashboard/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── classes/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── students/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── route.ts
│   │   │   │   ├── subjects/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── timetables/
│   │   │   │   │   └── route.ts
│   │   │   │   └── vora/
│   │   │   │       └── assign/
│   │   │   │           └── route.ts
│   │   │   ├── timetable/
│   │   │   │   └── route.ts
│   │   │   ├── upload/
│   │   │   │   └── route.ts
│   │   │   └── vora/
│   │   │       ├── content/
│   │   │       │   └── route.ts
│   │   │       ├── continue/
│   │   │       │   └── route.ts
│   │   │       ├── engage/
│   │   │       │   └── route.ts
│   │   │       ├── public/
│   │   │       │   └── route.ts
│   │   │       ├── saved-videos/
│   │   │       │   └── route.ts
│   │   │       ├── search/
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   ├── calendar/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── downloads/
│   │   │   └── page.tsx
│   │   ├── faqs/
│   │   │   └── page.tsx
│   │   ├── gallery/
│   │   │   └── page.tsx
│   │   ├── help/
│   │   │   └── page.tsx
│   │   ├── library/
│   │   │   └── page.tsx
│   │   ├── news-events/
│   │   │   └── page.tsx
│   │   ├── notices/
│   │   │   └── page.tsx
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── policies/
│   │   │   └── page.tsx
│   │   ├── students/
│   │   │   └── page.tsx
│   │   ├── vora/
│   │   │   └── page.tsx
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── analytics/
│   │   │   ├── AnomaliesCard.tsx
│   │   │   ├── AtRiskStudentsCard.tsx
│   │   │   └── AttendanceInsightsCard.tsx
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── joy/
│   │   │   ├── AttachmentChip.tsx
│   │   │   ├── AttachmentPreview.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── ImageEditor.tsx
│   │   │   ├── JoyAIDrawPanel.tsx
│   │   │   ├── JoyChat.tsx
│   │   │   ├── JoyHeader.tsx
│   │   │   ├── JoyPageBubble.tsx
│   │   │   ├── JoyPublicChat.tsx
│   │   │   ├── JoySearchModal.tsx
│   │   │   ├── JoySidebar.tsx
│   │   │   ├── JoySourceViewer.tsx
│   │   │   ├── JoyThinkingIndicator.tsx
│   │   │   ├── JoyVoiceInput.tsx
│   │   │   └── JoyWhiteboard.tsx
│   │   ├── layout/
│   │   │   └── PublicLayout.tsx
│   │   ├── loading/
│   │   │   └── WorldClassLoader.tsx
│   │   ├── permissions/
│   │   │   └── PermissionSelector.tsx
│   │   ├── pwa/
│   │   │   └── InstallPrompt.tsx
│   │   ├── shared/
│   │   │   └── QueryProvider.tsx
│   │   ├── staff/
│   │   │   └── CredentialModal.tsx
│   │   ├── ui/
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── RichTextEditor.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Table.tsx
│   │   ├── vora/
│   │   │   ├── AuthGateModal.tsx
│   │   │   └── VideoPlayerModal.tsx
│   │   ├── AnimatedCounter.tsx
│   │   ├── CmsPageContent.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── SchoolDocumentHeader.tsx
│   │   └── ScrollReveal.tsx
│   ├── contexts/
│   │   └── ParentContext.tsx
│   ├── hooks/
│   │   ├── useAttachments.ts
│   │   ├── useAuth.ts
│   │   ├── useInactivityLogout.ts
│   │   ├── useJoyAdminRequests.ts
│   │   ├── useJoyAnalytics.ts
│   │   ├── useJoyCommunication.ts
│   │   ├── useJoyConversations.ts
│   │   ├── useJoyKnowledge.ts
│   │   ├── useJoyPageAssistant.ts
│   │   ├── useJoyPreferences.ts
│   │   ├── useJoyReports.ts
│   │   ├── useModuleVisibility.ts
│   │   └── useStore.ts
│   ├── lib/
│   │   ├── admin-segment.ts
│   │   ├── aevibron.ts
│   │   ├── api-client.ts
│   │   ├── audit.ts
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── db-helpers.ts
│   │   ├── education-quotes.ts
│   │   ├── errors.ts
│   │   ├── image-utils.ts
│   │   ├── joy-actions.ts
│   │   ├── joy-context.ts
│   │   ├── joy-extract.ts
│   │   ├── joy-guardrails.ts
│   │   ├── joy-search.ts
│   │   ├── joy-themes.ts
│   │   ├── joy-tools.ts
│   │   ├── permissions.ts
│   │   ├── rate-limiter.ts
│   │   ├── security.ts
│   │   ├── session.ts
│   │   ├── supabase-client.ts
│   │   ├── supabase-server.ts
│   │   ├── supabase.ts
│   │   ├── upload-client.ts
│   │   ├── utils.ts
│   │   ├── validation.ts
│   │   ├── vora-utils.ts
│   │   ├── vora.ts
│   │   └── youtube.ts
│   ├── stores/
│   │   └── permissions.ts
│   ├── types/
│   │   ├── api-responses.ts
│   │   ├── attachments.ts
│   │   ├── database.ts
│   │   ├── index.ts
│   │   ├── joy.ts
│   │   ├── pdf-parse.d.ts
│   │   ├── react-syntax-highlighter.d.ts
│   │   └── speech-recognition.d.ts
│   └── middleware.ts
├── supabase/
│   └── migrations/
│       ├── 001_core_schema.sql
│       ├── 002_seed_data.sql
│       ├── 003_admin_setup.sql
│       ├── 004_joy_ai.sql
│       ├── 005_parent_experience.sql
│       ├── 006_academic_operations.sql
│       ├── 007_reporting_and_imports.sql
│       ├── 008_platform_operations.sql
│       ├── 009_storage.sql
│       └── MIGRATIONS.md
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── README.md
├── SECURITY.md
├── SETUP.md
├── SETUP_TYPES.md
├── next-env.d.ts
├── next.config.js
├── package.json
├── postcss.config.js
├── setup-ci-fix.sh
├── tailwind.config.ts
└── tsconfig.json
```

</details>

---

## Getting Started

```bash
git clone https://github.com/BishopDavisJoyAcademy/BDJA.git
cd BDJA
npm install
cp .env.example .env.local   # fill in your Supabase credentials
npm run dev
```

Then apply the database — **[docs/SETUP.md](docs/SETUP.md)** walks through the environment,
migrations (`001 → 009`), admin bootstrap and automated type generation step by step.

### Documentation

| Document | Contents |
|----------|----------|
| **[docs/SETUP.md](docs/SETUP.md)** | Environment, database setup, admin bootstrap, type generation via GitHub Actions |
| **[docs/SECURITY.md](docs/SECURITY.md)** | Threat model, controls, quarterly audit checklist |
| **[supabase/migrations/MIGRATIONS.md](supabase/migrations/MIGRATIONS.md)** | Running and understanding the nine migrations |

---

## Security

Hardened by default: RLS on every table, dual-auth API routes, granular permissions,
login lockouts with password history, rate limiting, DOMPurify-sanitized rich text,
strict CSP — full details in **[docs/SECURITY.md](docs/SECURITY.md)**.

---

<div align="center">

<img src="public/logo-official.png" width="64" />

<sub><b>Bishop Davis Joy Academy</b> · v1.0.0 · Built with pride</sub>

</div>
