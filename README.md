# BDJA Platform

Bishop Davis Joy Academy — A comprehensive school management platform built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Public Website** — Beautiful, animated homepage with CMS-driven content
- **CMS Pages Editor** — Edit /about, /admissions, /contact, /policies, /faqs without touching code
- **Role-Based Dashboard** — Students, Parents, Teachers, Bursar, Librarian, Principal, Super Admin
- **VORA Learning** — Video-based Online Resource for Academic learning
- **Library Management** — Digital & physical resource catalog
- **Fee Management** — Payment tracking & receipt generation
- **Admissions** — Application workflow with status tracking
- **Calendar & Timetable** — Staff-editable, no hardcoded data
- **AI Chatbot (Joy AI)** — Powered by Aevibron Gateway
- **Real-time Messaging** — Between staff, students, and parents

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Realtime)
- Lucide React (Icons)
- React Hot Toast (Notifications)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/BishopDavisJoyAcademy/BDJA.git
cd BDJA
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AEVIBRON_API_KEY=your_aevibron_key
```

### 3. Database Setup

Run the migrations in order:

```bash
# Via Supabase Dashboard SQL Editor
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_super_admin.sql
supabase/migrations/003_security_updates.sql
supabase/migrations/004_homepage_and_teacher_tools.sql
supabase/migrations/005_cms_pages.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## CMS Pages (No-Code Editing)

Admins can edit public page content directly from the dashboard:

1. Log in as **Principal** or **Super Admin**
2. Navigate to **Admin → Pages**
3. Click any page to edit with the rich text editor
4. Changes appear instantly on the public site

**Editable pages:** `/about`, `/admissions`, `/contact`, `/policies`, `/faqs`

Each page has fallback content if no CMS entry exists, so the site never breaks.

## Hero Carousel Images

Place slide images in the `public/slides/` folder:

```
public/slides/
  hero-1.jpg   ← Children in classroom / playground (warm, welcoming)
  hero-2.jpg   ← CBC learning activities / group work
  hero-3.jpg   ← Graduation / achievement moment
```

The carousel auto-plays every 5 seconds. Hover to pause. Click arrows or dots to navigate manually.

## Default Login

- **Email:** `admin@bdja.ac.ke`
- **Password:** `BDJA2026!`

You will be forced to change the password on first login.

## Project Structure

```
src/
  app/
    (auth)/          ← Login, reset-password
    (dashboard)/     ← Role-based dashboards
      admin/         ← Admin tools (users, pages, content, campuses, analytics)
      manage/        ← Management pages (admissions, calendar, library, vora)
      student/       ← Student portal
      parent/        ← Parent portal
      teacher/       ← Teacher tools
      ...
    about/           ← Public about page (CMS-powered)
    admissions/      ← Public admissions page (CMS-powered)
    contact/         ← Public contact page (CMS-powered)
    policies/        ← Public policies page (CMS-powered)
    faqs/            ← Public FAQs page (CMS-powered)
    page.tsx         ← Homepage with animated hero carousel
  components/
    dashboard/       ← Sidebar, TopBar
    layout/          ← PublicLayout
    ui/              ← Reusable UI components + RichTextEditor
    ScrollReveal.tsx ← Scroll-triggered animations
    AnimatedCounter.tsx ← Number count-up animation
    CmsPageContent.tsx ← CMS content wrapper for public pages
  lib/
    permissions.ts   ← Role-based permission system
    auth.ts          ← Password hashing & user creation
    supabase.ts      ← Client-side Supabase client
    supabase-server.ts ← Server-side Supabase client
  types/
    index.ts         ← TypeScript types
    database.ts      ← Database types

supabase/migrations/  ← Database schema migrations
public/
  slides/            ← Hero carousel images
  grades/            ← Grade level icons
  logo.png           ← School logo
```

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based route protection via middleware
- Password hashing with bcrypt (salt rounds: 12)
- Forced password change on first login
- Session management via Supabase Auth
- API routes protected with session validation

## License

© 2024 Bishop Davis Joy Academy. All Rights Reserved.

Designed with ♡ by BDJA ICT Team.
