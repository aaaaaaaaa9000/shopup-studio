export interface Img {
  base64: string;
  mimeType: string;
}

export type SubjectKind = 'person' | 'mannequin';

export interface Garment {
  id: string;
  name: string;
  image: Img;
}

/** One step of the outfit: the base (garment = null) or a garment added on top. */
export interface Layer {
  garment: Garment | null;
  /** Generated images of this step, by pose key ("default" = the original pose). */
  images: Record<string, Img>;
}

export interface SavedLook {
  id: string;
  /** Compressed JPEG data URL. */
  image: string;
  subject: SubjectKind;
  names: string[];
  createdAt: number;
}
