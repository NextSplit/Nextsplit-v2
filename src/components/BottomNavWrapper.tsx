'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const APP_PATHS = [
  '/home', '/train', '/explore', '/you',
  '/coach', '/plan', '/today', '/profile', '/community',
  '/squad', '/nutrition', '/dashboard', '/marketplace', '/history',
  '/races', '/gym', '/settings',
]

export default function BottomNavWrapper() {
  const pathname = usePathname()
  const show = APP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!show) return null
  return <BottomNav />
}
