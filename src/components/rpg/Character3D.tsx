'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// PR J9a — 3D character foundation.
//
// Stub procedural humanoid built from primitives (capsule torso, sphere head,
// box limbs). Designed so a Mixamo-rigged glTF can drop in later without
// changing call-sites: see TODO in render() — when `/public/3d/character.glb`
// exists, swap the procedural mesh for a `useGLTF`-loaded skinned mesh.
//
// Animations are computed inline in useFrame as sin-wave offsets keyed on
// `state`. This avoids needing baked clip data for the foundation PR.

export type CharState = 'idle' | 'running' | 'celebrating'

interface BodyShape {
  height:    number
  width:     number
  shoulders: number
}

const BODY_SHAPES: Record<'lean' | 'stocky' | 'tall', BodyShape> = {
  lean:   { height: 1.70, width: 0.18, shoulders: 0.28 },
  stocky: { height: 1.65, width: 0.24, shoulders: 0.34 },
  tall:   { height: 1.85, width: 0.18, shoulders: 0.30 },
}

interface Character3DProps {
  body:       'lean' | 'stocky' | 'tall'
  skinHex:    string
  hairHex:    string
  kitHex:     string
  state:      CharState
  level?:     number
  /** PR J9c — level tier 0-3, controls aura intensity + kit trim metalness.
   *  Maps from RPG_LEVELS[].tier. */
  tier?:      0 | 1 | 2 | 3
  /** PR J9c — runner-class colour. When set, the aura tints to this colour
   *  instead of kit; kit material gets a faint emissive of the same hue. */
  classHex?:  string | null
}

