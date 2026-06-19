import { useEffect, useRef, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createAnalyzingItem, type IngestResolver } from '../lib/ingestion';
import {
  createLovcoreOriginalItems,
  hasLovcoreOriginalSeedRepair,
  isRemovedLovcoreOriginalSeedItem,
  repairLovcoreOriginalSeedItem,
} from '../data/lovcoreOriginalSeed';
import { loadStoredItems, persistItems } from '../lib/storage';
import { deleteStoredFile, fileRefKey, isFileRef, loadFile } from '../lib/fileStore';
import { supabase } from '../lib/supabaseClient';
import { dbToCard, cardToDb, bodyToCardBody } from '../lib/supabaseMappers';
import { uploadCardFile, uploadCardPreview, uploadCardThumbnail } from '../lib/cloudFileStore';
import type { Item, ItemType } from '../types';
import type { CardBodyRow, CardRow } from '../types/database';
import { useTranslation } from '../i18n';

interface UseCardsOptions {
  onToast?: (message: string) => void;
  user?: User | null;
  authLoading?: boolean;
}

const INGEST_TIMEOUT_MS = 45000;
const STALE_ANALYZING_MS = 2 * 60 * 1000;
const STARTER_SEED_KEY_PREFIX = 'lovcore:starter-seeded:';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeout);
        reject(error);
      });
  });
}

function normalizeLoadedItem(item: Item): Item {
  if (item.status !== 'analyzing') return item;

  const createdAt = new Date(item.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return item;

  return Date.now() - createdAt > STALE_ANALYZING_MS
    ? { ...item, status: 'failed' as const }
    : item;
}

async function attachCloudFileRefs(
  item: Item,
  userId: string,
  onProgress?: (itemId: string, progress: number) => void,
): Promise<Item> {
  if (!supabase) return item;

  const next: Item = { ...item };

  if (item.originalFileRef && isFileRef(item.originalFileRef) && !item.originalStoragePath) {
    const blob = await loadFile(fileRefKey(item.originalFileRef));
    if (blob) {
      const result = await uploadCardFile({
        userId,
        cardId: item.id,
        file: blob,
        originalFileName: item.originalFileName || item.title,
        fileExtension: item.fileExtension,
        mimeType: item.mimeType || blob.type || 'application/octet-stream',
        onProgress: (progress) => onProgress?.(item.id, progress),
      });
      if (result.ok) {
        next.originalStoragePath = result.storagePath;
        next.fileSyncStatus = undefined;
        next.fileSyncError = undefined;
      } else {
        console.warn('[Lovcore] Failed to upload original file:', result.error);
        next.fileSyncStatus = 'failed';
        next.fileSyncError = '原文件同步失败，点击重新上传';
      }
    } else {
      next.fileSyncStatus = 'failed';
      next.fileSyncError = '原文件同步失败，点击重新上传';
    }
  }

  if (item.previewPdfRef && isFileRef(item.previewPdfRef) && !item.previewPdfStoragePath) {
    const blob = await loadFile(fileRefKey(item.previewPdfRef));
    if (blob) {
      const result = await uploadCardPreview({
        userId,
        cardId: item.id,
        pdfBlob: blob,
      });
      if (result.ok) {
        next.previewPdfStoragePath = result.storagePath;
      } else {
        console.warn('[Lovcore] Failed to upload preview PDF:', result.error);
      }
    }
  }

  if (item.thumbnail && isFileRef(item.thumbnail) && !item.thumbnailStoragePath) {
    const blob = await loadFile(fileRefKey(item.thumbnail));
    if (blob) {
      const result = await uploadCardThumbnail({
        userId,
        cardId: item.id,
        thumbBlob: blob,
      });
      if (result.ok) {
        next.thumbnailStoragePath = result.storagePath;
      } else {
        console.warn('[Lovcore] Failed to upload thumbnail:', result.error);
      }
    }
  }

  return next;
}

function needsCloudFileRepair(item: Item): boolean {
  // Items with failed file sync that have an IndexedDB ref to retry
  if (item.fileSyncStatus === 'failed' && item.originalFileRef && isFileRef(item.originalFileRef)) {
    return true;
  }

  return (
    (!!item.originalFileRef && isFileRef(item.originalFileRef) && !item.originalStoragePath)
    || (!!item.previewPdfRef && isFileRef(item.previewPdfRef) && !item.previewPdfStoragePath)
    || (!!item.thumbnail && isFileRef(item.thumbnail) && !item.thumbnailStoragePath)
  );
}

function cloudRefsChanged(before: Item, after: Item): boolean {
  return before.originalStoragePath !== after.originalStoragePath
    || before.previewPdfStoragePath !== after.previewPdfStoragePath
    || before.thumbnailStoragePath !== after.thumbnailStoragePath
    || before.fileSyncStatus !== after.fileSyncStatus
    || before.fileSyncError !== after.fileSyncError;
}

/** Upsert a body row into card_bodies. Fire-and-forget. */
function upsertCardBody(item: Item, userId: string) {
  if (!supabase || !item.body) return;
  const payload = bodyToCardBody(item.id, userId, item.body);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.from('card_bodies') as any)
    .upsert(payload, { onConflict: 'card_id' })
    .then(({ error }: { error: unknown }) => {
      if (error) console.error('[Lovcore] Failed to upsert card body:', error);
    });
}

