import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CustomizationOptions, ImageFile } from './types';
import { generateImage, analyzeStyleImage } from './services/geminiService';
import { readAndResizeImage } from '../../shared/resizeImage';
import { buildPrompt } from './prompts';
import Uploader from '../../shared/Uploader';
import { useAutoSave, useInbox } from '../../studio/StudioContext';
import { SendButton } from '../../studio/Sheets';
import {
  LIGHTING_STYLES,
  CAMERA_PERSPECTIVES,
  STYLE_PRESETS,
  PRESET_GROUPS,
  PresetGroup,
} from './constants';

type Result = ImageFile & { id: number; presetLabel: string };

const LOADING_MESSAGES = [
  'بنجهّز الاستوديو...',
  'بنظبط الإضاءة والزاوية...',
  'بنرسم الوضعية الجديدة...',
  'لمسات أخيرة...',
];

const MAX_HISTORY = 8;

function toSrc(img: ImageFile) {
  return `data:${img.mimeType};base64,${img.base64}`;
}

function App() {
  const autoSave = useAutoSave('poses');
  const [productImage, setProductImage] = useState<ImageFile | null>(null);
  const [styleImage, setStyleImage] = useState<ImageFile | null>(null);
  const [styleDescription, setStyleDescription] = useState<string | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

  const [options, setOptions] = useState<CustomizationOptions>({
    stylePreset: STYLE_PRESETS[0].value,
    lightingStyle: LIGHTING_STYLES[0].value,
    cameraPerspective: CAMERA_PERSPECTIVES[0].value,
  });
  const [group, setGroup] = useState<PresetGroup>(STYLE_PRESETS[0].group);

  const [prompt, setPrompt] = useState('');
  const [promptEdited, setPromptEdited] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<Result[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const activePreset = STYLE_PRESETS.find((p) => p.value === options.stylePreset)!;
  const presetsInGroup = useMemo(() => STYLE_PRESETS.filter((p) => p.group === group), [group]);
  const active = history.find((h) => h.id === activeId) || null;

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

  // Rebuild the prompt whenever the selection changes (unless the user edited it by hand).
  useEffect(() => {
    if (!promptEdited) setPrompt(buildPrompt(options, styleDescription));
  }, [options, styleDescription, promptEdited]);

  // Rotate loading messages.
  useEffect(() => {
    if (!isLoading) return;
    setLoadingIdx(0);
    const t = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2500);
    return () => clearInterval(t);
  }, [isLoading]);

  useInbox(['poses'], (_target, img) => {
    setProductImage(img);
    setError(null);
  });

  const handleFile =
    (setter: React.Dispatch<React.SetStateAction<ImageFile | null>>) =>
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setError('الملف ده مش صورة.');
        return;
      }
      try {
        setter(await readAndResizeImage(file));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ماقدرتش أقرا الصورة.');
      }
    };

  const handleGenerate = useCallback(async () => {
    if (!productImage) {
      setError('ارفع صورة الموديل الأول.');
      return;
    }
    setIsLoading(true);
    setError(null);
    if (window.innerWidth < 1024) {
      setTimeout(() => canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
    try {
      const img = await generateImage(productImage, prompt, styleImage);
      const item: Result = { ...img, name: `pose-${activePreset.label}`, id: Date.now(), presetLabel: activePreset.label };
      autoSave(item);
      setHistory((h) => [item, ...h].slice(0, MAX_HISTORY));
      setActiveId(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التوليد. جرّب تاني.');
    } finally {
      setIsLoading(false);
    }
  }, [productImage, prompt, styleImage, activePreset.label, autoSave]);

  const handleDownload = (img: Result) => {
    const link = document.createElement('a');
    link.href = toSrc(img);
    const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
    link.download = `pose-${img.id}.${ext}`;
    link.click();
  };

  const showCanvasOnMobile = isLoading || !!active || !!error;
  const generateLabel = !productImage ? 'ارفع صورة الموديل الأول' : isLoading ? 'جاري التوليد...' : 'ولّد الصورة';

  return (
    <div className="pb-28 lg:pb-12">

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-8">
        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Step 1 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="step-num">١</span>
              <h2 className="text-base font-bold">صورة الموديل</h2>
            </div>
            <Uploader
              id="poses-subject"
              image={productImage}
              onChange={handleFile(setProductImage)}
              onPick={(img) => setProductImage(img)}
              onClear={() => setProductImage(null)}
              title="ارفع صورة الموديل أو المنتج"
              hint="صورة واضحة للوش أو للمنتج بتطلّع أحسن نتيجة"
            />
          </section>

          {/* Step 2 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num">٢</span>
                <h2 className="text-base font-bold">اختار الستايل</h2>
              </div>
              <span className="truncate text-xs font-semibold text-wine">{activePreset.label}</span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {PRESET_GROUPS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGroup(g.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    group === g.value ? 'bg-ink text-cream' : 'bg-cream-100 text-ink-soft hover:bg-cream-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {presetsInGroup.map((p) => {
                const selected = options.stylePreset === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setOptions((o) => ({ ...o, stylePreset: p.value }))}
                    aria-pressed={selected}
                    className={`relative min-h-[64px] rounded-2xl border py-3 ps-3.5 pe-8 text-start text-sm font-semibold leading-snug transition-all ${
                      selected
                        ? 'border-wine bg-wine-soft text-wine-dark ring-1 ring-wine'
                        : 'border-cream-300 bg-white text-ink-soft hover:border-ink/25 hover:text-ink'
                    }`}
                  >
                    {p.label}
                    {selected && (
                      <span className="absolute top-2 end-2 flex h-5 w-5 items-center justify-center rounded-full bg-wine text-[11px] text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {options.stylePreset === 'Standard' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
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
            )}
          </section>

          {/* Step 3 (optional) */}
          <details className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num bg-cream-200 text-ink">٣</span>
                <div>
                  <h2 className="text-base font-bold">تفاصيل إضافية</h2>
                  <p className="text-xs text-ink-muted">اختياري: صورة مرجعية للستايل وتعديل الوصف</p>
                </div>
              </div>
              <svg className="h-5 w-5 text-ink-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="mt-5 flex flex-col gap-5">
              <div>
                <h3 className="mb-2 text-sm font-bold">صورة مرجعية للستايل</h3>
                <Uploader
                  id="poses-style"
                  compact
                  image={styleImage}
                  onChange={handleFile(setStyleImage)}
                  onPick={(img) => setStyleImage(img)}
                  onClear={() => setStyleImage(null)}
                  title="ارفع صورة بالستايل اللي عاجبك"
                  hint="هننقل ألوانها وإضاءتها للصورة الناتجة"
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
                  rows={6}
                  className="w-full resize-y rounded-2xl border border-cream-300 bg-cream-100 p-3 text-xs leading-relaxed text-ink-soft focus:border-wine/50 focus:outline-none"
                />
                <p className="mt-1 text-xs text-ink-muted">بيتكتب تلقائي حسب الستايل، وتقدر تعدّل فيه.</p>
              </div>
            </div>
          </details>

          {/* Desktop generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!productImage || isLoading}
            className="btn-primary hidden h-14 text-base shadow-lift lg:flex"
          >
            {isLoading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {generateLabel}
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`order-first min-w-0 scroll-mt-36 lg:order-none ${showCanvasOnMobile ? '' : 'hidden lg:block'}`}
        >
          <div className="lg:sticky lg:top-36">
            <section className="card overflow-hidden p-3 sm:p-4">
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-cream-100 sm:aspect-square lg:aspect-[4/3]">
                {isLoading ? (
                  <div className="shimmer-bg absolute inset-0 flex animate-shimmer flex-col items-center justify-center gap-4">
                    <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />
                    <p key={loadingIdx} className="animate-fadeUp text-sm font-bold text-ink-soft">
                      {LOADING_MESSAGES[loadingIdx]}
                    </p>
                  </div>
                ) : active ? (
                  <img
                    key={active.id}
                    src={toSrc(active)}
                    alt="الصورة الناتجة"
                    className="h-full w-full animate-fadeUp object-contain"
                  />
                ) : (
                  <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-wine shadow-card">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                      </svg>
                    </span>
                    <h2 className="text-lg font-bold">النتيجة هتظهر هنا</h2>
                    <p className="text-sm text-ink-muted">ارفع صورة، اختار ستايل، ودوس "ولّد الصورة".</p>
                  </div>
                )}

                {productImage && (active || isLoading) && (
                  <div className="absolute bottom-3 start-3 overflow-hidden rounded-xl border-2 border-white shadow-lift">
                    <img src={toSrc(productImage)} alt="الصورة الأصلية" className="h-16 w-16 object-cover sm:h-20 sm:w-20" />
                    <span className="absolute inset-x-0 bottom-0 bg-ink/60 py-0.5 text-center text-[10px] font-bold text-white">الأصل</span>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" className="mt-3 flex items-start gap-3 rounded-2xl border border-wine-line bg-wine-soft p-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wine text-xs font-bold text-white">!</span>
                  <p className="flex-1 text-sm leading-relaxed text-wine-dark">{error}</p>
                  <button type="button" onClick={() => setError(null)} aria-label="إغلاق" className="text-wine-dark/60 hover:text-wine-dark">
                    ✕
                  </button>
                </div>
              )}

              {active && !isLoading && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-ink-soft">{active.presetLabel}</span>
                  <div className="flex flex-wrap gap-2">
                    <SendButton image={active} from="poses" />
                    <button type="button" onClick={handleGenerate} className="btn-ghost h-11 px-4 text-sm">
                      ولّد تاني
                    </button>
                    <button type="button" onClick={() => handleDownload(active)} className="btn-primary h-11 px-5 text-sm">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      تحميل
                    </button>
                  </div>
                </div>
              )}
            </section>

            {history.length > 1 && (
              <section className="mt-4">
                <h3 className="mb-2 text-sm font-bold text-ink-soft">صور الجلسة دي</h3>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setActiveId(h.id)}
                      title={h.presetLabel}
                      className={`shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        h.id === activeId ? 'border-wine' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={toSrc(h)} alt={h.presetLabel} className="h-20 w-20 object-cover" />
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-ink-muted">كل صورة بتطلع بتتحفظ في صندوق الصور كمان.</p>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Mobile generate bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300/70 bg-cream/90 p-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!productImage || isLoading}
          className="btn-primary h-14 w-full text-base"
        >
          {isLoading && <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
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

export default App;
