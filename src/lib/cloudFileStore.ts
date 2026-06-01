/**
 * Cloud file storage helpers for Supabase Storage.
 *
 * These functions are independent of useCards.ts and ingestion.ts.
 * They provide reusable building blocks for uploading, fetching,
 * and deleting card files in Supabase Storage.
 *
 * Includes exponential-backoff retry logic so transient network
 * failures (or temporary auth-key issues) don't silently lose files.
 */

import { supabase } from './supabaseClient'

// ============================================================
// Types
// ============================================================

export type FileUploadResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: string }

export type SignedUrlResult =
  | { ok: true; url: string; expiresAt: number }
  | { ok: false; error: string }

export type DeleteResult =
  | { ok: true; deletedPaths: string[] }
  | { ok: false; error: string }

export type FileDownloadResult =
  | { ok: true; blob: Blob }
  | { ok: false; error: string }

export interface CardFileParams {
  userId: string
  cardId: string
}

export interface UploadCardFileParams extends CardFileParams {
  file: Blob
  originalFileName?: string
  fileExtension?: string
  mimeType: string
}

export interface UploadCardPreviewParams extends CardFileParams {
  pdfBlob: Blob
}

export interface UploadCardThumbnailParams extends CardFileParams {
  thumbBlob: Blob
}

// ============================================================
// Constants
// ============================================================

const BUCKET_NAME = 'lovcore-files'
const SIGNED_URL_EXPIRY = 3600 // 1 hour
const MAX_RETRIES = 3
const BASE_DELAY_MS = 800

class StorageOperationError extends Error {
  statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'StorageOperationError'
    this.statusCode = statusCode
  }
}

// ============================================================
// Internal helpers
// ============================================================

function notConfiguredError(): { ok: false; error: string } {
  return { ok: false, error: 'Supabase not configured - running in local-only mode' }
}

function storagePath(userId: string, cardId: string, ...segments: string[]): string {
  return ['users', userId, 'cards', cardId, ...segments].join('/')
}

function safeFileExtension(extension: string | undefined, mimeType: string): string {
  const normalized = extension?.toLowerCase().replace(/^\./, '').replace(/[^a-z0-9]/g, '')
  if (normalized) return normalized.slice(0, 16)
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  if (mimeType.includes('plain')) return 'txt'
  return 'bin'
}

function originalObjectPath(userId: string, cardId: string, extension: string | undefined, mimeType: string): string {
  return storagePath(userId, cardId, 'original', `source.${safeFileExtension(extension, mimeType)}`)
}

function isRetryableStorageError(error: unknown): boolean {
  const statusCode = error instanceof StorageOperationError ? error.statusCode : undefined
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (statusCode) return statusCode >= 500 || statusCode === 408 || statusCode === 429
  if (
    lower.includes('invalid key')
    || lower.includes('400')
    || lower.includes('401')
    || lower.includes('403')
    || lower.includes('404')
    || lower.includes('not authorized')
    || lower.includes('permission')
  ) {
    return false
  }

  return lower.includes('network')
    || lower.includes('timeout')
    || lower.includes('fetch')
    || lower.includes('failed to fetch')
}

function storageError(error: { message?: string; statusCode?: string | number } | null | undefined): StorageOperationError {
  const rawStatus = error?.statusCode
  const statusCode = typeof rawStatus === 'string' ? Number(rawStatus) : rawStatus
  return new StorageOperationError(error?.message ?? 'Storage operation failed', Number.isFinite(statusCode) ? statusCode : undefined)
}

/**
 * Retry an async operation with exponential backoff.
 * Retries on network errors and 5xx responses, not on 4xx auth errors.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const errMsg = err instanceof Error ? err.message : String(err)
      if (!isRetryableStorageError(err)) {
        throw err
      }
      if (attempt < maxRetries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        console.warn(`[cloudFileStore] ${label} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, errMsg)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

// ============================================================
// Public API
// ============================================================

/**
 * Upload an original card file (image, PDF, DOCX, etc.) to Supabase Storage.
 *
 * Storage path: users/{userId}/cards/{cardId}/original/source.{ext}
 * Retries up to 3 times with exponential backoff on transient failures.
 */
