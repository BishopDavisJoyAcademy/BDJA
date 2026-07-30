# BDJA Platform v2.0 - Migration Guide

## What Changed

### Security Fixes
1. **All API routes now require authentication** - No more unprotected endpoints
2. **Role-based access control** - Middleware checks permissions on every route
3. **Rate limiting** - Built-in protection against brute force and abuse
4. **Input validation** - Zod schemas on all API routes
5. **CORS restricted** - No more wildcard `*` origins
6. **Password strength requirements** - Minimum 8 chars, uppercase, lowercase, number, special char
7. **No hardcoded secrets** - All credentials from environment variables
8. **Audit logging** - Every admin action is logged
9. **Password change enforcement** - All users must change temp password on first login
10. **Zustand no longer persists user data** - Sensitive data stays out of localStorage

### New Features
1. **Super Admin setup from env vars** - Run `/admin/setup` once after deployment
2. **Headteacher creation** - Super Admin creates the first headteacher
3. **Student creation with parent** - One form creates both student and parent accounts
4. **Print & WhatsApp share** - Auto-generated credentials sharing
5. **VORA video system** - Grade-based video browsing with search and filters
6. **Joy AI with VORA integration** - Searches local content first, falls back to YouTube
7. **Saved Videos library** - Students can save recommended videos
8. **Error boundaries** - Graceful error handling across the app
9. **Loading states** - Smooth transitions between pages

## Setup Steps

### 1. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in ALL values:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Aevibron
NEXT_PUBLIC_AEVIBRON_ENDPOINT=https://api.aevibron.com/api/v1/chat
AEVIBRON_API_KEY=

# Super Admin (one-time setup)
SUPER_ADMIN_EMAIL=admin@bdja.ac.ke
SUPER_ADMIN_PASSWORD=YourStrongP@ssw0rd!
SUPER_ADMIN_NAME=System Administrator

# YouTube (for Joy AI fallback)
YOUTUBE_API_KEY=

# App
DEFAULT_PASSWORD=BDJA2026!
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Database Migrations
Run these in order:
```bash
# 1. Original schema (from original repo)
supabase migrations up 001_initial_schema.sql

# 2. Seed super admin (from original repo)
supabase migrations up 002_seed_super_admin.sql

# 3. Security updates (NEW - included in this update)
supabase migrations up 003_security_updates.sql
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Setup Super Admin
1. Deploy the app
2. Visit `/admin/setup`
3. Click "Create Super Admin"
4. The super admin account is created from your env vars
5. Log in with the super admin credentials
6. **Immediately change the password** (enforced)

### 5. Create Headteacher
1. As super admin, go to `/admin/users`
2. Create a user with role "Principal" (Headteacher)
3. Share credentials via Print or WhatsApp
4. The headteacher logs in and changes their password

### 6. Populate VORA Content
1. Open `content/youtube/` folder
2. Edit each grade JSON file with real YouTube educational videos
3. Follow the schema documented in `content/youtube/README.md`
4. Restart the dev server or redeploy

## File Changes Summary

### New Files
- `src/lib/validation.ts` - Zod schemas for all inputs
- `src/lib/rate-limiter.ts` - Rate limiting (Upstash + memory fallback)
- `src/lib/audit.ts` - Audit logging helper
- `src/lib/vora.ts` - VORA content loading and search
- `src/lib/youtube.ts` - YouTube API integration
- `src/app/api/onboarding/setup-super-admin/route.ts` - Super admin setup
- `src/app/api/onboarding/create-headteacher/route.ts` - Headteacher creation
- `src/app/api/auth/change-password/route.ts` - Secure password change
- `src/app/api/vora/search/route.ts` - VORA search API
- `src/app/api/vora/content/route.ts` - VORA content API
- `src/app/api/vora/saved-videos/route.ts` - Saved videos CRUD
- `src/app/(dashboard)/admin/setup/page.tsx` - Setup UI
- `src/app/(dashboard)/admin/users/page.tsx` - User management UI
- `src/app/(dashboard)/vora/page.tsx` - VORA learning page
- `src/app/error.tsx` - Global error boundary
- `src/app/loading.tsx` - Global loading state
- `src/app/(dashboard)/error.tsx` - Dashboard error boundary
- `src/app/(dashboard)/loading.tsx` - Dashboard loading state
- `content/youtube/*.json` - VORA content files
- `supabase/migrations/003_security_updates.sql` - DB security updates

### Modified Files
- `next.config.js` - Restricted CORS, security headers
- `package.json` - Updated dependencies
- `src/middleware.ts` - Added active check, password enforcement, role-based routing
- `src/lib/auth.ts` - Added temp password generation, student+parent creation
- `src/lib/aevibron.ts` - Added timeout, abort controller, VORA context
- `src/lib/permissions.ts` - Added route permission mapping
- `src/lib/supabase-server.ts` - Added env validation
- `src/hooks/useAuth.ts` - Added cleanup, safer state management
- `src/hooks/useStore.ts` - Removed sensitive data from persistence
- `src/app/layout.tsx` - Added Toaster config
- `src/app/(dashboard)/layout.tsx` - Added auth redirect, loading state
- `src/app/(dashboard)/page.tsx` - Improved dashboard UI
- `src/app/(auth)/login/page.tsx` - Added suspended error display
- `src/app/(auth)/reset-password/page.tsx` - Added strength meter, current password check
- `src/app/api/admin/create-user/route.ts` - Added auth, validation, audit, student+parent flow
- `src/app/api/chat/route.ts` - Added auth, validation, VORA search, YouTube fallback
- `src/app/api/health/route.ts` - Added DB health check
- `src/components/joy/JoyChat.tsx` - Complete rewrite with VORA results, save functionality
- `src/components/dashboard/Sidebar.tsx` - Permission-based nav filtering
- `src/components/dashboard/TopBar.tsx` - Improved UX
- `src/components/ui/*.tsx` - Added missing UI components
- `.env.local.example` - Complete env template

## Important Notes
- The old `DEFAULT_PASSWORD` fallback to `"BDJA2026!"` has been removed. You MUST set it in env vars.
- All API keys must be in environment variables. Never commit them.
- The YouTube API key is optional but recommended for Joy AI fallback search.
- Rate limiting uses Upstash Redis in production; falls back to memory in development.
- VORA content is read from JSON files at runtime. No database needed for videos.
