
export type LightingStyle = 'Natural Light' | 'Studio Light' | 'Golden Hour' | 'Blue Hour' | 'Cinematic' | 'Dramatic';
export type CameraPerspective = 'Front View' | 'Top View' | 'Side View' | '45° Angle' | 'Close-up' | 'Macro Shot';
/** Quick pose change only (from the old coloring app): `Pose:<id>` from QUICK_POSES. */
export type QuickPose = `Pose:${string}`;
export type StylePreset = QuickPose | 'Standard' | 'Cinematic 3D Ad' | 'Valentine 3D Ad' | 'Relaxation 3D Ad' | 'Winter 3D Ad' | 'Summer 3D Ad' | 'Summer Relaxed Ad' | 'Summer Relaxed Outdoor Ad' | 'Outdoor Portrait' | 'Editorial Portrait' | 'Instagram Reels Style' | 'Instagram Reels Lifestyle' | 'Instagram Reels Confidence' | 'Outdoor Photoshoot Style' | 'Natural Outdoor Lifestyle' | 'Natural Close-up Portrait' | 'Instagram Reels Luxury' | 'Instagram Reels Soft Luxury' | 'Instagram Reels Soft Feminine' | 'Instagram Reels Birthday' | 'Instagram Reels Birthday Celebration' | 'Instagram Reels Birthday Walk' | 'Instagram Reels Café Birthday' | 'Instagram Reels Birthday Close-up';

export interface CustomizationOptions {
  stylePreset: StylePreset;
  lightingStyle: LightingStyle;
  cameraPerspective: CameraPerspective;
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}
