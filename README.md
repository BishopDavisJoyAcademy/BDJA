# BDJA Platform

Bishop Davis Joy Academy - Competency-Based Curriculum (CBC) Platform

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your credentials
2. Run `npm install`
3. Run Supabase migrations in `supabase/migrations/`
4. Start dev server: `npm run dev`
5. Start signaling server: `npm run server`

## Logo Placement

Place your school logo files in `/public/`:
- `logo.png` - Dashboard background watermark
- `favicon.ico` - Browser icon
- `icon-192x192.png` - PWA icon
- `icon-512x512.png` - PWA icon
- `apple-touch-icon.png` - iOS icon

## Default Password

All new users get password: `BDJA2026!`

## Aevibron Gateway

Joy AI connects to `POST /api/v1/chat` with header `X-Aevibron-Key`.
