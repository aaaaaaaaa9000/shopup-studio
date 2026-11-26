import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, editImage, makeModel, tryOn } from './lib/api';
import { compressForSave, fetchImage, fromDataUrl, readImageFile, toSrc } from './lib/image';
import { DEFAULT_POSE, MANNEQUINS, POSES } from './lib/options';
import type { Garment, Img, Layer, SavedLook, SubjectKind } from './lib/types';
import SubjectPicker from './components/SubjectPicker';
import Stage, { type StageError } from './components/Stage';
import Wardrobe from './components/Wardrobe';
import OutfitPanel from './components/OutfitPanel';
import EditsPanel from './components/EditsPanel';
import SavedLooks from './components/SavedLooks';
import { RestartIcon } from '../../shared/icons';
import { useAutoSave, useInbox, useStudio } from '../../studio/StudioContext';

const SAVED_KEY = 'tryon-saved-looks-v1';
const MAX_SAVED = 30;

function loadSaved(): SavedLook[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Writes the list; returns false when the browser storage is full or blocked. */
function storeSaved(list: SavedLook[]): boolean {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'حصلت مشكلة. جرّب تاني.');

export default function App() {
  const autoSave = useAutoSave('tryon');
  const { pickFromTray } = useStudio();
  const [subject, setSubject] = useState<SubjectKind | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layerIndex, setLayerIndex] = useState(0);
  const [poseKey, setPoseKey] = useState(DEFAULT_POSE);
  const [wardrobe, setWardrobe] = useState<Garment[]>([]);
  const [saved, setSaved] = useState<SavedLook[]>(loadSaved);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<StageError | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const activeLayers = useMemo(() => layers.slice(0, layerIndex + 1), [layers, layerIndex]);
  const currentLayer = layers[layerIndex];
  const currentImage: Img | null = currentLayer
    ? currentLayer.images[poseKey] ?? currentLayer.images[DEFAULT_POSE] ?? Object.values(currentLayer.images)[0] ?? null
    : null;
  const activeGarmentIds = activeLayers.map((l) => l.garment?.id).filter(Boolean) as string[];
  const isLoading = busy !== null;

  // Keep the result in view on phones when work starts or an error appears.
  const scrollToStage = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /** Runs one generation with a loading message and Arabic error handling. */
  const run = useCallback(async (message: string, task: () => Promise<void>, onRefused?: StageError['action']) => {
    setError(null);
    setBusy(message);
    scrollToStage();
    try {
      await task();
    } catch (err) {
      const refused = err instanceof ApiError && err.code === 'refused';
      setError({
        message: refused
          ? 'جيميناي رفض يعمل الصورة دي. ده بيحصل غالبًا مع الملابس الداخلية على صور أشخاص حقيقيين.'
          : errorText(err),
        action: refused ? onRefused : undefined,
      });
    } finally {
      setBusy(null);
    }
  }, []);

  const startWith = (kind: SubjectKind, base: Img) => {
    setSubject(kind);
    setLayers([{ garment: null, images: { [DEFAULT_POSE]: base } }]);
    setLayerIndex(0);
    setPoseKey(DEFAULT_POSE);
    setError(null);
  };

  const handleStartOver = () => {
    setSubject(null);
    setLayers([]);
    setLayerIndex(0);
    setPoseKey(DEFAULT_POSE);
    setError(null);
  };

  const loadMannequin = async (id: string) => fetchImage(MANNEQUINS.find((m) => m.id === id)!.src);

  const applyGarment = useCallback(
    async (garment: Garment, onto: { kind: SubjectKind; image: Img; fresh?: boolean }) => {
      const result = await tryOn(onto.image, garment.image, onto.kind);
      autoSave({ ...result, name: `try-on-${garment.name}` });
      if (onto.fresh) {
        setSubject(onto.kind);
        setLayers([
          { garment: null, images: { [DEFAULT_POSE]: onto.image } },
          { garment, images: { [DEFAULT_POSE]: result } },
        ]);
        setLayerIndex(1);
      } else {
        setLayers((prev) => [...prev.slice(0, layerIndex + 1), { garment, images: { [DEFAULT_POSE]: result } }]);
        setLayerIndex(layerIndex + 1);
      }
      setPoseKey(DEFAULT_POSE);
    },
    [layerIndex, autoSave],
  );

  const tryOnMannequin = (garment: Garment, mannequinId: string) =>
    run('بنلبّس المانيكان...', async () => {
      const image = await loadMannequin(mannequinId);
      await applyGarment(garment, { kind: 'mannequin', image, fresh: true });
    });

  const handleGarmentSelect = (garment: Garment) => {
    if (!currentImage || isLoading) return;
    // Re-selecting the garment that comes next in the history just moves forward.
    const next = layers[layerIndex + 1];
    if (next?.garment?.id === garment.id) {
      setLayerIndex(layerIndex + 1);
      setPoseKey(DEFAULT_POSE);
      return;
    }
    const kind = subject!;
    run(
      `بنلبّس «${garment.name}»...`,
      () => applyGarment(garment, { kind, image: currentImage }),
      kind === 'person' ? { garment, run: tryOnMannequin } : undefined,
    );
  };

  const newGarment = (name: string, image: Img): Garment => ({
    id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.replace(/\.[^/.]+$/, '').slice(0, 40) || 'قطعة',
    image,
  });

  useInbox(['tryon-garment', 'tryon-person'], (target, img) => {
    const image = { base64: img.base64, mimeType: img.mimeType };
    if (target === 'tryon-person') {
      if (!isLoading) startWith('person', image);
      return;
    }
    setWardrobe((prev) => [...prev, newGarment(img.name, image)]);
  });

  const handlePickGarments = async () => {
    const chosen = await pickFromTray(true);
    if (!chosen.length) return [];
    const added = chosen.map((c) => newGarment(c.name, { base64: c.base64, mimeType: c.mimeType }));
    setWardrobe((prev) => [...prev, ...added]);
    return added;
  };

  const handlePickPerson = async () => {
    const [chosen] = await pickFromTray(false);
    if (chosen) startWith('person', { base64: chosen.base64, mimeType: chosen.mimeType });
  };

  const handleAddGarments = async (files: File[]) => {
    const added: Garment[] = [];
    for (const file of files) {
      try {
        const image = await readImageFile(file, 1280);
        added.push(newGarment(file.name, image));
      } catch (err) {
        setError({ message: errorText(err) });
      }
    }
    if (added.length) setWardrobe((prev) => [...prev, ...added]);
    return added;
  };

  const handleRemoveGarment = (id: string) => setWardrobe((prev) => prev.filter((g) => g.id !== id));

  const handleRemoveLast = () => {
    if (layerIndex > 0) {
      setLayerIndex(layerIndex - 1);
      setPoseKey(DEFAULT_POSE);
    }
  };

  /** Saves an edit result in the studio tray and passes it through. */
  const autoSaved = (img: Img, name: string) => {
    autoSave({ ...img, name: `try-on-${name}` });
    return img;
  };

  /** Replaces the image of the current step and pose (color / background edits). */
  const replaceCurrent = (img: Img) =>
    setLayers((prev) =>
      prev.map((l, i) => (i === layerIndex ? { ...l, images: { ...l.images, [poseKey]: img } } : l)),
    );

  const handleColor = (label: string, value: string) => {
    if (!currentImage || isLoading) return;
    run(`بنغيّر اللون لـ${label}...`, async () => replaceCurrent(autoSaved(await editImage(currentImage, 'color', value), `color-${label}`)));
  };

  const handleBackground = (label: string, value: string) => {
    if (!currentImage || isLoading) return;
    run(`بنغيّر الخلفية (${label})...`, async () => replaceCurrent(autoSaved(await editImage(currentImage, 'background', value), 'background')));
  };

  const handlePose = (key: string, value: string) => {
    if (!currentLayer || isLoading || key === poseKey) return;
    if (currentLayer.images[key] || key === DEFAULT_POSE) {
      setPoseKey(key);
      return;
    }
    const base = currentLayer.images[DEFAULT_POSE] ?? Object.values(currentLayer.images)[0];
    const idx = layerIndex;
    run('بنغيّر الوضعية...', async () => {
      const img = autoSaved(await editImage(base, 'pose', value), 'pose');
      setLayers((prev) => prev.map((l, i) => (i === idx ? { ...l, images: { ...l.images, [key]: img } } : l)));
      setPoseKey(key);
    });
  };

  const handleCustomPose = (text: string) => {
    const preset = POSES.find((p) => p.label === text.trim());
    handlePose(preset ? preset.key : `custom:${text.trim()}`, preset ? preset.value : text.trim());
  };

  const handleMakeModel = async (photo: Img): Promise<Img | null> => {
    let model: Img | null = null;
    await run('بنجهّز صورتك كموديل...', async () => {
      model = await makeModel(photo);
    });
    return model;
  };

  const handleSave = async () => {
    if (!currentImage || !subject) return;
    try {
      const look: SavedLook = {
        id: `look-${Date.now()}`,
        image: await compressForSave(currentImage),
        subject,
        names: activeLayers.map((l) => l.garment?.name).filter(Boolean) as string[],
        createdAt: Date.now(),
      };
      const next = [look, ...saved].slice(0, MAX_SAVED);
      if (!storeSaved(next)) {
        setError({ message: 'مساحة الحفظ في المتصفح اتملت. امسح شوية أطقم قديمة وجرّب تاني.' });
        return false;
      }
      setSaved(next);
      return true;
    } catch (err) {
      setError({ message: errorText(err) });
      return false;
    }
  };

  const handleDeleteSaved = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    storeSaved(next);
    setSaved(next);
  };

  const handleOpenSaved = (look: SavedLook) => {
    if (isLoading) return;
    startWith(look.subject, fromDataUrl(look.image));
  };

  useEffect(() => {
    if (error) scrollToStage();
  }, [error]);

  return (
    <div className="pb-12">

      <main className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:pt-8">
        <div className="flex min-w-0 flex-col gap-5">
          {subject && (
            <button type="button" onClick={handleStartOver} disabled={isLoading} className="btn-ghost h-11 self-start px-4 text-sm">
              <RestartIcon className="h-4 w-4" />
              ابدأ من جديد بموديل تاني
            </button>
          )}
          {!subject ? (
            <SubjectPicker
              busy={isLoading}
              onMakeModel={handleMakeModel}
              onUsePhoto={(img) => startWith('person', img)}
              onPickFromTray={handlePickPerson}
              onPickMannequin={(id) =>
                run('بنجهّز المانيكان...', async () => startWith('mannequin', await loadMannequin(id)))
              }
            />
          ) : (
            <>
              <Wardrobe
                garments={wardrobe}
                activeIds={activeGarmentIds}
                disabled={isLoading}
                onAdd={handleAddGarments}
                onPickFromTray={handlePickGarments}
                onSelect={handleGarmentSelect}
                onRemove={handleRemoveGarment}
              />
              <OutfitPanel
                subject={subject}
                layers={activeLayers}
                disabled={isLoading}
                onRemoveLast={handleRemoveLast}
                onColor={handleColor}
              />
              <EditsPanel
                subject={subject}
                poseKey={poseKey}
                readyPoses={currentLayer ? Object.keys(currentLayer.images) : []}
                disabled={isLoading}
                onPose={handlePose}
                onCustomPose={handleCustomPose}
                onBackground={handleBackground}
              />
            </>
          )}
          {saved.length > 0 && (
            <SavedLooks looks={saved} disabled={isLoading} onOpen={handleOpenSaved} onDelete={handleDeleteSaved} />
          )}
        </div>

        <div ref={stageRef} className="order-first min-w-0 scroll-mt-36 lg:order-none">
          <Stage
            image={currentImage}
            subject={subject}
            busy={busy}
            error={error}
            canSave={!!currentImage && !!subject}
            onDismissError={() => setError(null)}
            onSave={handleSave}
          />
        </div>
      </main>
    </div>
  );
}
