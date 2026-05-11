// Session colour system + getCol lookup. Lifted from TrainClient during
// R2 god-component decomp. Kept as a non-tsx module so future Train tests
// can import without pulling in JSX.

export const SESSION_COLOURS: Record<string, { gradient: string; tint: string; border: string; dot: string; label: string }> = {
  easy:     { gradient: 'linear-gradient(135deg,#16a34a,#15803d)', tint: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.3)',   dot: '#22c55e', label: 'Easy Run'  },
  tempo:    { gradient: 'linear-gradient(135deg,#ca8a04,#a16207)', tint: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.3)',   dot: '#eab308', label: 'Tempo'     },
  interval: { gradient: 'linear-gradient(135deg,#ea580c,#c2410c)', tint: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.3)',  dot: '#f97316', label: 'Intervals' },
  long:     { gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', tint: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.3)',  dot: '#3b82f6', label: 'Long Run'  },
  recovery: { gradient: 'linear-gradient(135deg,#059669,#047857)', tint: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.3)',  dot: '#4ade80', label: 'Recovery'  },
  gym:      { gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', tint: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.3)',  dot: '#8b5cf6', label: 'Strength'  },
  rest:     { gradient: 'linear-gradient(135deg,#6b7280,#4b5563)', tint: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', dot: '#9ca3af', label: 'Rest'      },
  race:     { gradient: 'linear-gradient(135deg,#db2777,#be185d)', tint: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.3)',  dot: '#ec4899', label: 'Race'      },
}

export function getCol(code: string | null | undefined) {
  if (!code) return SESSION_COLOURS.easy
  const c = code.toLowerCase()
  if (c.includes('tempo'))                           return SESSION_COLOURS.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_COLOURS.interval
  if (c.includes('long'))                            return SESSION_COLOURS.long
  if (c.includes('recovery'))                        return SESSION_COLOURS.recovery
  if (c.includes('gym') || c.includes('strength'))   return SESSION_COLOURS.gym
  if (c.includes('race'))                            return SESSION_COLOURS.race
  return SESSION_COLOURS.easy
}
