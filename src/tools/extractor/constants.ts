import { AspectRatio, Background, ItemKind, Presentation, Quality } from './types';

/** How many items are generated at the same time. */
export const CONCURRENCY = 2;

export const BACKGROUNDS: { value: Background; label: string; swatch: string }[] = [
  { value: 'white', label: 'أبيض', swatch: '#FFFFFF' },
  { value: 'gray', label: 'رمادي فاتح', swatch: '#F0F0F0' },
  { value: 'beige', label: 'بيج', swatch: '#EFE6DA' },
];

export const PRESENTATIONS: { value: Presentation; label: string; hint: string }[] = [
  { value: 'ghost', label: 'مجسّمة', hint: 'كأنها ملبوسة من غير موديل' },
  { value: 'flat', label: 'مفرودة', hint: 'متصوّرة من فوق على الأرض' },
];

export const ASPECT_RATIOS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: '1:1', label: 'مربع', hint: '1:1' },
  { value: '4:5', label: 'طولي', hint: '4:5' },
  { value: '3:4', label: 'طولي أكتر', hint: '3:4' },
];

export const QUALITIES: { value: Quality; label: string; hint: string }[] = [
  { value: 'standard', label: 'عادية', hint: 'سريعة' },
  { value: '2K', label: 'عالية', hint: 'أوضح وأبطأ' },
];

export const KIND_LABELS: Record<ItemKind, string> = {
  clothing: 'لبس',
  footwear: 'جزمة',
  bag: 'شنطة',
  accessory: 'إكسسوار',
  jewelry: 'مجوهرات',
};