export const useCards = ({ onToast, user, authLoading = false }: UseCardsOptions = {}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  const isMockMode = !user || (typeof window !== 'undefined' && localStorage.getItem('lovcore:mock-auth') === 'true');

  // Load items on mount
  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      return () => {
        cancelled = true;
      };
    }

    if (user && supabase && !isMockMode) {
      const client = supabase;
      const userId = user.id;
      const isUserSwitch = lastUserIdRef.current !== userId;
      lastUserIdRef.current = userId;

      if (isUserSwitch) {
        setItems([]);
      }
      setLoading(true);
      client
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .then(async ({ data, error }) => {
          if (cancelled) return;

          if (error) {
            console.error('[Lovcore] Failed to load cards from Supabase:', error);
            onToast?.(t.app.loadFailed);
            setItems(loadStoredItems());
            setLoading(false);
            return;
          }

          const rows = data ?? [];
          const seedKey = `${STARTER_SEED_KEY_PREFIX}${userId}`;

          if (rows.length === 0 && localStorage.getItem(seedKey) !== 'true') {
            const seededItems = createLovcoreOriginalItems(userId);
            const payload = seededItems.map((item) => cardToDb(item, userId));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: seedError } = await (client.from('cards') as any).insert(payload);
            if (cancelled) return;

            if (seedError) {
              console.error('[Lovcore] Failed to create starter stack:', seedError);
              onToast?.(t.app.saveFailed);
              setItems([]);
            } else {
              localStorage.setItem(seedKey, 'true');
              setItems(seededItems);
            }

            setLoading(false);
            return;
          }

          // Batch-fetch card_bodies for all loaded cards
          let bodyMap = new Map<string, CardBodyRow>();
          if (rows.length > 0) {
            const cardIds = rows.map((r: { id: string }) => r.id);
            const { data: bodies } = await client
              .from('card_bodies')
              .select('*')
              .eq('user_id', userId)
              .in('card_id', cardIds);
            if (cancelled) return;
            if (bodies) {
              bodyMap = new Map(bodies.map((b: CardBodyRow) => [b.card_id, b]));
            }
          }

          const loadedItems = rows.map((row: CardRow) => normalizeLoadedItem(dbToCard(row, bodyMap.get(row.id))));
          const removedStarterItems = loadedItems.filter((item) => isRemovedLovcoreOriginalSeedItem(userId, item));
          if (removedStarterItems.length > 0) {
            const removedIds = removedStarterItems.map((item) => item.id);
            client
              .from('cards')
              .delete()
              .eq('user_id', userId)
              .in('id', removedIds)
              .then(({ error }) => {
                if (error) console.warn('[Lovcore] Failed to remove deprecated starter cards:', error);
              });
            client
              .from('card_bodies')
              .delete()
              .eq('user_id', userId)
              .in('card_id', removedIds)
              .then(() => {});
          }

          const repairedItems = await Promise.all(
            loadedItems
            .filter((item) => !isRemovedLovcoreOriginalSeedItem(userId, item))
            .map(async (item) => {
              const seedRepaired = repairLovcoreOriginalSeedItem(userId, item);
              if (hasLovcoreOriginalSeedRepair(item, seedRepaired)) {
                const payload = cardToDb(seedRepaired, userId);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (client.from('cards') as any)
                  .update(payload)
                  .eq('id', seedRepaired.id)
                  .eq('user_id', userId)
                  .then(({ error }: { error: unknown }) => {
                    if (error) console.warn('[Lovcore] Failed to persist starter PDF repair:', error);
                  });
              }

              if (!needsCloudFileRepair(seedRepaired)) return seedRepaired;

              const repaired = await attachCloudFileRefs(seedRepaired, userId);
              if (!cloudRefsChanged(seedRepaired, repaired)) return seedRepaired;

              const payload = cardToDb(repaired, userId);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (client.from('cards') as any)
                .update(payload)
                .eq('id', repaired.id)
                .eq('user_id', userId)
                .then(({ error }: { error: unknown }) => {
                  if (error) console.warn('[Lovcore] Failed to persist repaired cloud file refs:', error);
                });

              return repaired;
            }),
          );
          if (cancelled) return;

          setItems((current) => {
            const loadedIds = new Set(repairedItems.map((item) => item.id));
            const pendingLocalItems = current.filter(
              (item) => item.status === 'analyzing' && !loadedIds.has(item.id),
            );
            return [...pendingLocalItems, ...repairedItems];
          });
          setLoading(false);

          // Background repair: re-attempt cloud upload for items that still
          // have indexeddb:// refs but no storagePath after initial repair.
          // This catches files that were uploaded when Supabase was
          // misconfigured (e.g. wrong anon key) and never made it to cloud.
          const stillBroken = repairedItems.filter(needsCloudFileRepair);
          if (stillBroken.length > 0 && !cancelled) {
            console.info(`[Lovcore] Background repair: ${stillBroken.length} card(s) still need cloud file upload`);
            // Run in the background with a slight delay to avoid blocking UI
            setTimeout(async () => {
              if (cancelled) return;
              let repairSuccess = 0;
              let repairFail = 0;
              for (const item of stillBroken) {
                if (cancelled) break;
                try {
                  const fixed = await attachCloudFileRefs(item, userId);
                  if (cloudRefsChanged(item, fixed)) {
                    // Update Supabase with the repaired paths
                    const payload = cardToDb(fixed, userId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (client.from('cards') as any)
                      .update(payload)
                      .eq('id', fixed.id)
                      .eq('user_id', userId);
                    // Update local state
                    setItems((current) =>
                      current.map((c) => (c.id === fixed.id ? fixed : c)),
                    );
                    repairSuccess++;
                  } else {
                    repairFail++;
                  }
                } catch {
                  repairFail++;
                }
              }
              if (repairSuccess > 0) {
                console.info(`[Lovcore] Background repair complete: ${repairSuccess} fixed, ${repairFail} failed`);
                onToast?.(`${repairSuccess} file(s) synced to cloud`);
              } else if (repairFail > 0) {
                console.warn(`[Lovcore] Background repair: ${repairFail} files could not be recovered (IndexedDB data may be missing)`);
              }
            }, 3000);
          }
        });
    } else {
      lastUserIdRef.current = null;
      setItems(loadStoredItems());
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, onToast, t, isMockMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage when in local mode
  useEffect(() => {
    if (isMockMode && !loading) {
      persistItems(items);
    }
  }, [items, isMockMode, loading]);

  const updateItem = useCallback((updatedItem: Item) => {
    setItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));

    if (user && supabase && !isMockMode) {
      const payload = cardToDb(updatedItem, user.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('cards') as any)
        .update(payload)
        .eq('id', updatedItem.id)
        .eq('user_id', user.id)
        .then(({ error }: { error: unknown }) => {
          if (error) {
            console.error('[Lovcore] Failed to update card:', error);
            onToast?.(t.app.saveFailed);
          }
        });

      // Persist body to card_bodies table
      upsertCardBody(updatedItem, user.id);
    }
  }, [user, onToast, t, isMockMode]);

  const deleteItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));

    // Always clean up IndexedDB file blobs
    deleteStoredFile(id).catch(() => {});
    deleteStoredFile(`${id}-thumb`).catch(() => {});
    deleteStoredFile(`${id}-pdf`).catch(() => {});
    deleteStoredFile(`${id}-docx`).catch(() => {});
    deleteStoredFile(`${id}-original`).catch(() => {});
    deleteStoredFile(`${id}-preview-pdf`).catch(() => {});
    deleteStoredFile(`${id}-clip-thumb`).catch(() => {});
    const item = items.find((current) => current.id === id);
    if (item?.originalFileRef && isFileRef(item.originalFileRef)) {
      deleteStoredFile(fileRefKey(item.originalFileRef)).catch(() => {});
    }
    if (item?.previewPdfRef && isFileRef(item.previewPdfRef)) {
      deleteStoredFile(fileRefKey(item.previewPdfRef)).catch(() => {});
    }

    if (user && supabase && !isMockMode) {
      supabase
        .from('cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            console.error('[Lovcore] Failed to delete card:', error);
            onToast?.(t.app.deleteFailed);
          }
        });

      // Also clean up card_bodies (FK cascade would handle it, but be explicit)
      supabase
        .from('card_bodies')
        .delete()
        .eq('card_id', id)
        .eq('user_id', user.id)
        .then(() => {});
    }

    onToast?.(t.app.inspirationRemoved);
  }, [user, items, onToast, t, isMockMode]);

  const triggerIngest = useCallback((
    type: ItemType,
    initialFields: Partial<Item>,
    resolve: IngestResolver,
  ) => {
    const tempItem = createAnalyzingItem(type, initialFields);

    setItems((current) => [tempItem, ...current]);

    // Track whether the initial insert succeeded so we can fall back to upsert later
    let initialInsertSucceeded = false;

    // Insert the analyzing placeholder into Supabase immediately
    if (user && supabase && !isMockMode) {
      const payload = cardToDb(tempItem, user.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('cards') as any)
        .insert(payload)
        .then(({ error }: { error: unknown }) => {
          if (error) {
            console.error('[Lovcore] Failed to insert analyzing card:', error);
            onToast?.(t.app.saveFailed);
          } else {
            initialInsertSucceeded = true;
          }
        });
    }

    setTimeout(async () => {
      try {
        const resolved = await withTimeout(
          Promise.resolve(resolve(tempItem)),
          INGEST_TIMEOUT_MS,
          `${type} ingestion`,
        );

        const readyItem = { ...resolved, status: 'ready' as const };
        const persistedItem = user && supabase && !isMockMode
          ? await attachCloudFileRefs(readyItem, user.id, (itemId, progress) => {
              // Update upload progress in UI
              setItems((current) =>
                current.map((c) =>
                  c.id === itemId ? { ...c, uploadProgress: progress } : c
                )
              );
            })
          : readyItem;

        setItems((current) =>
          current.map((item) =>
            item.id === tempItem.id ? persistedItem : item,
          ),
        );

        // Sync resolved card to Supabase
        if (user && supabase && !isMockMode) {
          const payload = cardToDb(persistedItem, user.id);
          if (initialInsertSucceeded) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('cards') as any)
              .update(payload)
              .eq('id', tempItem.id)
              .eq('user_id', user.id)
              .then(({ error }: { error: unknown }) => {
                if (error) console.error('[Lovcore] Failed to update resolved card:', error);
              });
          } else {
            // Initial insert failed — upsert so the row is created or updated
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('cards') as any)
              .upsert(payload, { onConflict: 'id' })
              .then(({ error }: { error: unknown }) => {
                if (error) console.error('[Lovcore] Failed to upsert resolved card:', error);
              });
          }

          // Persist body to card_bodies if present
          upsertCardBody(persistedItem, user.id);
        }

        onToast?.(`${type.toUpperCase()} ${t.app.organizedBy}`);
      } catch (err) {
        console.error(`[Lovcore] Ingestion failed for ${type}:`, err);

        // Mark the card as failed so it doesn't get stuck at 'analyzing'
        const failedItem: Item = { ...tempItem, status: 'failed' as const };
        setItems((current) =>
          current.map((item) =>
            item.id === tempItem.id ? failedItem : item,
          ),
        );

        // Sync failed status to Supabase
        if (user && supabase && !isMockMode) {
          const payload = cardToDb(failedItem, user.id);
          if (initialInsertSucceeded) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('cards') as any)
              .update(payload)
              .eq('id', tempItem.id)
              .eq('user_id', user.id)
              .then(({ error }: { error: unknown }) => {
                if (error) console.error('[Lovcore] Failed to sync failed card status:', error);
              });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from('cards') as any)
              .upsert(payload, { onConflict: 'id' })
              .then(({ error }: { error: unknown }) => {
                if (error) console.error('[Lovcore] Failed to upsert failed card:', error);
              });
          }
        }

        onToast?.(`${type.toUpperCase()} ${t.app.ingestionFailed}`);
      }
    }, 2500);
  }, [user, onToast, t, isMockMode]);

  return {
    items,
    setItems,
    updateItem,
    deleteItem,
    triggerIngest,
    loading,
  };
};
