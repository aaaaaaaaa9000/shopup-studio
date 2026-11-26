import type { Img, SubjectKind } from './types';
import { ApiError, postJson } from '../../../shared/api';

export { ApiError };

async function post(path: string, body: unknown): Promise<Img> {
  const data = await postJson(path, body);
  if (!data?.base64) throw new ApiError('السيرفر مارجّعش صورة.');
  return { base64: data.base64, mimeType: data.mimeType || 'image/jpeg' };
}

const strip = (img: Img) => ({ base64: img.base64, mimeType: img.mimeType });

export const makeModel = (image: Img) => post('/api/tryon/model', { image: strip(image) });

export const tryOn = (image: Img, garment: Img, subject: SubjectKind) =>
  post('/api/tryon/apply', { image: strip(image), garment: strip(garment), subject });

export const editImage = (image: Img, kind: 'pose' | 'color' | 'background', value: string) =>
  post('/api/tryon/edit', { image: strip(image), kind, value });
