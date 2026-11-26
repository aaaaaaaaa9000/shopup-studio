import React from 'react';
import type { SavedLook } from '../lib/types';

interface Props {
  looks: SavedLook[];
  disabled: boolean;
  onOpen: (look: SavedLook) => void;
  onDelete: (id: string) => void;
}

/** Looks saved in this browser. Tapping one opens it to keep styling from there. */
const SavedLooks: React.FC<Props> = ({ looks, disabled, onOpen, onDelete }) => (
  <section className="card p-5">
    <h2 className="mb-1 text-base font-bold">الأطقم المحفوظة</h2>
    <p className="mb-4 text-xs text-ink-muted">محفوظة على الجهاز ده بس. دوس على طقم عشان تكمّل عليه.</p>
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {looks.map((look) => (
        <div key={look.id} className="relative">
          <button
            type="button"
            onClick={() => onOpen(look)}
            disabled={disabled}
            title={look.names.join('، ')}
            className="block aspect-[3/4] w-full overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 transition-all hover:border-wine/50 disabled:opacity-50"
          >
            <img src={look.image} alt={look.names.join('، ') || 'طقم محفوظ'} className="h-full w-full object-cover" loading="lazy" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(look.id)}
            disabled={disabled}
            aria-label="امسح الطقم"
            className="absolute -top-1.5 -end-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-cream-300 bg-white text-xs text-ink-muted shadow-card hover:text-wine disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </section>
);

export default SavedLooks;
