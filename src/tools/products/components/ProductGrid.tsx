import React from 'react';
import { ImageFile } from '../types';
import { useStudio } from '../../../studio/StudioContext';
import { TrayIcon } from '../../../shared/icons';

interface ProductGridProps {
  images: ImageFile[];
  onAdd: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  max: number;
  onPickFromTray?: () => void;
}

const toSrc = (img: ImageFile) => `data:${img.mimeType};base64,${img.base64}`;

const ProductGrid: React.FC<ProductGridProps> = ({ images, onAdd, onRemove, max, onPickFromTray }) => {
  const { tray } = useStudio();
  const trayButton =
    onPickFromTray && tray.length > 0 && images.length < max ? (
      <button type="button" onClick={onPickFromTray} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-wine hover:underline">
        <TrayIcon className="h-4 w-4" />
        اختار من صندوق الصور
      </button>
    ) : null;
  const full = images.length >= max;

  if (images.length === 0) {
    return (
      <>
        <label
          htmlFor="products-files"
          className="group flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cream-300 bg-cream-100 p-4 text-center transition-colors hover:border-wine/40 hover:bg-wine-soft/40"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-wine shadow-card transition-transform group-hover:scale-105">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </span>
          <span className="text-sm font-bold text-ink">ارفع صور المنتجات</span>
          <span className="text-xs text-ink-muted">تقدر تختار كذا صورة مرة واحدة. صورة واضحة للمنتج على خلفية بسيطة بتطلّع أحسن نتيجة.</span>
        </label>
        <input id="products-files" type="file" multiple accept="image/*" className="hidden" onChange={onAdd} />
        {trayButton}
      </>
    );
  }

  return (
    <>
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-3">
      {images.map((image, index) => (
        <div key={`${image.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-cream-200">
          <img src={toSrc(image)} alt={image.name} className="h-full w-full object-contain" />
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label="شيل الصورة"
            className="absolute top-1.5 end-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs text-ink-soft shadow-card hover:text-wine"
          >
            ✕
          </button>
        </div>
      ))}
      {!full && (
        <label
          htmlFor="products-files"
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-cream-300 bg-cream-100 text-ink-muted transition-colors hover:border-wine/40 hover:text-wine"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-xs font-semibold">ضيف صور</span>
        </label>
      )}
      <input id="products-files" type="file" multiple accept="image/*" className="hidden" onChange={onAdd} />
    </div>
    {trayButton}
    </>
  );
};

export default ProductGrid;
