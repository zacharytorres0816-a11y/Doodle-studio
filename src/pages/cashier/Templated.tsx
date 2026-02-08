import { useState, useEffect } from 'react';
import { PrintTemplate, TemplateSlot } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Download, FileText, Plus } from 'lucide-react';
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
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;

    const seqA = parseTemplateSequence(a.template_number);
    const seqB = parseTemplateSequence(b.template_number);
    if (seqB !== seqA) return seqB - seqA;

    return b.id.localeCompare(a.id);
  });
};

export default function Templated() {
  const [templates, setTemplates] = useState<TemplateWithSlots[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const tmplData = await api.printTemplates.list({
      statuses: ['filling', 'complete'],
      orderBy: 'created_at',
      orderDir: 'desc',
    });

    if (!tmplData) { setLoading(false); return; }

    const templates = tmplData as unknown as PrintTemplate[];
    const templateIds = templates.map(t => t.id);

    const slotsData = await api.templateSlots.list({
      templateIds,
      orderBy: 'position',
      orderDir: 'asc',
    });

    const slots = (slotsData || []) as unknown as TemplateSlot[];

    const merged: TemplateWithSlots[] = templates.map(t => ({
      ...t,
      slots: slots.filter(s => s.template_id === t.id),
    }));

    setTemplates(sortTemplatesNewestFirst(merged));
    setLoading(false);
  };

  const handleDownload = async (template: TemplateWithSlots) => {
    if (template.status !== 'complete') {
      toast.error('Template is not complete yet');
      return;
    }

    setDownloading(template.id);

    try {
      // Generate A4 canvas (2481 x 3507 at 300 DPI)
      const canvas = document.createElement('canvas');
      canvas.width = 2481;
      canvas.height = 3507;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Layout: 3 cols x 2 rows, each slot 600x1755
      const slotW = 600;
      const slotH = 1755;
      const marginX = Math.floor((2481 - slotW * 3) / 4);
      const marginY = Math.floor((3507 - slotH * 2) / 3);

      const positions = [
        [marginX, marginY],
        [marginX * 2 + slotW, marginY],
        [marginX * 3 + slotW * 2, marginY],
        [marginX, marginY * 2 + slotH],
        [marginX * 2 + slotW, marginY * 2 + slotH],
        [marginX * 3 + slotW * 2, marginY * 2 + slotH],
      ];

      // Load and draw each slot image
      for (let i = 0; i < 6; i++) {
        const slot = template.slots.find(s => s.position === i + 1);
        const [x, y] = positions[i];
        if (slot?.photo_url) {
          try {
            const img = await loadImageForCanvas(resolveMediaUrl(slot.photo_url) || slot.photo_url);
            ctx.drawImage(img, x, y, slotW, slotH);
          } catch {
            // Draw placeholder if image fails
            ctx.fillStyle = '#F0F0F0';
            ctx.fillRect(x, y, slotW, slotH);
            ctx.fillStyle = '#999';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(slot.student_name || 'Empty', x + slotW / 2, y + slotH / 2);
          }
        } else {
          ctx.strokeStyle = '#DDD';
          ctx.strokeRect(x, y, slotW, slotH);
        }

        // 1px black border around each exported strip
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, slotW - 1, slotH - 1);
      }

      const filename = `${template.template_number}.png`;
      const blob = await canvasToBlob(canvas);

      // Update template status to downloaded
      const updatedTemplate = await api.printTemplates.update(template.id, {
        status: 'downloaded',
        downloaded_at: new Date().toISOString(),
      } as any);
      if (!updatedTemplate?.id) {
        throw new Error('Template status update failed');
      }

      // Move all orders in this template to 'to_print' status
      const orderIds = template.slots
        .filter(s => s.order_id)
        .map(s => s.order_id!);
      const uniqueOrderIds = [...new Set(orderIds)];

      if (uniqueOrderIds.length > 0) {
        await api.orders.bulkUpdate(uniqueOrderIds, { order_status: 'to_print' } as any);
      }

      // Trigger download/share after successful state transition so mobile navigation
      // cannot interrupt the backend updates.
      await shareOrDownloadBlob(blob, filename, template.template_number);

      toast.success('Template downloaded! Orders moved to To Print.');
      fetchTemplates();
    } catch (err: any) {
      toast.error('Download failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Templated</h2>
        <span className="text-sm text-muted-foreground">{templates.length} template(s)</span>
      </div>

      {templates.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No templates yet. Complete photo editing to generate templates.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="panel p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  <span className="font-medium text-foreground">{tmpl.template_number}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  tmpl.status === 'complete' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {tmpl.status === 'complete' ? `COMPLETE (${tmpl.slots_used}/6)` : `FILLING (${tmpl.slots_used}/6)`}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Created: {format(new Date(tmpl.created_at), 'MMM d, yyyy h:mm a')}
              </p>

              {/* Slot grid preview */}
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

              {tmpl.status === 'complete' && (
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => handleDownload(tmpl)}
                  disabled={downloading === tmpl.id}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloading === tmpl.id ? 'Generating...' : 'Download 300DPI PNG'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Could not generate template PNG'));
    }, 'image/png');
  });
}

async function shareOrDownloadBlob(blob: Blob, filename: string, title: string) {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iP(ad|hone|od)/.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = isIOS || isAndroid;

  if (typeof File !== 'undefined') {
    const file = new File([blob], filename, { type: 'image/png' });
    const canShareFiles = isMobile
      && typeof navigator !== 'undefined'
      && 'share' in navigator
      && 'canShare' in navigator
      && (navigator as any).canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await (navigator as any).share({
          files: [file],
          title,
        });
        return;
      } catch {
        // fall through to browser download flow
      }
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    if (isIOS) {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

const NGROK_HOST_RE = /ngrok(-free)?\.dev$/i;

function loadImageElement(src: string, useCors: boolean) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadImageForCanvas(src: string): Promise<HTMLImageElement> {
  let objectUrl: string | null = null;
  try {
    if (/^https?:\/\//i.test(src)) {
      const headers: Record<string, string> = {};
      try {
        const host = new URL(src).hostname;
        if (NGROK_HOST_RE.test(host)) {
          headers['ngrok-skip-browser-warning'] = 'true';
        }
      } catch {
        // ignore URL parse issues and fall back
      }

      const response = await fetch(src, {
        headers,
        mode: 'cors',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Unexpected content-type: ${contentType || 'unknown'}`);
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      return await loadImageElement(objectUrl, false);
    }

    return await loadImageElement(src, true);
  } catch {
    try {
      return await loadImageElement(src, true);
    } catch {
      // Last resort for non-CORS image responses; this can still render in many browsers.
      return await loadImageElement(src, false);
    }
  } finally {
    if (objectUrl) {
      const urlToRevoke = objectUrl;
      setTimeout(() => URL.revokeObjectURL(urlToRevoke), 1000);
    }
  }
}
