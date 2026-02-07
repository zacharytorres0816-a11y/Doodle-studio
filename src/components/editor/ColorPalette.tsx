import { COLOR_PALETTE, QUICK_COLORS } from '@/lib/colors';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export function ColorPalette({ selectedColor, onColorSelect }: ColorPaletteProps) {
  return (
    <div className="space-y-4">
      {/* Quick Colors */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">Quick Colors</div>
        <div className="flex flex-wrap gap-1">
          {QUICK_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorSelect(color)}
              className={`color-swatch ${selectedColor === color ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Full Palette */}
      <ScrollArea className="h-64">
        <div className="space-y-3 pr-3">
          {COLOR_PALETTE.map((category) => (
            <div key={category.name}>
              <div className="text-xs text-muted-foreground mb-1.5">{category.name}</div>
              <div className="flex flex-wrap gap-1">
                {category.colors.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => onColorSelect(color.hex)}
                    className={`color-swatch ${selectedColor === color.hex ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
