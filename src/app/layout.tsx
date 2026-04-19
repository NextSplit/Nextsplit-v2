import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNavWrapper from '@/components/BottomNavWrapper'
import { ToastProvider } from '@/components/Toast'
import ThemeWrapper from '@/components/ThemeWrapper'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: 'NextSplit — Intelligent Running Training',
  description: 'Personalised running plans, intelligent coaching and training analytics for every runner.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NextSplit',
    startupImage: '/icon-512.png',
  },
  icons: {
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
    ],
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': 'NextSplit',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0 }}>
        <ThemeWrapper>
          <ToastProvider>
            {children}
            <BottomNavWrapper />
            <PWAInstallPrompt />
            <ServiceWorkerRegistrar />
          </ToastProvider>
        </ThemeWrapper>
      </body>
    </html>
  )
}
