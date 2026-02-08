import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const RAFFLE_PRICE = 5;

export default function NewOrder() {
  const [customerName, setCustomerName] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');

  const formatSection = (input: string) => {
    return input
      .toUpperCase()
      .replace(/ /g, '-')
      .replace(/-+/g, '-')
      .trim();
  };
  const [packageType, setPackageType] = useState<2 | 4>(2);
  const [designType, setDesignType] = useState<'standard' | 'custom'>('standard');
  const [additionalRaffles, setAdditionalRaffles] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [gcashReference, setGcashReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const maxAdditionalRaffles = packageType === 2 ? 1 : 3;
  const totalRaffles = 1 + additionalRaffles;
  const raffleCost = additionalRaffles * RAFFLE_PRICE;
  const packageBaseCost = packageType === 2 ? 50 : 100; // placeholder costs
  const totalAmount = packageBaseCost + raffleCost;

  const handlePackageChange = (pkg: string) => {
    const p = Number(pkg) as 2 | 4;
    setPackageType(p);
    const maxExtra = p === 2 ? 1 : 3;
    if (additionalRaffles > maxExtra) setAdditionalRaffles(maxExtra);
  };

  const handleSubmit = async () => {
    console.log("PROCESS ORDER CLICKED");
    if (!customerName.trim() || !grade.trim() || !section.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      console.log("About to insert order", {
        customerName,
        grade,
        section,
        packageType,
        designType,
        paymentMethod,
        totalAmount
      });
      // 1. Create order
      const order = await api.orders.create({
          customer_name: customerName.trim(),
          grade: grade.trim(),
          section: section.trim(),
          package_type: packageType,
          design_type: designType,
          included_raffles: 1,
          additional_raffles: additionalRaffles,
          total_raffles: totalRaffles,
          raffle_cost: raffleCost,
          package_base_cost: packageBaseCost,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          gcash_reference: paymentMethod === 'gcash' ? gcashReference : null,
        } as any);
      if (!order?.id) {
        throw new Error('Order API returned an empty response. Check backend/ngrok mapping.');
      }
      console.log('Order inserted', order.id);

      // 2. Auto-create pending project
      const createdProject = await api.projects.create({
          name: `${customerName.trim()} - ${grade} ${section}`,
          order_id: order.id,
          customer_name: customerName.trim(),
          grade: grade.trim(),
          section: section.trim(),
          package_type: packageType,
          design_type: designType,
          status: 'awaiting_photo',
        } as any);
      if (!createdProject?.id) {
        throw new Error('Project API returned an empty response after order creation.');
      }
      console.log('Project inserted', createdProject.id);

      // 3. Create raffle entries
      const entries = Array.from({ length: totalRaffles }, (_, i) => ({
        order_id: order.id,
        customer_name: customerName.trim(),
        grade: grade.trim(),
        section: section.trim(),
        raffle_number: i + 1,
      }));

      await api.raffleEntries.bulkCreate(entries as any);
      console.log('Raffle entries inserted', entries.length);

      toast.success('Order created! Project added to Projects tab.');

      // Reset form
      setCustomerName('');
      setGrade('');
      setSection('');
      setPackageType(2);
      setDesignType('standard');
      setAdditionalRaffles(0);
      setPaymentMethod('cash');
      setGcashReference('');
    } catch (err: any) {
      console.error("PROCESS ORDER ERROR:", err);
      toast.error(err?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-foreground mb-6">Add New Order</h2>

      <div className="space-y-6">
        {/* Customer Info */}
        <div className="panel p-4 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Customer Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="bg-input border-border" placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Grade *</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} className="bg-input border-border" placeholder="e.g. Grade 7" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Section *</Label>
              <Input value={section} onChange={(e) => setSection(formatSection(e.target.value))} className="bg-input border-border" placeholder="e.g. HOPE-4, STEM, A-2" />
            </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Package Selection</h3>
          <div className="grid grid-cols-2 gap-3">
            {[2, 4].map((pkg) => (
              <button
                key={pkg}
                onClick={() => handlePackageChange(String(pkg))}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  packageType === pkg
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-border bg-input text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                <p className="text-lg font-bold">Package {pkg}</p>
                <p className="text-xs mt-1">{pkg} items • 1 included raffle</p>
              </button>
            ))}
          </div>
        </div>

        {/* Design Selection */}
        <div className="panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Design Type</h3>
          <div className="grid grid-cols-2 gap-3">
            {(['standard', 'custom'] as const).map((dt) => (
              <button
                key={dt}
                onClick={() => setDesignType(dt)}
                className={`p-3 rounded-lg border-2 text-center transition-colors capitalize ${
                  designType === dt
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-border bg-input text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                {dt}
              </button>
            ))}
          </div>
        </div>

        {/* Raffle Add-on */}
        <div className="panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Raffle Add-on</h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Included raffles:</span>
            <span className="text-foreground">1</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Additional raffles:</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setAdditionalRaffles(Math.max(0, additionalRaffles - 1))} disabled={additionalRaffles <= 0}>-</Button>
              <span className="text-foreground w-4 text-center">{additionalRaffles}</span>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setAdditionalRaffles(Math.min(maxAdditionalRaffles, additionalRaffles + 1))} disabled={additionalRaffles >= maxAdditionalRaffles}>+</Button>
              <span className="text-muted-foreground text-xs">× ₱{RAFFLE_PRICE} = ₱{raffleCost}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-foreground">Total raffles:</span>
            <span className="text-accent">{totalRaffles}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="panel p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {(['cash', 'gcash'] as const).map((pm) => (
              <button
                key={pm}
                onClick={() => setPaymentMethod(pm)}
                className={`p-3 rounded-lg border-2 text-center transition-colors capitalize ${
                  paymentMethod === pm
                    ? 'border-accent bg-accent/10 text-foreground'
                    : 'border-border bg-input text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                {pm === 'gcash' ? 'GCash' : 'Cash'}
              </button>
            ))}
          </div>
          {paymentMethod === 'gcash' && (
            <div>
              <Label className="text-xs text-muted-foreground">Reference Number (optional)</Label>
              <Input value={gcashReference} onChange={(e) => setGcashReference(e.target.value)} className="bg-input border-border" placeholder="GCash reference #" />
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="panel p-4 space-y-2">
          <h3 className="text-sm font-medium text-foreground mb-3">Order Summary</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Customer:</span><span className="text-foreground">{customerName || '—'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Grade & Section:</span><span className="text-foreground">{grade && section ? `${grade} - ${section}` : '—'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Package:</span><span className="text-foreground">Package {packageType}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Design:</span><span className="text-foreground capitalize">{designType}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Raffles:</span><span className="text-foreground">{totalRaffles}</span>
            </div>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between text-muted-foreground">
              <span>Package Cost:</span><span className="text-foreground">₱{packageBaseCost}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Raffle Cost:</span><span className="text-foreground">₱{raffleCost}</span>
            </div>
            <div className="flex justify-between font-bold text-foreground text-base pt-1">
              <span>Total:</span><span className="text-accent">₱{totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {submitting ? 'Processing...' : 'Process Order'}
          </Button>
        </div>
      </div>
    </div>
  );
}
