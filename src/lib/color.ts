// Comprehensive color palette for photo booth editor
export interface ColorCategory {
  name: string;
  colors: { name: string; hex: string }[];
}

export const COLOR_PALETTE: ColorCategory[] = [
  {
    name: 'Reds',
    colors: [
      { name: 'Red', hex: '#EF4444' },
      { name: 'Dark Red', hex: '#B91C1C' },
      { name: 'Light Red', hex: '#F87171' },
      { name: 'Pink', hex: '#EC4899' },
      { name: 'Light Pink', hex: '#F9A8D4' },
    ],
  },
  {
    name: 'Oranges',
    colors: [
      { name: 'Orange', hex: '#F97316' },
      { name: 'Dark Orange', hex: '#C2410C' },
      { name: 'Light Orange', hex: '#FB923C' },
      { name: 'Peach', hex: '#FDBA74' },
      { name: 'Light Peach', hex: '#FED7AA' },
    ],
  },
  {
    name: 'Yellows',
    colors: [
      { name: 'Yellow', hex: '#EAB308' },
      { name: 'Dark Yellow', hex: '#A16207' },
      { name: 'Light Yellow', hex: '#FDE047' },
      { name: 'Gold', hex: '#CA8A04' },
      { name: 'Light Gold', hex: '#FEF08A' },
    ],
  },
  {
    name: 'Greens',
    colors: [
      { name: 'Green', hex: '#22C55E' },
      { name: 'Dark Green', hex: '#15803D' },
      { name: 'Light Green', hex: '#4ADE80' },
      { name: 'Lime', hex: '#84CC16' },
      { name: 'Light Lime', hex: '#BEF264' },
    ],
  },
  {
    name: 'Teals / Cyans',
    colors: [
      { name: 'Teal', hex: '#14B8A6' },
      { name: 'Dark Teal', hex: '#0F766E' },
      { name: 'Light Teal', hex: '#2DD4BF' },
      { name: 'Cyan', hex: '#06B6D4' },
      { name: 'Light Cyan', hex: '#67E8F9' },
    ],
  },
  {
    name: 'Blues',
    colors: [
      { name: 'Blue', hex: '#3B82F6' },
      { name: 'Dark Blue', hex: '#1D4ED8' },
      { name: 'Light Blue', hex: '#60A5FA' },
      { name: 'Navy', hex: '#1E3A8A' },
      { name: 'Sky Blue', hex: '#7DD3FC' },
    ],
  },
  {
    name: 'Purples',
    colors: [
      { name: 'Purple', hex: '#8B5CF6' },
      { name: 'Dark Purple', hex: '#6D28D9' },
      { name: 'Light Purple', hex: '#A78BFA' },
      { name: 'Lavender', hex: '#C4B5FD' },
      { name: 'Indigo', hex: '#4F46E5' },
    ],
  },
  {
    name: 'Magenta / Pinks',
    colors: [
      { name: 'Magenta', hex: '#D946EF' },
      { name: 'Dark Magenta', hex: '#A21CAF' },
      { name: 'Light Magenta', hex: '#E879F9' },
      { name: 'Rose', hex: '#F43F5E' },
    ],
  },
  {
    name: 'Browns',
    colors: [
      { name: 'Brown', hex: '#A16207' },
      { name: 'Dark Brown', hex: '#713F12' },
      { name: 'Light Brown', hex: '#D97706' },
      { name: 'Tan', hex: '#D4A574' },
      { name: 'Beige', hex: '#E7D4B5' },
    ],
  },
  {
    name: 'Grays (Neutrals)',
    colors: [
      { name: 'Black', hex: '#000000' },
      { name: 'Dark Gray', hex: '#374151' },
      { name: 'Gray', hex: '#6B7280' },
      { name: 'Light Gray', hex: '#9CA3AF' },
      { name: 'White', hex: '#FFFFFF' },
    ],
  },
];

// Flatten all colors for quick access
export const ALL_COLORS = COLOR_PALETTE.flatMap((category) => category.colors);

// Quick access colors (most used)
export const QUICK_COLORS = [
  '#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
];