export default function Character3D({
  body, skinHex, hairHex, kitHex, state, tier = 0, classHex,
}: Character3DProps) {
  const shape = BODY_SHAPES[body]

  // Refs for limbs the useFrame loop animates per-state.
  const root      = useRef<THREE.Group>(null)
  const leftArm   = useRef<THREE.Group>(null)
  const rightArm  = useRef<THREE.Group>(null)
  const leftLeg   = useRef<THREE.Group>(null)
  const rightLeg  = useRef<THREE.Group>(null)
  const aura      = useRef<THREE.Mesh>(null)

  // Materials memo'd so React Three Fiber doesn't recreate them every frame.
  // PR J9c — kit material picks up emissive of `classHex` (~10% intensity)
  // when the runner has a revealed class. Trim metalness ramps with tier.
  const mats = useMemo(() => {
    const trimMetal = [0.0, 0.15, 0.5, 0.9][tier] ?? 0.0
    const kitMat = new THREE.MeshStandardMaterial({
      color:     kitHex,
      roughness: 0.4,
      metalness: trimMetal,
    })
    if (classHex) {
      kitMat.emissive    = new THREE.Color(classHex)
      kitMat.emissiveIntensity = 0.10
    }
    // Trim colour for shoulder ring — gold at tier 3, silver at tier 2.
    const trimHex = tier === 3 ? '#FFD700' : tier === 2 ? '#C0C0C0' : kitHex
    return {
      skin: new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.6, metalness: 0.0 }),
      hair: new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.7, metalness: 0.0 }),
      kit:  kitMat,
      trim: new THREE.MeshStandardMaterial({ color: trimHex,  roughness: 0.25, metalness: 0.8 }),
      leg:  new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5, metalness: 0.0 }),
      aura: new THREE.MeshBasicMaterial({
        color:        classHex ?? kitHex,
        transparent:  true,
        opacity:      tier === 0 ? 0 : 0.18 + tier * 0.10,
        depthWrite:   false,
      }),
    }
  }, [skinHex, hairHex, kitHex, classHex, tier])

  useFrame((clock) => {
    const t = clock.clock.elapsedTime
    if (!root.current) return

    if (state === 'idle') {
      // Gentle breathing — body bobs ~3cm at 1Hz.
      root.current.position.y = Math.sin(t * 2) * 0.03
      // Arms at side, slight sway.
      if (leftArm.current)  leftArm.current.rotation.x  = Math.sin(t * 2)      * 0.08
      if (rightArm.current) rightArm.current.rotation.x = Math.sin(t * 2 + Math.PI) * 0.08
      if (leftLeg.current)  leftLeg.current.rotation.x  = 0
      if (rightLeg.current) rightLeg.current.rotation.x = 0

    } else if (state === 'running') {
      // 2 Hz stride, arms counter-swing 0.9 rad, legs 0.7 rad.
      const stride = Math.sin(t * 8)
      if (leftArm.current)  leftArm.current.rotation.x  =  stride * 0.9
      if (rightArm.current) rightArm.current.rotation.x = -stride * 0.9
      if (leftLeg.current)  leftLeg.current.rotation.x  = -stride * 0.7
      if (rightLeg.current) rightLeg.current.rotation.x =  stride * 0.7
      // Vertical bounce in sync with footstrikes.
      root.current.position.y = Math.abs(Math.sin(t * 8)) * 0.05

    } else if (state === 'celebrating') {
      // Arms up + V-jump.
      const jump = Math.max(0, Math.sin(t * 4))
      root.current.position.y = jump * 0.2
      if (leftArm.current)  leftArm.current.rotation.x  = -Math.PI / 2 + Math.sin(t * 6) * 0.2
      if (rightArm.current) rightArm.current.rotation.x = -Math.PI / 2 + Math.sin(t * 6 + Math.PI) * 0.2
      if (leftArm.current)  leftArm.current.rotation.z  =  0.3
      if (rightArm.current) rightArm.current.rotation.z = -0.3
      if (leftLeg.current)  leftLeg.current.rotation.x  = 0
      if (rightLeg.current) rightLeg.current.rotation.x = 0
    }

    // PR J9c — aura pulse for tier ≥ 1. Tier 3 pulses faster + brighter than
    // tier 1, so progression reads visibly even at rest.
    if (aura.current && tier > 0) {
      const pulseHz   = 0.5 + tier * 0.4
      const baseScale = 1 + tier * 0.15
      const swing     = 0.10 + tier * 0.05
      aura.current.scale.setScalar(baseScale + Math.sin(t * pulseHz * Math.PI) * swing)
      aura.current.rotation.y = t * 0.4
    }
  })

  // Dimensions in metres, scaled at the canvas level. Capsule torso is two
  // pieces (kit jersey upper, legs lower) so kit colour reads cleanly.
  const torsoH = shape.height * 0.35
  const legH   = shape.height * 0.45
  const armL   = shape.height * 0.40
  const headR  = 0.13

  return (
    // TODO J9a→J9b: when `/public/3d/character-${body}.glb` is added by
    // founder via Mixamo, replace this <group> body with:
    //   const { scene, animations } = useGLTF(`/3d/character-${body}.glb`)
    //   const { actions } = useAnimations(animations, scene)
    //   useEffect(() => { actions[state]?.reset().fadeIn(0.2).play() }, [state])
    //   return <primitive object={scene} />
    // Cosmetics (kit/aura) layer over the rigged model in J9c.
    <group ref={root} position={[0, -shape.height / 2, 0]}>
      {/* PR J9c — Aura halo: torus around the character's feet, tinted by
          runner-class colour (or kit if no class revealed). Pulses + spins
          via the useFrame loop above. tier 0 = invisible (opacity 0). */}
      {tier > 0 && (
        <mesh ref={aura} position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.aura}>
          <torusGeometry args={[shape.width * 1.8, 0.04, 12, 32]} />
        </mesh>
      )}

      {/* Head */}
      <group position={[0, shape.height - headR, 0]}>
        <mesh material={mats.skin}>
          <sphereGeometry args={[headR, 24, 24]} />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, headR * 0.45, 0]} material={mats.hair}>
          <sphereGeometry args={[headR * 1.02, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        </mesh>
      </group>

      {/* Torso (kit jersey) */}
      <mesh position={[0, shape.height - headR * 2 - torsoH / 2, 0]} material={mats.kit}>
        <capsuleGeometry args={[shape.width, torsoH * 0.7, 6, 12]} />
      </mesh>

      {/* Shoulders pad to read silhouette */}
      <mesh position={[0, shape.height - headR * 2 - 0.05, 0]} material={mats.kit}>
        <sphereGeometry args={[shape.shoulders, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* PR J9c — Metallic kit trim ring around shoulders. Silver at tier 2,
          gold at tier 3. Invisible (skipped) at tier 0-1. */}
      {tier >= 2 && (
        <mesh position={[0, shape.height - headR * 2 - 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
          <torusGeometry args={[shape.shoulders + 0.02, 0.012, 8, 24]} />
        </mesh>
      )}

      {/* Arms — pivot at shoulder. */}
      <group ref={leftArm}  position={[ shape.shoulders + 0.04, shape.height - headR * 2 - 0.05, 0]}>
        <mesh position={[0, -armL / 2, 0]} material={mats.skin}>
          <capsuleGeometry args={[0.05, armL * 0.85, 4, 8]} />
        </mesh>
      </group>
      <group ref={rightArm} position={[-shape.shoulders - 0.04, shape.height - headR * 2 - 0.05, 0]}>
        <mesh position={[0, -armL / 2, 0]} material={mats.skin}>
          <capsuleGeometry args={[0.05, armL * 0.85, 4, 8]} />
        </mesh>
      </group>

      {/* Legs — pivot at hip. */}
      <group ref={leftLeg}  position={[ shape.width * 0.7, legH, 0]}>
        <mesh position={[0, -legH / 2, 0]} material={mats.leg}>
          <capsuleGeometry args={[0.07, legH * 0.85, 4, 8]} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[-shape.width * 0.7, legH, 0]}>
        <mesh position={[0, -legH / 2, 0]} material={mats.leg}>
          <capsuleGeometry args={[0.07, legH * 0.85, 4, 8]} />
        </mesh>
      </group>
    </group>
  )
}
