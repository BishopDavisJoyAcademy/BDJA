-- ============================================================
-- BDJA Phase 7B: Sovereign View
-- New permissions for session management and permission override
-- Date: 2026-09-06
-- ============================================================

-- Ensure permission categories exist
INSERT INTO permission_categories (key, name, icon, sort_order) VALUES
  ('permissions', 'Permission Management', 'Shield', 3)
ON CONFLICT (key) DO NOTHING;

-- New permissions
INSERT INTO permissions (key, name, category, description) VALUES
  ('permissions.view', 'View Permissions', 'permissions', 'View user permission assignments'),
  ('permissions.edit', 'Edit Permissions', 'permissions', 'Grant or revoke user permissions')
ON CONFLICT (key) DO NOTHING;
