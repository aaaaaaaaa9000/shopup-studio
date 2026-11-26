/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared by the server (to build prompts from a fixed list) and the UI (labels).

export interface Shade {
  id: string;
  /** English name sent to the model. */
  en: string;
  /** Arabic label shown in the UI. */
  ar: string;
  hex: string;
}

export interface ColorFamily {
  id: string;
  ar: string;
  shades: Shade[];
}


export const COLOR_FAMILIES: ColorFamily[] = [
  {
    id: 'reds',
    ar: 'أحمر',
    shades: [
      { id: 'pastel-red', en: 'Pastel Red', ar: 'أحمر فاتح', hex: '#fecaca' },
      { id: 'vibrant-red', en: 'Vibrant Red', ar: 'أحمر صريح', hex: '#ef4444' },
      { id: 'deep-maroon', en: 'Deep Maroon', ar: 'نبيتي', hex: '#881337' },
    ],
  },
  {
    id: 'pinks',
    ar: 'بمبي',
    shades: [
      { id: 'baby-pink', en: 'Baby Pink', ar: 'بيبي بينك', hex: '#fbcfe8' },
      { id: 'hot-pink', en: 'Hot Pink', ar: 'فوشيا', hex: '#ec4899' },
      { id: 'magenta', en: 'Magenta', ar: 'ماجنتا', hex: '#be185d' },
    ],
  },
  {
    id: 'blues',
    ar: 'أزرق',
    shades: [
      { id: 'sky-blue', en: 'Sky Blue', ar: 'لبني', hex: '#7dd3fc' },
      { id: 'royal-blue', en: 'Royal Blue', ar: 'أزرق ملكي', hex: '#3b82f6' },
      { id: 'navy-blue', en: 'Navy Blue', ar: 'كحلي', hex: '#1e3a8a' },
    ],
  },
  {
    id: 'teals',
    ar: 'تركواز',
    shades: [
      { id: 'light-teal', en: 'Light Teal', ar: 'تركواز فاتح', hex: '#99f6e4' },
      { id: 'teal', en: 'Teal', ar: 'تركواز', hex: '#2dd4bf' },
      { id: 'petrol', en: 'Petrol Blue', ar: 'بترولي', hex: '#006469' },
    ],
  },
  {
    id: 'greens',
    ar: 'أخضر',
    shades: [
      { id: 'mint-green', en: 'Mint Green', ar: 'منت', hex: '#a7f3d0' },
      { id: 'emerald-green', en: 'Emerald Green', ar: 'زمردي', hex: '#10b981' },
      { id: 'forest-green', en: 'Forest Green', ar: 'أخضر غامق', hex: '#14532d' },
    ],
  },
  {
    id: 'warm',
    ar: 'أصفر وبرتقالي',
    shades: [
      { id: 'sunshine-yellow', en: 'Sunshine Yellow', ar: 'أصفر', hex: '#fde047' },
      { id: 'gold', en: 'Gold', ar: 'دهبي', hex: '#f59e0b' },
      { id: 'burnt-orange', en: 'Burnt Orange', ar: 'برتقالي', hex: '#f97316' },
    ],
  },
  {
    id: 'earth',
    ar: 'بيج وبني',
    shades: [
      { id: 'beige', en: 'Beige', ar: 'بيج', hex: '#e8d8c3' },
      { id: 'camel', en: 'Camel', ar: 'جملي', hex: '#c19a6b' },
      { id: 'chocolate-brown', en: 'Chocolate Brown', ar: 'بني', hex: '#5c3a21' },
    ],
  },
  {
    id: 'neutrals',
    ar: 'أبيض وأسود',
    shades: [
      { id: 'crisp-white', en: 'Crisp White', ar: 'أبيض', hex: '#f9fafb' },
      { id: 'light-gray', en: 'Light Gray', ar: 'رمادي فاتح', hex: '#d1d5db' },
      { id: 'classic-black', en: 'Classic Black', ar: 'أسود', hex: '#111827' },
    ],
  },
];


export const HEX_RE = /^#[0-9a-f]{6}$/i;

export const ALL_SHADES: Shade[] = COLOR_FAMILIES.flatMap((f) => f.shades);

export function findShade(id: string): Shade | undefined {
  return ALL_SHADES.find((s) => s.id === id);
}

