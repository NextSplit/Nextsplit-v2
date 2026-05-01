import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNavWrapper from '@/components/BottomNavWrapper'
import { ToastProvider } from '@/components/Toast'
import ThemeWrapper from '@/components/ThemeWrapper'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { Analytics } from '@vercel/analytics/next'
import CookieConsentBanner from '@/components/CookieConsentBanner'

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
  themeColor: 'var(--ns-cyan)',
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('nextsplit_dark_mode');if(s===null){localStorage.setItem('nextsplit_dark_mode','true');s='true';}if(s!=='false'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`
          }}
        />
      </head>
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0 }}>
        <ThemeWrapper>
          <ToastProvider>
            {children}
            <BottomNavWrapper />
            <PWAInstallPrompt />
            <ServiceWorkerRegistrar />
            <Analytics />
            <CookieConsentBanner />
          </ToastProvider>
        </ThemeWrapper>
      </body>
    </html>
  )
}
