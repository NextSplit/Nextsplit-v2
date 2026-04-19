'use client'

import { useState } from 'react'

function StatBar({ label, value, colour, tip }: {
  label: string; value: number; colour: string; tip: string
}) {
  const [showTip, setShowTip] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowTip(s => !s)}
        className="text-[10px] text-gray-400 w-16 flex-shrink-0 text-left hover:text-gray-600 transition-colors"
      >
        {label} <span className="text-[8px] text-gray-300">ⓘ</span>
      </button>
      <div className="flex-1 h-2 bg-gray-100/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[10px] font-black w-6 text-right ${colour.replace('bg-', 'text-')}`}>{value}</span>
      {showTip && (
        <div className="absolute mt-6 ml-16 z-10 bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 max-w-[180px] shadow-lg">
          {tip}
        </div>
      )}
    </div>
  )
}


export default StatBar
