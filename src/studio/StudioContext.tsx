// Shared state of the studio: which section is open, the image tray, and images
// "in flight" from one section to another.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageFile } from '../shared/types';
import { clearTrayStore, deleteTrayImage, loadTray, putTrayImage, type TrayImage } from './store';
import { toolOf, type Target, type ToolId } from './tools';

/** Most images kept in the tray; the oldest ones drop off. */
export const MAX_TRAY = 100;

type Img = { base64: string; mimeType: string; name?: string };

interface Delivery {
  nonce: number;
  target: Target;
  image: TrayImage;
}

interface PickerRequest {
  multiple: boolean;
  resolve: (images: TrayImage[]) => void;
}

interface StudioValue {
  active: ToolId;
  setActive: (id: ToolId) => void;
  tray: TrayImage[];
  /** Saves an image in the tray (skips exact duplicates) and returns the saved entry. */
  addToTray: (img: Img, from: TrayImage['from']) => TrayImage;
  removeFromTray: (id: string) => void;
  clearTray: () => void;
  /** Opens a section with this image already loaded into it. */
  sendTo: (target: Target, img: Img, from: TrayImage['from']) => void;
  deliveries: Delivery[];
  consume: (nonce: number) => void;
  /** Opens the tray picker; resolves with the chosen images (empty when cancelled). */
  pickFromTray: (multiple?: boolean) => Promise<TrayImage[]>;
  picker: PickerRequest | null;
  closePicker: (images: TrayImage[]) => void;
  /** Image whose "send to" sheet is open. */
  sendSheet: { image: TrayImage; from: TrayImage['from'] } | null;
  openSendSheet: (img: Img, from: TrayImage['from']) => void;
  closeSendSheet: () => void;
  trayOpen: boolean;
  setTrayOpen: (open: boolean) => void;
  toast: string | null;
  showToast: (text: string) => void;
}

const StudioContext = createContext<StudioValue | null>(null);

const fingerprint = (img: Img) => `${img.mimeType}:${img.base64.length}:${img.base64.slice(-48)}`;
const newId = () => `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readHashTool(): ToolId | null {
  const id = window.location.hash.replace('#', '');
  return ['extractor', 'tryon', 'coloring', 'poses', 'products', 'jpg'].includes(id) ? (id as ToolId) : null;
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [active, setActiveState] = useState<ToolId>(() => readHashTool() || 'extractor');
  const [tray, setTray] = useState<TrayImage[]>([]);
  const trayRef = useRef<TrayImage[]>([]);
  trayRef.current = tray;
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const nonce = useRef(0);
  const [picker, setPicker] = useState<PickerRequest | null>(null);
  const [sendSheet, setSendSheet] = useState<StudioValue['sendSheet']>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadTray().then((saved) => {
      // Keep anything added before the stored list finished loading.
      setTray((current) => {
        const seen = new Set(current.map((i) => i.id));
        return [...current, ...saved.filter((s) => !seen.has(s.id))].slice(0, MAX_TRAY);
      });
    });
  }, []);

  useEffect(() => {
    const onHash = () => {
      const id = readHashTool();
      if (id) setActiveState(id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setActive = useCallback((id: ToolId) => {
    setActiveState(id);
    if (window.location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const addToTray = useCallback((img: Img, from: TrayImage['from']) => {
    const fp = fingerprint(img);
    const existing = trayRef.current.find((t) => fingerprint(t) === fp);
    if (existing) return existing;
    const entry: TrayImage = {
      id: newId(),
      base64: img.base64,
      mimeType: img.mimeType,
      name: img.name || 'صورة',
      from,
      createdAt: Date.now(),
    };
    const next = [entry, ...trayRef.current];
    const dropped = next.slice(MAX_TRAY);
    trayRef.current = next.slice(0, MAX_TRAY);
    setTray(trayRef.current);
    putTrayImage(entry);
    dropped.forEach((d) => deleteTrayImage(d.id));
    return entry;
  }, []);

  const removeFromTray = useCallback((id: string) => {
    trayRef.current = trayRef.current.filter((t) => t.id !== id);
    setTray(trayRef.current);
    deleteTrayImage(id);
  }, []);

  const clearTray = useCallback(() => {
    trayRef.current = [];
    setTray([]);
    clearTrayStore();
  }, []);

  const sendTo = useCallback(
    (target: Target, img: Img, from: TrayImage['from']) => {
      const image = addToTray(img, from);
      setDeliveries((d) => [...d, { nonce: ++nonce.current, target, image }]);
      setSendSheet(null);
      setTrayOpen(false);
      setActive(toolOf(target));
    },
    [addToTray, setActive],
  );

  const consume = useCallback((n: number) => setDeliveries((d) => d.filter((x) => x.nonce !== n)), []);

  const pickFromTray = useCallback(
    (multiple = false) => new Promise<TrayImage[]>((resolve) => setPicker({ multiple, resolve })),
    [],
  );

  const closePicker = useCallback(
    (images: TrayImage[]) => {
      picker?.resolve(images);
      setPicker(null);
    },
    [picker],
  );

  const openSendSheet = useCallback(
    (img: Img, from: TrayImage['from']) => setSendSheet({ image: addToTray(img, from), from }),
    [addToTray],
  );

  const value = useMemo<StudioValue>(
    () => ({
      active,
      setActive,
      tray,
      addToTray,
      removeFromTray,
      clearTray,
      sendTo,
      deliveries,
      consume,
      pickFromTray,
      picker,
      closePicker,
      sendSheet,
      openSendSheet,
      closeSendSheet: () => setSendSheet(null),
      trayOpen,
      setTrayOpen,
      toast,
      showToast,
    }),
    [active, setActive, tray, addToTray, removeFromTray, clearTray, sendTo, deliveries, consume, pickFromTray, picker, closePicker, sendSheet, openSendSheet, trayOpen, toast, showToast],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}

/** Copies a tray entry into the plain image shape the tools use. */
export const asImageFile = (img: TrayImage): ImageFile => ({ base64: img.base64, mimeType: img.mimeType, name: img.name });

/**
 * Hands images sent to one of `targets` to `handler`, once each. Tools stay mounted
 * while hidden, so an image sent from another section arrives right away.
 */
export function useInbox(targets: Target[], handler: (target: Target, image: ImageFile) => void) {
  const { deliveries, consume } = useStudio();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const key = targets.join(',');
  useEffect(() => {
    for (const d of deliveries) {
      if (!key.split(',').includes(d.target)) continue;
      consume(d.nonce);
      handlerRef.current(d.target, asImageFile(d.image));
    }
  }, [deliveries, key, consume]);
}

/** Saves results of a tool in the tray automatically. */
export function useAutoSave(from: ToolId) {
  const { addToTray } = useStudio();
  return useCallback((img: Img) => addToTray(img, from), [addToTray, from]);
}
