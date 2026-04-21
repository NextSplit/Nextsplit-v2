'use client'

import { useState } from 'react'
import {
  RPG_CHARS, RPG_BADGES, RPG_LEVELS, RARITY_CONFIG, SESSION_XP,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'

function CharSelectModal({
  currentCharId, currentLevel, onSelect, onClose
}: {
  currentCharId: string
  currentLevel: number
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState(currentCharId)
  const [previewLevel, setPreviewLevel] = useState(currentLevel)

  const PREVIEW_LEVELS = [1, 4, 7, 10, 14]

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <h2 className="text-lg font-black text-gray-900 mb-1">Choose your runner</h2>
          <p className="text-xs text-gray-400 mb-4">Your character evolves as you level up</p>

          {/* Level evolution preview */}
          <div className="bg-gray-50 rounded-2xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Level preview</span>
              <div className="flex gap-1">
                {PREVIEW_LEVELS.map(l => (
                  <button key={l} onClick={() => setPreviewLevel(l)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${previewLevel === l ? 'bg-[var(--ns-forest)] text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                    L{l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div dangerouslySetInnerHTML={{ __html: renderCharSVG(selected, previewLevel, 80, 100) }} />
            </div>
            <div className="text-center text-[10px] text-gray-400 mt-1">
              {previewLevel >= 9 ? '🎽 Race bib' : previewLevel >= 6 ? '🕶️ Sunglasses' : previewLevel >= 3 ? '⌚ GPS watch' : 'Base kit'}
              {previewLevel >= 7 ? ' · Full stride' : previewLevel >= 4 ? ' · Light stride' : ''}
            </div>
          </div>

          {/* Character grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {RPG_CHARS.map(ch => {
              const isSel = selected === ch.id
              return (
                <button key={ch.id}
                  onClick={() => setSelected(ch.id)}
                  className={`rounded-2xl border-2 p-3 text-center transition-all ${isSel ? 'border-[var(--ns-forest)] bg-[var(--ns-forest-light)] shadow-md' : 'border-gray-100 bg-white'}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderCharSVG(ch.id, previewLevel, 60, 76) }} />
                  <div className={`text-xs font-bold mt-1 ${isSel ? 'text-[var(--ns-forest)]' : 'text-gray-700'}`}>{ch.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{ch.specialty}</div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button onClick={() => { onSelect(selected); onClose() }}
              className="flex-1 py-3 rounded-xl bg-[var(--ns-forest)] text-white text-sm font-bold">
              Select character
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default CharSelectModal
