'use client'

import React from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  label?: string
}

interface State {
  hasError: boolean
  error: Error | null
  eventId: string | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, eventId: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary: ${this.props.label ?? 'unknown'}]`, error, info)
    const eventId = Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
      tags: { boundary: this.props.label ?? 'unknown' },
    })
    this.setState({ eventId })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[40vh] flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Something went wrong</p>
            <p className="text-xs text-gray-400 mb-4">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null, eventId: null })}
                className="px-4 py-2 bg-[var(--ns-ember)] text-white text-sm font-semibold rounded-xl"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = '/today' }}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl"
              >
                Go home
              </button>
            </div>
            {this.state.eventId && (
              <p className="text-xs text-gray-300 mt-3">ID: {this.state.eventId}</p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/** Convenience wrapper for page-level boundaries */
export function PageErrorBoundary({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <ErrorBoundary label={name}>
      {children}
    </ErrorBoundary>
  )
}
