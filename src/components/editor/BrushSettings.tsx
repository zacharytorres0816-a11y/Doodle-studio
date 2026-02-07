import { Slider } from '@/components/ui/slider';

interface BrushSettingsProps {
  brushSize: number;
  brushOpacity: number;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
}

export function BrushSettings({
  brushSize,
  brushOpacity,
  onBrushSizeChange,
  onBrushOpacityChange,
}: BrushSettingsProps) {
  return (
    <div className="space-y-4">
      {/* Brush Size */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Size</span>
          <span className="text-xs text-foreground font-medium">{brushSize}px</span>
        </div>
        <Slider
          value={[brushSize]}
          onValueChange={([value]) => onBrushSizeChange(value)}
          min={1}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-center mt-2">
          <div
            className="rounded-full bg-foreground transition-all"
            style={{
              width: Math.min(brushSize, 40),
              height: Math.min(brushSize, 40),
              opacity: brushOpacity / 100,
            }}
          />
        </div>
      </div>

      {/* Brush Opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Opacity</span>
          <span className="text-xs text-foreground font-medium">{brushOpacity}%</span>
        </div>
        <Slider
          value={[brushOpacity]}
          onValueChange={([value]) => onBrushOpacityChange(value)}
          min={1}
          max={100}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
}
