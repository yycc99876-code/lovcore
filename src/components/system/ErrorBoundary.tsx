'use client';

import React from 'react';
import en from '../../i18n/locales/en';
import zh from '../../i18n/locales/zh';

function getLocaleStrings() {
  try {
    const locale = localStorage.getItem('lovcore_locale') || 'en';
    return locale === 'zh' ? zh.app : en.app;
  } catch {
    return en.app;
  }
}

interface Props {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = () => {
    const { error, errorInfo } = this.state;
    const text = [
      error?.message ?? 'Unknown error',
      error?.stack ?? '',
      errorInfo?.componentStack ?? '',
    ].join('\n');

    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  };

  render() {
    if (this.state.hasError) {
      const t = getLocaleStrings();

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            background: 'var(--bg-primary, #faf9f6)',
            color: 'var(--text-primary, #1a1a1a)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              marginBottom: '0.5rem',
              opacity: 0.3,
            }}
          >
            &middot;&middot;&middot;
          </div>
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
              letterSpacing: '0.02em',
            }}
          >
            {t.errorTitle}
          </h2>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary, #666)',
              maxWidth: '360px',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            {t.errorDesc}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '6px',
                background: 'var(--bg-primary, #fff)',
                color: 'var(--text-primary, #1a1a1a)',
                cursor: 'pointer',
              }}
            >
              {t.errorReload}
            </button>
            <button
              onClick={this.handleCopy}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                border: '1px solid var(--border-color, #ddd)',
                borderRadius: '6px',
                background: 'transparent',
                color: 'var(--text-secondary, #666)',
                cursor: 'pointer',
              }}
            >
              {t.errorCopy}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
