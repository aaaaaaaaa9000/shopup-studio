import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CustomizationOptions, ImageFile } from './types';
import { analyzeStyleImage, applyBackgroundBlur, generateImage } from './services/geminiService';
import { readAndResizeImage } from '../../shared/resizeImage';
import { buildPrompt } from './prompts';
import Uploader from '../../shared/Uploader';
import { asImageFile, useAutoSave, useInbox, useStudio } from '../../studio/StudioContext';
import ProductGrid from './components/ProductGrid';
import ResultCard, { Job } from './components/ResultCard';
import {
  ASPECT_RATIOS,
  CAMERA_PERSPECTIVES,
  CONCURRENCY,
  LIGHTING_STYLES,
  MAX_GROUP_PRODUCTS,
  MAX_PRODUCTS,
  QUALITIES,
  SHOT_MODES,
} from './constants';

const baseName = (name: string) => name.replace(/\.[^/.]+$/, '') || 'product';
const extFor = (mime: string) => (mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg');

function App() {
  const autoSave = useAutoSave('products');
  const { pickFromTray } = useStudio();
  const [productImages, setProductImages] = useState<ImageFile[]>([]);
  const [styleImage, setStyleImage] = useState<ImageFile | null>(null);
  const [styleDescription, setStyleDescription] = useState<string | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

  const [options, setOptions] = useState<CustomizationOptions>({
    mode: 'single',
    lightingStyle: LIGHTING_STYLES[0].value,
    cameraPerspective: CAMERA_PERSPECTIVES[0].value,
    aspectRatio: '1:1',
    quality: 'standard',
  });

  const [prompt, setPrompt] = useState('');
  const [promptEdited, setPromptEdited] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const isGroup = options.mode === 'group' && productImages.length > 1;
  const tooManyForGroup = options.mode === 'group' && productImages.length > MAX_GROUP_PRODUCTS;
  const isGenerating = jobs.some((j) => j.status === 'queued' || j.status === 'running');
  const doneJobs = jobs.filter((j) => j.status === 'done' && j.image);

  // Analyze the optional style reference image.
  useEffect(() => {
    if (!styleImage) {
      setStyleDescription(null);
      return;
    }
    let cancelled = false;
    setIsAnalyzingStyle(true);
    analyzeStyleImage(styleImage)
      .then((d) => !cancelled && setStyleDescription(d))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'ماقدرتش أحلل صورة الستايل.');
        setStyleDescription(null);
      })
      .finally(() => !cancelled && setIsAnalyzingStyle(false));
    return () => {
      cancelled = true;
    };
  }, [styleImage]);

  // Rebuild the prompt whenever the selection changes, unless the user edited it by hand.
  useEffect(() => {
    if (!promptEdited) setPrompt(buildPrompt(options, productImages.length, styleDescription));
  }, [options, productImages.length, styleDescription, promptEdited]);

  const updateJob = (id: number, patch: Partial<Job>) =>
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const runJob = useCallback(async (job: Job) => {
    updateJob(job.id, { status: 'running', error: undefined });
    try {
      const image = await generateImage(job.inputs, job.prompt, job.styleImage, job.aspectRatio as any, job.quality);
      image.name = `${baseName(job.label)}-studio`;
      autoSave(image);
      updateJob(job.id, { status: 'done', image });
    } catch (err) {
      updateJob(job.id, { status: 'error', error: err instanceof Error ? err.message : 'فشل التوليد. جرّب تاني.' });
    }
  }, [autoSave]);

  /** Runs jobs a few at a time so a big batch doesn't hit the key's rate limit. */
  const runQueue = useCallback(
    async (queue: Job[]) => {
      let next = 0;
      const worker = async () => {
        while (next < queue.length) await runJob(queue[next++]);
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    },
    [runJob],
  );

  const handleGenerate = () => {
    if (productImages.length === 0) {
      setError('ارفع صور المنتجات الأول.');
      return;
    }
    if (tooManyForGroup) {
      setError(`الصورة الجماعية بتاخد ${MAX_GROUP_PRODUCTS} منتجات بالكتير. شيل شوية صور أو اختار "صورة لكل منتج".`);
      return;
    }
    setError(null);

    const common = {
      prompt,
      styleImage,
      aspectRatio: options.aspectRatio,
      quality: options.quality,
      status: 'queued' as const,
    };
    const newJobs: Job[] = isGroup
      ? [{ ...common, id: nextId.current++, label: `صورة جماعية (${productImages.length} منتجات)`, inputs: productImages }]
      : productImages.map((img) => ({ ...common, id: nextId.current++, label: baseName(img.name), inputs: [img] }));

    setJobs((list) => [...newJobs, ...list]);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    runQueue(newJobs);
  };

  const handleBlur = async (job: Job, intensity: number) => {
    if (!job.image) return;
    updateJob(job.id, { blurring: true, blurError: undefined });
    try {
      const image = await applyBackgroundBlur(job.image, intensity, job.quality);
      autoSave(image);
      updateJob(job.id, { image, blurring: false });
    } catch (err) {
      updateJob(job.id, { blurring: false, blurError: err instanceof Error ? err.message : 'فشل تغبيش الخلفية.' });
    }
  };

  const fileNameFor = (job: Job, index?: number) =>
    `${baseName(job.label)}-studio${index !== undefined ? `-${index + 1}` : ''}.${extFor(job.image!.mimeType)}`;

  const handleDownload = (job: Job) => {
    if (!job.image) return;
    const link = document.createElement('a');
    link.href = `data:${job.image.mimeType};base64,${job.image.base64}`;
    link.download = fileNameFor(job);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadAll = async () => {
    if (doneJobs.length === 0) return;
    setIsZipping(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      doneJobs.forEach((job, i) => zip.file(fileNameFor(job, i), job.image!.base64, { base64: true }));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product-studio.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError('ماقدرتش أجهّز ملف التحميل. نزّل الصور واحدة واحدة.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleAddProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const picked: File[] = input.files ? [...input.files] : [];
    const files = picked.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    input.value = '';
    if (files.length === 0) return;
    const room = MAX_PRODUCTS - productImages.length;
    if (files.length > room) setError(`أقصى عدد ${MAX_PRODUCTS} منتج في المرة. اتضاف أول ${Math.max(room, 0)} بس.`);
    else setError(null);
    const results = await Promise.allSettled(files.slice(0, Math.max(room, 0)).map(readAndResizeImage));
    const ok = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    if (ok.length < results.length) setError('في صور ماقدرتش أقراها. استخدم صور جي بي جي أو بي إن جي.');
    setProductImages((prev) => [...prev, ...ok].slice(0, MAX_PRODUCTS));
  };

  /** Adds images (from the tray or another section) to the product list. */
  const addImages = (images: ImageFile[]) => {
    const room = MAX_PRODUCTS - productImages.length;
    if (images.length > room) setError(`أقصى عدد ${MAX_PRODUCTS} منتج في المرة. اتضاف أول ${Math.max(room, 0)} بس.`);
    else setError(null);
    setProductImages((prev) => [...prev, ...images].slice(0, MAX_PRODUCTS));
  };

  useInbox(['products'], (_target, img) => addImages([img]));

  const pickProducts = async () => {
    const chosen = await pickFromTray(true);
    if (chosen.length) addImages(chosen.map(asImageFile));
  };

  const handleStyleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      setStyleImage(await readAndResizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ماقدرتش أقرا الصورة.');
    }
  };

  const generateLabel =
    productImages.length === 0
      ? 'ارفع صور المنتجات الأول'
      : tooManyForGroup
        ? `الصورة الجماعية ${MAX_GROUP_PRODUCTS} منتجات بالكتير`
        : isAnalyzingStyle
          ? 'بحلل صورة الستايل...'
          : isGroup
            ? 'ولّد الصورة الجماعية'
            : productImages.length === 1
              ? 'ولّد الصورة'
              : `ولّد ${productImages.length} صور`;
  const canGenerate = productImages.length > 0 && !tooManyForGroup && !isAnalyzingStyle;

  return (
    <div className="pb-28 lg:pb-12">

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-8">
        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Step 1 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num">١</span>
                <h2 className="text-base font-bold">صور المنتجات</h2>
              </div>
              {productImages.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-ink-muted">{productImages.length} صورة</span>
                  <button
                    type="button"
                    onClick={() => setProductImages([])}
                    className="text-xs font-semibold text-wine hover:underline"
                  >
                    شيل الكل
                  </button>
                </div>
              )}
            </div>
            <ProductGrid
              images={productImages}
              onAdd={handleAddProducts}
              onRemove={(i) => setProductImages((prev) => prev.filter((_, idx) => idx !== i))}
              max={MAX_PRODUCTS}
              onPickFromTray={pickProducts}
            />
          </section>

          {/* Step 2 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="step-num">٢</span>
              <h2 className="text-base font-bold">نوع الصورة</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {SHOT_MODES.map((m) => {
                const selected = options.mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setOptions((o) => ({ ...o, mode: m.value }))}
                    className={`rounded-2xl border p-3 text-start transition-all ${
                      selected
                        ? 'border-wine bg-wine-soft text-wine-dark ring-1 ring-wine'
                        : 'border-cream-300 bg-white text-ink-soft hover:border-ink/25'
                    }`}
                  >
                    <span className="block text-sm font-bold leading-snug">{m.label}</span>
                    <span className="mt-1 block text-xs opacity-75">{m.hint}</span>
                  </button>
                );
              })}
            </div>
            {options.mode === 'group' && productImages.length === 1 && (
              <p className="mt-3 text-xs text-ink-muted">ضيف أكتر من منتج عشان تطلع صورة جماعية.</p>
            )}
            {tooManyForGroup && (
              <p className="mt-3 text-xs font-semibold text-wine-dark">
                الصورة الجماعية بتاخد {MAX_GROUP_PRODUCTS} منتجات بالكتير، وانت رافع {productImages.length}.
              </p>
            )}
          </section>

          {/* Step 3 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="step-num">٣</span>
              <h2 className="text-base font-bold">شكل الصورة</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="الإضاءة"
                value={options.lightingStyle}
                options={LIGHTING_STYLES}
                onChange={(v) => setOptions((o) => ({ ...o, lightingStyle: v as CustomizationOptions['lightingStyle'] }))}
              />
              <Select
                label="زاوية الكاميرا"
                value={options.cameraPerspective}
                options={CAMERA_PERSPECTIVES}
                onChange={(v) =>
                  setOptions((o) => ({ ...o, cameraPerspective: v as CustomizationOptions['cameraPerspective'] }))
                }
              />
            </div>

            <h3 className="mb-2 mt-5 text-xs font-bold text-ink-soft">المقاس</h3>
            <ChipGroup
              value={options.aspectRatio}
              options={ASPECT_RATIOS}
              onChange={(v) => setOptions((o) => ({ ...o, aspectRatio: v as CustomizationOptions['aspectRatio'] }))}
            />

            <h3 className="mb-2 mt-5 text-xs font-bold text-ink-soft">الجودة</h3>
            <ChipGroup
              value={options.quality}
              options={QUALITIES}
              onChange={(v) => setOptions((o) => ({ ...o, quality: v as CustomizationOptions['quality'] }))}
            />
            {options.quality !== 'standard' && (
              <p className="mt-2 text-xs text-ink-muted">
                الجودة الأعلى بتستعمل موديل أقوى، والصورة بتاخد حوالي {options.quality === '4K' ? '20' : '12'} ثانية بدل 3.
              </p>
            )}
          </section>

          {/* Step 4 (optional) */}
          <details className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num bg-cream-200 text-ink">٤</span>
                <div>
                  <h2 className="text-base font-bold">تفاصيل إضافية</h2>
                  <p className="text-xs text-ink-muted">اختياري: صورة مرجعية للستايل وتعديل الوصف</p>
                </div>
              </div>
              <svg className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="mt-5 flex flex-col gap-5">
              <div>
                <h3 className="mb-2 text-sm font-bold">صورة مرجعية للستايل</h3>
                <Uploader
                  id="products-style"
                  compact
                  image={styleImage}
                  onChange={handleStyleFile}
                  onPick={setStyleImage}
                  onClear={() => setStyleImage(null)}
                  title="ارفع صورة بالستايل اللي عاجبك"
                  hint="هننقل ألوانها وإضاءتها لصور المنتجات"
                  busy={isAnalyzingStyle ? 'بحلل الستايل...' : null}
                />
                {styleDescription && !isAnalyzingStyle && (
                  <p className="mt-2 rounded-xl bg-cream-100 px-3 py-2 text-xs text-ink-soft">تم تحليل الستايل وإضافته للوصف.</p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold">الوصف اللي بيتبعت للموديل</h3>
                  {promptEdited && (
                    <button
                      type="button"
                      onClick={() => setPromptEdited(false)}
                      className="text-xs font-semibold text-wine hover:underline"
                    >
                      رجّع الوصف التلقائي
                    </button>
                  )}
                </div>
                <textarea
                  dir="ltr"
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setPromptEdited(true);
                  }}
                  rows={7}
                  className="w-full resize-y rounded-2xl border border-cream-300 bg-cream-100 p-3 text-xs leading-relaxed text-ink-soft focus:border-wine/50 focus:outline-none"
                />
                <p className="mt-1 text-xs text-ink-muted">
                  بيتكتب تلقائي حسب اختياراتك. لو عدّلت فيه، تعديلك بيفضل لحد ما تدوس "رجّع الوصف التلقائي".
                </p>
              </div>
            </div>
          </details>

          {error && <ErrorBox message={error} onClose={() => setError(null)} />}

          {/* Desktop generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary hidden h-14 text-base shadow-lift lg:flex"
          >
            {isGenerating && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {generateLabel}
          </button>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="min-w-0 scroll-mt-36">
          {jobs.length === 0 ? (
            <section className="card hidden min-h-[420px] flex-col items-center justify-center gap-3 px-6 text-center lg:flex">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-cream-100 text-wine">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </span>
              <h2 className="text-lg font-bold">الصور هتظهر هنا</h2>
              <p className="max-w-xs text-sm text-ink-muted">ارفع صور المنتجات، اختار نوع الصورة وشكلها، ودوس "ولّد".</p>
            </section>
          ) : (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold">
                  النتايج
                  {isGenerating && (
                    <span className="ms-2 text-xs font-semibold text-ink-muted">
                      (خلص {jobs.filter((j) => j.status === 'done' || j.status === 'error').length} من {jobs.length})
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  {doneJobs.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDownloadAll}
                      disabled={isZipping}
                      className="btn-primary h-10 px-4 text-sm"
                    >
                      {isZipping ? 'بجهّز الملف...' : `تحميل الكل (${doneJobs.length})`}
                    </button>
                  )}
                  {!isGenerating && (
                    <button type="button" onClick={() => setJobs([])} className="btn-ghost h-10 px-4 text-sm">
                      مسح النتايج
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <ResultCard
                    key={job.id}
                    job={job}
                    onRetry={() => runJob(job)}
                    onDownload={() => handleDownload(job)}
                    onBlur={(intensity) => handleBlur(job, intensity)}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-muted">كل صورة بتطلع بتتحفظ في صندوق الصور كمان.</p>
            </section>
          )}
        </div>
      </main>

      {/* Mobile generate bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300/70 bg-cream/90 p-3 backdrop-blur-md lg:hidden">
        <button type="button" onClick={handleGenerate} disabled={!canGenerate} className="btn-primary h-14 w-full text-base">
          {isGenerating && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {generateLabel}
        </button>
      </div>
    </div>
  );
}

const Select: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}> = ({ label, value, options, onChange }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-bold text-ink-soft">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-sm text-ink focus:border-wine/50 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

const ChipGroup: React.FC<{
  value: string;
  options: { value: string; label: string; hint: string }[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
  <div className={`grid gap-2 ${options.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
    {options.map((o) => {
      const selected = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={selected}
          onClick={() => onChange(o.value)}
          className={`min-w-0 rounded-xl border px-1.5 py-2 text-center transition-all ${
            selected ? 'border-wine bg-wine-soft text-wine-dark ring-1 ring-wine' : 'border-cream-300 bg-white text-ink-soft hover:border-ink/25'
          }`}
        >
          <span className="block text-sm font-bold">{o.label}</span>
          <span className="block truncate text-[11px] opacity-75">{o.hint}</span>
        </button>
      );
    })}
  </div>
);

const ErrorBox: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div role="alert" className="flex items-start gap-3 rounded-2xl border border-wine-line bg-wine-soft p-3.5">
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wine text-xs font-bold text-white">!</span>
    <p className="flex-1 text-sm leading-relaxed text-wine-dark">{message}</p>
    <button type="button" onClick={onClose} aria-label="إغلاق" className="text-wine-dark/60 hover:text-wine-dark">
      ✕
    </button>
  </div>
);

export default App;