export async function uploadCardFile(params: UploadCardFileParams): Promise<FileUploadResult> {
  if (!supabase) return notConfiguredError()

  const path = originalObjectPath(params.userId, params.cardId, params.fileExtension, params.mimeType)

  try {
    await withRetry(async () => {
      const { error } = await supabase!.storage
        .from(BUCKET_NAME)
        .upload(path, params.file, {
          contentType: params.mimeType,
          upsert: true,
        })
      if (error) throw storageError(error)
    }, `uploadCardFile(${params.cardId})`)

    await upsertFileRecord({
      userId: params.userId,
      cardId: params.cardId,
      storagePath: path,
      originalName: params.originalFileName ?? null,
      mimeType: params.mimeType,
      size: params.file.size,
    })

    return { ok: true, storagePath: path }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Upload a preview PDF (e.g. Office->PDF conversion result) to Supabase Storage.
 *
 * Storage path: users/{userId}/cards/{cardId}/preview/preview.pdf
 * Retries up to 3 times with exponential backoff on transient failures.
 */
export async function uploadCardPreview(params: UploadCardPreviewParams): Promise<FileUploadResult> {
  if (!supabase) return notConfiguredError()

  const path = storagePath(params.userId, params.cardId, 'preview', 'preview.pdf')

  try {
    await withRetry(async () => {
      const { error } = await supabase!.storage
        .from(BUCKET_NAME)
        .upload(path, params.pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        })
      if (error) throw storageError(error)
    }, `uploadCardPreview(${params.cardId})`)

    return { ok: true, storagePath: path }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Upload a card thumbnail image to Supabase Storage.
 *
 * Storage path: users/{userId}/cards/{cardId}/thumbnail/cover.webp
 * Retries up to 3 times with exponential backoff on transient failures.
 */
export async function uploadCardThumbnail(params: UploadCardThumbnailParams): Promise<FileUploadResult> {
  if (!supabase) return notConfiguredError()

  const path = storagePath(params.userId, params.cardId, 'thumbnail', 'cover.webp')

  try {
    await withRetry(async () => {
      const { error } = await supabase!.storage
        .from(BUCKET_NAME)
        .upload(path, params.thumbBlob, {
          contentType: params.thumbBlob.type || 'image/png',
          upsert: true,
        })
      if (error) throw storageError(error)
    }, `uploadCardThumbnail(${params.cardId})`)

    return { ok: true, storagePath: path }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Get a signed URL for a file in Supabase Storage.
 * Useful for displaying images/PDFs that are in a private bucket.
 *
 * @param path - The full storage path (e.g. "users/abc/cards/def/thumb/thumb.png")
 * @param expiresIn - URL expiry in seconds (default: 3600 = 1 hour)
 */
export async function getSignedFileUrl(
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY,
): Promise<SignedUrlResult> {
  if (!supabase) return notConfiguredError()

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn)

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to create signed URL' }
  }

  return { ok: true, url: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 }
}

/**
 * Download a private file from Supabase Storage.
 *
 * This is used as the durable fallback when an IndexedDB blob is missing
 * after refresh or on another browser/device.
 */
export async function downloadCardFile(path: string): Promise<FileDownloadResult> {
  if (!supabase) return notConfiguredError()

  try {
    return await withRetry(async () => {
      const { data, error } = await supabase!.storage
        .from(BUCKET_NAME)
        .download(path)

      if (error || !data) {
        throw storageError(error)
      }

      return { ok: true as const, blob: data }
    }, `downloadCardFile(${path})`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/**
 * Delete all files associated with a card from Supabase Storage.
 *
 * Lists all objects under users/{userId}/cards/{cardId}/ and removes them.
 * Also deletes the corresponding rows from the `files` table.
 */
export async function deleteCardFiles(userId: string, cardId: string): Promise<DeleteResult> {
  if (!supabase) return notConfiguredError()

  const prefix = storagePath(userId, cardId)

  // List all files under this card's prefix
  const { data: fileList, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix, { limit: 100 })

  if (listError) {
    return { ok: false, error: listError.message }
  }

  if (!fileList || fileList.length === 0) {
    // No files to delete - clean up DB records only
    await cleanupFileRecords(userId, cardId)
    return { ok: true, deletedPaths: [] }
  }

  // Build full paths for all files in all subdirectories
  const pathsToDelete: string[] = []

  // Storage list only returns top-level items in the prefix.
  // We need to list subdirectories (original/, preview/, thumb/) separately.
  for (const item of fileList) {
    if (item.id) {
      // It's a file at the card level
      pathsToDelete.push(`${prefix}/${item.name}`)
    } else {
      // It's a subdirectory - list its contents
      const { data: subFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`${prefix}/${item.name}`, { limit: 100 })

      if (subFiles) {
        for (const sub of subFiles) {
          if (sub.id) {
            pathsToDelete.push(`${prefix}/${item.name}/${sub.name}`)
          }
        }
      }
    }
  }

  if (pathsToDelete.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(pathsToDelete)

    if (removeError) {
      return { ok: false, error: removeError.message }
    }
  }

  // Clean up file metadata records
  await cleanupFileRecords(userId, cardId)

  return { ok: true, deletedPaths: pathsToDelete }
}

async function upsertFileRecord(params: {
  userId: string
  cardId: string
  storagePath: string
  originalName: string | null
  mimeType: string
  size: number
}): Promise<void> {
  if (!supabase) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('files') as any)
    .upsert({
      user_id: params.userId,
      card_id: params.cardId,
      storage_path: params.storagePath,
      original_name: params.originalName,
      mime_type: params.mimeType,
      size: params.size,
      width: null,
      height: null,
      duration: null,
    }, { onConflict: 'storage_path' })

  if (error) {
    console.warn('[cloudFileStore] Could not persist file metadata:', error.message)
  }
}

/**
 * Delete file metadata records from the `files` table for a given card.
 */
async function cleanupFileRecords(userId: string, cardId: string): Promise<void> {
  if (!supabase) return

  await supabase
    .from('files')
    .delete()
    .eq('user_id', userId)
    .eq('card_id', cardId)
}

/**
 * Get all file metadata records for a card.
 * Useful for cross-device recovery - query what files exist in the cloud.
 */
export async function getCardFileRecords(userId: string, cardId: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase not configured' }

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const, files: data ?? [] }
}
