import { ImageFile } from '../types';
import { postJson } from '../../../shared/api';

export async function recolor(image: ImageFile, color: { colorId?: string; hex?: string }): Promise<ImageFile> {
  const data = await postJson('/api/coloring/recolor', { image: { base64: image.base64, mimeType: image.mimeType }, ...color });
  if (!data?.base64) throw new Error('السيرفر مارجّعش صورة.');
  return { base64: data.base64, mimeType: data.mimeType || 'image/png', name: 'recolored.png' };
}
