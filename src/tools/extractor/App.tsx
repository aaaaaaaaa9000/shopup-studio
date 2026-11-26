import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DetectedItem, ExtractOptions, ImageFile } from './types';
import { analyzeOutfit, extractItem } from './services/api';
import { readAndResizeImage } from '../../shared/resizeImage';
import Uploader from '../../shared/Uploader';
import { useAutoSave, useInbox } from '../../studio/StudioContext';
import ItemList from './components/ItemList';
import ResultCard, { Job } from './components/ResultCard';
import { ASPECT_RATIOS, BACKGROUNDS, CONCURRENCY, PRESENTATIONS, QUALITIES } from './constants';

const extFor = (mime: string) => (mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg');
/** Keeps Arabic letters but drops characters that are not allowed in file names. */
const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 80) || 'item';

function App() {
  const autoSave = useAutoSave('extractor');
  const [photo, setPhoto] = useState<ImageFile | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const [options, setOptions] = useState<ExtractOptions>({
    background: 'white',
    presentation: 'ghost',
    aspectRatio: '1:1',
    quality: 'standard',
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const analyzeRun = useRef(0);

  const selected = items.filter((i) => i.selected);
  const isGenerating = jobs.some((j) => j.status === 'queued' || j.status === 'running');
  const doneJobs = jobs.filter((j) => j.status === 'done' && j.image);

  const analyze = useCallback(async (image: ImageFile) => {
    const run = ++analyzeRun.current;
    setIsAnalyzing(true);
    setAnalyzed(false);
    setItems([]);
    setError(null);
    try {
      const found = await analyzeOutfit(image);
      if (run !== analyzeRun.current) return;
      setItems(
        found.map((f) => ({
          ...f,
          id: nextId.current++,
          // Small jewelry is rarely sold separately; leave it unticked to save requests.
          selected: f.kind !== 'jewelry',
        })),
      );
      setAnalyzed(true);
    } catch (err) {
      if (run !== analyzeRun.current) return;
      setError(err instanceof Error ? err.message : 'فشل تحليل الصورة. جرّب تاني.');
    } finally {
      if (run === analyzeRun.current) setIsAnalyzing(false);
    }
  }, []);

  const loadPhoto = (image: ImageFile) => {
    setError(null);
    setPhoto(image);
    analyze(image);
  };

  useInbox(['extractor'], (_target, img) => loadPhoto(img));

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
      setError('الملف ده مش صورة. اختار صورة جي بي جي أو بي إن جي.');
      return;
    }
    try {
      loadPhoto(await readAndResizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ماقدرتش أقرا الصورة.');
    }
  };

  const clearPhoto = () => {
    analyzeRun.current++;
    setPhoto(null);
    setItems([]);
    setAnalyzed(false);
    setIsAnalyzing(false);
  };

  const updateJob = (id: number, patch: Partial<Job>) =>
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const runJob = useCallback(async (job: Job) => {
    updateJob(job.id, { status: 'running', error: undefined });
    try {
      const { image, lowered } = await extractItem(job.source, job.item, job.options);
      autoSave(image);
      updateJob(job.id, { status: 'done', image, lowered });
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
    if (!photo) return setError('ارفع صورة الموديل الأول.');
    if (selected.length === 0) return setError('علّم على قطعة واحدة على الأقل.');
    setError(null);
    const newJobs: Job[] = selected.map((item) => ({
      id: nextId.current++,
      item,
      source: photo,
      options,
      status: 'queued',
    }));
    setJobs((list) => [...newJobs, ...list]);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    runQueue(newJobs);
  };

  const fileNameFor = (job: Job, index?: number) =>
    `${safeFileName(job.item.name)}${index !== undefined ? `-${index + 1}` : ''}.${extFor(job.image!.mimeType)}`;

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
      link.download = 'fashion-items.zip';
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

  // Warn before closing the page while images are still being made or not downloaded.
  useEffect(() => {
    if (!isGenerating) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isGenerating]);

  const generateLabel = !photo
    ? 'ارفع صورة الموديل الأول'
    : isAnalyzing
      ? 'بحلل الصورة...'
      : selected.length === 0
        ? 'علّم على القطع اللي عايزها'
        : selected.length === 1
          ? 'طلّع القطعة'
          : `طلّع ${selected.length} قطع`;
  const canGenerate = !!photo && !isAnalyzing && selected.length > 0;

  return (
    <div className="pb-28 lg:pb-12">

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-8">
        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Step 1 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="step-num">١</span>
              <h2 className="text-base font-bold">صورة الموديل</h2>
            </div>
            <Uploader
              id="extractor-photo"
              image={photo}
              onChange={handlePhoto}
              onPick={loadPhoto}
              onClear={clearPhoto}
              title="ارفع صورة الموديل لابسة الطقم"
              hint="الأحسن صورة كاملة وواضحة من قدّام"
              busy={isAnalyzing ? 'بدوّر على القطع...' : null}
              tall
            />
          </section>

          {/* Step 2 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num">٢</span>
                <h2 className="text-base font-bold">القطع اللي في الصورة</h2>
              </div>
              {photo && !isAnalyzing && analyzed && (
                <button
                  type="button"
                  onClick={() => analyze(photo)}
                  className="shrink-0 text-xs font-semibold text-wine hover:underline"
                >
                  حلّل تاني
                </button>
              )}
            </div>
            <ItemList
              items={items}
              isAnalyzing={isAnalyzing}
              hasPhoto={!!photo}
              onRetryAnalyze={photo && !analyzed && !isAnalyzing ? () => analyze(photo) : undefined}
              onToggle={(id) => setItems((list) => list.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)))}
              onSetAll={(value) => setItems((list) => list.map((i) => ({ ...i, selected: value })))}
              onAdd={(name) =>
                setItems((list) => [
                  ...list,
                  { id: nextId.current++, name, kind: 'clothing', description: '', selected: true },
                ])
              }
              onRemove={(id) => setItems((list) => list.filter((i) => i.id !== id))}
            />
          </section>

          {/* Step 3 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="step-num">٣</span>
              <h2 className="text-base font-bold">شكل صورة المنتج</h2>
            </div>

            <h3 className="mb-2 text-xs font-bold text-ink-soft">طريقة العرض</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {PRESENTATIONS.map((p) => {
                const isOn = options.presentation === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => setOptions((o) => ({ ...o, presentation: p.value }))}
                    className={`rounded-2xl border p-3 text-start transition-all ${
                      isOn ? 'border-wine bg-wine-soft text-wine-dark ring-1 ring-wine' : 'border-cream-300 bg-white text-ink-soft hover:border-ink/25'
                    }`}
                  >
                    <span className="block text-sm font-bold leading-snug">{p.label}</span>
                    <span className="mt-1 block text-xs opacity-75">{p.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-muted">الجزم والشنط والإكسسوارات بتطلع صورة منتج عادية في الحالتين.</p>

            <h3 className="mb-2 mt-5 text-xs font-bold text-ink-soft">الخلفية</h3>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUNDS.map((b) => {
                const isOn = options.background === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => setOptions((o) => ({ ...o, background: b.value }))}
                    className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-sm font-bold transition-all ${
                      isOn ? 'border-wine bg-wine-soft text-wine-dark ring-1 ring-wine' : 'border-cream-300 bg-white text-ink-soft hover:border-ink/25'
                    }`}
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border border-ink/15" style={{ background: b.swatch }} />
                    <span className="truncate">{b.label}</span>
                  </button>
                );
              })}
            </div>

            <h3 className="mb-2 mt-5 text-xs font-bold text-ink-soft">المقاس</h3>
            <ChipGroup
              value={options.aspectRatio}
              options={ASPECT_RATIOS}
              onChange={(v) => setOptions((o) => ({ ...o, aspectRatio: v as ExtractOptions['aspectRatio'] }))}
            />

            <h3 className="mb-2 mt-5 text-xs font-bold text-ink-soft">الجودة</h3>
            <ChipGroup
              value={options.quality}
              options={QUALITIES}
              onChange={(v) => setOptions((o) => ({ ...o, quality: v as ExtractOptions['quality'] }))}
            />
            {options.quality !== 'standard' && (
              <p className="mt-2 text-xs text-ink-muted">الجودة العالية بتستعمل موديل أقوى، والقطعة بتاخد حوالي ١٥ ثانية بدل ٣.</p>
            )}
          </section>

          {error && <ErrorBox message={error} onClose={() => setError(null)} />}

          {/* Desktop generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary hidden h-14 text-base shadow-lift lg:flex"
          >
            {(isGenerating || isAnalyzing) && (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
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
              <h2 className="text-lg font-bold">صور القطع هتظهر هنا</h2>
              <p className="max-w-xs text-sm text-ink-muted">ارفع صورة الموديل، علّم على القطع اللي عايزها، ودوس "طلّع".</p>
            </section>
          ) : (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold">
                  القطع الجاهزة
                  {isGenerating && (
                    <span className="ms-2 text-xs font-semibold text-ink-muted">
                      (خلص {jobs.filter((j) => j.status === 'done' || j.status === 'error').length} من {jobs.length})
                    </span>
                  )}
                </h2>
                <div className="flex gap-2">
                  {doneJobs.length > 1 && (
                    <button type="button" onClick={handleDownloadAll} disabled={isZipping} className="btn-primary h-10 px-4 text-sm">
                      {isZipping ? 'بجهّز الملف...' : `تحميل الكل (${doneJobs.length})`}
                    </button>
                  )}
                  {!isGenerating && (
                    <button type="button" onClick={() => setJobs([])} className="btn-ghost h-10 px-4 text-sm">
                      مسح
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <ResultCard key={job.id} job={job} onRetry={() => runJob(job)} onDownload={() => handleDownload(job)} />
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-muted">كل قطعة بتطلع بتتحفظ في صندوق الصور، وتقدر تبعتها لغرفة القياس عشان تلبسها لموديل.</p>
            </section>
          )}
        </div>
      </main>

      {/* Mobile generate bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300/70 bg-cream/90 p-3 backdrop-blur-md lg:hidden">
        <button type="button" onClick={handleGenerate} disabled={!canGenerate} className="btn-primary h-14 w-full text-base">
          {(isGenerating || isAnalyzing) && (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {generateLabel}
        </button>
      </div>
    </div>
  );
}

const ChipGroup: React.FC<{
  value: string;
  options: { value: string; label: string; hint: string }[];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
  <div className={`grid gap-2 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
    {options.map((o) => {
      const isOn = o.value === value;
      return (
        <button
          key={o.value}
          type="button"
          aria-pressed={isOn}
          onClick={() => onChange(o.value)}
          className={`min-w-0 rounded-xl border px-1.5 py-2 text-center transition-all ${
            isOn ? 'border-wine bg-wine-soft text-wine-dark ring-1 ring-wine' : 'border-cream-300 bg-white text-ink-soft hover:border-ink/25'
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
