-- ============================================================
-- BDJA Platform v4.0 — Data Migration
-- Migration 009: Migrate Existing Users to New Model
-- ============================================================

-- ============================================
-- 1. MIGRATE STUDENTS
-- ============================================
INSERT INTO students (id, profile_id, admission_number, grade_level, status)
SELECT 
  p.id,
  p.id,
  COALESCE(au.raw_user_meta_data->>'admission_number', 'ADM-' || substr(p.id::text, 1, 8)),
  COALESCE(au.raw_user_meta_data->>'grade_level', 'grade1'),
  CASE WHEN p.is_active THEN 'active' ELSE 'inactive' END
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM students s WHERE s.profile_id = p.id);

-- ============================================
-- 2. MIGRATE STAFF (teachers, bursars, librarians, principals)
-- ============================================
INSERT INTO staff (id, employee_id, department, designation, status)
SELECT 
  p.id,
  COALESCE(au.raw_user_meta_data->>'employee_id', p.email),
  CASE p.role
    WHEN 'teacher' THEN 'Academics'
    WHEN 'bursar' THEN 'Finance'
    WHEN 'librarian' THEN 'Library'
    WHEN 'principal' THEN 'Administration'
    WHEN 'super_admin' THEN 'Administration'
    ELSE 'General'
  END,
  p.role,
  CASE WHEN p.is_active THEN 'active' ELSE 'inactive' END
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.role IN ('teacher', 'bursar', 'librarian', 'principal', 'super_admin')
  AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = p.id);

-- ============================================
-- 3. MIGRATE PARENTS (link to students via metadata)
-- ============================================
INSERT INTO parent_students (parent_id, student_id, relationship, is_primary)
SELECT 
  p.id,
  (au.raw_user_meta_data->>'student_id')::UUID,
  COALESCE(au.raw_user_meta_data->>'relationship', 'parent'),
  true
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.role = 'parent'
  AND au.raw_user_meta_data->>'student_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM parent_students ps 
    WHERE ps.parent_id = p.id 
    AND ps.student_id = (au.raw_user_meta_data->>'student_id')::UUID
  );

-- ============================================
-- 4. GRANT DEFAULT PERMISSIONS TO EXISTING STAFF
-- ============================================
-- Teachers
INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT 
  p.id,
  perm.id,
  p.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.role = 'teacher'
  AND perm.key IN (
    'students.view', 'grades.view', 'grades.manage', 'attendance.view', 'attendance.manage',
    'timetable.view', 'timetable.manage', 'assignments.view', 'assignments.manage',
    'calendar.view', 'messages.send', 'library.view', 'vora.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.profile_id = p.id AND sp.permission_id = perm.id
  );

-- Bursars → Finance permissions
INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT 
  p.id,
  perm.id,
  p.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.role = 'bursar'
  AND perm.key IN (
    'fees.view', 'fees.manage', 'payments.verify', 'analytics.view', 'messages.send'
  )
  AND NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.profile_id = p.id AND sp.permission_id = perm.id
  );

-- Librarians → Library permissions
INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT 
  p.id,
  perm.id,
  p.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.role = 'librarian'
  AND perm.key IN (
    'library.view', 'library.manage', 'vora.view', 'messages.send'
  )
  AND NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.profile_id = p.id AND sp.permission_id = perm.id
  );

-- Principals / Super Admins → ALL permissions
INSERT INTO staff_permissions (profile_id, permission_id, granted_by)
SELECT 
  p.id,
  perm.id,
  p.id
FROM profiles p
CROSS JOIN permissions perm
WHERE p.role IN ('principal', 'super_admin')
  AND NOT EXISTS (
    SELECT 1 FROM staff_permissions sp 
    WHERE sp.profile_id = p.id AND sp.permission_id = perm.id
  );
