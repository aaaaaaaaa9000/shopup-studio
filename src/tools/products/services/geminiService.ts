import { AspectRatio, ImageFile, Quality } from '../types';

// All Gemini calls go through our own server, so the API key never reaches the browser.

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
  // The body may not be JSON (e.g. a proxy error page), so don't let parsing throw.
  const data = await response.json().catch(() => null);
  if (response.status === 401) throw new Error(SESSION_EXPIRED);
  if (!response.ok) throw new Error(data?.error || `${fallbackError} (${response.status})`);
  return data || {};
}

function toImage(data: any, name: string): ImageFile {
  if (!data?.base64) throw new Error('السيرفر مارجّعش صورة.');
  return { base64: data.base64, mimeType: data.mimeType || 'image/png', name };
}

/** One product → one photo, or several products → one group photo. */
export async function generateImage(
  productImages: ImageFile[],
  prompt: string,
  styleImage: ImageFile | null,
  aspectRatio: AspectRatio,
  quality: Quality,
): Promise<ImageFile> {
  const strip = ({ base64, mimeType }: ImageFile) => ({ base64, mimeType });
  const data = await postJson(
    '/api/generate',
    {
      productImages: productImages.map(strip),
      prompt,
      styleImage: styleImage ? strip(styleImage) : null,
      aspectRatio,
      quality,
    },
    'فشل التوليد',
  );
  return toImage(data, productImages.length === 1 ? productImages[0].name : 'group-shot');
}

export async function analyzeStyleImage(styleImage: ImageFile): Promise<string> {
  const data = await postJson(
    '/api/style',
    { styleImage: { base64: styleImage.base64, mimeType: styleImage.mimeType } },
    'فشل تحليل الستايل',
  );
  if (typeof data.description !== 'string') throw new Error('السيرفر مارجّعش وصف للستايل.');
  return data.description;
}

export async function applyBackgroundBlur(
  sourceImage: ImageFile,
  blurIntensity: number,
  quality: Quality,
): Promise<ImageFile> {
  const data = await postJson(
    '/api/products/blur',
    { image: { base64: sourceImage.base64, mimeType: sourceImage.mimeType }, intensity: blurIntensity, quality },
    'فشل تغبيش الخلفية',
  );
  return toImage(data, sourceImage.name);
}
