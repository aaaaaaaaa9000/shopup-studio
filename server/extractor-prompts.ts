import type { Background, ItemKind, Presentation } from '../src/tools/extractor/types';

export function analyzePrompt(): string {
  return `You are a meticulous fashion cataloguer for an online clothing and lingerie store.
List every separate piece the person in the photo is wearing: clothing, underwear/lingerie, sleepwear, footwear, bags, accessories (belts, scarves, hats, glasses) and jewelry.

Rules:
- Each garment is its own item. A set (pajamas, suit, lingerie set, tracksuit) is split into its top and bottom.
- Skip pieces that are almost completely hidden.
- name_ar: a short product name in Egyptian Arabic as a shop would write it, with the main color (e.g. "كارديجان تريكو أوف وايت", "بنطلون بيجامة ستان نبيتي").
- kind: one of clothing, footwear, bag, accessory, jewelry.
- description: an exhaustive, literal English description used to recreate the item as a product photo. Cover garment type, exact colors and shades, material and texture, pattern/print/lace (transcribe any text exactly), fit and cut, length, neckline, sleeves, closures (buttons, zippers, hooks), trims, piping, straps, stitching and every other visible detail.
- Describe only what is visible. Do not describe the person, pose, background or lighting.
- Order items from the most prominent garment to the smallest accessory.`;
}

const BACKGROUND_TEXT: Record<Background, string> = {
  white: 'a seamless pure white (#FFFFFF) studio background',
  gray: 'a seamless light gray (#F0F0F0) studio background',
  beige: 'a seamless soft warm beige (#EFE6DA) studio background',
};

function presentationText(kind: ItemKind, presentation: Presentation): string {
  if (kind !== 'clothing') {
    return 'Show it as a clean e-commerce product shot from its most flattering angle, centered, filling most of the frame.';
  }
  return presentation === 'flat'
    ? 'Show it as a neat flat lay photographed straight from above, garment smoothed out and symmetrically arranged, centered, filling most of the frame.'
    : 'Show it in "ghost mannequin" style: the garment keeps its natural 3D shape as if worn by an invisible body, front view, centered, filling most of the frame. No visible mannequin, hanger or person.';
}

export function extractPrompt(opts: {
  name: string;
  description: string;
  kind: ItemKind;
  background: Background;
  presentation: Presentation;
}): string {
  return `You are a professional e-commerce product photographer and retoucher.
The attached photo is only a reference showing what the item looks like. Create a brand-new studio product photo of ONLY this one item. Do not edit, crop or reuse the original scene.

Item name: ${opts.name}
Item details: ${opts.description || opts.name}

Requirements:
- Keep the item exactly as it is in the photo: same colors, fabric, texture, print, lace, text, buttons, trims and proportions. Do not redesign it or add details.
- Realistically complete any parts hidden by the body, hair, hands or other clothes, matching the visible parts.
- The final image contains this single item and nothing else: no person or body parts, no other clothes, shoes or accessories, no room, floor, furniture or plants from the reference photo.
- ${presentationText(opts.kind, opts.presentation)}
- Place it on ${BACKGROUND_TEXT[opts.background]} with soft, even lighting and a subtle natural shadow.
- No text, logos added by you, watermarks, borders or props.`;
}

export function upscalePrompt(): string {
  return 'Re-render this exact product photo at higher resolution with sharper fabric and stitching detail. Keep the item, its shape, colors, background, framing and lighting identical. Do not add, remove or change anything.';
}
