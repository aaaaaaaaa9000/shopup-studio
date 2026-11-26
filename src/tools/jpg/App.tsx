import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useInbox, useStudio } from '../../studio/StudioContext';
import { TrayIcon } from '../../shared/icons';

// JPEG quality used for every conversion (same as the original app).
const JPEG_QUALITY = 0.95;
// How many images are decoded at the same time. Decoding many large images at
// once can crash a phone browser tab, so they are processed in a small queue.
const CONCURRENCY = 2;

type Status = 'waiting' | 'converting' | 'done' | 'error';

interface Item {
  id: string;
  file: File;
  status: Status;
  blob: Blob | null;
  url: string | null;
  outName: string;
  error: string | null;
}

const IMAGE_EXT = /\.(avif|webp|png|jpe?g|gif|bmp|heic|heif|tiff?)$/i;

const isSupported = (file: File) => file.type.startsWith('image/') || IMAGE_EXT.test(file.name);

const formatLabel = (file: File) => {
  const fromType = file.type.startsWith('image/') ? file.type.slice(6).replace('jpeg', 'jpg').replace('svg+xml', 'svg') : '';
  const fromName = file.name.match(/\.([a-z0-9]+)$/i)?.[1] || '';
  const label = (fromType || fromName || 'image').toUpperCase();
  return label === 'WEBP' ? 'WebP' : label;
};

