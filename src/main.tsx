import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { AuthProvider } from './providers/AuthProvider'
import { ErrorBoundary } from './components/system/ErrorBoundary'

// Sentry error monitoring — only activates when VITE_SENTRY_DSN is set
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
  })
}

// Global unhandled promise rejection handler — logs errors that would otherwise be silently lost
window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason);
  if (sentryDsn) {
    Sentry.captureException(event.reason);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
)
