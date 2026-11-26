// API routes of every section of the studio.
import { Router } from 'express';
import { ThinkingLevel, Type } from '@google/genai';
import {
  ANALYZE_MODEL,
  HQ_IMAGE_MODEL,
  IMAGE_MODEL,
  STYLE_MODEL,
  SAFETY_SETTINGS,
  generateAndSend,
  generateImage,
  getAI,
  imagePart,
  rateLimit,
  sendGeminiError,
  validateImage,
  type ImageInput,
} from './common';
import { analyzePrompt, extractPrompt, upscalePrompt } from './extractor-prompts';
import { HEX_RE, findShade } from '../src/tools/coloring/catalog';
import type { AspectRatio, Background, ItemKind, Presentation, Quality as ExtractQuality } from '../src/tools/extractor/types';

const MAX_PROMPT_CHARS = Number(process.env.MAX_PROMPT_CHARS) || 4000;
const MAX_GROUP_IMAGES = Number(process.env.MAX_GROUP_IMAGES) || 8;
const MAX_TEXT_CHARS = Number(process.env.MAX_TEXT_CHARS) || 300;
const MAX_DESCRIPTION_CHARS = Number(process.env.MAX_DESCRIPTION_CHARS) || 3000;
const MAX_NAME_CHARS = 120;

export const api = Router();
api.use(rateLimit);

// ============ Poses + products: one photo (or a group) in a new scene ============

type Quality = 'standard' | '2K' | '4K';
const ALLOWED_QUALITY = new Set<Quality>(['standard', '2K', '4K']);
const ALLOWED_ASPECT = new Set(['1:1', '4:5', '3:4', '9:16', '16:9']);

function parseQuality(value: unknown): Quality | null {
  if (value === undefined || value === null || value === '') return 'standard';
  return ALLOWED_QUALITY.has(value as Quality) ? (value as Quality) : null;
}

function qualityOptions(quality: Quality, aspectRatio?: string) {
  const imageConfig: Record<string, string> = {};
  if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
  if (quality !== 'standard') imageConfig.imageSize = quality;
  return { model: quality === 'standard' ? IMAGE_MODEL : HQ_IMAGE_MODEL, imageConfig };
}

const REFUSED_GENERATE = 'الموديل رفض يولّد الصورة دي. جرّب صورة أو وصف تاني.';

api.post('/generate', async (req, res) => {
  const { productImages, prompt, styleImage, aspectRatio } = req.body || {};
  const quality = parseQuality(req.body?.quality);
  if (!quality) return res.status(400).json({ error: 'الجودة المطلوبة غير مدعومة.' });
  if (!Array.isArray(productImages) || productImages.length === 0) {
    return res.status(400).json({ error: 'ارفع صورة واحدة على الأقل.' });
  }
  if (productImages.length > MAX_GROUP_IMAGES) {
    return res.status(400).json({ error: `أقصى عدد منتجات في الصورة الواحدة ${MAX_GROUP_IMAGES}.` });
  }
  for (const img of productImages) {
    const err = validateImage(img, 'الصورة');
    if (err) return res.status(400).json({ error: err });
  }
  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'الوصف فاضي.' });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: `الوصف طويل جدًا. الحد الأقصى ${MAX_PROMPT_CHARS} حرف.` });
  }
  const hasStyle = styleImage && styleImage.base64;
  if (hasStyle) {
    const err = validateImage(styleImage, 'صورة الستايل');
    if (err) return res.status(400).json({ error: err });
  }
  if (aspectRatio !== undefined && aspectRatio !== null && !ALLOWED_ASPECT.has(aspectRatio)) {
    return res.status(400).json({ error: 'مقاس الصورة غير مدعوم.' });
  }

  const parts: any[] = productImages.map((img: ImageInput) => imagePart(img));
  parts.push({ text: prompt });
  if (hasStyle) {
    // Label the reference so the model doesn't paste its objects into the shot.
    parts.push({
      text: 'The next image is a STYLE REFERENCE ONLY. Copy its mood, colors and lighting; do not include any of its objects or people.',
    });
    parts.push(imagePart(styleImage));
  }
  return generateAndSend(res, 'generate', parts, { ...qualityOptions(quality, aspectRatio || undefined), refusedMessage: REFUSED_GENERATE });
});

