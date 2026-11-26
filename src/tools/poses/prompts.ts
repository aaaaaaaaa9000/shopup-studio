import { CustomizationOptions } from './types';
import { QUICK_POSES } from './constants';

/** Builds the image-generation prompt for the selected preset and options. */
export function buildPrompt(opts: CustomizationOptions, styleDescription: string | null): string {
  let newPrompt = '';

  if (opts.stylePreset.startsWith('Pose:')) {
    const pose = QUICK_POSES.find((p) => `Pose:${p.id}` === opts.stylePreset);
    return (
      `You are an expert fashion photo editor. Change the pose of the person in the image to: ${pose?.en || 'a natural relaxed pose'}. ` +
      `You MUST NOT change the person's identity, face, body shape, their clothing (including its exact colors) or the background. ` +
      `The final image should be photorealistic and seamlessly edited. Return ONLY the final image.`
    );
  }

  if (opts.stylePreset === 'Cinematic 3D Ad') {
    newPrompt = `Cinematic 3D action-packed advertisement of the subject in the provided image, captured in a dramatic mid-motion scene that embodies its core energy. Use bold studio lighting with intense highlights and deep shadows, dynamic particles, and slow-motion effects to amplify impact. The environment should feel surreal yet hyperrealistic, designed to reflect the product’s personality (crunchy, energetic, fast, luxurious, refreshing, etc.). Integrate the brand logo crafted from product elements if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, bold, and designed to go viral.`;
  } else if (opts.stylePreset === 'Valentine 3D Ad') {
    newPrompt = `Cinematic 3D romantic advertisement of the subject in the provided image, captured in a dreamy mid-motion scene that embodies love and passion. Use soft, warm studio lighting with rose-gold highlights and deep shadows, dynamic floating rose petals or heart-shaped particles, and slow-motion effects to amplify the romantic impact. The environment should feel surreal yet hyperrealistic, designed to reflect the product’s personality suitable for Valentine's Day (romantic, luxurious, sweet, passionate). Integrate the brand logo crafted from product elements if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, bold, and designed to go viral.`;
  } else if (opts.stylePreset === 'Relaxation 3D Ad') {
    newPrompt = `Cinematic 3D serene advertisement of the subject in the provided image, captured in a peaceful scene that embodies ultimate comfort and relaxation. Use soft, warm lighting with gentle highlights and cozy shadows, subtle floating feathers or soft clouds to amplify the soothing atmosphere. The environment should feel surreal yet hyperrealistic, designed to reflect the product’s personality (soft, plush, calm, soothing, tranquil). Integrate the brand logo crafted from product elements if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, elegant, and designed to go viral.`;
  } else if (opts.stylePreset === 'Winter 3D Ad') {
    newPrompt = `Cinematic cozy winter advertisement of the subject in the provided image, captured in a serene and inviting scene that embodies the warmth and comfort of the season. Use soft, warm lighting that contrasts gently with a cool, snowy background, creating a cozy and luxurious atmosphere. The environment should feel premium and hyperrealistic, designed to reflect the product’s personality suitable for winter (warm, comforting, soft, elegant). Integrate the brand logo subtly if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, elegant, and designed to evoke a sense of winter comfort.`;
  } else if (opts.stylePreset === 'Summer 3D Ad') {
    newPrompt = `Cinematic 3D summer advertisement of the subject in the provided image, captured in a vibrant and energetic mid-motion scene that embodies the refreshing spirit of the season. Use bright, intense sunlight with sharp contrasts, dynamic elements like water splashes, heat waves, or tropical particles, and slow-motion effects to amplify the refreshing impact. The environment should feel surreal yet hyperrealistic, designed to reflect the product’s personality suitable for summer (refreshing, cool, bright, energetic). Integrate the brand logo crafted from product elements if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, bold, and designed to go viral.`;
  } else if (opts.stylePreset === 'Summer Relaxed Ad') {
    newPrompt = `Cinematic serene summer advertisement of the subject in the provided image, captured in a peaceful and relaxing indoor scene that embodies the quiet luxury of the season. Use soft, natural sunlight streaming through windows with gentle highlights and calming shadows, avoiding dynamic motion. The environment should feel hyperrealistic and tranquil, perhaps a stylish interior with light linen textures, indoor tropical plants, or a sunroom, designed to reflect the product’s personality suitable for a relaxed summer (calm, refreshing, luxurious, peaceful). Integrate the brand logo subtly if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, elegant, and designed to go viral.`;
  } else if (opts.stylePreset === 'Summer Relaxed Outdoor Ad') {
    newPrompt = `Cinematic serene summer advertisement of the subject in the provided image, captured in a peaceful and relaxing scene that embodies the quiet luxury of the season. Use soft, natural sunlight with gentle highlights and calming shadows, avoiding dynamic motion. The environment should feel hyperrealistic and tranquil, perhaps a quiet beach at sunset or a serene poolside, designed to reflect the product’s personality suitable for a relaxed summer (calm, refreshing, luxurious, peaceful). Integrate the brand logo subtly if possible, and place a sleek creative slogan beneath it that matches the mood. Composition in 1:1 aspect ratio, hyper-detailed, sharp, elegant, and designed to go viral.`;
  } else if (opts.stylePreset === 'Outdoor Portrait') {
    newPrompt = `A realistic outdoor portrait of the subject in the provided image, depicted as a young woman standing at a slight side angle, body turned 45 degrees away from the camera, head gently facing the lens, soft natural expression, one hand lightly touching her hair, casual stylish outfit, natural daylight, shallow depth of field, blurred background, high detail, photorealistic.`;
  } else if (opts.stylePreset === 'Editorial Portrait') {
    newPrompt = `A stylish outdoor portrait of the subject in the provided image, depicted as a young woman leaning gently against a wall or tree, one leg slightly bent, relaxed body language, looking away from the camera with a thoughtful expression, natural environment, warm daylight, editorial photography style, photorealistic.`;
  } else if (opts.stylePreset === 'Instagram Reels Style') {
    newPrompt = `A trendy Instagram Reels style outdoor shot of the subject in the provided image, depicted as a young woman with a modern BMW car, confident and natural pose, cinematic vertical framing (9:16), stylish casual outfit, clean luxury lifestyle vibe, smooth camera motion feel, shallow depth of field, soft natural daylight, modern color grading, high realism.`;
  } else if (opts.stylePreset === 'Instagram Reels Lifestyle') {
    newPrompt = `A fashionable Instagram Reels lifestyle shot of the subject in the provided image, depicted as a young woman sitting casually on the hood of a BMW, confident youthful energy, clean luxury aesthetic, golden hour lighting, shallow depth of field, vertical video look, high realism.`;
  } else if (opts.stylePreset === 'Instagram Reels Confidence') {
    newPrompt = `A confident young woman leaning casually on a modern BMW, relaxed posture, effortless Instagram Reels vibe, luxury lifestyle mood, urban background, cinematic lighting, vertical composition, realistic photography, reference image guided.`;
  } else if (opts.stylePreset === 'Outdoor Photoshoot Style') {
    newPrompt = `A stylish outdoor photoshoot of the subject in the provided image, depicted as a young woman leaning casually against a modern car, one leg slightly bent, arms relaxed, confident expression, contemporary fashion style, soft natural light, cinematic composition, photorealistic details.`;
  } else if (opts.stylePreset === 'Natural Outdoor Lifestyle') {
    newPrompt = `A natural outdoor portrait of the subject in the provided image, depicted as a young woman sitting casually on stairs or a bench, leaning slightly forward, relaxed shoulders, hands resting naturally, calm and confident expression, soft sunlight, lifestyle photography, realistic proportions, shallow depth of field.`;
  } else if (opts.stylePreset === 'Natural Close-up Portrait') {
    newPrompt = `A close-up outdoor portrait of the subject in the provided image, depicted as a young woman interacting naturally with her hair or accessories, soft candid expression, minimal makeup, elegant casual outfit, golden hour lighting, dreamy background blur, high realism, lifestyle portrait photography.`;
  } else if (opts.stylePreset === 'Instagram Reels Luxury') {
    newPrompt = `A luxury Instagram Reels style outdoor shot of the subject in the provided image, depicted as a young woman with a modern BMW, confident elegant pose, clean high-end lifestyle aesthetic, tailored fashionable outfit, premium look, cinematic vertical framing (9:16), sharp focus on subject, soft natural daylight, refined color grading, glossy highlights, photorealistic, high detail, minimal background, luxury tones, deep shadows, crisp highlights, premium vibe.`;
  } else if (opts.stylePreset === 'Instagram Reels Soft Luxury') {
    newPrompt = `A high-quality Instagram Reels style outdoor shot of the subject in the provided image, depicted as a young woman with a modern BMW, soft feminine luxury aesthetic, gentle confident pose, relaxed body language, natural elegant smile, flowing stylish outfit in pastel or neutral tones, clean luxury lifestyle vibe, cinematic vertical framing (9:16), soft natural daylight, shallow depth of field, smooth realistic skin texture, refined facial details, dreamy atmosphere, warm tones, subtle glow, airy feeling, romantic softness, minimal contrast, modern instagram color grading, photorealistic, high detail.`;
  } else if (opts.stylePreset === 'Instagram Reels Soft Feminine') {
    newPrompt = `A soft feminine Instagram Reels style outdoor shot of the subject in the provided image, depicted as a young woman with a modern BMW, gentle relaxed pose, natural smile, flowing outfit, pastel or neutral colors, dreamy lifestyle mood, cinematic vertical framing (9:16), soft natural light, shallow depth of field, smooth skin texture, delicate color grading, photorealistic, warm tones, pastel highlights, airy feeling, subtle glow, romantic softness, minimal contrast.`;
  } else if (opts.stylePreset === 'Instagram Reels Birthday') {
    newPrompt = `A joyful Instagram Reels style outdoor birthday celebration shot of the subject in the provided image, depicted as a young woman turning 21, soft feminine aesthetic, elegant yet playful mood, holding balloons or a small birthday cake, gentle confident smile, flowing stylish outfit in pastel or light tones, celebratory details like candles or confetti, cinematic vertical framing (9:16), soft natural daylight, shallow depth of field, dreamy atmosphere, warm tones, subtle glow, airy feeling, romantic softness, clean instagram color grading, photorealistic, high detail, birthday balloons, soft confetti, glowing candles.`;
  } else if (opts.stylePreset === 'Instagram Reels Birthday Celebration') {
    newPrompt = `A joyful Instagram Reels style outdoor birthday celebration shot of the subject in the provided image, depicted as a young woman turning 21, soft feminine aesthetic, elegant yet playful mood, holding balloons or a small birthday cake, gentle confident smile, flowing stylish outfit in pastel or light tones, celebratory details like candles or confetti, cinematic vertical framing (9:16), soft natural daylight, shallow depth of field, dreamy atmosphere, warm tones, subtle glow, airy feeling, romantic softness, clean instagram color grading, photorealistic, high detail, floral accents, pastel decorations, gentle motion feel.`;
  } else if (opts.stylePreset === 'Instagram Reels Birthday Walk') {
    newPrompt = `A soft feminine Instagram Reels style outdoor birthday shot of the subject in the provided image, depicted as a young woman turning 21, walking naturally while holding pastel balloons, joyful relaxed expression, gentle confident posture, flowing elegant outfit in light neutral tones, candid lifestyle feel, cinematic vertical framing (9:16), soft natural daylight, shallow depth of field, dreamy background blur, warm tones, subtle glow, airy feeling, romantic softness, minimal contrast, modern instagram color grading, photorealistic, high detail.`;
  } else if (opts.stylePreset === 'Instagram Reels Café Birthday') {
    newPrompt = `A soft feminine Instagram Reels style café portrait of the subject in the provided image, depicted as a young woman celebrating her 21st birthday, seated or standing casually at a cozy café, gentle natural smile, relaxed elegant pose, flowing stylish outfit in pastel or neutral colors, warm café atmosphere, cinematic vertical framing (9:16), soft window light, shallow depth of field, dreamy lifestyle mood, warm tones, subtle glow, airy feeling, romantic softness, clean instagram color grading, photorealistic, high detail.`;
  } else if (opts.stylePreset === 'Instagram Reels Birthday Close-up') {
    newPrompt = `A soft feminine Instagram Reels style close-up birthday portrait of the subject in the provided image, depicted as a young woman holding a small birthday cake with a glowing candle shaped as number 21, gentle joyful smile, delicate facial expression, minimal makeup, intimate celebratory mood, cinematic vertical framing (9:16), soft natural light, shallow depth of field, creamy background blur, warm tones, subtle glow, airy feeling, romantic softness, minimal contrast, modern instagram color grading, photorealistic, high detail.`;
  } else {
    newPrompt = `Professional photo of subject, ${opts.lightingStyle}, ${opts.cameraPerspective}, premium studio quality.`;
  }

  newPrompt += `\n\n- CRITICAL: Preserve exact facial features and likeness of the model.`;

  if (styleDescription) {
    newPrompt += `\n\n- Match the style/mood of the reference: ${styleDescription}`;
  }


  return newPrompt;
}
