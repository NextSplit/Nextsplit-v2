/**
 * Splity — NextSplit's coach character
 * A friendly running shoe with a face. Simple, distinctive, brand-ownable.
 * Appears in: TodayHeader, empty states, notifications, achievements
 */

interface SplityProps {
  size?: number
  mood?: 'default' | 'happy' | 'encouraging' | 'celebrating'
  className?: string
}

export default function Splity({ size = 32, mood = 'default', className = '' }: SplityProps) {
  const eyeY = mood === 'happy' || mood === 'celebrating' ? 13 : 15
  const mouthPath = mood === 'happy' || mood === 'celebrating'
    ? 'M 11 19 Q 16 23 21 19'   // big smile
    : mood === 'encouraging'
    ? 'M 12 20 Q 16 22 20 20'   // gentle smile
    : 'M 12 19 Q 16 21 20 19'   // slight smile

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Splity the coach"
    >
      {/* Shoe body — rounded, friendly */}
      <ellipse cx="16" cy="22" rx="13" ry="7" fill="#c49a3c" />
      {/* Sole */}
      <ellipse cx="16" cy="25" rx="13" ry="4" fill="#a8832a" />
      {/* Shoe upper */}
      <path d="M 4 22 Q 4 10 16 10 Q 28 10 28 22" fill="#e8c45a" />
      {/* Laces */}
      <line x1="10" y1="17" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="19.5" y2="19.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Lace cross detail */}
      <line x1="13" y1="15" y2="17" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="19" y1="15" y2="17" stroke="white" strokeWidth="1.2" strokeLinecap="round" />

      {/* Face */}
      {/* Eyes */}
      <circle cx="12" cy={eyeY} r="2" fill="#1a1a18" />
      <circle cx="20" cy={eyeY} r="2" fill="#1a1a18" />
      {/* Eye shine */}
      <circle cx="12.7" cy={eyeY - 0.7} r="0.6" fill="white" />
      <circle cx="20.7" cy={eyeY - 0.7} r="0.6" fill="white" />
      {/* Happy squint lines */}
      {(mood === 'happy' || mood === 'celebrating') && (
        <>
          <path d="M 10 12 Q 12 10.5 14 12" stroke="#1a1a18" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M 18 12 Q 20 10.5 22 12" stroke="#1a1a18" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* Mouth */}
      <path d={mouthPath} stroke="#1a1a18" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Celebration stars */}
      {mood === 'celebrating' && (
        <>
          <text y="8" fontSize="6">✨</text>
          <text y="6" fontSize="5">⭐</text>
        </>
      )}

      {/* Motion lines when encouraging */}
      {mood === 'encouraging' && (
        <>
          <line x1="1" y1="20" y2="20" stroke="#e85d26" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="1" y1="23" y2="23" stroke="#e85d26" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        </>
      )}
    </svg>
  )
}
