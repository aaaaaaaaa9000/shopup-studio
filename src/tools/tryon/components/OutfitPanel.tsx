import React from 'react';
import type { Layer, SubjectKind } from '../lib/types';
import { toSrc } from '../lib/image';
import { COLORS } from '../lib/options';
import { TrashIcon } from '../../../shared/icons';

interface Props {
  subject: SubjectKind;
  layers: Layer[];
  disabled: boolean;
  onRemoveLast: () => void;
  onColor: (label: string, value: string) => void;
}

/** Step 3: what is worn right now, in order, with recolor for the last piece. */
const OutfitPanel: React.FC<Props> = ({ subject, layers, disabled, onRemoveLast, onColor }) => {
  const last = layers.length - 1;
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="step-num">٣</span>
        <h2 className="text-base font-bold">الطقم الحالي</h2>
      </div>

      <ol className="flex flex-col gap-2">
        {layers.map((layer, i) => (
          <li key={layer.garment?.id || 'base'} className="flex items-center gap-3 rounded-2xl border border-cream-300/80 bg-cream-100 p-2">
            <span dir="ltr" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream-300 text-xs font-bold text-ink-soft">
              {i + 1}
            </span>
            {layer.garment && (
              <img src={toSrc(layer.garment.image)} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={layer.garment?.name}>
              {layer.garment ? layer.garment.name : subject === 'mannequin' ? 'المانيكان' : 'صورتك'}
            </span>
            {i > 0 && i === last && (
              <button
                type="button"
                onClick={onRemoveLast}
                disabled={disabled}
                aria-label="اقلع القطعة دي"
                title="اقلع القطعة دي"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-wine-soft hover:text-wine disabled:opacity-40"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </li>
        ))}
      </ol>

      {last > 0 ? (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-bold">غيّر لون آخر قطعة</h3>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onColor(c.label, c.value)}
                disabled={disabled}
                title={c.label}
                aria-label={`لون ${c.label}`}
                className="h-8 w-8 rounded-full border border-ink/15 shadow-card transition-transform hover:scale-110 disabled:opacity-40 disabled:hover:scale-100"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">القطع اللي هتلبسها هتظهر هنا بالترتيب، وتقدر تقلع آخر واحدة.</p>
      )}
    </section>
  );
};

export default OutfitPanel;
