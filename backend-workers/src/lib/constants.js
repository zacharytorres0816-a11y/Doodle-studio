export const ORDERABLE_COLUMNS = {
  projects: new Set(['created_at', 'updated_at', 'photo_uploaded_at', 'last_edited_at']),
  orders: new Set(['created_at', 'updated_at', 'order_date', 'packed_date']),
  templates: new Set(['created_at']),
  print_templates: new Set(['created_at', 'downloaded_at', 'printed_at']),
  template_slots: new Set(['position', 'inserted_at']),
  raffle_entries: new Set(['created_at', 'raffle_number']),
  raffle_winners: new Set(['won_at']),
};

export const PRINT_TEMPLATE_STATUS_VALUES = new Set(['filling', 'complete', 'downloaded', 'printed']);
export const TEMPLATE_NUMBER_LOCK_KEY = 90442011;

export const PROJECT_COLUMNS = new Set([
  'name', 'template_id', 'photo_url', 'canvas_data', 'frame_color', 'order_id', 'customer_name',
  'grade', 'section', 'package_type', 'design_type', 'status', 'thumbnail_url', 'photo_uploaded_at',
  'last_edited_at', 'completed_at', 'created_at', 'updated_at',
]);

export const ORDER_COLUMNS = new Set([
  'customer_name', 'grade', 'section', 'package_type', 'design_type', 'standard_design_id', 'included_raffles',
  'additional_raffles', 'total_raffles', 'raffle_cost', 'package_base_cost', 'total_amount', 'payment_method',
  'gcash_reference', 'order_status', 'photo_status', 'order_date', 'photo_uploaded_date', 'project_completed_date',
  'packed_date', 'delivery_date', 'delivery_recipient', 'delivery_notes', 'created_at', 'updated_at',
]);

export const TEMPLATE_COLUMNS = new Set(['name', 'preview_url', 'created_at']);

export const PRINT_TEMPLATE_COLUMNS = new Set([
  'template_number', 'status', 'slots_used', 'total_slots', 'final_image_url', 'created_at',
  'completed_at', 'downloaded_at', 'printed_at',
]);

export const TEMPLATE_SLOT_COLUMNS = new Set([
  'template_id', 'position', 'order_id', 'project_id', 'photo_url', 'student_name', 'grade', 'section',
  'package_type', 'inserted_at',
]);

export const RAFFLE_ENTRY_COLUMNS = new Set([
  'order_id', 'customer_name', 'grade', 'section', 'raffle_number', 'is_winner', 'won_at', 'created_at',
]);

export const RAFFLE_WINNER_COLUMNS = new Set([
  'entry_id', 'order_id', 'customer_name', 'grade', 'section', 'won_at', 'prize_details',
]);
