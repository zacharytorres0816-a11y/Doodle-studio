-- Doodle Studio canonical schema for Supabase Postgres
-- Preserves table shapes, constraints, indexes, and triggers used by the current API.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  preview_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  grade text NOT NULL,
  section text NOT NULL,
  package_type integer NOT NULL CHECK (package_type IN (2, 4)),
  design_type text NOT NULL DEFAULT 'standard',
  standard_design_id text,
  included_raffles integer NOT NULL DEFAULT 1,
  additional_raffles integer NOT NULL DEFAULT 0,
  total_raffles integer NOT NULL DEFAULT 1,
  raffle_cost numeric NOT NULL DEFAULT 0,
  package_base_cost numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  gcash_reference text,
  order_status text NOT NULL DEFAULT 'pending_photo',
  photo_status text NOT NULL DEFAULT 'awaiting',
  order_date timestamptz NOT NULL DEFAULT now(),
  photo_uploaded_date timestamptz,
  project_completed_date timestamptz,
  packed_date timestamptz,
  delivery_date timestamptz,
  delivery_recipient text,
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  photo_url text,
  canvas_data jsonb,
  frame_color text DEFAULT '#FFFFFF',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text,
  grade text,
  section text,
  package_type integer,
  design_type text,
  status text NOT NULL DEFAULT 'awaiting_photo',
  thumbnail_url text,
  photo_uploaded_at timestamptz,
  last_edited_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'filling',
  slots_used integer NOT NULL DEFAULT 0,
  total_slots integer NOT NULL DEFAULT 6,
  final_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  downloaded_at timestamptz,
  printed_at timestamptz,
  CONSTRAINT print_templates_total_slots_check CHECK (total_slots > 0)
);

CREATE TABLE IF NOT EXISTS public.template_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.print_templates(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1 AND position <= 6),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  photo_url text,
  student_name text,
  grade text,
  section text,
  package_type integer,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, position)
);

CREATE TABLE IF NOT EXISTS public.raffle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  grade text NOT NULL,
  section text NOT NULL,
  raffle_number integer NOT NULL,
  is_winner boolean NOT NULL DEFAULT false,
  won_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.raffle_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.raffle_entries(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  grade text NOT NULL,
  section text NOT NULL,
  won_at timestamptz NOT NULL DEFAULT now(),
  prize_details text
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_order_id ON public.projects(order_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_grade_section ON public.orders(grade, section);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_print_templates_status ON public.print_templates(status);
CREATE INDEX IF NOT EXISTS idx_print_templates_created_at ON public.print_templates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_slots_template_id ON public.template_slots(template_id);
CREATE INDEX IF NOT EXISTS idx_template_slots_order_id ON public.template_slots(order_id);
CREATE INDEX IF NOT EXISTS idx_template_slots_project_id ON public.template_slots(project_id);

CREATE INDEX IF NOT EXISTS idx_raffle_entries_order_id ON public.raffle_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_is_winner ON public.raffle_entries(is_winner);
CREATE INDEX IF NOT EXISTS idx_raffle_winners_order_id ON public.raffle_winners(order_id);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS is enabled with permissive prototype policies to preserve current no-auth backend behavior.
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_select_all ON public.templates;
DROP POLICY IF EXISTS templates_insert_all ON public.templates;
DROP POLICY IF EXISTS templates_update_all ON public.templates;
DROP POLICY IF EXISTS templates_delete_all ON public.templates;
CREATE POLICY templates_select_all ON public.templates FOR SELECT USING (true);
CREATE POLICY templates_insert_all ON public.templates FOR INSERT WITH CHECK (true);
CREATE POLICY templates_update_all ON public.templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY templates_delete_all ON public.templates FOR DELETE USING (true);

DROP POLICY IF EXISTS orders_select_all ON public.orders;
DROP POLICY IF EXISTS orders_insert_all ON public.orders;
DROP POLICY IF EXISTS orders_update_all ON public.orders;
DROP POLICY IF EXISTS orders_delete_all ON public.orders;
CREATE POLICY orders_select_all ON public.orders FOR SELECT USING (true);
CREATE POLICY orders_insert_all ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY orders_update_all ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY orders_delete_all ON public.orders FOR DELETE USING (true);

DROP POLICY IF EXISTS projects_select_all ON public.projects;
DROP POLICY IF EXISTS projects_insert_all ON public.projects;
DROP POLICY IF EXISTS projects_update_all ON public.projects;
DROP POLICY IF EXISTS projects_delete_all ON public.projects;
CREATE POLICY projects_select_all ON public.projects FOR SELECT USING (true);
CREATE POLICY projects_insert_all ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY projects_update_all ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY projects_delete_all ON public.projects FOR DELETE USING (true);

DROP POLICY IF EXISTS print_templates_select_all ON public.print_templates;
DROP POLICY IF EXISTS print_templates_insert_all ON public.print_templates;
DROP POLICY IF EXISTS print_templates_update_all ON public.print_templates;
DROP POLICY IF EXISTS print_templates_delete_all ON public.print_templates;
CREATE POLICY print_templates_select_all ON public.print_templates FOR SELECT USING (true);
CREATE POLICY print_templates_insert_all ON public.print_templates FOR INSERT WITH CHECK (true);
CREATE POLICY print_templates_update_all ON public.print_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY print_templates_delete_all ON public.print_templates FOR DELETE USING (true);

DROP POLICY IF EXISTS template_slots_select_all ON public.template_slots;
DROP POLICY IF EXISTS template_slots_insert_all ON public.template_slots;
DROP POLICY IF EXISTS template_slots_update_all ON public.template_slots;
DROP POLICY IF EXISTS template_slots_delete_all ON public.template_slots;
CREATE POLICY template_slots_select_all ON public.template_slots FOR SELECT USING (true);
CREATE POLICY template_slots_insert_all ON public.template_slots FOR INSERT WITH CHECK (true);
CREATE POLICY template_slots_update_all ON public.template_slots FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY template_slots_delete_all ON public.template_slots FOR DELETE USING (true);

DROP POLICY IF EXISTS raffle_entries_select_all ON public.raffle_entries;
DROP POLICY IF EXISTS raffle_entries_insert_all ON public.raffle_entries;
DROP POLICY IF EXISTS raffle_entries_update_all ON public.raffle_entries;
DROP POLICY IF EXISTS raffle_entries_delete_all ON public.raffle_entries;
CREATE POLICY raffle_entries_select_all ON public.raffle_entries FOR SELECT USING (true);
CREATE POLICY raffle_entries_insert_all ON public.raffle_entries FOR INSERT WITH CHECK (true);
CREATE POLICY raffle_entries_update_all ON public.raffle_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY raffle_entries_delete_all ON public.raffle_entries FOR DELETE USING (true);

DROP POLICY IF EXISTS raffle_winners_select_all ON public.raffle_winners;
DROP POLICY IF EXISTS raffle_winners_insert_all ON public.raffle_winners;
DROP POLICY IF EXISTS raffle_winners_update_all ON public.raffle_winners;
DROP POLICY IF EXISTS raffle_winners_delete_all ON public.raffle_winners;
CREATE POLICY raffle_winners_select_all ON public.raffle_winners FOR SELECT USING (true);
CREATE POLICY raffle_winners_insert_all ON public.raffle_winners FOR INSERT WITH CHECK (true);
CREATE POLICY raffle_winners_update_all ON public.raffle_winners FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY raffle_winners_delete_all ON public.raffle_winners FOR DELETE USING (true);
