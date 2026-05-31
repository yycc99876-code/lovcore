import { useState, useEffect, useLayoutEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { ContentCard } from './components/ContentCard';
import { CreateSpaceModal, type SmartSpaceRuleData } from './components/CreateSpaceModal';
import { DetailDrawer } from './components/DetailDrawer';
import { DragZone } from './components/DragZone';
import { MasonryWaterfall } from './components/MasonryWaterfall';
import { QuickNoteCard } from './components/QuickNoteCard';
import { SearchHeader, type VaultView } from './components/SearchHeader';
import { SpacePills } from './components/SpacePills';
import { ErrorBoundary } from './components/system/ErrorBoundary';

const LandingPage = lazy(() => import('./components/landing').then(m => ({ default: m.LandingPage })));
const SerendipityView = lazy(() => import('./components/SerendipityView').then(m => ({ default: m.SerendipityView })));
const SpacesView = lazy(() => import('./components/SpacesView').then(m => ({ default: m.SpacesView })));
const FolioDetailView = lazy(() => import('./components/FolioDetailView').then(m => ({ default: m.FolioDetailView })));
import { createFileIngestDraft, createSearchSubmitDraft, isHttpUrl } from './lib/ingestion';
import { useCards } from './hooks/useCards';
import { useSearch } from './hooks/useSearch';
import { useSpaces } from './hooks/useSpaces';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import type { Item, LovcoreDocumentBody } from './types';
import { useTranslation } from './i18n';

const StackLoadingSkeleton = () => (
  <>
    {Array.from({ length: 8 }).map((_, index) => (
      <div className="masonry-item stack-loading-card" key={`stack-loading-${index}`}>
        <div className="stack-loading-media" />
        <div className="stack-loading-line stack-loading-line-long" />
        <div className="stack-loading-line stack-loading-line-short" />
      </div>
    ))}
  </>
);

function App() {
  const { t } = useTranslation();
  const [toast, setToast] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<VaultView>('stack');
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [serendipityStarted, setSerendipityStarted] = useState(false);

  const { isDark, toggleTheme } = useTheme();
  const { user, loading: authLoading, signOut, updatePassword } = useAuth();
  const isAuthenticated = !!user;

  // Detect Supabase auth callback from email confirmation / password reset links
  const [authCallback, setAuthCallback] = useState<'confirmed' | 'reset-password' | null>(() => {
    const hash = window.location.hash;
    if (!hash) return null;
    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');
    if (type === 'signup' || type === 'recovery') {
      window.history.replaceState(null, '', window.location.pathname);
      return type === 'signup' ? 'confirmed' : 'reset-password';
    }
    return null;
  });
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  useLayoutEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const scrollWorkspaceToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollWorkspaceToTop();
    const frame = window.requestAnimationFrame(scrollWorkspaceToTop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [authLoading, isAuthenticated]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const {
    spaces,
    activeSpace,
    activeSpaceId,
    selectSpace,
    clearSpace,
    createManualSpace,
    createSmartSpace,
    deleteSpace,
    loading: spacesLoading,
  } = useSpaces({ user, authLoading, onToast: showToast });

  const { items, updateItem, deleteItem, triggerIngest, loading: cardsLoading } = useCards({
    onToast: showToast,
    user,
    authLoading,
  });

  const {
    searchValue,
    setSearchValue,
    selectedType,
    setSelectedType,
    resetFilters,
    filteredItems,
  } = useSearch(items, activeView === 'stack' ? activeSpace : undefined);
  const showStackLoading = activeView === 'stack'
    && (cardsLoading || spacesLoading)
    && filteredItems.length === 0;

  // Detect browser extension clip parameter
  const clipProcessed = useRef(false);
  useEffect(() => {
    if (clipProcessed.current) return;
    if (authLoading || !isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const clipUrl = params.get('clip');
    if (!clipUrl || !isHttpUrl(clipUrl)) return;

    clipProcessed.current = true;

    const title = params.get('title') || undefined;
    const selectedText = params.get('text') || undefined;
    const tagsParam = params.get('tags') || undefined;
    const note = params.get('note') || undefined;
    const kind = params.get('kind') || undefined;
    const clipTags = tagsParam ? tagsParam.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];

    // A clip should be added to the full stack. Do not leave the UI in a folio/type/search filter.
    setActiveView('stack'); // eslint-disable-line react-hooks/set-state-in-effect
    selectSpace('space-all');
    resetFilters();

    // Clean up URL parameters to prevent re-processing on refresh
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    // Wait for screenshot from extension (injected script sends custom event)
    const waitForScreenshot = (): Promise<string | undefined> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(undefined), 2500);

        const handler = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (detail?.screenshot) {
            clearTimeout(timeout);
            window.removeEventListener('lovcore:clip-data', handler);
            resolve(detail.screenshot);
          }
        };
        window.addEventListener('lovcore:clip-data', handler);

        // Check if already set (injected before listener was ready)
        const w = window as unknown as Record<string, unknown>;
        if (w.__lovcoreClipScreenshot) {
          clearTimeout(timeout);
          window.removeEventListener('lovcore:clip-data', handler);
          const ss = w.__lovcoreClipScreenshot as string;
          delete w.__lovcoreClipScreenshot;
          resolve(ss);
        }
      });
    };

    // Trigger ingestion after getting screenshot
    waitForScreenshot().then((screenshot) => {
      setTimeout(() => {
        const draft = createSearchSubmitDraft(clipUrl, { title, selectedText, tags: clipTags, note, kind, screenshot });
        triggerIngest(draft.type, draft.initialFields, draft.resolve);
        showToast('Clipped from browser extension');
      }, 300);
    });
  }, [authLoading, isAuthenticated, resetFilters, selectSpace, triggerIngest, showToast]);

  const handleSelectCard = (item: Item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    updateItem(updatedItem);

    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleDeleteCard = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (selectedItem?.id === id) {
      setIsDrawerOpen(false);
      setSelectedItem(null);
    }

    deleteItem(id);
  };

  const handleFileDrop = (file: File, spaceId?: string) => {
    const wrapResolve = (resolve: (item: Item) => Item | Promise<Item>) =>
      spaceId
        ? (item: Item) => Promise.resolve(resolve(item)).then((r) => ({
            ...r,
            assignedSpaceIds: [...(r.assignedSpaceIds || []), spaceId],
          }))
        : resolve;

    const spaceFields: Partial<Item> = spaceId ? { assignedSpaceIds: [spaceId] } : {};

    const draft = createFileIngestDraft(file, (textDraft) => {
      triggerIngest(
        textDraft.type,
        { ...textDraft.initialFields, ...spaceFields },
        wrapResolve(textDraft.resolve),
      );
    });

    if (draft) {
      triggerIngest(
        draft.type,
        { ...draft.initialFields, ...spaceFields },
        wrapResolve(draft.resolve),
      );
    }
  };

  const handleSaveQuickNote = (
    content: string,
    bodyOrSpaceId?: LovcoreDocumentBody | string,
    noteBgColorOrSpaceId?: string,
    spaceId?: string,
  ) => {
    const body = typeof bodyOrSpaceId === 'object' ? bodyOrSpaceId : undefined;
    const isColorValue = typeof noteBgColorOrSpaceId === 'string'
      && (noteBgColorOrSpaceId.startsWith('rgba') || noteBgColorOrSpaceId.startsWith('#'));
    const noteBgColor = isColorValue ? noteBgColorOrSpaceId : undefined;
    const effectiveSpaceId = typeof bodyOrSpaceId === 'string'
      ? bodyOrSpaceId
      : (isColorValue ? spaceId : noteBgColorOrSpaceId);

    triggerIngest(
      'note',
      {
        content,
        title: t.quickNote.newNote,
      },
      (item) => {
        const titleSnippet = content.length > 34 ? `${content.slice(0, 34)}...` : content;
        return {
          ...item,
          content,
          body,
          title: titleSnippet,
          summary: `${t.quickNote.newNote}: "${content}"`,
          tags: ['note', 'capture', 'quick-note'],
          noteBgColor: noteBgColor || 'rgba(238, 233, 224, 0.78)',
          ...(effectiveSpaceId ? { assignedSpaceIds: [effectiveSpaceId] } : {}),
        };
      },
    );
  };

  const handleResetWorkspace = () => {
    clearSpace();
    resetFilters();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = searchValue.trim();
    if (!val || !isHttpUrl(val)) return;

    const draft = createSearchSubmitDraft(val);
    triggerIngest(draft.type, draft.initialFields, draft.resolve);
    setSearchValue('');
  };

  const handleOpenSpace = (spaceId: string) => {
    selectSpace(spaceId);
    setActiveView('folio-detail');
    resetFilters();
  };

  const handleBackFromFolio = () => {
    setActiveView('spaces');
    clearSpace();
    resetFilters();
  };

  const handleCreateSpace = (name: string, color: string) => {
    const space = createManualSpace({ name, color });

    if (!space) return;

    setActiveView('spaces');
    showToast(`${t.app.folioCreated}: ${space.name}`);
  };

  const handleCreateSmartSpace = (name: string, color: string, ruleData: SmartSpaceRuleData) => {
    const space = createSmartSpace({ name, color, ...ruleData });

    if (!space) return;

    setActiveView('spaces');
    showToast(`${t.app.folioCreated}: ${space.name}`);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-text">{t.auth.loading}</div>
      </div>
    );
  }

  // Email confirmation success
  if (authCallback === 'confirmed' && !isAuthenticated) {
    return (
      <div className="app-loading-screen" style={{ flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '2rem', opacity: 0.3 }}>✓</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t.auth.emailConfirmedTitle}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)', maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
          {t.auth.emailConfirmedDesc}
        </div>
        <button
          onClick={() => { setAuthCallback(null); }}
          style={{ marginTop: 8, padding: '8px 24px', fontSize: '0.85rem', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, background: 'var(--bg-primary, #fff)', cursor: 'pointer' }}
        >
          {t.auth.backToSignIn}
        </button>
      </div>
    );
  }

  // Password reset form
  if (authCallback === 'reset-password' && isAuthenticated) {
    const handlePasswordReset = async () => {
      if (newPassword.length < 6) { setResetError(t.auth.errorPasswordTooShort); return; }
      setResetLoading(true);
      setResetError(null);
      const { error } = await updatePassword(newPassword);
      setResetLoading(false);
      if (error) { setResetError(error); return; }
      setAuthCallback(null);
    };

    return (
      <div className="app-loading-screen" style={{ flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{t.auth.resetPasswordTitle}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)', maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
          {t.auth.resetPasswordDesc}
        </div>
        <input
          type="password"
          placeholder={t.auth.newPasswordPlaceholder}
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); setResetError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordReset(); }}
          style={{ padding: '8px 16px', fontSize: '0.9rem', border: '1px solid var(--border-color, #ddd)', borderRadius: 6, width: 280, background: 'var(--bg-primary, #fff)', color: 'var(--text-primary, #1a1a1a)' }}
          autoFocus
        />
        {resetError && <div style={{ fontSize: '0.8rem', color: '#e3594c' }}>{resetError}</div>}
        <button
          onClick={handlePasswordReset}
          disabled={resetLoading}
          style={{ marginTop: 4, padding: '8px 24px', fontSize: '0.85rem', border: 'none', borderRadius: 6, background: 'var(--accent, #1b1917)', color: '#fff', cursor: resetLoading ? 'default' : 'pointer', opacity: resetLoading ? 0.6 : 1 }}
        >
          {resetLoading ? '...' : t.auth.resetPasswordBtn}
        </button>
      </div>
    );
  }

  // Not authenticated: show landing page
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="app-loading-screen" />}>
          <LandingPage
            onEnter={() => {}}
            isDark={isDark}
            onThemeToggle={toggleTheme}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="app-container fade-in-workspace">
      {activeView !== 'folio-detail' && activeView !== 'serendipity' && <DragZone onFileDrop={handleFileDrop} />}

      {!(activeView === 'serendipity' && serendipityStarted) && <SearchHeader
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
      />}

      {activeView === 'stack' && (
        <div className="view-fade-in" key="stack">
          <SpacePills
            spaces={spaces}
            items={items}
            activeSpaceId={activeSpaceId}
            onSelectSpace={selectSpace}
            onCreateFolio={() => setIsCreateSpaceOpen(true)}
          />

          <MasonryWaterfall>
            <QuickNoteCard onSaveNote={handleSaveQuickNote} />
            {showStackLoading && <StackLoadingSkeleton />}
            {filteredItems.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onSelect={handleSelectCard}
                onDelete={handleDeleteCard}
              />
            ))}
          </MasonryWaterfall>

          {!showStackLoading && filteredItems.length === 0 && (
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
        </div>
      )}

      {activeView === 'spaces' && (
        <div className="view-fade-in" key="spaces">
          <Suspense fallback={null}>
            <SpacesView
              spaces={spaces}
              items={items}
              onCreateSpace={() => setIsCreateSpaceOpen(true)}
              onOpenSpace={handleOpenSpace}
              onDeleteSpace={deleteSpace}
            />
          </Suspense>
        </div>
      )}

      {activeView === 'folio-detail' && activeSpace && activeSpace.id !== 'space-all' && (
        <Suspense fallback={null}>
          <FolioDetailView
            space={activeSpace}
            items={items}
            onBack={handleBackFromFolio}
            onSelectCard={handleSelectCard}
            onDeleteCard={handleDeleteCard}
            onFileDrop={handleFileDrop}
            onSaveQuickNote={handleSaveQuickNote}
            onDeleteSpace={() => {
              deleteSpace(activeSpace.id);
              handleBackFromFolio();
            }}
          />
        </Suspense>
      )}

      {activeView === 'serendipity' && (
        <div className="view-fade-in" key="serendipity">
          <Suspense fallback={null}>
            <SerendipityView
              items={items}
              onSelectCard={handleSelectCard}
              onForgetCard={deleteItem}
              onBack={() => { setActiveView('stack'); setSerendipityStarted(false); }}
              onStarted={() => setSerendipityStarted(true)}
            />
          </Suspense>
        </div>
      )}

      <CreateSpaceModal
        isOpen={isCreateSpaceOpen}
        onClose={() => setIsCreateSpaceOpen(false)}
        onCreate={handleCreateSpace}
        onCreateSmart={handleCreateSmartSpace}
      />

      <DetailDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={(id) => {
          deleteItem(id);
          setSelectedItem(null);
        }}
        spaces={spaces}
      />

      <div className={`toast-alert ${toast ? 'show' : ''}`}>
        {toast}
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default App;
