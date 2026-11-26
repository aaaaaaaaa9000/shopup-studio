// The image tray lives in the browser's IndexedDB, so images survive a page refresh.
// Every call is wrapped so a blocked or full storage never breaks the app: the tray
// then simply works in memory for this visit.
import type { ToolId } from './tools';

export interface TrayImage {
  id: string;
  base64: string;
  mimeType: string;
  name: string;
  from: ToolId | 'upload';
  createdAt: number;
}

const DB_NAME = 'shopup-studio';
const STORE = 'tray';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? (req.result as T) : null);
      t.onerror = () => resolve(null);
      t.onabort = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadTray(): Promise<TrayImage[]> {
  const all = (await tx<TrayImage[]>('readonly', (s) => s.getAll())) || [];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export const putTrayImage = (img: TrayImage) => tx('readwrite', (s) => s.put(img));
export const deleteTrayImage = (id: string) => tx('readwrite', (s) => s.delete(id));
export const clearTrayStore = () => tx('readwrite', (s) => s.clear());
