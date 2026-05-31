'use client'

import { useState } from 'react'
import { ContentCard } from '@/components/ContentCard'
import { CreateSpaceModal } from '@/components/CreateSpaceModal'
import { DetailDrawer } from '@/components/DetailDrawer'
import { DragZone } from '@/components/DragZone'
import { LandingPage } from '@/components/LandingPage'
import { MasonryWaterfall } from '@/components/MasonryWaterfall'
import { QuickNoteCard } from '@/components/QuickNoteCard'
import { SearchHeader, type VaultView } from '@/components/SearchHeader'
import { SerendipityView } from '@/components/SerendipityView'
import { SpacePills } from '@/components/SpacePills'
import { SpacesView } from '@/components/SpacesView'
import { createFileIngestDraft, createSearchSubmitDraft, isHttpUrl } from '@/lib/ingestion'
import { useCards } from '@/hooks/useCards'
import { useSearch } from '@/hooks/useSearch'
import { useSpaces } from '@/hooks/useSpaces'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import type { Item, LovcoreDocumentBody } from '@/types'
import { useTranslation } from '@/i18n'

function App() {
  const { t } = useTranslation()
  const [toast, setToast] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeView, setActiveView] = useState<VaultView>('stack')
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false)

  const { isDark, toggleTheme } = useTheme()
  const { user, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth()
  const {
    spaces,
    activeSpace,
    activeSpaceId,
    selectSpace,
    clearSpace,
    createManualSpace,
  } = useSpaces()

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const { items, updateItem, deleteItem, triggerIngest } = useCards({
    onToast: showToast,
  })

  const {
    searchValue,
    setSearchValue,
    selectedType,
    setSelectedType,
    resetFilters,
    filteredItems,
  } = useSearch(items, activeView === 'stack' ? activeSpace : undefined)

  const handleSelectCard = (item: Item) => {
    setSelectedItem(item)
    setIsDrawerOpen(true)
  }

  const handleUpdateItem = (updatedItem: Item) => {
    updateItem(updatedItem)

    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem)
    }
  }

  const handleDeleteCard = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()

    if (selectedItem?.id === id) {
      setIsDrawerOpen(false)
      setSelectedItem(null)
    }

    deleteItem(id)
  }

  const handleFileDrop = (file: File) => {
    const draft = createFileIngestDraft(file, (textDraft) => {
      triggerIngest(textDraft.type, textDraft.initialFields, textDraft.resolve)
    })

    if (draft) {
      triggerIngest(draft.type, draft.initialFields, draft.resolve)
    }
  }

  const handleSaveQuickNote = (content: string, body?: LovcoreDocumentBody) => {
    triggerIngest(
      'note',
      {
        content,
        title: t.quickNote.newNote,
      },
      (item) => {
        const titleSnippet = content.length > 34 ? `${content.slice(0, 34)}...` : content
        return {
          ...item,
          content,
          body,
          title: titleSnippet,
          summary: `${t.quickNote.newNote}: "${content}"`,
          tags: ['note', 'capture', 'quick-note'],
          noteBgColor: 'rgba(238, 233, 224, 0.65)',
        }
      },
    )
  }

  const handleResetWorkspace = () => {
    clearSpace()
    resetFilters()
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const val = searchValue.trim()
    if (!val || !isHttpUrl(val)) return

    const draft = createSearchSubmitDraft(val)
    triggerIngest(draft.type, draft.initialFields, draft.resolve)
    setSearchValue('')
  }

  const handleOpenSpace = (spaceId: string) => {
    selectSpace(spaceId)
    setActiveView('stack')
    resetFilters()
  }

  const handleCreateSpace = (name: string, color: string) => {
    const space = createManualSpace({ name, color })

    if (!space) return

    setActiveView('spaces')
    showToast(`${t.app.folioCreated}: ${space.name}`)
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="pulsing-circle" />
      </div>
    )
  }

  // Show landing page if not authenticated
  if (!user) {
    return (
      <LandingPage
        onEnter={() => {}}
        isDark={isDark}
        onThemeToggle={toggleTheme}
        signIn={signIn}
        signUp={signUp}
        signInWithGoogle={signInWithGoogle}
      />
    )
  }

  return (
    <div className="app-container fade-in-workspace">
      <DragZone onFileDrop={handleFileDrop} />

      <SearchHeader
        activeView={activeView}
        onViewChange={setActiveView}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedType={selectedType}
        onTypeSelect={setSelectedType}
        isDark={isDark}
        onThemeToggle={toggleTheme}
        onExitVault={signOut}
        onResetFilters={handleResetWorkspace}
        onKeyDown={handleSearchKeyDown}
      />

      {activeView === 'stack' && (
        <>
          <SpacePills
            spaces={spaces}
            activeSpaceId={activeSpaceId}
            onSelectSpace={selectSpace}
          />

          {filteredItems.length > 0 ? (
            <MasonryWaterfall>
              <QuickNoteCard onSaveNote={handleSaveQuickNote} />
              {filteredItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onSelect={handleSelectCard}
                  onDelete={handleDeleteCard}
                />
              ))}
            </MasonryWaterfall>
          ) : (
            <div className="empty-state">
              <h2 className="empty-title">
                {searchValue ? t.app.noSearchResults : t.app.emptyTitle}
              </h2>
              <p className="empty-subtitle">
                {searchValue
                  ? t.app.noSearchHint
                  : t.app.emptyDesc}
              </p>
            </div>
          )}
        </>
      )}

      {activeView === 'spaces' && (
        <SpacesView
          spaces={spaces}
          items={items}
          onCreateSpace={() => setIsCreateSpaceOpen(true)}
          onOpenSpace={handleOpenSpace}
        />
      )}

      {activeView === 'serendipity' && (
        <SerendipityView
          items={items}
          onSelectCard={handleSelectCard}
        />
      )}

      <CreateSpaceModal
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onCreate={handleCreateSpace}
      />

      <DetailDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateItem={handleUpdateItem}
      />

      <div className={`toast-alert ${toast ? 'show' : ''}`}>
        {toast}
      </div>
    </div>
  )
}

export default App