api.post('/style', async (req, res) => {
  const { styleImage } = req.body || {};
  const err = validateImage(styleImage, 'صورة الستايل');
  if (err) return res.status(400).json({ error: err });
  try {
    const response = await getAI().models.generateContent({
      model: STYLE_MODEL,
      contents: {
        parts: [
          imagePart(styleImage),
          {
            text: "Analyze this image and describe its aesthetic, color palette, and mood in a concise phrase suitable for a prompt. For example: 'A vibrant, high-contrast style with bold neon colors and a futuristic mood.'",
          },
        ],
      },
      config: { safetySettings: SAFETY_SETTINGS },
    });
    if (!response.text) {
      console.warn('[style] no text, finishReason:', response.candidates?.[0]?.finishReason);
      return res.status(502).json({ error: 'ماقدرتش أحلل صورة الستايل. جرّب صورة تانية.' });
    }
    return res.json({ description: response.text.trim() });
  } catch (error) {
    return sendGeminiError(res, error, 'style');
  }
});

api.post('/products/blur', async (req, res) => {
  const { image, intensity } = req.body || {};
  const quality = parseQuality(req.body?.quality);
  if (!quality) return res.status(400).json({ error: 'الجودة المطلوبة غير مدعومة.' });
  const err = validateImage(image, 'الصورة');
  if (err) return res.status(400).json({ error: err });
  const px = Math.round(Number(intensity));
  if (!Number.isFinite(px) || px < 2 || px > 50) {
    return res.status(400).json({ error: 'درجة التغبيش لازم تكون بين 2 و 50.' });
  }
  const prompt = `Keeping the main subject in sharp focus, apply a photographic gaussian blur effect to the background of this image. The blur intensity should be equivalent to a ${px}px radius. Ensure a natural, soft fall-off (bokeh). Do not change the product, its colors, shape, or any text on it. Return only the modified image.`;
  return generateAndSend(res, 'products-blur', [imagePart(image), { text: prompt }], {
    ...qualityOptions(quality),
    refusedMessage: REFUSED_GENERATE,
  });
});

// ============ Coloring: recolor the main garment (colors only from the catalog or a hex code) ============

const recolorPrompt = (color: string) =>
  `You are an expert fashion photo editor. Recolor the primary garment being worn by the person in the image to ${color}. ` +
  `You MUST NOT change anything else in the image: the person, their face, their pose, other clothing items, the lighting and the background must remain identical. ` +
  `Keep the fabric texture, folds, shadows and highlights of the garment realistic. Return ONLY the final photorealistic image.`;

api.post('/coloring/recolor', async (req, res) => {
  const { image, colorId, hex } = req.body || {};
  const err = validateImage(image, 'الصورة');
  if (err) return res.status(400).json({ error: err });
  let colorText: string;
  if (typeof hex === 'string' && hex) {
    if (!HEX_RE.test(hex)) return res.status(400).json({ error: 'كود اللون غلط.' });
    colorText = `the exact color with hex code ${hex.toLowerCase()}`;
  } else {
    const shade = typeof colorId === 'string' ? findShade(colorId) : undefined;
    if (!shade) return res.status(400).json({ error: 'اختار لون من القائمة.' });
    colorText = `'${shade.en}' (hex ${shade.hex})`;
  }
  return generateAndSend(res, 'recolor', [imagePart(image), { text: recolorPrompt(colorText) }], {
    refusedMessage: 'الموديل رفض يعدّل الصورة دي. جرّب صورة تانية.',
  });
});

// ============ Extractor: find the pieces, then one product photo per piece ============

const ALLOWED_KIND = new Set<ItemKind>(['clothing', 'footwear', 'bag', 'accessory', 'jewelry']);
const ALLOWED_BACKGROUND = new Set<Background>(['white', 'gray', 'beige']);
const ALLOWED_PRESENTATION = new Set<Presentation>(['ghost', 'flat']);
const ALLOWED_EXTRACT_ASPECT = new Set<AspectRatio>(['1:1', '4:5', '3:4']);
const ALLOWED_EXTRACT_QUALITY = new Set<ExtractQuality>(['standard', '2K']);

const ANALYZE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name_ar: { type: Type.STRING },
          kind: { type: Type.STRING, enum: [...ALLOWED_KIND] },
          description: { type: Type.STRING },
        },
        required: ['name_ar', 'kind', 'description'],
      },
    },
  },
  required: ['items'],
};

