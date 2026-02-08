import { useState, useEffect } from 'react';
import { PrintTemplate, TemplateSlot } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/mediaUrl';

interface TemplateWithSlots extends PrintTemplate {
  slots: TemplateSlot[];
}

const parseTemplateSequence = (templateNumber: string) => {
  const match = templateNumber.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
};

const sortTemplatesNewestFirst = (input: TemplateWithSlots[]) => {
  return [...input].sort((a, b) => {
    const timeA = a.downloaded_at ? new Date(a.downloaded_at).getTime() : 0;
    const timeB = b.downloaded_at ? new Date(b.downloaded_at).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;

    const seqA = parseTemplateSequence(a.template_number);
    const seqB = parseTemplateSequence(b.template_number);
    if (seqB !== seqA) return seqB - seqA;

    return b.id.localeCompare(a.id);
  });
};

export default function ToPrint() {
  const [templates, setTemplates] = useState<TemplateWithSlots[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const tmplData = await api.printTemplates.list({
      status: 'downloaded',
      orderBy: 'downloaded_at',
      orderDir: 'desc',
    });

    if (!tmplData) { setLoading(false); return; }

    const templates = tmplData as unknown as PrintTemplate[];
    const templateIds = templates.map(t => t.id);

    let slots: TemplateSlot[] = [];
    if (templateIds.length > 0) {
      const slotsData = await api.templateSlots.list({
        templateIds,
        orderBy: 'position',
        orderDir: 'asc',
      });
      slots = (slotsData || []) as unknown as TemplateSlot[];
    }

    const merged = templates.map(t => ({
      ...t,
      slots: slots.filter(s => s.template_id === t.id),
    }));
    setTemplates(sortTemplatesNewestFirst(merged));
    setLoading(false);
  };

  const handleMarkPrinted = async (template: TemplateWithSlots) => {
    if (!confirm(`Mark ${template.template_number} as printed?`)) return;

    await api.printTemplates.update(template.id, {
      status: 'printed',
      printed_at: new Date().toISOString(),
    } as any);

    // Move orders to packed only when all slots for that order are printed
    const orderIds = [...new Set(template.slots.filter(s => s.order_id).map(s => s.order_id!))];
    if (orderIds.length > 0) {
      const ordersData = await api.orders.list({ ids: orderIds });

      const printedSummary = await api.templateSlots.printedSummary(orderIds);
      const printedCounts = new Map<string, number>();
      (printedSummary || []).forEach((row: any) => {
        printedCounts.set(row.order_id, row.printed_count ?? 0);
      });

      const readyIds = (ordersData || [])
        .filter((o: any) => (printedCounts.get(o.id) || 0) >= (o.package_type ?? 0))
        .map((o: any) => o.id);

      if (readyIds.length > 0) {
        await api.orders.bulkUpdate(readyIds, {
          order_status: 'packed',
          packed_date: new Date().toISOString(),
        } as any);
      }
    }

    toast.success('Template marked as printed.');
    fetchTemplates();
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">To Print Queue</h2>
        <span className="text-sm text-muted-foreground">Total Templates: {templates.length}</span>
      </div>

      {templates.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No templates to print. Download templates from the Templated tab.</p>
      ) : (
        <div className="space-y-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{tmpl.template_number}</p>
                  <p className="text-xs text-muted-foreground">
                    Downloaded: {tmpl.downloaded_at ? format(new Date(tmpl.downloaded_at), 'MMM d, yyyy h:mm a') : '—'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleMarkPrinted(tmpl)}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Printer className="w-4 h-4 mr-1" /> Mark as Printed
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Slots (chronological):</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }, (_, i) => {
                    const slot = tmpl.slots.find(s => s.position === i + 1);
                    const slotOrderCount = slot?.order_id
                      ? tmpl.slots.filter(s => s.order_id === slot.order_id).length
                      : 0;
                    const packageLabel = slot?.package_type
                      ? (slotOrderCount > 0 && slotOrderCount !== slot.package_type
                        ? `Pkg ${slot.package_type} (${slotOrderCount}/${slot.package_type})`
                        : `Pkg ${slot.package_type}`)
                      : 'Pkg —';
                    return (
                      <div key={i} className="bg-secondary rounded border border-border aspect-square overflow-hidden flex flex-col">
                        {slot ? (
                          <>
                            <div className="h-1/2 bg-muted border-b border-border">
                              {slot.photo_url ? (
                                <img src={resolveMediaUrl(slot.photo_url) || slot.photo_url} alt={slot.student_name || 'Slot photo'} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Photo</div>
                              )}
                            </div>
                            <div className="flex-1 p-1.5 text-center flex flex-col items-center justify-center leading-tight">
                              <p className="text-[11px] font-medium text-foreground truncate w-full">{slot.student_name || '—'}</p>
                              <p className="text-[10px] text-muted-foreground truncate w-full">{slot.grade || '—'}-{slot.section || '—'}</p>
                              <p className="text-[10px] text-muted-foreground">{packageLabel}</p>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                            <Plus className="w-5 h-5" />
                            <p className="text-[10px]">Empty</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
