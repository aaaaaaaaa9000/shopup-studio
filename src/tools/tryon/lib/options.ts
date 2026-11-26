import type { SubjectKind } from './types';

export const DEFAULT_POSE = 'default';

export interface PoseOption {
  key: string;
  label: string;
  /** Instruction sent to the model. */
  value: string;
  mannequin: boolean;
}

export const POSES: PoseOption[] = [
  { key: DEFAULT_POSE, label: 'الوضعية الأصلية', value: '', mannequin: true },
  { key: 'front', label: 'من الأمام', value: 'Full frontal view, standing straight, arms relaxed', mannequin: true },
  { key: 'three-quarter', label: 'ربع لفّة', value: 'Slightly turned, 3/4 view', mannequin: true },
  { key: 'side', label: 'جانبي', value: 'Side profile view', mannequin: true },
  { key: 'back', label: 'من الضهر', value: 'Full back view, seen from behind', mannequin: true },
  { key: 'walk', label: 'ماشية ناحية الكاميرا', value: 'Walking towards the camera, mid-stride', mannequin: false },
  { key: 'shoulder', label: 'بتبص ورا كتفها', value: 'Glancing back over the shoulder', mannequin: false },
  { key: 'hip', label: 'إيد على الوسط', value: 'Confident stance with one hand on the hip', mannequin: false },
  { key: 'sit', label: 'قاعدة على كرسي', value: 'Sitting elegantly on a simple stool', mannequin: false },
];

export const posesFor = (subject: SubjectKind) => POSES.filter((p) => subject === 'person' || p.mannequin);

export const COLORS = [
  { label: 'أسود', value: 'black', hex: '#111111' },
  { label: 'أبيض', value: 'white', hex: '#FAFAFA' },
  { label: 'بيج', value: 'nude beige', hex: '#D9B99B' },
  { label: 'نبيتي', value: 'burgundy', hex: '#7F1D2D' },
  { label: 'أحمر', value: 'red', hex: '#C81E1E' },
  { label: 'وردي', value: 'blush pink', hex: '#F2A7B8' },
  { label: 'موف', value: 'lilac', hex: '#B9A3D9' },
  { label: 'كحلي', value: 'navy blue', hex: '#1E2A4A' },
  { label: 'سماوي', value: 'sky blue', hex: '#7DB9E8' },
  { label: 'زيتي', value: 'olive green', hex: '#5B6B2F' },
];

export const BACKGROUNDS = [
  { label: 'استوديو رمادي', value: 'A minimalist photography studio with a solid light gray backdrop' },
  { label: 'أبيض للمتجر', value: 'A pure white seamless e-commerce background' },
  { label: 'ستوديو وردي', value: 'A soft blush-pink seamless studio backdrop with gentle shadows' },
  { label: 'أوضة نوم', value: 'An elegant, softly lit bedroom with neutral linen and morning light' },
  { label: 'كافيه', value: 'A cozy, stylish cafe interior with warm light' },
  { label: 'شارع في القاهرة', value: 'A charming street in downtown Cairo in golden hour light' },
  { label: 'شاطئ', value: 'A bright sunny beach with clear blue sky and calm sea' },
  { label: 'حديقة', value: 'A green garden with soft natural daylight' },
];

export const MANNEQUINS = [
  { id: 'standard', label: 'مانيكان عادي', src: '/mannequins/standard.jpg' },
  { id: 'curvy', label: 'مانيكان مقاس كبير', src: '/mannequins/curvy.jpg' },
];
