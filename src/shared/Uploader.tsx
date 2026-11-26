import React from 'react';
import type { ImageFile } from './types';
import { TrayIcon } from './icons';
import { asImageFile, useStudio } from '../studio/StudioContext';

interface UploaderProps {
  id: string;
  image: ImageFile | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called with an image picked from the studio tray. Shows the "من الصندوق" button when set. */
  onPick?: (image: ImageFile) => void;
  onClear?: () => void;
  title: string;
  hint: string;
  compact?: boolean;
  busy?: string | null;
  /** Portrait frame for full-body photos. */
  tall?: boolean;
}

const Uploader: React.FC<UploaderProps> = ({ id, image, onChange, onPick, onClear, title, hint, compact, busy, tall }) => {
  const { pickFromTray, tray } = useStudio();
  const src = image ? `data:${image.mimeType};base64,${image.base64}` : null;

  const pick = async () => {
    const [chosen] = await pickFromTray(false);
    if (chosen && onPick) onPick(asImageFile(chosen));
  };

  return (
    <div>
      <div className="relative">
        <label
          htmlFor={id}
          className={`group block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${
            src ? 'border-transparent' : 'border-cream-300 bg-cream-100 hover:border-wine/40 hover:bg-wine-soft/40'
          } ${compact ? 'aspect-[16/9]' : tall ? (src ? 'aspect-[3/4] max-h-[520px]' : 'aspect-[4/3]') : 'aspect-[4/3]'}`}
        >
          {src ? (
            <div className="relative h-full w-full bg-cream-200">
              <img src={src} alt={title} className="h-full w-full object-contain" />
              <span className="absolute bottom-3 start-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink shadow-card backdrop-blur">
                غيّر الصورة
              </span>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-wine shadow-card transition-transform group-hover:scale-105">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </span>
              <span className="text-sm font-bold text-ink">{title}</span>
              <span className="text-xs text-ink-muted">{hint}</span>
            </div>
          )}
        </label>
        <input id={id} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onChange} />
        {src && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="شيل الصورة"
            className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-card hover:text-wine"
          >
            ✕
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/80 backdrop-blur-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-wine border-t-transparent" />
            <span className="text-xs font-bold text-ink">{busy}</span>
          </div>
        )}
      </div>
      {onPick && tray.length > 0 && !busy && (
        <button type="button" onClick={pick} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-wine hover:underline">
          <TrayIcon className="h-4 w-4" />
          اختار من صندوق الصور
        </button>
      )}
    </div>
  );
};

export default Uploader;
