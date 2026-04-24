'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

// Pages where the bottom nav should appear
const APP_PATHS = ['/home', '/train', '/nutrition', '/dashboard', '/profile', '/coach', '/marketplace', '/community']

export default function BottomNavWrapper() {
  const pathname = usePathname()
  const show = APP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!show) return null
  return <BottomNav />
}
