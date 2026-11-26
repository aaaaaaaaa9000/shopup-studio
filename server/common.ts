// Shared by every section's API routes: config, the Gemini client, input checks,
// Arabic error messages and the per-IP rate limit.
import type { NextFunction, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
/** Used for 2K / 4K results. */
export const HQ_IMAGE_MODEL = process.env.GEMINI_HQ_IMAGE_MODEL || 'gemini-3.1-flash-image';
/** Describes a style reference image (poses and products). */
export const STYLE_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
/** Finds the pieces in a model photo (extractor). */
export const ANALYZE_MODEL = process.env.GEMINI_ANALYZE_MODEL || 'gemini-3.5-flash';

export const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE) || 30;
export const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB) || 12;
const MAX_IMAGE_BASE64 = Math.ceil((MAX_IMAGE_MB * 1024 * 1024 * 4) / 3);
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
] as any;

let aiClient: GoogleGenAI | null = null;
export function getAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error('GEMINI_API_KEY is not set'), { status: 'NO_KEY' });
  }
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return aiClient;
}

export type ImageInput = { base64: string; mimeType: string };

export const imagePart = (img: ImageInput) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } });

/**
 * Returns an Arabic error message if the image is invalid, otherwise null.
 * `missing` is the message shown when no image was sent.
 */
export function validateImage(img: unknown, label: string, missing = `ارفع ${label} الأول.`): string | null {
  const i = img as Partial<ImageInput> | undefined;
  if (!i || typeof i.base64 !== 'string' || !i.base64) return missing;
  if (typeof i.mimeType !== 'string' || !ALLOWED_MIME.has(i.mimeType)) {
    return `نوع ${label} غير مدعوم. استخدم صورة عادية (جي بي جي أو بي إن جي).`;
  }
  if (i.base64.length > MAX_IMAGE_BASE64) return `${label} كبيرة جدًا. الحد الأقصى ${MAX_IMAGE_MB} ميجا.`;
  return null;
}

/** Maps a Gemini SDK error to an HTTP status and an Arabic message; logs details server-side. */
export function sendGeminiError(res: Response, error: any, context: string) {
  console.error(`[${context}]`, error?.status, error?.message);
  const msg = String(error?.message || '');
  if (error?.status === 'NO_KEY') {
    return res.status(500).json({ error: 'مفتاح جيميناي مش متضبط على السيرفر.' });
  }
  if (/spend(ing)? cap/i.test(msg)) {
    return res.status(429).json({ error: 'مشروع جيميناي وصل لحد الصرف الشهري. ارفع الحد من إعدادات جوجل أو استنى شوية.' });
  }
  if (error?.status === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return res.status(429).json({ error: 'تم تجاوز حد الاستخدام للمفتاح. جرّب تاني بعد شوية.' });
  }
  if (error?.status === 403 || /PERMISSION_DENIED|API_KEY_INVALID|API key/i.test(msg)) {
    return res.status(502).json({ error: 'مفتاح جيميناي مرفوض. راجع المفتاح في إعدادات السيرفر.' });
  }
  if (/Unsupported MIME type/i.test(msg)) {
    return res.status(400).json({ error: 'نوع الصورة غير مدعوم. استخدم جي بي جي أو بي إن جي.' });
  }
  return res.status(500).json({ error: 'حصلت مشكلة أثناء المعالجة. جرّب تاني.' });
}

export type GeneratedImage = { base64: string; mimeType: string };
export type Refusal = { status: number; error: string; code?: string; reason?: string };

/** Calls an image model and returns the first image, or a status + Arabic error. Throws SDK errors. */
export async function generateImage(
  model: string,
  parts: any[],
  imageConfig: Record<string, string> = {},
  context = 'image',
): Promise<GeneratedImage | Refusal> {
  const response = await getAI().models.generateContent({
    model,
    contents: { parts },
    config: {
      safetySettings: SAFETY_SETTINGS,
      ...(Object.keys(imageConfig).length ? { imageConfig } : {}),
    },
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
    }
  }
  const reason = response.candidates?.[0]?.finishReason || response.promptFeedback?.blockReason;
  console.warn(`[${context}] ${model} returned no image, reason:`, reason);
  if (reason && reason !== 'STOP') {
    return { status: 422, error: 'الموديل رفض يعمل الصورة دي. جرّب صورة أو اختيار تاني.', code: 'refused', reason: String(reason) };
  }
  return { status: 502, error: 'الموديل ماطلّعش صورة. جرّب تاني.' };
}

/** Runs one generation and sends the image (or an Arabic error) as JSON. */
export async function generateAndSend(
  res: Response,
  context: string,
  parts: any[],
  opts: { model?: string; imageConfig?: Record<string, string>; refusedMessage?: string } = {},
) {
  try {
    const result = await generateImage(opts.model || IMAGE_MODEL, parts, opts.imageConfig, context);
    if ('error' in result) {
      return res
        .status(result.status)
        .json({ error: result.code === 'refused' && opts.refusedMessage ? opts.refusedMessage : result.error, code: result.code });
    }
    return res.json(result);
  } catch (error) {
    return sendGeminiError(res, error, context);
  }
}

// ---- Rate limit (per IP, fixed 1-minute window, in memory, shared by all sections) ----
const hits = new Map<string, { count: number; reset: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of hits) if (h.reset <= now) hits.delete(ip);
}, 60_000).unref();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let h = hits.get(ip);
  if (!h || h.reset <= now) {
    h = { count: 0, reset: now + 60_000 };
    hits.set(ip, h);
  }
  h.count++;
  if (h.count > RATE_LIMIT_PER_MINUTE) {
    res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
    return res.status(429).json({ error: 'طلبات كتير في وقت قصير. استنى دقيقة وجرّب تاني.' });
  }
  next();
}
