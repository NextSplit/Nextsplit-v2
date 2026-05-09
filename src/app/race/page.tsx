import { Metadata } from 'next'
import RaceClient from './RaceClient'

export const metadata: Metadata = {
  title: 'Race · NextSplit',
  description: 'Daily races for your character — built from your training.',
}

export default function RacePage() {
  return <RaceClient />
}
