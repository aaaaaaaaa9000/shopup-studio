import { ImageFile } from '../types';
import { postJson } from '../../../shared/api';

export async function generateImage(productImage: ImageFile, prompt: string, styleImage: ImageFile | null): Promise<ImageFile> {
  const strip = ({ base64, mimeType }: ImageFile) => ({ base64, mimeType });
  const data = await postJson(
    '/api/generate',
    { productImages: [strip(productImage)], prompt, styleImage: styleImage ? strip(styleImage) : null },
    'فشل التوليد',
  );
  if (!data?.base64) throw new Error('السيرفر مارجّعش صورة.');
  return { base64: data.base64, mimeType: data.mimeType || 'image/jpeg', name: 'pose.jpg' };
}

export async function analyzeStyleImage(styleImage: ImageFile): Promise<string> {
  const data = await postJson('/api/style', { styleImage: { base64: styleImage.base64, mimeType: styleImage.mimeType } }, 'فشل تحليل الستايل');
  if (typeof data?.description !== 'string') throw new Error('السيرفر مارجّعش وصف للستايل.');
  return data.description;
}
