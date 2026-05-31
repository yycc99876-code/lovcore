'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Lock, Moon, Sun } from 'lucide-react';
import { LogoIcon } from './LogoIcon';
import type { CardTypeFilter } from '../types';
import { useTranslation } from '../i18n';

export type VaultView = 'stack' | 'spaces' | 'serendipity';

interface SearchHeaderProps {
  activeView: VaultView;
  onViewChange: (view: VaultView) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedType: CardTypeFilter;
  onTypeSelect: (type: CardTypeFilter) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onExitVault?: () => void;
  onResetFilters?: () => void;
}

const TYPE_FILTERS: Array<{ type: CardTypeFilter; labelKey: 'images' | 'documents' | 'notes' | 'videos' | 'articles' | 'links' }> = [
  { type: 'image', labelKey: 'images' },
  { type: 'pdf', labelKey: 'documents' },
  { type: 'note', labelKey: 'notes' },
  { type: 'video', labelKey: 'videos' },
  { type: 'article', labelKey: 'articles' },
  { type: 'link', labelKey: 'links' },
];

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  activeView,
  onViewChange,
  searchValue,
  onSearchChange,
  selectedType,
  onTypeSelect,
  isDark,
  onThemeToggle,
  onKeyDown,
  onExitVault,
  onResetFilters,
}) => {
  const { t, locale, toggleLocale } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const bigInputRef = useRef<HTMLInputElement>(null);
  const smallInputRef = useRef<HTMLInputElement>(null);

  const shouldShowSearchTools = activeView === 'stack' && (isSearchFocused || searchValue.trim() || selectedType !== 'all');

  useEffect(() => {
    const handleScroll = () => {
      setIsCollapsed(window.scrollY > 160);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const wasBigFocused = document.activeElement === bigInputRef.current;
    const wasSmallFocused = document.activeElement === smallInputRef.current;

    if (isCollapsed && wasBigFocused) {
      setTimeout(() => smallInputRef.current?.focus({ preventScroll: true }), 50);
    } else if (!isCollapsed && wasSmallFocused) {
      setTimeout(() => bigInputRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [isCollapsed]);

  const handleLogoClick = () => {
    onViewChange('stack');
    onResetFilters?.();
  };

  const handleNavClick = (view: VaultView) => {
    onViewChange(view);
    if (view !== 'stack') {
      onResetFilters?.();
    }
  };

  const renderTopNav = (compact = false) => (
    <nav className={compact ? 'vault-nav compact' : 'vault-nav'} aria-label="Lovcore views">
      {(['stack', 'spaces', 'serendipity'] as VaultView[]).map((view) => (
        <button
          key={view}
          className={`vault-nav-btn ${activeView === view ? 'active' : ''}`}
          onClick={() => handleNavClick(view)}
        >
          {view === 'stack' ? t.header.theStack : view === 'spaces' ? t.header.folios : t.header.echoes}
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`header-wrapper ${isCollapsed ? 'is-collapsed' : ''}`}>
      <header className={`header-content ${activeView !== 'stack' ? 'section-mode' : ''}`}>
        <div className="top-bar">
          <div className="logo-container" onClick={handleLogoClick}>
            <LogoIcon size={40} className="header-logo-icon" />
            <span className="logo-text">LOVCORE</span>
          </div>

          <div className="top-right-cluster">
            {renderTopNav()}
            <div className="controls-group-expanded">
              <button
                className="icon-btn locale-toggle-btn"
                onClick={toggleLocale}
                title={locale === 'en' ? 'Switch to Chinese' : '切换至英文'}
                aria-label="Toggle Language"
              >
                {locale === 'en' ? '中' : 'EN'}
              </button>
              <button
                className="icon-btn"
                onClick={onThemeToggle}
                title={isDark ? t.header.themeLight : t.header.themeDark}
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {onExitVault && (
                <button
                  className="icon-btn"
                  onClick={onExitVault}
                  title={t.header.lockVault}
                  aria-label="Lock Vault"
                >
                  <Lock size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeView === 'stack' && (
          <div className="expanded-body">
            <div className="search-container">
              <input
                ref={bigInputRef}
                type="text"
                className="search-input"
                placeholder={t.header.searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                onKeyDown={onKeyDown}
              />
            </div>

            {shouldShowSearchTools && (
              <div className="search-type-toolbar">
                <button
                  className={`search-type-chip ${selectedType === 'all' ? 'active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onTypeSelect('all')}
                >
                  {t.header.allFilter}
                </button>
                {TYPE_FILTERS.map(({ type, labelKey }) => (
                  <button
                    key={type}
                    className={`search-type-chip ${selectedType === type ? 'active' : ''}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onTypeSelect(type)}
                  >
                    {t.header[labelKey]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      <div className={`sticky-header ${isCollapsed ? 'is-visible' : ''}`}>
        <div className="sticky-header-content">
          <div className="logo-container" onClick={handleLogoClick}>
            <LogoIcon size={30} className="header-logo-icon" />
            <span className="logo-text-compact">LOVCORE</span>
          </div>

          {activeView === 'stack' ? (
            <div className="compact-search-container">
              <input
                ref={smallInputRef}
                type="text"
                className="compact-search-input"
                placeholder={t.header.searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={onKeyDown}
              />
            </div>
          ) : (
            <div className="compact-section-title">
              {activeView === 'spaces' ? t.header.allFolios : t.header.echoes}
            </div>
          )}

          <div className="sticky-right-cluster">
            {renderTopNav(true)}
            <div className="controls-group-compact">
              <button
                className="icon-btn locale-toggle-btn"
                onClick={toggleLocale}
                title={locale === 'en' ? 'Switch to Chinese' : '切换至英文'}
                aria-label="Toggle Language"
              >
                {locale === 'en' ? '中' : 'EN'}
              </button>
              <button
                className="icon-btn"
                onClick={onThemeToggle}
                title={isDark ? t.header.themeLight : t.header.themeDark}
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {onExitVault && (
                <button
                  className="icon-btn"
                  onClick={onExitVault}
                  title={t.header.lockVault}
                  aria-label="Lock Vault"
                >
                  <Lock size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
