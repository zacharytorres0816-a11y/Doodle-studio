import { supabase } from '@/integrations/supabase/client';
import { PrintTemplate } from '@/types/database';

/**
 * Inserts a framed photo into the A4 template system.
 * Package 2 = 2 slots, Package 4 = 4 slots.
 * Auto-creates new templates as needed.
 */
export async function insertPhotoIntoTemplate(
  orderId: string,
  projectId: string,
  editedStripUrl: string,
  studentName: string,
  grade: string,
  section: string,
  packageType: number
) {
  const slotsNeeded = packageType === 4 ? 4 : 2;
  let remaining = slotsNeeded;

  while (remaining > 0) {
    const template = await getOrCreateActiveTemplate();
    const available = template.total_slots - template.slots_used;
    const toFill = Math.min(remaining, available);

    const slots = [];
    for (let i = 0; i < toFill; i++) {
      slots.push({
        template_id: template.id,
        position: template.slots_used + i + 1,
        order_id: orderId,
        project_id: projectId,
        photo_url: editedStripUrl,
        student_name: studentName,
        grade,
        section,
        package_type: packageType,
      });
    }

    await supabase.from('template_slots').insert(slots as any).select();

    const newSlotsUsed = template.slots_used + toFill;
    const isComplete = newSlotsUsed >= 6;

    await supabase
      .from('print_templates')
      .update({
        slots_used: newSlotsUsed,
        status: isComplete ? 'complete' : 'filling',
        completed_at: isComplete ? new Date().toISOString() : null,
      } as any)
      .eq('id', template.id);

    remaining -= toFill;
  }
}

async function getOrCreateActiveTemplate(): Promise<PrintTemplate> {
  const { data } = await supabase
    .from('print_templates')
    .select('*')
    .eq('status', 'filling')
    .order('created_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return data[0] as unknown as PrintTemplate;
  }

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('print_templates')
    .select('*', { count: 'exact', head: true });

  const num = (count || 0) + 1;
  const templateNumber = `TMPL-${year}-${String(num).padStart(4, '0')}`;

  const { data: newTmpl, error } = await supabase
    .from('print_templates')
    .insert({
      template_number: templateNumber,
      status: 'filling',
      slots_used: 0,
      total_slots: 6,
    } as any)
    .select()
    .single();

  if (error || !newTmpl) {
    throw new Error('Failed to create template: ' + error?.message);
  }

  return newTmpl as unknown as PrintTemplate;
}
