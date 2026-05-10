import { Metadata } from 'next'
import InventoryClient from './InventoryClient'

export const metadata: Metadata = {
  title: 'Inventory · NextSplit',
  description: 'Your boosts and cosmetic items.',
}

// useSearchParams in InventoryClient requires dynamic rendering — skip
// static prerender. Page is auth-gated anyway, no SEO benefit to static.
export const dynamic = 'force-dynamic'

export default function InventoryPage() {
  return <InventoryClient />
}
