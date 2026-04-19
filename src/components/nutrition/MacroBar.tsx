'use client'



function MacroBar({ label, actual, target, colour }: {
  label: string; actual: number; target: number; colour: string
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 110) : 0
  const over = pct > 100
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className={`font-bold ${over ? 'text-red-500' : 'text-gray-700'}`}>
          {Math.round(actual)}{label === 'kcal' ? '' : 'g'}
          {target > 0 && <span className="font-normal text-gray-400">/{Math.round(target)}</span>}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : colour}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Recipe Form Modal ─────────────────────────────────────────────────────


export default MacroBar
