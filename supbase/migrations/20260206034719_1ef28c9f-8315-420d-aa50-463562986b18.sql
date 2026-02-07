
-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT NOT NULL,
  package_type INTEGER NOT NULL CHECK (package_type IN (2, 4)),
  design_type TEXT NOT NULL DEFAULT 'standard',
  standard_design_id TEXT,
  included_raffles INTEGER NOT NULL DEFAULT 1,
  additional_raffles INTEGER NOT NULL DEFAULT 0,
  total_raffles INTEGER NOT NULL DEFAULT 1,
  raffle_cost NUMERIC NOT NULL DEFAULT 0,
  package_base_cost NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  gcash_reference TEXT,
  order_status TEXT NOT NULL DEFAULT 'pending_photo',
  photo_status TEXT NOT NULL DEFAULT 'awaiting',
  order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  photo_uploaded_date TIMESTAMPTZ,
  project_completed_date TIMESTAMPTZ,
  packed_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  delivery_recipient TEXT,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete orders" ON public.orders FOR DELETE USING (true);

-- =============================================
-- RAFFLE ENTRIES TABLE
-- =============================================
CREATE TABLE public.raffle_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT NOT NULL,
  raffle_number INTEGER NOT NULL,
  is_winner BOOLEAN NOT NULL DEFAULT false,
  won_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view raffle_entries" ON public.raffle_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert raffle_entries" ON public.raffle_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update raffle_entries" ON public.raffle_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete raffle_entries" ON public.raffle_entries FOR DELETE USING (true);

-- =============================================
-- RAFFLE WINNERS TABLE
-- =============================================
CREATE TABLE public.raffle_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.raffle_entries(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  section TEXT NOT NULL,
  won_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prize_details TEXT
);

ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view raffle_winners" ON public.raffle_winners FOR SELECT USING (true);
CREATE POLICY "Anyone can insert raffle_winners" ON public.raffle_winners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update raffle_winners" ON public.raffle_winners FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete raffle_winners" ON public.raffle_winners FOR DELETE USING (true);

-- =============================================
-- ALTER PROJECTS TABLE - Add new columns
-- =============================================
ALTER TABLE public.projects
  ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN customer_name TEXT,
  ADD COLUMN grade TEXT,
  ADD COLUMN section TEXT,
  ADD COLUMN package_type INTEGER,
  ADD COLUMN design_type TEXT,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'awaiting_photo',
  ADD COLUMN thumbnail_url TEXT,
  ADD COLUMN photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN last_edited_at TIMESTAMPTZ,
  ADD COLUMN completed_at TIMESTAMPTZ;

-- =============================================
-- STORAGE BUCKET for project images
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true);

CREATE POLICY "Anyone can view project images"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-images');

CREATE POLICY "Anyone can upload project images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Anyone can update project images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-images');

CREATE POLICY "Anyone can delete project images"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-images');

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
