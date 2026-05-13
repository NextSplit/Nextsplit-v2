'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Character3D, { type CharState } from './Character3D'
import { RPG_CHARS } from '@/lib/rpg'

// PR J9a — Canvas wrapper that mounts a single Character3D with the lighting,
// camera, and (optionally) orbit controls. Callers consuming this in a real
// surface (HeroCard, RaceReplay) should `next/dynamic` import this component
// with `ssr: false` so the three.js bundle (~600 KB gz) is excluded from
// the initial route bundle.

interface Character3DCanvasProps {
  charId:    string             // 'm1' .. 'f3'
  kitHex:    string             // resolved kit colour (var() not allowed)
  state:     CharState          // idle | running | celebrating
  level?:    number
  size?:     number             // CSS pixels, square
  interactive?: boolean         // OrbitControls for dev preview
}

export default function Character3DCanvas({
  charId, kitHex, state, level, size = 200, interactive = false,
}: Character3DCanvasProps) {
  const ch = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]

  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0.2, 2.5], fov: 35 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Three-point lighting — key (front-right), fill (front-left),
            rim (behind). Tuned to read against the dark navy app background. */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[2,  3,  2]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-2, 2, 1]} intensity={0.5} color="#7DD3FC" />
        <directionalLight position={[0,  2, -3]} intensity={0.6} color={kitHex} />

        <Character3D
          body={ch.body}
          skinHex={ch.skin}
          hairHex={ch.hair}
          kitHex={kitHex}
          state={state}
          level={level}
        />

        {interactive && <OrbitControls enablePan={false} enableZoom={false} />}
      </Canvas>
    </div>
  )
}
