import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild(): React.ReactNode {
  throw new Error('Test crash');
}

function SafeChild(): React.ReactNode {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went quiet')).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
    expect(screen.getByText('Copy Error')).toBeInTheDocument();

    spy.mockRestore();
  });

  it('calls onError callback when child throws', () => {
    const onError = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('Test crash');

    spy.mockRestore();
  });
});
