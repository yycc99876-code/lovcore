'use client';

import React, { useState, useRef } from 'react';
import { 
  ArrowRight, 
  Lock, 
  Unlock, 
  Moon, 
  Sun, 
  FileText, 
  Sparkles, 
  UploadCloud, 
  MousePointer, 
  Database,
} from 'lucide-react';
import { SketchCat } from './SketchCat';
import { LogoIcon } from './LogoIcon';
import { useTranslation } from '../i18n';
import './LandingPage.css';

interface LandingPageProps {
  onEnter: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
}

interface TeaserItem {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'note';
  thumbnail?: string;
  status: 'analyzing' | 'ready';
  summary?: string;
  tags?: string[];
  colorPalette?: string[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnter,
  isDark,
  onThemeToggle,
  signIn,
  signUp,
  signInWithGoogle,
}) => {
  const { t, locale, toggleLocale } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isHoveredInput, setIsHoveredInput] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Drag and drop states for Cat tracking
  const [isDragging, setIsDragging] = useState(false);
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);
  const [pounceTrigger, setPounceTrigger] = useState(false);

  // Live sandbox cards
  const [teaserItems, setTeaserItems] = useState<TeaserItem[]>([]);

  // Scroll animations ref
  const featureSectionRef = useRef<HTMLDivElement>(null);

  // Focus effect for input
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragCoords({ x: e.clientX, y: e.clientY });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only turn off dragging if it leaves the main window/page
    if (e.relatedTarget === null) {
      setIsDragging(false);
      setDragCoords(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCoords(null);

    // Trigger cat pounce
    setPounceTrigger(true);
    setTimeout(() => setPounceTrigger(false), 500);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileIngest(files[0]);
    }
  };

  const handleFileIngest = (file: File) => {
    const id = Date.now().toString();
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    
    let itemType: 'image' | 'pdf' | 'note' = 'note';
    let thumbUrl: string | undefined;

    if (isImage) {
      itemType = 'image';
      thumbUrl = URL.createObjectURL(file);
    } else if (isPdf) {
      itemType = 'pdf';
    }

    const newTeaser: TeaserItem = {
      id,
      name: file.name,
      type: itemType,
      thumbnail: thumbUrl,
      status: 'analyzing'
    };

    setTeaserItems(prev => [newTeaser, ...prev]);

    // Simulate Lovcore AI pipeline on the landing page
    setTimeout(() => {
      setTeaserItems(prev => 
        prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              status: 'ready',
              summary: itemType === 'image'
                ? t.landing.aiExtracted
                : itemType === 'pdf'
                ? `${t.landing.aiDocParsed} '${file.name}'.`
                : t.landing.aiTextCaptured,
              tags: itemType === 'image' ? ['Visual DNA', 'Concept'] : itemType === 'pdf' ? ['Reading', 'Paper'] : ['Note', 'Vault'],
              colorPalette: itemType === 'image' ? ['#2D2E2B', '#E5E4DE', '#A18F7C'] : undefined
            };
          }
          return item;
        })
      );
    }, 2500);
  };

  const handleVaultAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEntering || !email || !password) return;

    setAuthError(null);
    setIsEntering(true);

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setAuthError(error);
      setIsEntering(false);
      return;
    }

    setIsUnlocked(true);
    setTimeout(() => {
      onEnter();
    }, 900);
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error);
  };

  // Scroll down trigger helper
  const scrollToFeatures = () => {
    featureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div 
      className={`landing-wrapper ${isDragging ? 'drag-active' : ''} ${isUnlocked ? 'vault-unlocked' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Header */}
      <header className="landing-header">
        <div className="landing-logo-container">
          <LogoIcon size={42} className="landing-logo-icon" />
          <span className="landing-logo-text">LOVCORE</span>
        </div>
        <div className="landing-actions">
          <button
            className="theme-toggle-btn locale-toggle-btn"
            onClick={toggleLocale}
            aria-label="Toggle Language"
          >
            {locale === 'en' ? '中' : 'EN'}
          </button>
          <button
            className="theme-toggle-btn"
            onClick={onThemeToggle}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Sections */}
      <main className="landing-content">
        
        {/* Section 1: Hero & Cat */}
        <section className="hero-section">
          <div className="hero-grid">
            
            {/* Left Brand Area */}
            <div className="brand-panel">
              <div className="category-tag">
                <Sparkles size={12} className="spark-icon" />
                <span>{t.landing.tagline}</span>
              </div>
              <h1 className="hero-title">
                {t.landing.heroTitle}<br />
                <span className="serif-italic">{t.landing.heroTitleItalic}</span>
              </h1>
              <p className="hero-desc">
                {t.landing.heroDesc}
              </p>

              {/* Login / Entry Form */}
              <form onSubmit={handleVaultAccess} className="vault-entry-form">
                <div
                  className={`input-container ${isHoveredInput ? 'focused' : ''}`}
                  onMouseEnter={() => setIsHoveredInput(true)}
                  onMouseLeave={() => setIsHoveredInput(false)}
                >
                  <div className="lock-icon-container">
                    {isUnlocked ? (
                      <Unlock size={18} className="lock-icon unlocked" />
                    ) : (
                      <Lock size={18} className="lock-icon" />
                    )}
                  </div>
                  <input
                    type="email"
                    placeholder={t.landing.emailPlaceholder || 'Email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="vault-password-input"
                    disabled={isEntering}
                    autoComplete="email"
                  />
                  <input
                    ref={inputRef}
                    type="password"
                    placeholder={t.landing.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="vault-password-input"
                    disabled={isEntering}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="submit"
                    className="enter-vault-btn"
                    disabled={isEntering}
                    aria-label="Enter Vault"
                  >
                    <span>{isSignUp ? (t.landing.signUpBtn || 'Sign Up') : t.landing.enterBtn}</span>
                    <ArrowRight size={16} className="arrow-icon" />
                  </button>
                </div>
                {authError && (
                  <div className="input-helper" style={{ color: '#e74c3c' }}>
                    {authError}
                  </div>
                )}
                <div className="input-helper">
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                  >
                    {isSignUp
                      ? (t.landing.switchToSignIn || 'Already have an account? Sign in')
                      : (t.landing.switchToSignUp || "Don't have an account? Sign up")}
                  </span>
                </div>
                <div className="input-helper">
                  {t.landing.inputHelper}
                </div>
                <button
                  type="button"
                  className="enter-vault-btn"
                  style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                  onClick={handleGoogleAuth}
                  disabled={isEntering}
                >
                  <span>{t.landing.googleAuth || 'Continue with Google'}</span>
                </button>
              </form>
            </div>

            {/* Right Interactive Mascot Area */}
            <div className="cat-panel">
              <div className="sketched-board">
                <div className="sketch-label">{t.landing.companionLabel}</div>
                <div className="sketch-canvas-wrapper">
                  <SketchCat 
                    isHoveringInput={isHoveredInput}
                    isDragging={isDragging}
                    dragCoords={dragCoords}
                    pounceTrigger={pounceTrigger}
                  />
                </div>
                <div className="sketch-footer">
                  <MousePointer size={12} className="indicator-icon animate-bounce" />
                  <span>{t.landing.mascotHint}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Ingestion Sandbox Teaser */}
          {teaserItems.length > 0 && (
            <div className="sandbox-teaser-container">
              <div className="sandbox-title-bar">
                <span className="sandbox-indicator pulse"></span>
                <h3>{t.landing.sandboxTitle}</h3>
              </div>
              <div className="teaser-grid">
                {teaserItems.map((item) => (
                  <div key={item.id} className={`teaser-card ${item.status}`}>
                    {item.status === 'analyzing' ? (
                      <div className="teaser-loader-content">
                        <div className="pulsing-circle"></div>
                        <div className="loader-text">
                          <p className="loader-title">{t.landing.ingesting} {item.name}</p>
                          <p className="loader-subtitle">{t.landing.aiAnalyzing}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="teaser-ready-content">
                        <div className="teaser-header">
                          {item.type === 'image' && item.thumbnail ? (
                            <div className="teaser-thumb-wrapper">
                              <img src={item.thumbnail} alt={item.name} className="teaser-thumb" />
                            </div>
                          ) : (
                            <div className="teaser-icon-wrapper">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="teaser-meta">
                            <span className="teaser-card-title">{item.name}</span>
                            <span className="teaser-card-type">{item.type.toUpperCase()}</span>
                          </div>
                        </div>
                        <p className="teaser-summary">{item.summary}</p>
                        <div className="teaser-tags">
                          {item.tags?.map((t, idx) => (
                            <span key={idx} className="teaser-tag">#{t}</span>
                          ))}
                        </div>
                        {item.colorPalette && (
                          <div className="teaser-palette">
                            {item.colorPalette.map((c, idx) => (
                              <span key={idx} className="color-swatch" style={{ backgroundColor: c }} title={c}></span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scroll Down Hint */}
          <div className="scroll-hint-container" onClick={scrollToFeatures}>
            <span className="scroll-text">{t.landing.exploreFeatures}</span>
            <div className="scroll-line"></div>
          </div>
        </section>

        {/* Section 2: Features Grid */}
        <section ref={featureSectionRef} className="features-section">
          <h2 className="section-title">
            {t.landing.featuresTitle}<br />
            <span className="serif-italic">{t.landing.featuresTitleItalic}</span>
          </h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">
                <UploadCloud size={24} />
              </div>
              <h3 className="feature-card-title">{t.landing.feature1Title}</h3>
              <p className="feature-card-desc">
                {t.landing.feature1Desc}
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <Sparkles size={24} />
              </div>
              <h3 className="feature-card-title">{t.landing.feature2Title}</h3>
              <p className="feature-card-desc">
                {t.landing.feature2Desc}
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box">
                <Database size={24} />
              </div>
              <h3 className="feature-card-title">{t.landing.feature3Title}</h3>
              <p className="feature-card-desc">
                {t.landing.feature3Desc}
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Global drag over indicator overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-box">
            <UploadCloud size={48} className="drag-icon animate-bounce" />
            <h2>{t.landing.dragDropTitle}</h2>
            <p>{t.landing.dragDropSubtitle}</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; 2026 Lovcore. {t.landing.footer}</p>
      </footer>
    </div>
  );
};