const MODEL_PHOTO_MISSING = 'ارفع صورة الموديل الأول.';

api.post('/extractor/analyze', async (req, res) => {
  const { image } = req.body || {};
  const err = validateImage(image, 'الصورة', MODEL_PHOTO_MISSING);
  if (err) return res.status(400).json({ error: err });
  try {
    const response = await getAI().models.generateContent({
      model: ANALYZE_MODEL,
      contents: { parts: [imagePart(image), { text: analyzePrompt() }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: ANALYZE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        safetySettings: SAFETY_SETTINGS,
      },
    });
    let items: any[] = [];
    try {
      items = JSON.parse(response.text || '{}').items || [];
    } catch {
      console.warn('[analyze] bad JSON, finishReason:', response.candidates?.[0]?.finishReason);
    }
    const clean = items
      .filter((i) => i && typeof i.name_ar === 'string' && typeof i.description === 'string')
      .slice(0, 15)
      .map((i) => ({
        name: i.name_ar.trim().slice(0, MAX_NAME_CHARS),
        kind: ALLOWED_KIND.has(i.kind) ? i.kind : 'clothing',
        description: i.description.trim().slice(0, MAX_DESCRIPTION_CHARS),
      }));
    if (clean.length === 0) {
      return res.status(422).json({ error: 'مالقيتش قطع لبس واضحة في الصورة. جرّب صورة أوضح للموديل كله.' });
    }
    return res.json({ items: clean });
  } catch (error) {
    return sendGeminiError(res, error, 'analyze');
  }
});

api.post('/extractor/extract', async (req, res) => {
  const { image, item, background, presentation, aspectRatio, quality } = req.body || {};
  const err = validateImage(image, 'الصورة', MODEL_PHOTO_MISSING);
  if (err) return res.status(400).json({ error: err });
  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  const description = typeof item?.description === 'string' ? item.description.trim() : '';
  if (!name && !description) return res.status(400).json({ error: 'اختار القطعة الأول.' });
  if (name.length > MAX_NAME_CHARS || description.length > MAX_DESCRIPTION_CHARS) {
    return res.status(413).json({ error: `وصف القطعة طويل جدًا. الحد الأقصى ${MAX_DESCRIPTION_CHARS} حرف.` });
  }
  const kind: ItemKind = ALLOWED_KIND.has(item?.kind) ? item.kind : 'clothing';
  if (
    !ALLOWED_BACKGROUND.has(background) ||
    !ALLOWED_PRESENTATION.has(presentation) ||
    !ALLOWED_EXTRACT_ASPECT.has(aspectRatio) ||
    !ALLOWED_EXTRACT_QUALITY.has(quality)
  ) {
    return res.status(400).json({ error: 'اختيارات الصورة مش صحيحة. حدّث الصفحة وجرّب تاني.' });
  }

  try {
    // The lite model follows "product photo only" well. The bigger models tend to edit the
    // reference photo instead (room, floor and other clothes leak in), so for high quality we
    // first make the clean product photo with the lite model and then re-render it at 2K.
    const base = await generateImage(
      IMAGE_MODEL,
      [imagePart(image), { text: extractPrompt({ name, description, kind, background, presentation }) }],
      { aspectRatio },
      'extract',
    );
    if ('error' in base) {
      const error = base.code === 'refused' ? 'الموديل رفض يطلّع القطعة دي. جرّب تاني أو غيّر الوصف.' : base.error;
      return res.status(base.status).json({ error });
    }
    if (quality === 'standard') return res.json(base);
    try {
      const hq = await generateImage(HQ_IMAGE_MODEL, [imagePart(base), { text: upscalePrompt() }], { aspectRatio, imageSize: quality }, 'extract-hq');
      if (!('error' in hq)) return res.json(hq);
      console.warn('[extract] high-quality pass failed, sending the standard image');
    } catch (error: any) {
      console.warn('[extract] high-quality pass failed, sending the standard image:', error?.status, error?.message);
    }
    return res.json({ ...base, lowered: true });
  } catch (error) {
    return sendGeminiError(res, error, 'extract');
  }
});

// ============ Try-on: model photo, put a garment on, pose / color / background edits ============

const TRYON_PROMPTS = {
  model:
    "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. Head to feet must be fully visible. The final image must be photorealistic. Return ONLY the final image.",
  tryOnPerson: `You are an expert virtual try-on AI. You will be given a 'model image' (first image) and a 'garment image' (second image). Create a new photorealistic image where the person from the model image is wearing the clothing from the garment image.

Rules:
1. Replace the clothing item the garment covers completely. No part of the original item (collars, sleeves, patterns) may remain visible.
2. Keep the person's face, hair, skin tone, body shape and pose unchanged.
3. Keep the background unchanged.
4. Reproduce the garment exactly: same color, fabric, print, lace and cut. Fit it naturally with realistic folds, shadows and lighting.
5. Return ONLY the final image, no text.`,
  tryOnMannequin: `You are an expert virtual try-on AI for a fashion and lingerie store catalog. You will be given an image of a display mannequin (first image) and a 'garment image' (second image). Dress the mannequin in the garment from the garment image.

Rules:
1. Reproduce the garment exactly: same color, fabric, print, lace and cut.
2. If the mannequin already wears clothing that the new garment covers, replace it completely.
3. Keep the mannequin, its pose and the background unchanged.
4. Fit the garment realistically with natural folds, shadows and lighting.
5. Return ONLY the final image, no text.`,
  pose: (pose: string) =>
    `You are an expert fashion photographer AI. Take this image and regenerate it from a different perspective. The subject, every piece of clothing and the background style must remain identical. The new perspective should be: "${pose}". Return ONLY the final image.`,
  color: (color: string) =>
    `You are an expert fashion photo editor. Recolor the main garment worn in this image to '${color}'. If the garment is a matching set (for example a bra and briefs, or a top and trousers), recolor every piece of the set. Keep its fabric, lace, print texture and cut. You MUST NOT change anything else: the subject, pose, framing, any other clothing items and the background must remain identical. Return ONLY the edited image.`,
  background: (bg: string) =>
    `You are an expert photo editor AI. Replace the background of the provided image with a new background described as: "${bg}".
Rules:
1. The subject, clothing, pose and lighting on the subject must remain completely unchanged.
2. The new background must be photorealistic and integrate seamlessly.
3. Return ONLY the final image, no text.`,
};

const TRYON_REFUSED = 'جيميناي رفض يعمل الصورة دي.';

function validateText(value: unknown, label: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return `${label} فاضي.`;
  if (value.length > MAX_TEXT_CHARS) return `${label} طويل جدًا. الحد الأقصى ${MAX_TEXT_CHARS} حرف.`;
  return null;
}

api.post('/tryon/model', async (req, res) => {
  const { image } = req.body || {};
  const err = validateImage(image, 'صورتك', 'صورتك ناقصة.');
  if (err) return res.status(400).json({ error: err });
  return generateAndSend(res, 'tryon-model', [imagePart(image), { text: TRYON_PROMPTS.model }], {
    imageConfig: { aspectRatio: '3:4' },
    refusedMessage: TRYON_REFUSED,
  });
});

api.post('/tryon/apply', async (req, res) => {
  const { image, garment, subject } = req.body || {};
  const err =
    validateImage(image, 'صورة الموديل', 'صورة الموديل ناقصة.') || validateImage(garment, 'صورة القطعة', 'صورة القطعة ناقصة.');
  if (err) return res.status(400).json({ error: err });
  const mannequin = subject === 'mannequin';
  return generateAndSend(
    res,
    `tryon:${mannequin ? 'mannequin' : 'person'}`,
    [imagePart(image), imagePart(garment), { text: mannequin ? TRYON_PROMPTS.tryOnMannequin : TRYON_PROMPTS.tryOnPerson }],
    { refusedMessage: TRYON_REFUSED },
  );
});

api.post('/tryon/edit', async (req, res) => {
  const { image, kind, value } = req.body || {};
  const builder =
    kind === 'pose' ? TRYON_PROMPTS.pose : kind === 'color' ? TRYON_PROMPTS.color : kind === 'background' ? TRYON_PROMPTS.background : null;
  if (!builder) return res.status(400).json({ error: 'نوع التعديل غير معروف.' });
  const err = validateImage(image, 'الصورة', 'الصورة ناقصة.') || validateText(value, 'الاختيار');
  if (err) return res.status(400).json({ error: err });
  return generateAndSend(res, `tryon-edit:${kind}`, [imagePart(image), { text: builder(value.trim()) }], {
    refusedMessage: TRYON_REFUSED,
  });
});

// Unknown API routes → JSON 404 (instead of the SPA page)
api.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
