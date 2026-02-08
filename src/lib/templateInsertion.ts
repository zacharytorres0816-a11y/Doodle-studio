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
    const totalSlots = Number(template.total_slots ?? 6) || 6;
    const existingSlots = await api.templateSlots.list({
      templateIds: [template.id],
      orderBy: 'position',
      orderDir: 'asc',
    });
    const occupied = new Set(
      (existingSlots || [])
        .map((slot: any) => Number(slot?.position))
        .filter((position) => Number.isFinite(position) && position >= 1 && position <= totalSlots),
    );
    const availablePositions = Array.from({ length: totalSlots }, (_, i) => i + 1).filter(
      (position) => !occupied.has(position),
    );

    if (availablePositions.length === 0) {
      await api.printTemplates.update(template.id, {
        slots_used: totalSlots,
        status: 'complete',
        completed_at: new Date().toISOString(),
      } as any);
      continue;
    }

    const toFill = Math.min(remaining, availablePositions.length);

    const slots = [];
    for (let i = 0; i < toFill; i++) {
      slots.push({
        template_id: template.id,
        position: availablePositions[i],
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

    const newSlotsUsed = occupied.size + toFill;
    const isComplete = newSlotsUsed >= totalSlots;

    await api.printTemplates.update(template.id, {
        slots_used: newSlotsUsed,
        status: isComplete ? 'complete' : 'filling',
        completed_at: isComplete ? new Date().toISOString() : null,
      } as any);

    remaining -= toFill;
  }
}

async function syncTemplateUsage(templateIds: string[]) {
  const uniqueTemplateIds = [...new Set(templateIds.filter(Boolean))];
  if (uniqueTemplateIds.length === 0) return;

  const templates = await api.printTemplates.list({
    statuses: ['filling', 'complete'],
    orderBy: 'created_at',
    orderDir: 'desc',
  });
  const trackedTemplates = (templates || []).filter((t: any) => uniqueTemplateIds.includes(t.id));
  if (trackedTemplates.length === 0) return;

  const slots = await api.templateSlots.list({
    templateIds: trackedTemplates.map((t: any) => t.id),
    orderBy: 'position',
    orderDir: 'asc',
  });
  const counts = new Map<string, number>();
  (slots || []).forEach((slot: any) => {
    counts.set(slot.template_id, (counts.get(slot.template_id) || 0) + 1);
  });

  await Promise.all(
    trackedTemplates.map((template: any) => {
      const totalSlots = Number(template.total_slots ?? 6) || 6;
      const used = counts.get(template.id) || 0;
      const complete = used >= totalSlots;
      return api.printTemplates.update(template.id, {
        slots_used: used,
        status: complete ? 'complete' : 'filling',
        completed_at: complete ? (template.completed_at || new Date().toISOString()) : null,
      } as any);
    }),
  );
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
    statuses: ['filling', 'complete'],
    orderBy: 'created_at',
    orderDir: 'desc',
  });
  const activeTemplateIds = new Set((activeTemplates || []).map((t: any) => t.id));

  const prioritize = (slot: TemplateSlot) => (activeTemplateIds.has(slot.template_id) ? 0 : 1);
  const deduped = new Map<string, TemplateSlot>();
  [...normalizedExisting]
    .filter((slot) => activeTemplateIds.has(slot.template_id))
    .sort((a, b) => prioritize(a) - prioritize(b))
    .forEach((slot) => {
      const key = `${slot.template_id}:${slot.position}`;
      if (!deduped.has(key)) deduped.set(key, slot);
    });

  const slotsToReuse = Array.from(deduped.values()).slice(0, slotsNeeded);
  const slotsToDrop = Array.from(deduped.values()).slice(slotsNeeded);
  const touchedTemplates = new Set<string>();

  slotsToDrop.forEach((slot) => touchedTemplates.add(slot.template_id));
  if (slotsToDrop.length > 0) {
    await api.templateSlots.deleteMany(slotsToDrop.map((slot) => slot.id));
  }

  if (slotsToReuse.length === 0) {
    await syncTemplateUsage(Array.from(touchedTemplates));
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

  slotsToReuse.forEach((slot) => touchedTemplates.add(slot.template_id));
  await syncTemplateUsage(Array.from(touchedTemplates));

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
