
-- Print Templates table (A4 sheets with 6 slots)
CREATE TABLE public.print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_number text NOT NULL,
  status text NOT NULL DEFAULT 'filling',
  slots_used integer NOT NULL DEFAULT 0,
  total_slots integer NOT NULL DEFAULT 6,
  final_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  downloaded_at timestamptz,
  printed_at timestamptz
);

-- Template Slots table
CREATE TABLE public.template_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.print_templates(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1 AND position <= 6),
  order_id uuid REFERENCES public.orders(id),
  project_id uuid REFERENCES public.projects(id),
  photo_url text,
  student_name text,
  grade text,
  section text,
  package_type integer,
  inserted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, position)
);

-- Enable RLS
ALTER TABLE public.print_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_slots ENABLE ROW LEVEL SECURITY;

-- RLS policies (open access for prototype)
CREATE POLICY "Anyone can view print_templates" ON public.print_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert print_templates" ON public.print_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update print_templates" ON public.print_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete print_templates" ON public.print_templates FOR DELETE USING (true);

CREATE POLICY "Anyone can view template_slots" ON public.template_slots FOR SELECT USING (true);
CREATE POLICY "Anyone can insert template_slots" ON public.template_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update template_slots" ON public.template_slots FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete template_slots" ON public.template_slots FOR DELETE USING (true);

-- Sequence for template numbering
CREATE SEQUENCE public.template_number_seq START 1;
