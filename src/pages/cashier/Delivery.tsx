import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Search, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface DeliveryOrder {
  order_id: string;
  student_name: string;
  grade: string;
  section: string;
  package_type: number;
  printed_count: number;
  template_numbers: string[];
  printed_at?: string | null;
  order_status?: string;
  delivery_date?: string | null;
}

export default function Delivery() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [deliveryModal, setDeliveryModal] = useState<DeliveryOrder | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);

    const ordersData = await api.orders.list({
      status: 'packed',
      orderBy: 'packed_date',
      orderDir: 'asc',
    });

    if (!ordersData) {
      setLoading(false);
      return;
    }

    const orderIds = ordersData.map((o: any) => o.id).filter(Boolean);
    const slotSummary = new Map<string, { count: number; templates: Set<string>; printedAt: string | null }>();

    if (orderIds.length > 0) {
      const summaryRows = await api.templateSlots.printedSummary(orderIds);
      (summaryRows || []).forEach((row: any) => {
        if (!row.order_id) return;
        const existing = slotSummary.get(row.order_id) || {
          count: 0,
          templates: new Set<string>(),
          printedAt: null as string | null,
        };

        existing.count = row.printed_count ?? 0;
        (row.template_numbers || []).forEach((value: string) => existing.templates.add(value));
        if (!existing.printedAt && row.printed_at) {
          existing.printedAt = row.printed_at;
        }
        slotSummary.set(row.order_id, existing);
      });
    }

    const mapped: DeliveryOrder[] = ordersData.map((o: any) => {
      const summary = slotSummary.get(o.id);
      return {
        order_id: o.id,
        student_name: o.customer_name || '—',
        grade: o.grade || '—',
        section: o.section || '—',
        package_type: o.package_type ?? 0,
        printed_count: summary?.count ?? 0,
        template_numbers: summary ? Array.from(summary.templates) : [],
        printed_at: summary?.printedAt ?? null,
        order_status: o.order_status,
        delivery_date: o.delivery_date ?? null,
      };
    });

    setOrders(mapped);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) =>
      (o.student_name || '').toLowerCase().includes(q) ||
      (o.order_id || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const grouped = useMemo(() => {
    const g: Record<string, DeliveryOrder[]> = {};
    filtered.forEach((o) => {
      const key = `${o.grade || '—'} - ${o.section || '—'}`;
      if (!g[key]) g[key] = [];
      g[key].push(o);
    });
    return g;
  }, [filtered]);

  const toggleSection = (key: string) => {
    setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const handleDeliveryComplete = async () => {
    if (!deliveryModal) return;
    await api.orders.update(deliveryModal.order_id, {
        order_status: 'delivered',
        delivery_date: new Date().toISOString(),
        delivery_recipient: null,
        delivery_notes: null,
      } as any);
    toast.success('Delivery marked complete');
    setDeliveryModal(null);
    fetchOrders();
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Delivery Queue</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-input border-border" />
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No printed slots ready for delivery.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => {
            const isCollapsed = collapsed.has(key);
            return (
              <div key={key}>
                <button onClick={() => toggleSection(key)} className="flex items-center gap-2 mb-2 text-foreground hover:text-accent">
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="font-medium">{key}</span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-2 ml-6">
                    {items.map((order) => {
                      const packageLabel = order.package_type
                        ? `Pkg ${order.package_type} (${order.printed_count}/${order.package_type})`
                        : 'Pkg —';
                      const templateLabel = order.template_numbers.length > 0
                        ? order.template_numbers.join(', ')
                        : '—';
                      return (
                      <div key={order.order_id} className="panel p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 text-sm">
                          <p className="text-foreground font-medium">{order.student_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {packageLabel} • Templates {templateLabel} • Printed {order.printed_at ? format(new Date(order.printed_at), 'MMM d') : '—'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setDeliveryModal(order)}
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          <Truck className="w-4 h-4 mr-1" /> To be delivered
                        </Button>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      <Dialog open={!!deliveryModal} onOpenChange={() => setDeliveryModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delivery</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Mark this order as delivered?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryModal(null)}>No</Button>
            <Button onClick={handleDeliveryComplete} className="bg-accent hover:bg-accent/90 text-accent-foreground">Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
