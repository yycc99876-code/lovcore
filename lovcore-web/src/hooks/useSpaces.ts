'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { defaultSpaces } from '../data/spaces'
import type { CardTypeFilter, LovcoreSpace } from '../types'

interface SpaceDraft {
  query: string
  selectedType: CardTypeFilter
  activeTags: string[]
}

interface ManualSpaceDraft {
  name: string
  color: string
}

const ALL_SPACE_ID = 'space-all'

function mapDbToSpace(row: Record<string, unknown>): LovcoreSpace {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as LovcoreSpace['type'],
    system: row.system as boolean | undefined,
    color: row.color as string | undefined,
    description: row.description as string | undefined,
    query: row.query as string | undefined,
    selectedType: row.selected_type as CardTypeFilter | undefined,
    tags: (row.tags as string[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapSpaceToDb(space: LovcoreSpace, userId: string): Record<string, unknown> {
  return {
    id: space.id,
    user_id: userId,
    name: space.name,
    type: space.type,
    system: space.system ?? false,
    color: space.color ?? null,
    description: space.description ?? null,
    query: space.query ?? null,
    selected_type: space.selectedType ?? null,
    tags: space.tags,
    created_at: space.createdAt,
    updated_at: space.updated_at,
  }
}

const createSpaceName = ({ query, selectedType, activeTags }: SpaceDraft) => {
  if (query.trim()) return query.trim()
  if (activeTags.length > 0) return activeTags.map((tag) => `#${tag}`).join(' ')
  if (selectedType !== 'all') return `${selectedType} archive`
  return 'Untitled Space'
}

export const useSpaces = () => {
  const [spaces, setSpaces] = useState<LovcoreSpace[]>([])
  const [activeSpaceId, setActiveSpaceId] = useState(ALL_SPACE_ID)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [])

  // Fetch spaces from Supabase, seed defaults if empty
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const fetchSpaces = async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch spaces:', error)
        return
      }

      if (data && data.length > 0) {
        setSpaces(data.map(mapDbToSpace))
      } else {
        // First login: seed default spaces
        const now = new Date().toISOString()
        const seedSpaces = defaultSpaces.map((s) => ({
          ...s,
          createdAt: now,
          updatedAt: now,
        }))

        const { error: insertError } = await supabase
          .from('spaces')
          .insert(seedSpaces.map((s) => mapSpaceToDb(s, userId)))

        if (!insertError) {
          setSpaces(seedSpaces)
        }
      }
    }

    fetchSpaces()
  }, [userId])

  const activeSpace = useMemo(
    () => spaces.find((space) => space.id === activeSpaceId) ?? spaces[0],
    [activeSpaceId, spaces],
  )

  const selectSpace = (spaceId: string) => setActiveSpaceId(spaceId)
  const clearSpace = () => setActiveSpaceId(ALL_SPACE_ID)

  const saveSmartSpace = useCallback(async (draft: SpaceDraft) => {
    const query = draft.query.trim()
    const selectedType = draft.selectedType
    const tags = [...draft.activeTags]

    const hasMeaningfulFilter = query || selectedType !== 'all' || tags.length > 0
    if (!hasMeaningfulFilter) return null

    const now = new Date().toISOString()
    const newSpace: LovcoreSpace = {
      id: `user-space-${Date.now()}`,
      name: createSpaceName(draft),
      type: 'smart',
      description: 'Saved from the current search and filter state.',
      query,
      selectedType,
      tags,
      createdAt: now,
      updatedAt: now,
    }

    // Optimistic update
    setSpaces((prev) => [...prev, newSpace])
    setActiveSpaceId(newSpace.id)

    // Persist to Supabase
    if (userId) {
      const supabase = createClient()
      await supabase.from('spaces').insert(mapSpaceToDb(newSpace, userId))
    }

    return newSpace
  }, [userId])

  const createManualSpace = useCallback(async ({ name, color }: ManualSpaceDraft) => {
    const cleanName = name.trim()
    if (!cleanName) return null

    const now = new Date().toISOString()
    const newSpace: LovcoreSpace = {
      id: `user-space-${Date.now()}`,
      name: cleanName,
      type: 'smart',
      color,
      description: 'A user-created space. Add assignment rules later, or use it as a visual collection shell.',
      selectedType: 'all',
      tags: [],
      createdAt: now,
      updatedAt: now,
    }

    // Optimistic update
    setSpaces((prev) => [...prev, newSpace])
    setActiveSpaceId(newSpace.id)

    // Persist to Supabase
    if (userId) {
      const supabase = createClient()
      await supabase.from('spaces').insert(mapSpaceToDb(newSpace, userId))
    }

    return newSpace
  }, [userId])

  const deleteSpace = useCallback(async (spaceId: string) => {
    const space = spaces.find((item) => item.id === spaceId)
    if (!space || space.id === ALL_SPACE_ID || space.type === 'default' || space.system) return

    // Optimistic update
    setSpaces((prev) => prev.filter((item) => item.id !== spaceId))
    if (activeSpaceId === spaceId) setActiveSpaceId(ALL_SPACE_ID)

    // Persist to Supabase
    if (userId) {
      const supabase = createClient()
      await supabase.from('spaces').delete().eq('id', spaceId)
    }
  }, [spaces, activeSpaceId, userId])

  return {
    spaces,
    activeSpace,
    activeSpaceId,
    selectSpace,
    clearSpace,
    saveSmartSpace,
    createManualSpace,
    deleteSpace,
  }
}
