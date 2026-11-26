import { DetectedItem, ExtractOptions, ImageFile, ItemKind } from '../types';

const SESSION_EXPIRED = 'انتهت الجلسة. حدّث الصفحة وسجّل الدخول من جديد.';

async function postJson(url: string, body: unknown, fallbackError: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('مفيش اتصال بالسيرفر. اتأكد من النت وجرّب تاني.');
  }
  const data = await response.json().catch(() => null);
  if (response.status === 401) throw new Error(SESSION_EXPIRED);
  if (!response.ok) throw new Error(data?.error || `${fallbackError} (${response.status})`);
  return data;
}

const toImage = (image: ImageFile) => ({ base64: image.base64, mimeType: image.mimeType });

export async function analyzeOutfit(image: ImageFile): Promise<{ name: string; kind: ItemKind; description: string }[]> {
  const data = await postJson('/api/extractor/analyze', { image: toImage(image) }, 'فشل تحليل الصورة');
  if (!Array.isArray(data?.items)) throw new Error('السيرفر مارجّعش قطع.');
  return data.items;
}

export async function extractItem(
  image: ImageFile,
  item: DetectedItem,
  options: ExtractOptions,
): Promise<{ image: ImageFile; lowered: boolean }> {
  const data = await postJson(
    '/api/extractor/extract',
    {
      image: toImage(image),
      item: { name: item.name, kind: item.kind, description: item.description },
      ...options,
    },
    'فشل التوليد',
  );
  if (!data?.base64) throw new Error('السيرفر مارجّعش صورة.');
  return {
    image: { base64: data.base64, mimeType: data.mimeType || 'image/png', name: item.name },
    lowered: data.lowered === true,
  };
}
