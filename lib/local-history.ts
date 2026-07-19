/**
 * Local recording history in IndexedDB — "never lose a recording."
 *
 * Every finished recording is saved to the browser automatically, so a
 * guest who closes the tab (or whose upload fails) can still recover the
 * file later. Only the newest MAX_ITEMS are kept to bound disk usage.
 */

const DB_NAME = "recordflow";
const STORE = "recordings";
const MAX_ITEMS = 10;

export interface LocalRecording {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  sizeBytes: number;
  mimeType: string;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveLocalRecording(
  recording: LocalRecording
): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(recording);
    await txDone(tx);
    await pruneOldest(db);
  } finally {
    db.close();
  }
}

async function pruneOldest(db: IDBDatabase): Promise<void> {
  const all = await readAll(db);
  const excess = all
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(MAX_ITEMS);
  if (excess.length === 0) return;
  const tx = db.transaction(STORE, "readwrite");
  for (const item of excess) tx.objectStore(STORE).delete(item.id);
  await txDone(tx);
}

function readAll(db: IDBDatabase): Promise<LocalRecording[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as LocalRecording[]);
    request.onerror = () => reject(request.error);
  });
}

export async function listLocalRecordings(): Promise<LocalRecording[]> {
  try {
    const db = await openDb();
    try {
      const all = await readAll(db);
      return all.sort((a, b) => b.createdAt - a.createdAt);
    } finally {
      db.close();
    }
  } catch {
    // Private browsing or blocked storage — behave as an empty history.
    return [];
  }
}

export async function deleteLocalRecording(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}
