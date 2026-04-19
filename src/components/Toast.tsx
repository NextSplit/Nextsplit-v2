'use client'

import { useState, useCallback, useEffect, createContext, useContext, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error:   (message: string, duration?: number) => void
  info:    (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { bg: string; icon: string; text: string }> = {
  success: { bg: 'bg-emerald-500', icon: '✓',  text: 'text-white' },
  error:   { bg: 'bg-red-500',     icon: '✕',  text: 'text-white' },
  info:    { bg: 'bg-[#0D9488]',   icon: 'ℹ',  text: 'text-white' },
  warning: { bg: 'bg-amber-500',   icon: '!',  text: 'text-white' },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const cfg = TOAST_CONFIG[toast.type]

  useEffect(() => {
    // Animate in
    const inTimer = setTimeout(() => setVisible(true), 10)
    // Auto-dismiss
    const outTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, toast.duration ?? 3500)

    return () => { clearTimeout(inTimer); clearTimeout(outTimer) }
  }, [toast, onDismiss])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${cfg.bg} ${cfg.text} transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ minWidth: 200, maxWidth: 340 }}
      onClick={() => onDismiss(toast.id)}
      role="alert"
      aria-live="polite"
    >
      <span className="text-base font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {cfg.icon}
      </span>
      <span className="text-sm font-medium leading-snug">{toast.message}</span>
    </div>
  )
}

// ─── Provider + Container ─────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++counterRef.current}`
    setToasts(prev => [...prev.slice(-3), { id, type, message, duration }]) // max 4 at once
  }, [])

  const ctx: ToastContextValue = {
    toast:   add,
    success: (m, d) => add(m, 'success', d),
    error:   (m, d) => add(m, 'error',   d),
    info:    (m, d) => add(m, 'info',    d),
    warning: (m, d) => add(m, 'warning', d),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container — sits above nav (80px), below modals */}
      <div
        className="fixed bottom-24 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-label="Notifications"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
