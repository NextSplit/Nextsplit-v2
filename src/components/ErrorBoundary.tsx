'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  label?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this would go to Sentry / error monitoring
    console.error(`[ErrorBoundary: ${this.props.label ?? 'unknown'}]`, error, info)
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
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-[#0D9488] text-white text-sm font-semibold rounded-xl"
            >
              Try again
            </button>
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
