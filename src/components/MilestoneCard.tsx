'use client'

import { useState } from 'react'
import Splity from '@/components/Splity'

interface Milestone {
  id:       string
  emoji:    string
  title:    string
  subtitle: string
  colour:   string
  xp:       number
}

interface Props {
  milestone: Milestone
  onDismiss: () => void
  onShare?:  () => void
}

export const MILESTONES: Record<string, Milestone> = {
  first_session: {
    id: 'first_session', emoji: '👟', colour: '#00d4ff',
    title: 'First session logged!', subtitle: 'The hardest step is starting.', xp: 50,
  },
  first_5k: {
    id: 'first_5k', emoji: '🏃', colour: '#00e676',
    title: 'First 5K logged!', subtitle: 'Your running journey begins.', xp: 100,
  },
  km_100: {
    id: 'km_100', emoji: '💯', colour: '#ffb800',
    title: '100km total!', subtitle: 'Century club — officially a runner.', xp: 200,
  },
  streak_7: {
    id: 'streak_7', emoji: '🔥', colour: '#ff7438',
    title: '7-day streak!', subtitle: 'A full week of consistency.', xp: 75,
  },
  streak_30: {
    id: 'streak_30', emoji: '🌟', colour: '#ff2d9e',
    title: '30-day streak!', subtitle: 'You\'re a habit machine.', xp: 300,
  },
  first_long: {
    id: 'first_long', emoji: '🏔️', colour: '#4d8aff',
    title: 'Longest run ever!', subtitle: 'New personal distance record.', xp: 150,
  },
}

export default function MilestoneCard({ milestone, onDismiss, onShare }: Props) {
  const [sharing, setSharing] = useState(false)

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onDismiss}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          background: `linear-gradient(145deg, #080b14, ${milestone.colour}15)`,
          border: `3px solid ${milestone.colour}`,
          boxShadow: `0 0 0 1px ${milestone.colour}15, 0 20px 60px ${milestone.colour}40`,
          animation: 'levelBurst 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
        <div className="p-8 text-center">
          {/* Emoji + Splity */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <span style={{ fontSize: 56, lineHeight: 1 }}>{milestone.emoji}</span>
            <Splity size={56} mood="celebrating" animate />
          </div>

          {/* Text */}
          <p className="text-[11px] font-black uppercase tracking-widest mb-2"
            style={{ color: milestone.colour }}>🎉 Milestone unlocked</p>
          <h2 className="text-2xl font-black mb-2"
            style={{ color: 'white', letterSpacing: '-0.03em' }}>
            {milestone.title}
          </h2>
          <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {milestone.subtitle}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-6"
            style={{ background: `${milestone.colour}20`, border: `2px solid ${milestone.colour}40` }}>
            <span className="text-sm font-black" style={{ color: milestone.colour }}>+{milestone.xp} XP</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onShare && (
              <button onClick={onShare}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '2px solid rgba(255,255,255,0.12)' }}>
                📤 Share
              </button>
            )}
            <button onClick={onDismiss}
              className="flex-1 py-3.5 rounded-2xl font-black text-sm"
              style={{ background: milestone.colour, color: '#0a0e1a', boxShadow: `0 4px 20px ${milestone.colour}50` }}>
              Keep going 🏃
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
