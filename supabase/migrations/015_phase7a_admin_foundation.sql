-- ============================================================
-- BDJA Phase 7A: Admin Foundation Fixes
-- Dark theme UI primitives, Users/Campuses/Setup/Audit rewrites
-- No new tables - uses existing schema
-- Date: 2026-09-06
-- ============================================================

-- Ensure permission categories exist FIRST (required by FK constraint)
INSERT INTO permission_categories (key, name, icon, sort_order) VALUES
  ('users', 'User Management', 'Users', 1),
  ('campuses', 'Campus Management', 'Building2', 2),
  ('audit', 'Audit & Compliance', 'Shield', 10)
ON CONFLICT (key) DO NOTHING;

-- Then insert permissions
INSERT INTO permissions (key, name, category, description) VALUES
  ('users.view', 'View All Users', 'users', 'View the complete list of all platform users'),
  ('users.edit', 'Edit Users', 'users', 'Activate or deactivate user accounts'),
  ('campuses.create', 'Create Campuses', 'campuses', 'Add new school campuses'),
  ('campuses.edit', 'Edit Campuses', 'campuses', 'Modify campus details'),
  ('campuses.delete', 'Delete Campuses', 'campuses', 'Remove campuses from the system'),
  ('audit.view', 'View Audit Logs', 'audit', 'Access the complete audit log history')
ON CONFLICT (key) DO NOTHING;
