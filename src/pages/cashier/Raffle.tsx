import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RaffleEntry, RaffleWinner } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Gift, RotateCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function Raffle() {
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<RaffleEntry | null>(null);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [entriesRes, winnersRes] = await Promise.all([
      supabase.from('raffle_entries').select('*').eq('is_winner', false).order('created_at'),
      supabase.from('raffle_winners').select('*').order('won_at', { ascending: false }),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data as unknown as RaffleEntry[]);
    if (winnersRes.data) setWinners(winnersRes.data as unknown as RaffleWinner[]);
  };

  const activeEntries = entries.filter((e) => !e.is_winner);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;

    ctx.clearRect(0, 0, size, size);

    if (activeEntries.length === 0) {
      ctx.fillStyle = 'hsl(0 0% 20%)';
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'hsl(0 0% 60%)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No entries', center, center);
      return;
    }

    const segAngle = (Math.PI * 2) / activeEntries.length;
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#c026d3'];

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-center, -center);

    activeEntries.forEach((entry, i) => {
      const startAngle = i * segAngle;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'hsl(0 0% 12%)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(12, 200 / activeEntries.length)}px sans-serif`;
      const name = entry.customer_name.length > 12 ? entry.customer_name.slice(0, 12) + '…' : entry.customer_name;
      ctx.fillText(name, radius - 15, 4);
      ctx.restore();
    });

    ctx.restore();

    // Draw pointer
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(size - 5, center - 10);
    ctx.lineTo(size - 5, center + 10);
    ctx.lineTo(size - 25, center);
    ctx.closePath();
    ctx.fill();
  }, [activeEntries, rotation]);

  const spin = useCallback(() => {
    if (activeEntries.length === 0 || spinning) return;
    setSpinning(true);
    setCurrentWinner(null);

    const winnerIndex = Math.floor(Math.random() * activeEntries.length);
    const segAngle = 360 / activeEntries.length;
    const targetAngle = 360 - (winnerIndex * segAngle + segAngle / 2);
    const totalRotation = 360 * 5 + targetAngle; // 5 full spins + target

    let start: number | null = null;
    const duration = 4000;
    const startRotation = rotation;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setRotation(startRotation + totalRotation * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const winner = activeEntries[winnerIndex];
        setCurrentWinner(winner);
        setSpinning(false);

        // Record winner
        (async () => {
          await supabase.from('raffle_entries').update({ is_winner: true, won_at: new Date().toISOString() } as any).eq('id', winner.id);
          await supabase.from('raffle_winners').insert([{
            entry_id: winner.id,
            order_id: winner.order_id,
            customer_name: winner.customer_name,
            grade: winner.grade,
            section: winner.section,
          }] as any).select();
          fetchData();
        })();

        toast.success(`🎉 Winner: ${winner.customer_name}!`);
      }
    };

    requestAnimationFrame(animate);
  }, [activeEntries, spinning, rotation]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">Raffle System</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wheel */}
        <div className="panel p-6 flex flex-col items-center gap-4">
          <canvas ref={canvasRef} width={350} height={350} className="rounded-full" />

          {currentWinner && (
            <div className="text-center p-3 bg-accent/10 rounded-lg border border-accent/30 w-full">
              <p className="text-xs text-muted-foreground">Winner!</p>
              <p className="text-lg font-bold text-accent">{currentWinner.customer_name}</p>
              <p className="text-xs text-muted-foreground">{currentWinner.grade} - {currentWinner.section}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={spin} disabled={spinning || activeEntries.length === 0} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Gift className="w-4 h-4 mr-2" />
              {spinning ? 'Spinning...' : 'Spin'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{activeEntries.length} entries remaining</p>
        </div>

        {/* Participants & Winners */}
        <div className="space-y-4">
          {/* Winners */}
          <div className="panel p-4">
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" /> Winner History
            </h3>
            {winners.length === 0 ? (
              <p className="text-xs text-muted-foreground">No winners yet</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-auto">
                {winners.map((w) => (
                  <div key={w.id} className="flex justify-between text-sm">
                    <span className="text-foreground">{w.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{w.grade} - {w.section}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Entries */}
          <div className="panel p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Participants ({activeEntries.length})</h3>
            <div className="space-y-1 max-h-60 overflow-auto">
              {activeEntries.map((e) => (
                <div key={e.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{e.customer_name}</span>
                  <span className="text-xs text-muted-foreground">{e.grade} - {e.section} • #{e.raffle_number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
