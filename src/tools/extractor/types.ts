export type ItemKind = 'clothing' | 'footwear' | 'bag' | 'accessory' | 'jewelry';
export type Background = 'white' | 'gray' | 'beige';
export type Presentation = 'ghost' | 'flat';
export type AspectRatio = '1:1' | '4:5' | '3:4';
export type Quality = 'standard' | '2K';

export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

/** One piece found in the photo (or added by hand). */
export interface DetectedItem {
  id: number;
  name: string;
  kind: ItemKind;
  description: string;
  selected: boolean;
}

export interface ExtractOptions {
  background: Background;
  presentation: Presentation;
  aspectRatio: AspectRatio;
  quality: Quality;
}
