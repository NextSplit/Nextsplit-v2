import { Metadata } from 'next'
import InventoryClient from './InventoryClient'

export const metadata: Metadata = {
  title: 'Inventory · NextSplit',
  description: 'Your boosts and cosmetic items.',
}

export default function InventoryPage() {
  return <InventoryClient />
}
