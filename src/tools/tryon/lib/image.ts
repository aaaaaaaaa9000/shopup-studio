import type { Img } from './types';

export const toSrc = (img: Img) => `data:${img.mimeType};base64,${img.base64}`;

export function fromDataUrl(dataUrl: string): Img {
  const [head, base64] = dataUrl.split(',');
  const mimeType = head.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return { base64, mimeType };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ماقدرتش أفتح الصورة.'));
    img.src = src;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ماقدرتش أقرا الصورة.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** Draws an image scaled to maxSide on a white background and returns a JPEG data URL. */
async function toJpegDataUrl(src: string, maxSide: number, quality: number): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('المتصفح مش قادر يعالج الصورة.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Reads an uploaded image and downscales it to JPEG (longest side maxSide) so
 * phone photos upload fast. Falls back to the original file when the browser
 * can't decode it (e.g. HEIC on some desktops).
 */
export async function readImageFile(file: File, maxSide = 1536): Promise<Img> {
  if (!file.type.startsWith('image/')) throw new Error('الملف ده مش صورة.');
  const dataUrl = await readFile(file);
  try {
    return fromDataUrl(await toJpegDataUrl(dataUrl, maxSide, 0.9));
  } catch {
    return fromDataUrl(dataUrl);
  }
}

/** Fetches a same-site image (e.g. a mannequin) as base64. */
export async function fetchImage(url: string): Promise<Img> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('ماقدرتش أحمّل صورة المانيكان.');
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('ماقدرتش أقرا صورة المانيكان.'));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
  return fromDataUrl(dataUrl);
}

/** Small JPEG copy for saving looks in the browser without filling its storage. */
export const compressForSave = (img: Img) => toJpegDataUrl(toSrc(img), 900, 0.82);

export function downloadImage(img: Img, name: string) {
  const link = document.createElement('a');
  link.href = toSrc(img);
  link.download = `${name}.${img.mimeType.includes('png') ? 'png' : 'jpg'}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
