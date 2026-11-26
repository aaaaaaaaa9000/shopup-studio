import React, { useEffect, useState } from 'react';
import type { Garment, Img, SubjectKind } from '../lib/types';
import { downloadImage, toSrc } from '../lib/image';
import { MANNEQUINS } from '../lib/options';
import { CheckIcon, DownloadIcon, HangerIcon, SaveIcon } from '../../../shared/icons';
import { SendButton } from '../../../studio/Sheets';

export interface StageError {
  message: string;
  /** Offered when Gemini refuses a garment on a real person: retry it on a mannequin. */
  action?: { garment: Garment; run: (garment: Garment, mannequinId: string) => void };
}

interface Props {
  image: Img | null;
  subject: SubjectKind | null;
  busy: string | null;
  error: StageError | null;
  canSave: boolean;
  onDismissError: () => void;
  onSave: () => Promise<boolean | undefined>;
}

const Stage: React.FC<Props> = ({ image, subject, busy, error, canSave, onDismissError, onSave }) => {
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const handleSave = async () => {
    if (await onSave()) setSavedFlash(true);
  };

  return (
    <div className="lg:sticky lg:top-36">
      <section className="card overflow-hidden p-3 sm:p-4">
        <div className="relative mx-auto flex aspect-[3/4] max-h-[78vh] items-center justify-center overflow-hidden rounded-2xl bg-cream-100">
          {image ? (
            <img key={image.base64.slice(-32)} src={toSrc(image)} alt="النتيجة" className="h-full w-full animate-fadeUp object-contain" />
          ) : (
            <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-wine shadow-card">
                <HangerIcon className="h-8 w-8" />
              </span>
              <h2 className="text-lg font-bold">الطقم هيظهر هنا</h2>
              <p className="text-sm text-ink-muted">اختار صورتك أو مانيكان، وبعدين ارفع صور الهدوم ودوس عليها عشان تتلبس.</p>
            </div>
          )}

          {busy && (
            <div className="shimmer-bg absolute inset-0 flex animate-shimmer flex-col items-center justify-center gap-4 bg-opacity-90">
              <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />
              <p className="animate-fadeUp px-6 text-center text-sm font-bold text-ink-soft">{busy}</p>
            </div>
          )}

          {subject && image && !busy && (
            <span className="absolute top-3 start-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink-soft shadow-card backdrop-blur">
              {subject === 'mannequin' ? 'مانيكان' : 'صورتك'}
            </span>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-3 rounded-2xl border border-wine-line bg-wine-soft p-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wine text-xs font-bold text-white">!</span>
              <p className="flex-1 text-sm leading-relaxed text-wine-dark">{error.message}</p>
              <button type="button" onClick={onDismissError} aria-label="إغلاق" className="text-wine-dark/60 hover:text-wine-dark">
                ✕
              </button>
            </div>
            {error.action && (
              <div className="mt-3 ps-9">
                <p className="mb-2 text-sm font-bold text-ink">جرّب «{error.action.garment.name}» على مانيكان:</p>
                <div className="flex flex-wrap gap-2">
                  {MANNEQUINS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => error.action!.run(error.action!.garment, m.id)}
                      className="btn-primary h-10 px-4 text-sm"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {image && !busy && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <SendButton image={image} from="tryon" className="btn-ghost col-span-2 h-11 px-4 text-sm" />
            <button type="button" onClick={handleSave} disabled={!canSave || savedFlash} className="btn-ghost h-11 px-4 text-sm">
              {savedFlash ? <CheckIcon className="h-4 w-4 text-wine" /> : <SaveIcon className="h-4 w-4" />}
              {savedFlash ? 'اتحفظ' : 'احفظ الطقم'}
            </button>
            <button type="button" onClick={() => downloadImage(image, `try-on-${Date.now()}`)} className="btn-primary h-11 px-5 text-sm">
              <DownloadIcon className="h-4 w-4" />
              تحميل
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Stage;
