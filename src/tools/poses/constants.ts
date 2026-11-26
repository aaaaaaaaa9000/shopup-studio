
import { LightingStyle, CameraPerspective, StylePreset } from './types';

export type PresetGroup = 'quick' | 'studio' | 'ads' | 'portrait' | 'reels' | 'birthday';

export const PRESET_GROUPS: { value: PresetGroup; label: string }[] = [
  { value: 'quick', label: 'وضعية بس' },
  { value: 'studio', label: 'استوديو' },
  { value: 'portrait', label: 'بورتريه' },
  { value: 'reels', label: 'ريلز وانستقرام' },
  { value: 'birthday', label: 'عيد ميلاد' },
  { value: 'ads', label: 'إعلانات' },
];

/** Changes only the pose and keeps the clothes, colors and background. */
export const QUICK_POSES: { id: string; en: string; ar: string }[] = [
  { id: 'hands-on-hips', en: 'Hands on hips', ar: 'الإيد على الوسط' },
  { id: 'walking-forward', en: 'Walking forward', ar: 'ماشية لقدّام' },
  { id: 'leaning-casually', en: 'Leaning casually', ar: 'سندة مريحة' },
  { id: 'arms-crossed', en: 'Arms crossed', ar: 'الدراعات متربّعة' },
  { id: 'looking-over-shoulder', en: 'Looking over shoulder', ar: 'بصّة من فوق الكتف' },
  { id: 'waving', en: 'Waving', ar: 'بتشاور بإيدها' },
];

export const STYLE_PRESETS: { value: StylePreset; group: PresetGroup; label: string }[] = [
  { value: 'Standard', group: 'studio', label: 'تصوير احترافي قياسي' },
  ...QUICK_POSES.map((p) => ({ value: `Pose:${p.id}` as const, group: 'quick' as const, label: p.ar })),
  { value: 'Cinematic 3D Ad', group: 'ads', label: 'إعلان سينمائي ثلاثي الأبعاد' },
  { value: 'Valentine 3D Ad', group: 'ads', label: 'إعلان عيد الحب' },
  { value: 'Relaxation 3D Ad', group: 'ads', label: 'راحة واسترخاء' },
  { value: 'Winter 3D Ad', group: 'ads', label: 'أجواء شتوية دافئة' },
  { value: 'Summer 3D Ad', group: 'ads', label: 'أجواء صيفية حيوية' },
  { value: 'Summer Relaxed Ad', group: 'ads', label: 'أجواء صيفية هادئة (داخلي)' },
  { value: 'Summer Relaxed Outdoor Ad', group: 'ads', label: 'أجواء صيفية هادئة (خارجي)' },
  { value: 'Outdoor Portrait', group: 'portrait', label: 'بورتريه خارجي واقعي' },
  { value: 'Editorial Portrait', group: 'portrait', label: 'بورتريه خارجي عصري' },
  { value: 'Instagram Reels Style', group: 'reels', label: 'أجواء انستقرام عصرية' },
  { value: 'Instagram Reels Lifestyle', group: 'reels', label: 'أجواء انستقرام لايف ستايل' },
  { value: 'Instagram Reels Confidence', group: 'reels', label: 'ثقة ورفاهية' },
  { value: 'Outdoor Photoshoot Style', group: 'portrait', label: 'جلسة تصوير خارجية احترافية' },
  { value: 'Natural Outdoor Lifestyle', group: 'portrait', label: 'بورتريه خارجي طبيعي' },
  { value: 'Natural Close-up Portrait', group: 'portrait', label: 'بورتريه قريب وطبيعي' },
  { value: 'Instagram Reels Luxury', group: 'reels', label: 'رفاهية انستقرام' },
  { value: 'Instagram Reels Soft Luxury', group: 'reels', label: 'رفاهية أنثوية ناعمة' },
  { value: 'Instagram Reels Soft Feminine', group: 'reels', label: 'أجواء ريلز أنثوية هادئة' },
  { value: 'Instagram Reels Birthday', group: 'birthday', label: 'احتفال عيد ميلاد' },
  { value: 'Instagram Reels Birthday Celebration', group: 'birthday', label: 'احتفال عيد ميلاد مبهج' },
  { value: 'Instagram Reels Birthday Walk', group: 'birthday', label: 'عيد ميلاد مع حركة ومشي' },
  { value: 'Instagram Reels Café Birthday', group: 'birthday', label: 'عيد ميلاد في كافيه' },
  { value: 'Instagram Reels Birthday Close-up', group: 'birthday', label: 'بورتريه قريب مع تورتة عيد الميلاد' },
];

export const LIGHTING_STYLES: { value: LightingStyle; label: string }[] = [
  { value: 'Natural Light', label: 'إضاءة طبيعية' },
  { value: 'Studio Light', label: 'إضاءة استوديو' },
  { value: 'Golden Hour', label: 'الساعة الذهبية (قبل الغروب)' },
  { value: 'Blue Hour', label: 'الساعة الزرقاء (بعد الغروب)' },
  { value: 'Cinematic', label: 'سينمائية' },
  { value: 'Dramatic', label: 'درامية' },
];

export const CAMERA_PERSPECTIVES: { value: CameraPerspective; label: string }[] = [
  { value: 'Front View', label: 'من الأمام' },
  { value: 'Top View', label: 'من فوق' },
  { value: 'Side View', label: 'من الجنب' },
  { value: '45° Angle', label: 'زاوية مايلة' },
  { value: 'Close-up', label: 'لقطة قريبة' },
  { value: 'Macro Shot', label: 'لقطة قريبة جدًا' },
];
