import React, { useEffect, useState } from 'react';
import { ImageFile, Quality } from '../types';
import { SendButton } from '../../../studio/Sheets';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface Job {
  id: number;
  label: string;
  inputs: ImageFile[];
  prompt: string;
  styleImage: ImageFile | null;
  aspectRatio: string;
  quality: Quality;
  status: JobStatus;
  image?: ImageFile;
  error?: string;
  blurring?: boolean;
  blurError?: string;
}

interface ResultCardProps {
  job: Job;
  onRetry: () => void;
  onDownload: () => void;
  onBlur: (intensity: number) => void;
}

const toSrc = (img: ImageFile) => `data:${img.mimeType};base64,${img.base64}`;

/** "9:16" → "9 / 16" for the CSS aspect-ratio property. */
const cssRatio = (ratio: string) => ratio.replace(':', ' / ');

const ResultCard: React.FC<ResultCardProps> = ({ job, onRetry, onDownload, onBlur }) => {
  const [blurOpen, setBlurOpen] = useState(false);
  const [intensity, setIntensity] = useState(10);
  // Close the blur panel once a new (blurred or regenerated) image arrives.
  useEffect(() => setBlurOpen(false), [job.image]);
  const busy = job.status === 'queued' || job.status === 'running' || job.blurring;

  return (
    <div className="card flex min-w-0 flex-col gap-3 p-3 animate-fadeUp">
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-cream-100"
        style={{ aspectRatio: cssRatio(job.aspectRatio) }}
      >
        {job.status === 'done' && job.image ? (
          <img src={toSrc(job.image)} alt={job.label} className="h-full w-full object-contain" />
        ) : job.status === 'error' ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wine text-sm font-bold text-white">!</span>
            <p className="text-sm leading-relaxed text-wine-dark">{job.error}</p>
          </div>
        ) : (
          <div className="shimmer-bg absolute inset-0 flex animate-shimmer flex-col items-center justify-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />
            <p className="text-xs font-bold text-ink-soft">{job.status === 'queued' ? 'مستني دوره...' : 'بنصوّر المنتج...'}</p>
          </div>
        )}

        {job.blurring && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-sm">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />
            <p className="text-xs font-bold text-ink">بنغبّش الخلفية...</p>
          </div>
        )}

        {job.inputs.length > 0 && job.status !== 'error' && (
          <div className="absolute bottom-2 start-2 flex -space-x-3 rtl:space-x-reverse">
            {job.inputs.slice(0, 4).map((img, i) => (
              <img
                key={i}
                src={toSrc(img)}
                alt=""
                className="h-10 w-10 rounded-lg border-2 border-white bg-cream-200 object-cover shadow-card"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-ink-soft" title={job.label}>
          {job.label}
        </span>
        {job.quality !== 'standard' && (
          <span className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-soft" dir="ltr">
            {job.quality}
          </span>
        )}
      </div>

      {job.status === 'error' && (
        <button type="button" onClick={onRetry} className="btn-primary h-10 text-sm">
          جرّب تاني
        </button>
      )}

      {job.status === 'done' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={onDownload} disabled={busy} className="btn-primary h-10 px-2 text-sm">
              تحميل
            </button>
            <button
              type="button"
              onClick={() => setBlurOpen((o) => !o)}
              disabled={busy}
              aria-expanded={blurOpen}
              className="btn-ghost h-10 px-2 text-sm disabled:opacity-40"
            >
              تغبيش
            </button>
            <button type="button" onClick={onRetry} disabled={busy} className="btn-ghost h-10 px-2 text-sm disabled:opacity-40">
              ولّد تاني
            </button>
          </div>

          <SendButton image={busy ? null : job.image} from="products" className="btn-ghost h-10 px-2 text-sm" />

          {blurOpen && (
            <div className="flex flex-col gap-3 rounded-2xl bg-cream-100 p-3">
              <label htmlFor={`blur-${job.id}`} className="flex items-center justify-between text-sm font-bold">
                <span>تغبيش الخلفية</span>
                <span className="text-xs font-semibold text-ink-muted">
                  {intensity < 15 ? 'خفيف' : intensity < 30 ? 'متوسط' : 'قوي'}
                </span>
              </label>
              <input
                id={`blur-${job.id}`}
                type="range"
                min={2}
                max={50}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-wine"
              />
              {job.blurError && <p className="text-xs text-wine-dark">{job.blurError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setBlurOpen(false)} className="btn-ghost h-10 flex-1 text-sm">
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onBlur(intensity)}
                  className="btn-primary h-10 flex-1 text-sm"
                >
                  طبّق
                </button>
              </div>
              <p className="text-xs text-ink-muted">بيعمل صورة جديدة بالذكاء الاصطناعي، يعني بيتحسب زي توليد صورة.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ResultCard;
