/**
 * IndexedDB-based file storage for Lovcore.
 *
 * Stores file blobs locally so images survive page refreshes.
 * Items reference files via `file://<itemId>` in the thumbnail field.
 */

const DB_NAME = 'lovcore-files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeFile(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(blob, key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadFile(key: string): Promise<Blob | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get(key);
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob ?? null;
}

export async function loadFileUrl(key: string): Promise<string | null> {
  const blob = await loadFile(key);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function deleteStoredFile(key: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(key);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function hasStoredFile(key: string): Promise<boolean> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).count(key);
  const count = await new Promise<number>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return count > 0;
}

export const FILE_REF_PREFIX = 'indexeddb://';

export function isFileRef(value: string | undefined): boolean {
  return !!value && value.startsWith(FILE_REF_PREFIX);
}

export function fileRefKey(value: string): string {
  return value.slice(FILE_REF_PREFIX.length);
}

export function makeFileRef(itemId: string): string {
  return `${FILE_REF_PREFIX}${itemId}`;
}

export function storageCacheKey(storagePath: string): string {
  return `storage://${storagePath}`;
}

// --- React Hook ---

import { useState, useEffect } from 'react';
import { downloadCardFile } from './cloudFileStore';

/**
 * Resolves a thumbnail value to a displayable URL.
 * If the value is an `indexeddb://` reference, loads from IndexedDB.
 * Otherwise returns the value as-is (external URL, blob URL, etc.).
 */
export function useFileUrl(ref: string | undefined, storagePath?: string): string | undefined {
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    setUrl(undefined); // eslint-disable-line react-hooks/set-state-in-effect

    if (!ref && !storagePath) {
      return;
    }

    if (ref && !isFileRef(ref)) {
      setUrl(ref);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    const setObjectUrl = (blob: Blob) => {
      const nextUrl = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(nextUrl);
        return false;
      }
      objectUrl = nextUrl;
      setUrl(objectUrl);
      return true;
    };

    (async () => {
      if (ref && isFileRef(ref)) {
        const key = fileRefKey(ref);
        const localBlob = await loadFile(key);
        if (localBlob) {
          setObjectUrl(localBlob);
          return;
        }
      }

      if (!storagePath) return;

      const cachedCloudBlob = await loadFile(storageCacheKey(storagePath));
      if (cachedCloudBlob) {
        setObjectUrl(cachedCloudBlob);
        return;
      }

      const downloaded = await downloadCardFile(storagePath);
      if (!downloaded.ok) return;

      try {
        await storeFile(storageCacheKey(storagePath), downloaded.blob);
      } catch (err) {
        console.warn('[fileStore] Could not cache cloud file locally:', err);
      }

      if (ref && isFileRef(ref)) {
        try {
          await storeFile(fileRefKey(ref), downloaded.blob);
        } catch (err) {
          console.warn('[fileStore] Could not cache downloaded file locally:', err);
        }
      }

      setObjectUrl(downloaded.blob);
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ref, storagePath]);

  return url;
}
