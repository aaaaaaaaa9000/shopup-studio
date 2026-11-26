// The sections of the studio, in the order an image usually travels through them.

export type ToolId = 'extractor' | 'tryon' | 'coloring' | 'poses' | 'products' | 'jpg';

/** Where an image can be sent. Try-on takes an image either as a garment or as the person. */
export type Target = 'extractor' | 'tryon-garment' | 'tryon-person' | 'coloring' | 'poses' | 'products' | 'jpg';

export interface ToolInfo {
  id: ToolId;
  label: string;
  subtitle: string;
  /** Heroicons outline path(s). */
  icon: string[];
}

export const TOOLS: ToolInfo[] = [
  {
    id: 'extractor',
    label: 'استخراج القطع',
    subtitle: 'صورة موديل واحدة، وكل قطعة صورة منتج لوحدها',
    icon: ['M9 3.75 6 5.25 3 8.25l2.25 3L7.5 10.5V20.25h9V10.5l2.25.75L21 8.25l-3-3-3-1.5a3 3 0 0 1-6 0Z'],
  },
  {
    id: 'tryon',
    label: 'غرفة القياس',
    subtitle: 'جرّب الهدوم على صورتك أو على مانيكان',
    icon: ['M12 6.5a1.75 1.75 0 10-1.75-1.75', 'M12 6.5v1.25L3.6 13.4A1.5 1.5 0 004.43 16.1h15.14a1.5 1.5 0 00.83-2.75L12 7.75'],
  },
  {
    id: 'coloring',
    label: 'التلوين',
    subtitle: 'غيّر لون اللبس بضغطة',
    icon: [
      'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42',
    ],
  },
  {
    id: 'poses',
    label: 'الوضعيات',
    subtitle: 'صورة واحدة، وضعيات وستايلات احترافية',
    icon: [
      'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z',
      'M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z',
    ],
  },
  {
    id: 'products',
    label: 'صور المنتجات',
    subtitle: 'صور احترافية لمنتجاتك، لوحدها أو مع بعض',
    icon: [
      'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    ],
  },
  {
    id: 'jpg',
    label: 'تحويل لـ JPG',
    subtitle: 'حوّل أي صورة لصيغة JPG جوه جهازك',
    icon: [
      'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21zM15.75 8.25h.008v.008h-.008V8.25z',
    ],
  },
];

export const TARGETS: { target: Target; tool: ToolId; label: string; hint: string }[] = [
  { target: 'extractor', tool: 'extractor', label: 'استخراج القطع', hint: 'يطلّع كل قطعة صورة منتج' },
  { target: 'tryon-garment', tool: 'tryon', label: 'غرفة القياس، كقطعة لبس', hint: 'تتحط في القطع وتلبسها لموديل' },
  { target: 'tryon-person', tool: 'tryon', label: 'غرفة القياس، كموديل', hint: 'تلبّس عليها قطع تانية' },
  { target: 'coloring', tool: 'coloring', label: 'التلوين', hint: 'تغيّر لون اللبس' },
  { target: 'poses', tool: 'poses', label: 'الوضعيات', hint: 'وضعية أو ستايل جديد' },
  { target: 'products', tool: 'products', label: 'صور المنتجات', hint: 'صورة منتج احترافية' },
  { target: 'jpg', tool: 'jpg', label: 'تحويل لـ JPG', hint: 'تتحوّل وتتنزّل' },
];

export const toolOf = (target: Target): ToolId => TARGETS.find((t) => t.target === target)!.tool;
export const toolInfo = (id: ToolId) => TOOLS.find((t) => t.id === id)!;
