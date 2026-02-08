import { api } from '@/lib/api';
import { PrintTemplate, TemplateSlot } from '@/types/database';
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
  const safePackageType = Number(packageType) === 4 ? 4 : 2;
  const slotsNeeded = safePackageType;

  // Idempotency guard:
  // if this order already has assigned slots, update those slots first
  // instead of creating additional rows on repeated Save clicks.
  const reusedSlotCount = await upsertExistingOrderSlots({
    orderId,
    projectId,
    photoUrl: normalizedEditedStripUrl,
    studentName,
    grade,
    section,
    packageType: safePackageType,
    slotsNeeded,
  });

  if (reusedSlotCount >= slotsNeeded) {
    return;
  }

  let remaining = slotsNeeded - reusedSlotCount;

  while (remaining > 0) {
    const template = await getOrCreateActiveTemplate();
    const slotsUsed = Number(template.slots_used ?? 0) || 0;
    const totalSlots = Number(template.total_slots ?? 6) || 6;
    const available = Math.max(0, totalSlots - slotsUsed);
    const toFill = Math.min(remaining, available);

    const slots = [];
    for (let i = 0; i < toFill; i++) {
      slots.push({
        template_id: template.id,
        position: slotsUsed + i + 1,
        order_id: orderId,
        project_id: projectId,
        photo_url: normalizedEditedStripUrl,
        student_name: studentName,
        grade,
        section,
        package_type: safePackageType,
      });
    }

    await api.templateSlots.bulkCreate(slots as any);

    const newSlotsUsed = slotsUsed + toFill;
    const isComplete = newSlotsUsed >= 6;

    await api.printTemplates.update(template.id, {
        slots_used: newSlotsUsed,
        status: isComplete ? 'complete' : 'filling',
        completed_at: isComplete ? new Date().toISOString() : null,
      } as any);

    remaining -= toFill;
  }
}

async function upsertExistingOrderSlots(params: {
  orderId: string;
  projectId: string;
  photoUrl: string;
  studentName: string;
  grade: string;
  section: string;
  packageType: number;
  slotsNeeded: number;
}) {
  const {
    orderId,
    projectId,
    photoUrl,
    studentName,
    grade,
    section,
    packageType,
    slotsNeeded,
  } = params;

  const existingSlots = await api.templateSlots.list({
    orderIds: [orderId],
    orderBy: 'inserted_at',
    orderDir: 'asc',
  });

  const normalizedExisting = (existingSlots || [])
    .filter((slot: any) => slot?.template_id && slot?.position !== undefined && slot?.position !== null)
    .map((slot: any) => ({
      ...slot,
      position: Number(slot.position),
    }))
    .filter((slot: any) => Number.isFinite(slot.position) && slot.position >= 1 && slot.position <= 6) as TemplateSlot[];

  if (normalizedExisting.length === 0) {
    return 0;
  }

  const activeTemplates = await api.printTemplates.list({
    statuses: ['filling', 'complete', 'downloaded'],
    orderBy: 'created_at',
    orderDir: 'desc',
  });
  const activeTemplateIds = new Set((activeTemplates || []).map((t: any) => t.id));

  const prioritize = (slot: TemplateSlot) => (activeTemplateIds.has(slot.template_id) ? 0 : 1);
  const deduped = new Map<string, TemplateSlot>();
  [...normalizedExisting]
    .sort((a, b) => prioritize(a) - prioritize(b))
    .forEach((slot) => {
      const key = `${slot.template_id}:${slot.position}`;
      if (!deduped.has(key)) deduped.set(key, slot);
    });

  const slotsToReuse = Array.from(deduped.values()).slice(0, slotsNeeded);
  if (slotsToReuse.length === 0) {
    return 0;
  }

  await api.templateSlots.bulkCreate(
    slotsToReuse.map((slot) => ({
      template_id: slot.template_id,
      position: Number(slot.position),
      order_id: orderId,
      project_id: projectId,
      photo_url: photoUrl,
      student_name: studentName,
      grade,
      section,
      package_type: packageType,
    })) as any,
  );

  return slotsToReuse.length;
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
