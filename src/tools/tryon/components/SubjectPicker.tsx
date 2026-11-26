import React, { useState } from 'react';
import type { Img } from '../lib/types';
import { readImageFile, toSrc } from '../lib/image';
import { MANNEQUINS } from '../lib/options';
import { TrayIcon, UploadIcon } from '../../../shared/icons';
import { useStudio } from '../../../studio/StudioContext';

interface Props {
  busy: boolean;
  onMakeModel: (photo: Img) => Promise<Img | null>;
  onUsePhoto: (img: Img) => void;
  onPickMannequin: (id: string) => void;
  onPickFromTray?: () => void;
}

/** Step 1: choose who wears the clothes, the user's own photo or a ready mannequin. */
const SubjectPicker: React.FC<Props> = ({ busy, onMakeModel, onUsePhoto, onPickMannequin, onPickFromTray }) => {
  const { tray } = useStudio();
  const [photo, setPhoto] = useState<Img | null>(null);
  const [model, setModel] = useState<Img | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReadError(null);
    setModel(null);
    try {
      const img = await readImageFile(file);
      setPhoto(img);
      setModel(await onMakeModel(img));
    } catch (err) {
      setReadError(err instanceof Error ? err.message : 'ماقدرتش أقرا الصورة.');
    }
  };

  return (
    <>
      <section className="card p-5">
        <div className="mb-1 flex items-center gap-3">
          <span className="step-num">١</span>
          <h2 className="text-base font-bold">مين هيلبس؟</h2>
        </div>
        <p className="mb-4 ps-10 text-xs text-ink-muted">ارفع صورتك أو اختار مانيكان جاهز.</p>

        {!photo ? (
          <label
            htmlFor="tryon-person"
            className={`group flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-100 p-4 text-center transition-colors hover:border-wine/40 hover:bg-wine-soft/40 ${busy ? 'pointer-events-none opacity-50' : ''}`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-wine shadow-card transition-transform group-hover:scale-105">
              <UploadIcon className="h-6 w-6" />
            </span>
            <span className="text-sm font-bold text-ink">ارفع صورتك</span>
            <span className="text-xs text-ink-muted">صورة واضحة للجسم كله أفضل حاجة</span>
          </label>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-3">
              <figure className="overflow-hidden rounded-2xl bg-cream-200">
                <img src={toSrc(photo)} alt="صورتك" className="aspect-[3/4] w-full object-cover" />
                <figcaption className="py-1.5 text-center text-xs font-bold text-ink-soft">صورتك</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-2xl bg-cream-200">
                {model ? (
                  <img src={toSrc(model)} alt="الموديل" className="aspect-[3/4] w-full animate-fadeUp object-cover" />
                ) : (
                  <div className="shimmer-bg flex aspect-[3/4] w-full animate-shimmer items-center justify-center">
                    {busy && <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />}
                  </div>
                )}
                <figcaption className="py-1.5 text-center text-xs font-bold text-ink-soft">بعد التجهيز</figcaption>
              </figure>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {model && (
                <button type="button" onClick={() => onUsePhoto(model)} className="btn-primary h-12 text-base">
                  كمّل بالصورة الجديدة
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => onUsePhoto(photo)} className="btn-ghost h-11 text-sm">
                  استخدم الأصلية
                </button>
                <label htmlFor="tryon-person" className={`btn-ghost h-11 cursor-pointer text-sm ${busy ? 'pointer-events-none opacity-40' : ''}`}>
                  صورة تانية
                </label>
              </div>
            </div>
          </div>
        )}
        <input id="tryon-person" type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
        {!photo && onPickFromTray && tray.length > 0 && (
          <button type="button" disabled={busy} onClick={onPickFromTray} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-wine hover:underline disabled:opacity-40">
            <TrayIcon className="h-4 w-4" />
            اختار موديل من صندوق الصور
          </button>
        )}
        {readError && <p className="mt-3 text-sm text-wine-dark">{readError}</p>}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-base font-bold">أو جرّب على مانيكان</h2>
        <p className="mb-4 text-xs text-ink-muted">مناسب للملابس الداخلية واللانجري، وأسرع لصور المنتجات.</p>
        <div className="grid grid-cols-2 gap-3">
          {MANNEQUINS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => onPickMannequin(m.id)}
              className="group overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 text-start transition-all hover:border-wine/50 disabled:opacity-50"
            >
              <img src={m.src} alt={m.label} className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-[1.02]" />
              <span className="block px-3 py-2 text-sm font-bold text-ink">{m.label}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export default SubjectPicker;
