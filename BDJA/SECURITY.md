# BDJA Platform v3.0 - Security Architecture Documentation

## Overview

This document describes the authentication and authorization security architecture implemented in BDJA v3.0.

## Key Security Features

### 1. Auto-Profile Creation
- Database trigger `auto_create_profile_trigger` automatically creates a `profiles` row whenever a new `auth.users` row is inserted
- Prevents the missing-profile bug that caused the `?error=suspended` redirect

### 2. Account Lockout
- After 5 failed login attempts, account is locked for 30 minutes
- Lockout duration doubles exponentially with each subsequent lockout
- Admin can unlock accounts via `/api/admin/recover`

### 3. Session Tracking
- All sessions tracked server-side in `user_sessions` table
- Sessions can be revoked individually or all at once
- Password changes invalidate all other sessions

### 4. Password History
- Last 5 passwords stored in `password_history`
- Prevents password reuse

### 5. Audit Logging
- All login attempts, password changes, account locks/unlocks logged
- IP address and user agent tracked

### 6. Emergency Recovery
- `/api/admin/recover` supports:
  - `restore_own_profile` - Self-service profile recovery
  - `unlock_account` - Admin unlocks locked account
  - `force_logout` - Admin revokes all sessions
  - `restore_profile` - Admin restores missing profile

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| NO_SESSION | 401 | No valid session found |
| INVALID_TOKEN | 401 | Token expired or invalid |
| PROFILE_MISSING | 404 | Profile row missing |
| ACCOUNT_LOCKED | 403 | Account temporarily locked |
| PROFILE_INACTIVE | 403 | Account suspended |
| RATE_LIMITED | 429 | Too many requests |

## Deployment Checklist

- [ ] Run `007_auth_security_overhaul.sql` in Supabase SQL Editor
- [ ] Set `NEXT_PUBLIC_APP_URL` environment variable
- [ ] Verify `auto_create_profile_trigger` is active
- [ ] Test login flow with existing users
- [ ] Test account lockout with 5 failed attempts
