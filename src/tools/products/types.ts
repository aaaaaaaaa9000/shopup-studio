export type LightingStyle = 'Natural Light' | 'Studio Light' | 'Golden Hour' | 'Blue Hour' | 'Cinematic' | 'Dramatic';
export type CameraPerspective = 'Front View' | 'Top View' | 'Side View' | '45° Angle' | 'Close-up' | 'Macro Shot';
export type ShotMode = 'single' | 'group';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';
export type Quality = 'standard' | '2K' | '4K';

export interface CustomizationOptions {
  mode: ShotMode;
  lightingStyle: LightingStyle;
  cameraPerspective: CameraPerspective;
  aspectRatio: AspectRatio;
  quality: Quality;
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}
