// Overlays shared by all sections: the image tray, the tray picker, the
// "send to" sheet and a small toast.
import React, { useEffect, useState } from 'react';
import { CloseIcon, DownloadIcon, SendIcon, TrashIcon, TrayIcon, UploadIcon } from '../shared/icons';
import { readAndResizeImage } from '../shared/resizeImage';
import { MAX_TRAY, useStudio } from './StudioContext';
import type { TrayImage } from './store';
import { TARGETS, toolInfo, type ToolId } from './tools';

const toSrc = (img: { base64: string; mimeType: string }) => `data:${img.mimeType};base64,${img.base64}`;

export function downloadTrayImage(img: { base64: string; mimeType: string; name?: string }) {
  const ext = img.mimeType.includes('png') ? 'png' : img.mimeType.includes('webp') ? 'webp' : 'jpg';
  const base = (img.name || 'image').replace(/\.[^/.]+$/, '').replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) || 'image';
  const link = document.createElement('a');
  link.href = toSrc(img);
  link.download = `${base}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const fromLabel = (from: TrayImage['from']) => (from === 'upload' ? 'مرفوعة' : toolInfo(from as ToolId).label);

// Page scroll stays locked while at least one overlay is open (they can stack).
let scrollLocks = 0;

/** Closes on Escape and locks page scroll while an overlay is open. */
function useOverlay(onClose: () => void) {
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (--scrollLocks === 0) document.body.style.overflow = '';
    };
  }, []);
}

const Sheet: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; z?: string }> = ({
  title,
  onClose,
  children,
  footer,
  z = 'z-[60]',
}) => {
  useOverlay(onClose);
  return (
    <div className={`fixed inset-0 ${z} flex items-end justify-center sm:items-center sm:p-6`} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-cream shadow-lift animate-fadeUp sm:max-w-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-cream-300/70 px-5 py-4">
          <h2 className="text-base font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-cream-200 hover:text-ink">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && <div className="border-t border-cream-300/70 bg-cream-100 p-3">{footer}</div>}
      </div>
    </div>
  );
};

/** Small button placed under results: opens the "send to" sheet for that image. */
export const SendButton: React.FC<{
  image: { base64: string; mimeType: string; name?: string } | null | undefined;
  from: ToolId;
  className?: string;
  label?: string;
}> = ({ image, from, className = 'btn-ghost h-11 px-4 text-sm', label = 'ابعت لقسم تاني' }) => {
  const { openSendSheet } = useStudio();
  return (
    <button type="button" disabled={!image} onClick={() => image && openSendSheet(image, from)} className={`${className} disabled:opacity-40`}>
      <SendIcon className="h-4 w-4 rtl:-scale-x-100" />
      {label}
    </button>
  );
};

function SendSheet() {
  const { sendSheet, closeSendSheet, sendTo, removeFromTray, showToast } = useStudio();
  if (!sendSheet) return null;
  const { image, from } = sendSheet;
  const targets = TARGETS.filter((t) => t.tool !== from || (from === 'tryon' && t.target === 'tryon-person'));

  return (
    <Sheet title="ابعت الصورة لـ..." onClose={closeSendSheet} z="z-[70]">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-2xl bg-cream-200 sm:mx-0 sm:w-44">
          <img src={toSrc(image)} alt={image.name} className="aspect-[3/4] w-full object-contain" />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2">
          {targets.map((t) => (
            <button
              key={t.target}
              type="button"
              onClick={() => {
                sendTo(t.target, image, from);
                showToast(`الصورة اتنقلت لـ«${t.label}»`);
              }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-cream-300 bg-white px-4 py-3 text-start transition-all hover:border-wine hover:bg-wine-soft"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink">{t.label}</span>
                <span className="block truncate text-xs text-ink-muted">{t.hint}</span>
              </span>
              <span className="shrink-0 text-wine" aria-hidden="true">←</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => downloadTrayImage(image)} className="btn-primary h-11 text-sm">
          <DownloadIcon className="h-4 w-4" />
          تحميل
        </button>
        <button
          type="button"
          onClick={() => {
            removeFromTray(image.id);
            closeSendSheet();
            showToast('اتشالت من الصندوق');
          }}
          className="btn-ghost h-11 text-sm"
        >
          <TrashIcon className="h-4 w-4" />
          شيلها من الصندوق
        </button>
      </div>
    </Sheet>
  );
}

function TrayGrid({
  images,
  selected,
  onTap,
}: {
  images: TrayImage[];
  selected?: Set<string>;
  onTap: (img: TrayImage) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {images.map((img) => {
        const on = selected?.has(img.id);
        return (
          <button
            key={img.id}
            type="button"
            onClick={() => onTap(img)}
            aria-pressed={selected ? on : undefined}
            title={img.name}
            className={`group relative overflow-hidden rounded-2xl border-2 bg-white text-start transition-all ${
              on ? 'border-wine ring-2 ring-wine/30' : 'border-cream-300 hover:border-wine/50'
            }`}
          >
            <img src={toSrc(img)} alt={img.name} loading="lazy" className="aspect-square w-full bg-cream-200 object-contain" />
            <span className="block truncate px-2 py-1.5 text-[11px] font-semibold text-ink-muted">{fromLabel(img.from)}</span>
            {on && (
              <span className="absolute top-1.5 end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-wine text-xs font-bold text-white">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function UploadToTray() {
  const { addToTray, showToast } = useStudio();
  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    let added = 0;
    for (const file of files) {
      try {
        addToTray(await readAndResizeImage(file), 'upload');
        added++;
      } catch {
        /* skipped: not an image the browser can read */
      }
    }
    if (added) showToast(added === 1 ? 'الصورة اتضافت للصندوق' : `${added} صور اتضافت للصندوق`);
  };
  return (
    <label className="btn-ghost h-11 cursor-pointer px-4 text-sm">
      <UploadIcon className="h-4 w-4" />
      ارفع صور للصندوق
      <input type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={onChange} />
    </label>
  );
}

function TrayDrawer() {
  const { trayOpen, setTrayOpen, tray, openSendSheet, clearTray } = useStudio();
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => setConfirmClear(false), [trayOpen]);
  if (!trayOpen) return null;

  return (
    <Sheet
      title={`صندوق الصور (${tray.length})`}
      onClose={() => setTrayOpen(false)}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <UploadToTray />
          {tray.length > 0 &&
            (confirmClear ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmClear(false)} className="btn-ghost h-11 px-4 text-sm">
                  لأ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearTray();
                    setConfirmClear(false);
                  }}
                  className="btn-primary h-11 px-4 text-sm"
                >
                  أيوه، امسح الكل
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className="h-11 px-3 text-sm font-semibold text-ink-muted hover:text-wine">
                امسح الصندوق
              </button>
            ))}
        </div>
      }
    >
      {tray.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-wine shadow-card">
            <TrayIcon className="h-7 w-7" />
          </span>
          <p className="text-base font-bold">الصندوق فاضي</p>
          <p className="max-w-xs text-sm text-ink-muted">أي صورة بتطلع من أي قسم بتتحفظ هنا لوحدها، وتقدر تبعتها لأي قسم تاني من غير تنزيل.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-muted">دوس على أي صورة عشان تبعتها لقسم أو تنزلها. الصندوق بيحتفظ بآخر {MAX_TRAY} صورة على الجهاز ده.</p>
          <TrayGrid images={tray} onTap={(img) => openSendSheet(img, img.from === 'upload' ? 'upload' : img.from)} />
        </>
      )}
    </Sheet>
  );
}

function TrayPicker() {
  const { picker, closePicker, tray } = useStudio();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => setSelected(new Set()), [picker]);
  if (!picker) return null;

  const toggle = (img: TrayImage) => {
    if (!picker.multiple) return closePicker([img]);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(img.id)) next.delete(img.id);
      else next.add(img.id);
      return next;
    });
  };

  return (
    <Sheet
      title={picker.multiple ? 'اختار صور من الصندوق' : 'اختار صورة من الصندوق'}
      onClose={() => closePicker([])}
      footer={
        picker.multiple ? (
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => closePicker(tray.filter((t) => selected.has(t.id)))}
            className="btn-primary h-12 w-full text-base"
          >
            {selected.size ? `استخدم ${selected.size === 1 ? 'الصورة' : `${selected.size} صور`}` : 'علّم على الصور اللي عايزها'}
          </button>
        ) : undefined
      }
    >
      {tray.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">الصندوق فاضي لسه.</p>
      ) : (
        <TrayGrid images={tray} selected={picker.multiple ? selected : undefined} onTap={toggle} />
      )}
    </Sheet>
  );
}

function Toast() {
  const { toast } = useStudio();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 lg:bottom-8" role="status">
      <span className="animate-fadeUp rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-cream shadow-lift">{toast}</span>
    </div>
  );
}

export function StudioOverlays() {
  return (
    <>
      <TrayDrawer />
      <TrayPicker />
      <SendSheet />
      <Toast />
    </>
  );
}
