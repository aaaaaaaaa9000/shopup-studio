/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState } from 'react';
import { ImageFile } from './types';
import { COLOR_FAMILIES, HEX_RE, findShade } from './catalog';
import { recolor } from './services/api';
import { readAndResizeImage } from '../../shared/resizeImage';
import Uploader from '../../shared/Uploader';
import { useAutoSave, useInbox } from '../../studio/StudioContext';
import { SendButton } from '../../studio/Sheets';

const ORIGINAL = 'original';

function toSrc(img: ImageFile) {
  return `data:${img.mimeType};base64,${img.base64}`;
}

function colorLabel(key: string) {
  if (key === ORIGINAL) return 'اللون الأصلي';
  return findShade(key)?.ar || key;
}

function App() {
  const [original, setOriginal] = useState<ImageFile | null>(null);
  // Recolored versions of the original image, keyed by shade id or hex code.
  const [colorCache, setColorCache] = useState<Record<string, ImageFile>>({});
  const [activeColor, setActiveColor] = useState(ORIGINAL);
  const autoSave = useAutoSave('coloring');

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customHex, setCustomHex] = useState('#9c3548');

  const canvasRef = useRef<HTMLDivElement>(null);

  const shown = activeColor === ORIGINAL ? original : colorCache[activeColor] || original;
  const isEdited = activeColor !== ORIGINAL;

  const revealCanvas = () => {
    if (window.innerWidth < 1024) {
      setTimeout(() => canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };

  const loadPhoto = (img: ImageFile) => {
    setOriginal(img);
    setColorCache({});
    setActiveColor(ORIGINAL);
    setError(null);
  };

  useInbox(['coloring'], (_target, img) => loadPhoto(img));

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('الملف ده مش صورة.');
      return;
    }
    try {
      loadPhoto(await readAndResizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ماقدرتش أقرا الصورة.');
    }
  };

  const clearImage = () => {
    setOriginal(null);
    setColorCache({});
    setActiveColor(ORIGINAL);
    setError(null);
  };

  const selectColor = useCallback(
    async (key: string) => {
      if (!original || busy) return;
      setError(null);
      if (key === ORIGINAL || colorCache[key]) {
        setActiveColor(key);
        return;
      }
      setBusy(`بنلوّن اللبس ${colorLabel(key)}...`);
      revealCanvas();
      try {
        const img = await recolor(original, HEX_RE.test(key) ? { hex: key } : { colorId: key });
        img.name = `color-${colorLabel(key)}`;
        autoSave(img);
        setColorCache((c) => ({ ...c, [key]: img }));
        setActiveColor(key);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تغيير اللون. جرّب تاني.');
      } finally {
        setBusy(null);
      }
    },
    [original, busy, colorCache, autoSave],
  );

  const handleDownload = () => {
    if (!shown) return;
    const link = document.createElement('a');
    link.href = toSrc(shown);
    const ext = shown.mimeType.includes('png') ? 'png' : 'jpg';
    link.download = `color-${Date.now()}.${ext}`;
    link.click();
  };

  const disabled = !original || !!busy;
  const customValid = HEX_RE.test(customHex);
  const customKey = customHex.toLowerCase();

  return (
    <div className="pb-12">

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-8">
        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Step 1 */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="step-num">١</span>
              <h2 className="text-base font-bold">الصورة</h2>
            </div>
            <Uploader
              id="coloring-photo"
              compact={!!original}
              image={original}
              onChange={handleFile}
              onPick={loadPhoto}
              onClear={busy ? undefined : clearImage}
              title="ارفع صورة فيها اللبس"
              hint="صورة واضحة لشخص لابس القطعة بتطلّع أحسن نتيجة"
            />
          </section>

          {/* Step 2 */}
          <section className={`card p-5 transition-opacity ${original ? '' : 'opacity-60'}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="step-num">٢</span>
                <h2 className="text-base font-bold">اختار اللون</h2>
              </div>
              {original && <span className="truncate text-xs font-semibold text-wine">{colorLabel(activeColor)}</span>}
            </div>

            <button
              type="button"
              onClick={() => selectColor(ORIGINAL)}
              disabled={disabled}
              aria-pressed={activeColor === ORIGINAL}
              className={`mb-4 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                activeColor === ORIGINAL && original ? 'bg-ink text-cream' : 'bg-cream-100 text-ink-soft hover:bg-cream-200'
              }`}
            >
              اللون الأصلي
            </button>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {COLOR_FAMILIES.map((family) => (
                <div key={family.id} className="min-w-0">
                  <h3 className="mb-2 text-xs font-bold text-ink-muted">{family.ar}</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {family.shades.map((shade) => (
                      <Swatch
                        key={shade.id}
                        hex={shade.hex}
                        label={shade.ar}
                        selected={!!original && activeColor === shade.id}
                        ready={!!colorCache[shade.id]}
                        disabled={disabled}
                        onClick={() => selectColor(shade.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-cream-300/70 pt-4">
              <h3 className="mb-2 text-xs font-bold text-ink-muted">لون مخصوص</h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="relative h-10 w-10 shrink-0 cursor-pointer">
                  <input
                    type="color"
                    value={customValid ? customKey : '#000000'}
                    onChange={(e) => setCustomHex(e.target.value)}
                    disabled={!!busy}
                    aria-label="اختار لون مخصوص"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span
                    className={`block h-full w-full rounded-full border border-ink/10 ${
                      original && activeColor === customKey ? 'ring-2 ring-wine ring-offset-2 ring-offset-white' : ''
                    }`}
                    style={{ backgroundColor: customValid ? customKey : '#ffffff' }}
                  />
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={customHex}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setCustomHex((v.startsWith('#') ? v : `#${v}`).slice(0, 7));
                  }}
                  maxLength={7}
                  aria-label="كود اللون"
                  className="h-10 w-28 rounded-xl border border-cream-300 bg-cream-100 px-3 text-center font-mono text-sm text-ink focus:border-wine/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => selectColor(customKey)}
                  disabled={disabled || !customValid}
                  className="btn-ghost h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  طبّق اللون
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Canvas */}
        <div ref={canvasRef} className={`order-first min-w-0 scroll-mt-36 lg:order-none ${original ? '' : 'hidden lg:block'}`}>
          <div className="lg:sticky lg:top-36">
            <section className="card overflow-hidden p-3 sm:p-4">
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-cream-100 sm:aspect-square lg:aspect-[4/3]">
                {shown ? (
                  <img key={shown.base64.length + activeColor} src={toSrc(shown)} alt="الصورة" className="h-full w-full animate-fadeUp object-contain" />
                ) : (
                  <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-wine shadow-card">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                      </svg>
                    </span>
                    <h2 className="text-lg font-bold">الصورة هتظهر هنا</h2>
                    <p className="text-sm text-ink-muted">ارفع صورة، وبعدين دوس على أي لون.</p>
                  </div>
                )}

                {busy && (
                  <div className="shimmer-bg absolute inset-0 flex animate-shimmer flex-col items-center justify-center gap-4 opacity-95">
                    <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-wine border-t-transparent" />
                    <p className="px-6 text-center text-sm font-bold text-ink-soft">{busy}</p>
                  </div>
                )}

                {original && isEdited && !busy && (
                  <div className="absolute bottom-3 start-3 overflow-hidden rounded-xl border-2 border-white shadow-lift">
                    <img src={toSrc(original)} alt="الصورة الأصلية" className="h-16 w-16 object-cover sm:h-20 sm:w-20" />
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

              {original && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-ink-soft">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1">
                      {activeColor !== ORIGINAL && (
                        <span
                          className="h-3 w-3 rounded-full border border-ink/10"
                          style={{ backgroundColor: findShade(activeColor)?.hex || activeColor }}
                        />
                      )}
                      {colorLabel(activeColor)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  <SendButton image={busy ? null : shown} from="coloring" />
                  <button type="button" onClick={handleDownload} disabled={!!busy} className="btn-primary h-11 px-5 text-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    تحميل
                  </button>
                  </div>
                </div>
              )}
              {original && (
                <p className="mt-2 text-xs text-ink-muted">الألوان اللي اتعملت بتفضل محفوظة، فالرجوع ليها مش بيصرف حاجة، وكل لون بيتحفظ في صندوق الصور كمان.</p>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

const Swatch: React.FC<{
  hex: string;
  label: string;
  selected: boolean;
  ready: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ hex, label, selected, ready, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    aria-pressed={selected}
    className={`relative h-10 w-10 shrink-0 rounded-full border border-ink/10 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:hover:scale-100 ${
      selected ? 'ring-2 ring-wine ring-offset-2 ring-offset-white' : ''
    } ${disabled && !selected ? 'opacity-60' : ''}`}
    style={{ backgroundColor: hex }}
  >
    {ready && !selected && (
      <span className="absolute -top-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-white bg-wine" />
    )}
  </button>
);

export default App;
