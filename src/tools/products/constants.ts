import { AspectRatio, CameraPerspective, LightingStyle, Quality, ShotMode } from './types';

export const SHOT_MODES: { value: ShotMode; label: string; hint: string }[] = [
  { value: 'single', label: 'صورة لكل منتج', hint: 'كل منتج بيطلع في صورة لوحده' },
  { value: 'group', label: 'كل المنتجات في صورة واحدة', hint: 'صورة جماعية للمنتجات مع بعض' },
];

export const LIGHTING_STYLES: { value: LightingStyle; label: string }[] = [
  { value: 'Studio Light', label: 'إضاءة استوديو' },
  { value: 'Natural Light', label: 'إضاءة طبيعية' },
  { value: 'Golden Hour', label: 'الساعة الذهبية (قبل الغروب)' },
  { value: 'Blue Hour', label: 'الساعة الزرقاء (بعد الغروب)' },
  { value: 'Cinematic', label: 'سينمائية' },
  { value: 'Dramatic', label: 'درامية' },
];

export const CAMERA_PERSPECTIVES: { value: CameraPerspective; label: string }[] = [
  { value: 'Front View', label: 'من الأمام' },
  { value: '45° Angle', label: 'زاوية مايلة' },
  { value: 'Top View', label: 'من فوق' },
  { value: 'Side View', label: 'من الجنب' },
  { value: 'Close-up', label: 'لقطة قريبة' },
  { value: 'Macro Shot', label: 'لقطة قريبة جدًا' },
];

export const ASPECT_RATIOS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: '1:1', label: 'مربع', hint: 'بوست' },
  { value: '4:5', label: 'طولي', hint: 'بوست انستقرام' },
  { value: '9:16', label: 'ستوري', hint: 'ستوري وريلز' },
  { value: '16:9', label: 'عرضي', hint: 'بانر وموقع' },
];

export const QUALITIES: { value: Quality; label: string; hint: string }[] = [
  { value: 'standard', label: 'عادية', hint: 'الأسرع والأرخص' },
  { value: '2K', label: 'عالية', hint: 'أبطأ وأغلى' },
  { value: '4K', label: 'فائقة', hint: 'الأبطأ والأغلى' },
];

/** Most products the model handles well in one group shot (the server enforces the same limit). */
export const MAX_GROUP_PRODUCTS = 8;
/** Most products per batch in "one photo per product" mode. */
export const MAX_PRODUCTS = 20;
/** How many images are generated at the same time, to stay under the key's rate limits. */
export const CONCURRENCY = 2;
