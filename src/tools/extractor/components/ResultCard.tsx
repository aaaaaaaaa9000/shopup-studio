import React from 'react';
import { DetectedItem, ExtractOptions, ImageFile } from '../types';
import { BACKGROUNDS } from '../constants';
import { SendButton } from '../../../studio/Sheets';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface Job {
  id: number;
  item: DetectedItem;
  /** The model photo this job was made from (kept so "try again" works after a new upload). */
  source: ImageFile;
  options: ExtractOptions;
  status: JobStatus;
  image?: ImageFile;
  error?: string;
  /** High quality was asked for but only the standard image could be made. */
  lowered?: boolean;
}

interface ResultCardProps {
  job: Job;
  onRetry: () => void;
  onDownload: () => void;
}

const toSrc = (img: ImageFile) => `data:${img.mimeType};base64,${img.base64}`;

/** "4:5" → "4 / 5" for the CSS aspect-ratio property. */
const cssRatio = (ratio: string) => ratio.replace(':', ' / ');

const ResultCard: React.FC<ResultCardProps> = ({ job, onRetry, onDownload }) => {
  const busy = job.status === 'queued' || job.status === 'running';
  const swatch = BACKGROUNDS.find((b) => b.value === job.options.background)?.swatch || '#FFFFFF';

  return (
    <div className="card flex min-w-0 flex-col gap-3 p-3 animate-fadeUp">
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl"
        style={{ aspectRatio: cssRatio(job.options.aspectRatio), background: job.status === 'done' ? swatch : undefined }}
      >
        {job.status === 'done' && job.image ? (
          <img src={toSrc(job.image)} alt={job.item.name} className="h-full w-full object-contain" />
        ) : job.status === 'error' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-cream-100 px-4 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wine text-sm font-bold text-white">!</span>
            <p className="text-sm leading-relaxed text-wine-dark">{job.error}</p>
          </div>
        ) : (
          <div className="shimmer-bg absolute inset-0 flex animate-shimmer flex-col items-center justify-center gap-3">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />
            <p className="text-xs font-bold text-ink-soft">{job.status === 'queued' ? 'مستنية دورها...' : 'بنطلّع القطعة...'}</p>
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-ink-soft" title={job.item.name}>
          {job.item.name}
        </span>
        {job.options.quality !== 'standard' && !job.lowered && (
          <span className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-soft">عالية</span>
        )}
      </div>

      {job.status === 'done' && job.lowered && (
        <p className="-mt-1 text-xs text-ink-muted">طلعت بالجودة العادية. دوس "طلّعها تاني" لو عايزها عالية.</p>
      )}

      {job.status === 'error' && (
        <button type="button" onClick={onRetry} className="btn-primary h-10 text-sm">
          جرّب تاني
        </button>
      )}

      {job.status === 'done' && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onDownload} disabled={busy} className="btn-primary h-10 px-2 text-sm">
            تحميل
          </button>
          <button type="button" onClick={onRetry} disabled={busy} className="btn-ghost h-10 px-2 text-sm disabled:opacity-40">
            طلّعها تاني
          </button>
          <SendButton image={job.image} from="extractor" className="btn-ghost col-span-2 h-10 px-2 text-sm" />
        </div>
      )}
    </div>
  );
};

export default ResultCard;
