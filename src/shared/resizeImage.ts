import { ImageFile } from './types';

const MAX_SIDE = 1536;

/**
 * Reads an image file and downscales it (longest side MAX_SIDE px) to JPEG,
 * so large phone photos upload fast. Falls back to the original file if the
 * browser can't decode it (e.g. HEIC on some desktops).
 */
export function readAndResizeImage(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ماقدرتش أقرا الصورة.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const original: ImageFile = {
        base64: dataUrl.split(',')[1],
        mimeType: file.type || 'image/jpeg',
        name: file.name,
      };
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 1.5 * 1024 * 1024) return resolve(original);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(original);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          base64: canvas.toDataURL('image/jpeg', 0.9).split(',')[1],
          mimeType: 'image/jpeg',
          name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        });
      };
      img.onerror = () => resolve(original);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
