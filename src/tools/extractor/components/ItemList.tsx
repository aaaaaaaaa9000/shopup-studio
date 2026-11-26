import React, { useState } from 'react';
import { DetectedItem } from '../types';
import { KIND_LABELS } from '../constants';

interface ItemListProps {
  items: DetectedItem[];
  isAnalyzing: boolean;
  hasPhoto: boolean;
  onRetryAnalyze?: () => void;
  onToggle: (id: number) => void;
  onSetAll: (value: boolean) => void;
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
}

const MAX_CUSTOM_CHARS = 120;

const ItemList: React.FC<ItemListProps> = ({ items, isAnalyzing, hasPhoto, onRetryAnalyze, onToggle, onSetAll, onAdd, onRemove }) => {
  const [custom, setCustom] = useState('');

  if (!hasPhoto) {
    return <p className="rounded-2xl bg-cream-100 px-4 py-3 text-sm text-ink-muted">بعد ما ترفع الصورة، هتظهر هنا كل قطعة لابساها الموديل.</p>;
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer-bg h-12 animate-shimmer rounded-2xl" />
        ))}
        <p className="text-xs text-ink-muted">بدوّر على القطع في الصورة، ثواني...</p>
      </div>
    );
  }

  const selectedCount = items.filter((i) => i.selected).length;

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = custom.trim();
    if (!name) return;
    onAdd(name);
    setCustom('');
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink-muted">
            اخترت {selectedCount} من {items.length}
          </span>
          <button
            type="button"
            onClick={() => onSetAll(selectedCount !== items.length)}
            className="font-semibold text-wine hover:underline"
          >
            {selectedCount === items.length ? 'شيل الكل' : 'اختار الكل'}
          </button>
        </div>
      )}

      {items.length === 0 && onRetryAnalyze && (
        <button type="button" onClick={onRetryAnalyze} className="btn-ghost h-11 text-sm">
          حلّل الصورة تاني
        </button>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <label
              className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                item.selected ? 'border-wine/60 bg-wine-soft/60' : 'border-cream-300 bg-white hover:border-ink/25'
              }`}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => onToggle(item.id)}
                className="h-4 w-4 shrink-0 accent-wine"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={item.name}>
                {item.name}
              </span>
              <span className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                {item.description ? KIND_LABELS[item.kind] : 'مضافة'}
              </span>
            </label>
            {!item.description && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`شيل ${item.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream-200 hover:text-wine"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addCustom} className="flex gap-2">
        <input
          type="text"
          value={custom}
          maxLength={MAX_CUSTOM_CHARS}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="قطعة ناقصة؟ اكتب اسمها"
          className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/80 focus:border-wine/50 focus:outline-none"
        />
        <button type="submit" disabled={!custom.trim()} className="btn-ghost h-11 shrink-0 px-4 text-sm disabled:opacity-40">
          ضيف
        </button>
      </form>
    </div>
  );
};

export default ItemList;
