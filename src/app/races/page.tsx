import { redirect } from 'next/navigation'

// Races are now embedded in the Stats tab (📊 Stats → 🏁 Races)
export default function RacesRedirect() {
  redirect('/dashboard')
}
