// Local types matching the database schema

export interface Order {
  id: string;
  customer_name: string;
  grade: string;
  section: string;
  package_type: number;
  design_type: string;
  standard_design_id: string | null;
  included_raffles: number;
  additional_raffles: number;
  total_raffles: number;
  raffle_cost: number;
  package_base_cost: number;
  total_amount: number;
  payment_method: string;
  gcash_reference: string | null;
  order_status: string;
  photo_status: string;
  order_date: string;
  photo_uploaded_date: string | null;
  project_completed_date: string | null;
  packed_date: string | null;
  delivery_date: string | null;
  delivery_recipient: string | null;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  template_id: string | null;
  photo_url: string | null;
  canvas_data: any;
  frame_color: string | null;
  order_id: string | null;
  customer_name: string | null;
  grade: string | null;
  section: string | null;
  package_type: number | null;
  design_type: string | null;
  status: string;
  thumbnail_url: string | null;
  photo_uploaded_at: string | null;
  last_edited_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RaffleEntry {
  id: string;
  order_id: string;
  customer_name: string;
  grade: string;
  section: string;
  raffle_number: number;
  is_winner: boolean;
  won_at: string | null;
  created_at: string;
}

export interface RaffleWinner {
  id: string;
  entry_id: string;
  order_id: string;
  customer_name: string;
  grade: string;
  section: string;
  won_at: string;
  prize_details: string | null;
}

export interface PrintTemplate {
  id: string;
  template_number: string;
  status: string; // 'filling' | 'complete' | 'downloaded' | 'printed'
  slots_used: number;
  total_slots: number;
  final_image_url: string | null;
  created_at: string;
  completed_at: string | null;
  downloaded_at: string | null;
  printed_at: string | null;
}

export interface TemplateSlot {
  id: string;
  template_id: string;
  position: number;
  order_id: string | null;
  project_id: string | null;
  photo_url: string | null;
  student_name: string | null;
  grade: string | null;
  section: string | null;
  package_type: number | null;
  inserted_at: string;
}