/** Turns a tray image into a File, so it goes through the same converter. */
function fileFromImage(img: { base64: string; mimeType: string; name: string }): File {
  const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
  const ext = img.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const base = img.name.replace(/\.[^/.]+$/, '') || 'image';
  return new File([bytes], `${base}.${ext}`, { type: img.mimeType });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Gives every output a unique ".jpg" name, so two files called "a" don't overwrite each other in the ZIP. */
function makeOutNames(files: File[], taken: string[] = []) {
  const used = new Set<string>(taken.map((t) => t.toLowerCase()));
  return files.map((file) => {
    const base = file.name.replace(/\.[^/.]+$/, '') || 'image';
    let name = `${base}.jpg`;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n}).jpg`;
    used.add(name.toLowerCase());
    return name;
  });
}

/** Decodes an AVIF/WebP file and re-encodes it as JPEG on a white background. */
async function convertToJpg(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    try {
      await img.decode();
    } catch {
      throw new Error('مقدرتش أفتح الصورة. ممكن الملف يكون بايظ أو المتصفح مش بيدعم الصيغة دي، جرّب كروم.');
    }
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) throw new Error('الصورة فاضية أو بايظة.');

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('المتصفح مقدرش يجهّز الصورة للتحويل.');
    // JPG has no transparency: without this, transparent areas turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    // Free the canvas memory right away (matters on phones).
    canvas.width = 0;
    canvas.height = 0;
    if (!blob) throw new Error('الصورة أكبر من اللي المتصفح يقدر يحوّله.');
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
}

function downloadUrl(url: string, name: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

function Badge({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'wine' }) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
        tone === 'wine' ? 'bg-wine text-white' : 'border border-cream-300 bg-white text-ink-soft'
      }`}
    >
      {children}
    </span>
  );
}

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const stop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <label
      htmlFor="jpg-files"
      onDragEnter={(e) => {
        stop(e);
        depth.current++;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        stop(e);
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDragOver={stop}
      onDrop={(e) => {
        stop(e);
        depth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:py-14 ${
        dragging ? 'border-wine bg-wine-soft' : 'border-cream-300 bg-cream-100 hover:border-wine-line hover:bg-wine-soft/40'
      }`}
    >
      <input
        id="jpg-files"
        type="file"
        accept="image/*,.avif,.webp,.heic,.heif"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-wine shadow-card">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </span>
      <div>
        <p className="text-lg font-bold">اسحب الصور هنا</p>
        <p className="mt-1 text-sm text-ink-muted">أو دوس واختار من جهازك، تقدر تختار كذا صورة مرة واحدة</p>
      </div>
      <span className="btn-primary px-7 py-3 text-base">اختار الصور</span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge>AVIF</Badge>
        <Badge>WebP</Badge>
        <Badge>PNG</Badge>
        <span className="text-ink-muted" aria-hidden="true">←</span>
        <Badge tone="wine">JPG</Badge>
      </div>
    </label>
  );
}

function ResultCard({ item }: { item: Item }) {
  return (
    <article className="card flex min-w-0 flex-col overflow-hidden animate-fadeUp">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-cream-200">
        {item.status === 'done' && item.url && (
          <img src={item.url} alt={item.outName} className="h-full w-full object-contain" loading="lazy" />
        )}
        {(item.status === 'waiting' || item.status === 'converting') && (
          <div className="shimmer-bg absolute inset-0 flex animate-shimmer flex-col items-center justify-center gap-2 text-ink-soft">
            {item.status === 'converting' ? <Spinner className="h-7 w-7 text-wine" /> : null}
            <span className="text-sm font-semibold">{item.status === 'converting' ? 'بنحوّل...' : 'في الدور...'}</span>
          </div>
        )}
        {item.status === 'error' && (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-red-700">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p>{item.error}</p>
          </div>
        )}
        <span className="absolute right-3 top-3">
          <Badge>{formatLabel(item.file)}</Badge>
        </span>
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold" dir="auto" title={item.outName}>
            {item.outName}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            <span dir="ltr">{formatSize(item.file.size)}</span>
            {item.blob && (
              <>
                {' '}
                ← <span dir="ltr">{formatSize(item.blob.size)}</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => item.url && downloadUrl(item.url, item.outName)}
          disabled={item.status !== 'done'}
          className="btn-ghost shrink-0 px-3 py-2 text-sm disabled:opacity-40"
          aria-label={`نزّل ${item.outName}`}
        >
          <DownloadIcon />
          نزّل
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const { pickFromTray, tray } = useStudio();
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  // Bumped on every new batch / reset so late results from an old batch are dropped.
  const generation = useRef(0);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const revokeAll = (list: Item[]) => list.forEach((i) => i.url && URL.revokeObjectURL(i.url));

  useEffect(() => () => revokeAll(itemsRef.current), []);

  const reset = useCallback(() => {
    generation.current++;
    revokeAll(itemsRef.current);
    setItems([]);
    setNotice(null);
    setZipping(false);
  }, []);

  const update = (gen: number, id: string, patch: Partial<Item>) => {
    if (gen !== generation.current) {
      if (patch.url) URL.revokeObjectURL(patch.url);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  /** Converts picked files; `append` keeps the images already in the list (images sent from other sections). */
  const handleFiles = async (picked: File[], append = false) => {
    if (!append || zipping) reset();
    else setNotice(null);
    const gen = generation.current;
    const valid = picked.filter(isSupported);
    const skipped = picked.length - valid.length;

    if (!valid.length) {
      setNotice('الملفات دي مش صور. اختار صور بس.');
      return;
    }
    if (skipped) setNotice(`اتجاهل ${skipped} ملف لأنه مش صورة.`);

    const names = makeOutNames(valid, append ? itemsRef.current.map((i) => i.outName) : []);
    const stamp = Date.now().toString(36);
    const batch: Item[] = valid.map((file, i) => ({
      id: `${gen}-${stamp}-${i}`,
      file,
      status: 'waiting',
      blob: null,
      url: null,
      outName: names[i],
      error: null,
    }));
    setItems((prev) => (append ? [...prev, ...batch] : batch));

    let next = 0;
    const worker = async () => {
      while (next < batch.length && gen === generation.current) {
        const item = batch[next++];
        update(gen, item.id, { status: 'converting' });
        try {
          const blob = await convertToJpg(item.file);
          update(gen, item.id, { status: 'done', blob, url: URL.createObjectURL(blob) });
        } catch (err) {
          update(gen, item.id, { status: 'error', error: err instanceof Error ? err.message : 'حصلت مشكلة في التحويل.' });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, worker));
  };

  useInbox(['jpg'], (_target, img) => handleFiles([fileFromImage(img)], true));

  const pickImages = async () => {
    const chosen = await pickFromTray(true);
    if (chosen.length) handleFiles(chosen.map(fileFromImage), true);
  };

  const trayButton =
    tray.length > 0 ? (
      <button type="button" onClick={pickImages} className="inline-flex items-center gap-1.5 text-sm font-bold text-wine hover:underline">
        <TrayIcon className="h-4 w-4" />
        حوّل صور من صندوق الصور
      </button>
    ) : null;

  const done = items.filter((i) => i.status === 'done');
  const failed = items.filter((i) => i.status === 'error').length;
  const finished = done.length + failed;
  const busy = items.length > 0 && finished < items.length;
  const progress = items.length ? Math.round((finished / items.length) * 100) : 0;

  const downloadAll = async () => {
    if (!done.length) return;
    if (done.length === 1) {
      downloadUrl(done[0].url!, done[0].outName);
      return;
    }
    setZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      // JPEGs are already compressed, so store them as-is (much faster).
      done.forEach((i) => zip.file(i.outName, i.blob!, { compression: 'STORE' }));
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      downloadUrl(url, 'converted-images.zip');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      console.error(err);
      setNotice('حصلت مشكلة وأنا بجهّز الملف المضغوط. جرّب تاني.');
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="pb-16">

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6 lg:px-8 lg:pt-10">
        {items.length === 0 ? (
          <section className="card mx-auto w-full max-w-2xl p-4 sm:p-6">
            <DropZone onFiles={handleFiles} />
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-wine" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              التحويل بيحصل جوه جهازك، والصور مش بتترفع على أي سيرفر.
            </p>
            {trayButton && <div className="mt-3">{trayButton}</div>}
          </section>
        ) : (
          <section className="card flex flex-col gap-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-bold">
                  {busy ? 'بنحوّل الصور...' : `خلصنا ${done.length} من ${items.length} صورة`}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {busy
                    ? `${finished} من ${items.length}`
                    : failed
                      ? `${failed} صورة مقدرتش أحوّلها`
                      : 'كل الصور جاهزة للتنزيل'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={downloadAll}
                  disabled={busy || zipping || done.length === 0}
                  className="btn-primary px-6 py-3"
                >
                  {zipping ? <Spinner /> : <DownloadIcon />}
                  {zipping
                    ? 'بنجهّز الملف...'
                    : done.length > 1
                      ? `نزّل الكل في ملف مضغوط (${done.length})`
                      : 'نزّل الصورة'}
                </button>
                <button type="button" onClick={reset} disabled={zipping} className="btn-ghost px-6 py-3 disabled:opacity-40">
                  صور جديدة
                </button>
              </div>
            </div>
            {trayButton && !busy && <div>{trayButton}</div>}
            {busy && (
              <div className="h-2 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-wine transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
          </section>
        )}

        {notice && (
          <div role="alert" className="mx-auto w-full max-w-2xl rounded-2xl border border-wine-line bg-wine-soft px-4 py-3 text-sm text-wine-dark">
            {notice}
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
