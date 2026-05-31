'use client'

/**
 * Supabase Storage-based file storage for Lovcore.
 *
 * Stores file blobs in Supabase Storage so images survive across devices.
 * Items reference files via `supabase://<itemId>` in the thumbnail field.
 */

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

const BUCKET = 'files'

export const FILE_REF_PREFIX = 'supabase://'

export function isFileRef(value: string | undefined): boolean {
  return !!value && value.startsWith(FILE_REF_PREFIX)
}

export function fileRefKey(value: string): string {
  return value.slice(FILE_REF_PREFIX.length)
}

export function makeFileRef(itemId: string): string {
  return `${FILE_REF_PREFIX}${itemId}`
}

export async function storeFile(key: string, blob: Blob): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, blob, { upsert: true })

  if (error) throw error
}

export async function loadFileUrl(key: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 3600)

  return data?.signedUrl ?? null
}

export async function deleteStoredFile(key: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([key])
}

/**
 * Resolves a thumbnail value to a displayable URL.
 * If the value is a `supabase://` reference, loads a signed URL from Supabase Storage.
 * Otherwise returns the value as-is (external URL, blob URL, etc.).
 */
export function useFileUrl(ref: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(
    isFileRef(ref) ? undefined : ref
  )

  useEffect(() => {
    if (!ref || !isFileRef(ref)) {
      setUrl(ref)
      return
    }

    let revoked = false

    loadFileUrl(fileRefKey(ref)).then((signedUrl) => {
      if (!revoked) {
        setUrl(signedUrl ?? undefined)
      }
    })

    return () => {
      revoked = true
    }
  }, [ref])

  return url
}
