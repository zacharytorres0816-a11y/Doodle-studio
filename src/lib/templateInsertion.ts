import { api } from '@/lib/api';
import { PrintTemplate } from '@/types/database';
import { normalizeStoredMediaUrl } from '@/lib/mediaUrl';

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
  const normalizedEditedStripUrl = normalizeStoredMediaUrl(editedStripUrl) || editedStripUrl;
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
        photo_url: normalizedEditedStripUrl,
        student_name: studentName,
        grade,
        section,
        package_type: packageType,
      });
    }

    await api.templateSlots.bulkCreate(slots as any);

    const newSlotsUsed = template.slots_used + toFill;
    const isComplete = newSlotsUsed >= 6;

    await api.printTemplates.update(template.id, {
        slots_used: newSlotsUsed,
        status: isComplete ? 'complete' : 'filling',
        completed_at: isComplete ? new Date().toISOString() : null,
      } as any);

    remaining -= toFill;
  }
}

async function getOrCreateActiveTemplate(): Promise<PrintTemplate> {
  const fillingTemplates = await api.printTemplates.list({
    status: 'filling',
    orderBy: 'created_at',
    orderDir: 'desc',
  });
  const data = fillingTemplates.slice(0, 1);

  if (data && data.length > 0) {
    return data[0] as unknown as PrintTemplate;
  }

  const year = new Date().getFullYear();
  const countRes = await api.printTemplates.count();
  const count = countRes.count;

  const num = (count || 0) + 1;
  const templateNumber = `TMPL-${year}-${String(num).padStart(4, '0')}`;

  const newTmpl = await api.printTemplates.create({
      template_number: templateNumber,
      status: 'filling',
      slots_used: 0,
      total_slots: 6,
    } as any);

  if (!newTmpl) {
    throw new Error('Failed to create template');
  }

  return newTmpl as unknown as PrintTemplate;
}
