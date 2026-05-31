'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createAnalyzingItem, type IngestResolver } from '../lib/ingestion'
import { deleteStoredFile } from '../lib/fileStore'
import type { Item, ItemType } from '../types'
import { useTranslation } from '../i18n'

interface UseCardsOptions {
  onToast?: (message: string) => void
}

function mapDbToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    type: row.type as Item['type'],
    title: row.title as string,
    content: row.content as string,
    body: row.body as Item['body'],
    summary: row.summary as string,
    sourceUrl: row.source_url as string | undefined,
    fileSize: row.file_size as string | undefined,
    pageCount: row.page_count as number | undefined,
    duration: row.duration as string | undefined,
    thumbnail: row.thumbnail as string | undefined,
    colorPalette: row.color_palette as string[] | undefined,
    tags: (row.tags as string[]) || [],
    status: row.status as Item['status'],
    createdAt: row.created_at as string,
    noteBgColor: row.note_bg_color as string | undefined,
    keyClaims: row.key_claims as string[] | undefined,
    whyItMatters: row.why_it_matters as string | undefined,
  }
}

function mapItemToDb(item: Item, userId: string): Record<string, unknown> {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    title: item.title,
    content: item.content,
    body: item.body ?? null,
    summary: item.summary,
    source_url: item.sourceUrl ?? null,
    file_size: item.fileSize ?? null,
    page_count: item.pageCount ?? null,
    duration: item.duration ?? null,
    thumbnail: item.thumbnail ?? null,
    color_palette: item.colorPalette ?? null,
    tags: item.tags,
    status: item.status,
    created_at: item.createdAt,
    note_bg_color: item.noteBgColor ?? null,
    key_claims: item.keyClaims ?? null,
    why_it_matters: item.whyItMatters ?? null,
  }
}

export const useCards = ({ onToast }: UseCardsOptions = {}) => {
  const { t } = useTranslation()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  // Fetch cards from Supabase
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const fetchCards = async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (data && !error) {
        setItems(data.map(mapDbToItem))
      }
      setLoading(false)
    }

    fetchCards()
  }, [userId])

  const updateItem = useCallback(async (updatedItem: Item) => {
    // Optimistic update
    setItems((current) =>
      current.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    )

    // Persist to Supabase
    if (userId) {
      const supabase = createClient()
      const { error } = await supabase
        .from('cards')
        .update(mapItemToDb(updatedItem, userId))
        .eq('id', updatedItem.id)

      if (error) {
        console.error('Failed to update card:', error)
      }
    }
  }, [userId])

  const deleteItem = useCallback(async (id: string) => {
    // Optimistic update
    setItems((current) => current.filter((item) => item.id !== id))

    // Persist to Supabase
    if (userId) {
      const supabase = createClient()
      await supabase.from('cards').delete().eq('id', id)
    }

    // Clean up file storage
    deleteStoredFile(id).catch(() => {})
    onToast?.(t.app.inspirationRemoved)
  }, [userId, onToast, t])

  const triggerIngest = useCallback((
    type: ItemType,
    initialFields: Partial<Item>,
    resolve: IngestResolver,
  ) => {
    const tempItem = createAnalyzingItem(type, initialFields)

    // Optimistic insert
    setItems((current) => [tempItem, ...current])

    // Insert "analyzing" card into Supabase
    if (userId) {
      const supabase = createClient()
      supabase.from('cards').insert(mapItemToDb(tempItem, userId)).then(() => {})
    }

    // Resolve after simulated processing
    setTimeout(async () => {
      const resolved = await resolve(tempItem)
      const readyItem = { ...resolved, status: 'ready' as const }

      setItems((current) =>
        current.map((item) =>
          item.id === tempItem.id ? readyItem : item,
        ),
      )

      // Update Supabase with resolved card
      if (userId) {
        const supabase = createClient()
        await supabase
          .from('cards')
          .update(mapItemToDb(readyItem, userId))
          .eq('id', tempItem.id)
      }

      onToast?.(`${type.toUpperCase()} ${t.app.organizedBy}`)
    }, 2500)
  }, [userId, onToast, t])

  return {
    items,
    setItems,
    updateItem,
    deleteItem,
    triggerIngest,
    loading,
  }
}
