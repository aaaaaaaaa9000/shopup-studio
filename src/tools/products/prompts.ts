import { CustomizationOptions } from './types';

/** Builds the image-generation prompt for the selected options. */
export function buildPrompt(opts: CustomizationOptions, productCount: number, styleDescription: string | null): string {
  const group = opts.mode === 'group' && productCount > 1;

  let prompt = group
    ? `Generate ONE high-resolution, professional group product photograph that shows ALL ${productCount} products from the ${productCount} provided product images together in a single, cohesive composition.

Key requirements:
- Products: include every product exactly once (${productCount} products in total). Do not add, duplicate or leave out any product.
- Fidelity: keep each product's exact shape, colors, materials, proportions, logos and any text or labels.
- Arrangement: arrange them naturally and attractively with sensible relative sizes, slight overlap is fine, but every product must stay clearly visible.`
    : `Generate a high-resolution, professional product photograph of the product in the provided image.

Key requirements:
- Fidelity: keep the product's exact shape, colors, materials, proportions, logos and any text or labels.`;

  prompt += `
- Lighting: illuminate the scene with a ${opts.lightingStyle} style that flatters the product and highlights its details.
- Camera Perspective: capture the ${group ? 'products' : 'product'} from a ${opts.cameraPerspective}.
- Background: clean, non-distracting and complementary. A subtle, high-end studio setting is preferred.
- Overall Mood: premium, clean and aspirational.`;

  if (styleDescription) {
    prompt += `\n- Style Reference: match the aesthetic of the style reference image: ${styleDescription}`;
  }

  return prompt;
}
