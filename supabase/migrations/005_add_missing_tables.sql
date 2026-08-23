-- Migration: Add missing platform_settings and inventory_items tables
-- Run this in Supabase SQL Editor before regenerating types

-- ============================================================
-- TABLE: platform_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text,
  school_code text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  country text DEFAULT 'Kenya',
  logo_url text,
  favicon_url text,
  theme text DEFAULT 'default',
  primary_color text,
  accent_color text,
  academic_year text,
  term text,
  term_start_date date,
  term_end_date date,
  timezone text DEFAULT 'Africa/Nairobi',
  currency text DEFAULT 'KES',
  maintenance_mode boolean DEFAULT false,
  registration_open boolean DEFAULT true,
  max_class_size integer DEFAULT 40,
  grading_system text DEFAULT 'percentage',
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  auto_backup boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.platform_settings IS 'Global school configuration and branding settings';

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on platform_settings"
  ON public.platform_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_category = 'admin'
    )
  );

-- ============================================================
-- TABLE: inventory_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  quantity integer DEFAULT 0,
  unit text DEFAULT 'pcs',
  location text,
  condition text DEFAULT 'good',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchase_date date,
  purchase_cost numeric(12,2),
  supplier text,
  serial_number text,
  barcode text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE public.inventory_items IS 'School inventory and asset management';

CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_inventory_items_assigned_to ON public.inventory_items(assigned_to);
CREATE INDEX idx_inventory_items_is_active ON public.inventory_items(is_active);
CREATE INDEX idx_inventory_items_name ON public.inventory_items USING gin(name gin_trgm_ops);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on inventory_items"
  ON public.inventory_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_category = 'admin'
    )
  );
