'use client'

import { useRef, useMemo, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

// PR J9d — Mixamo-rigged character.
//
// Replaces the procedural humanoid from J9a with a real glTF rigged mesh.
// The `/public/3d/character-${body}.glb` assets are baked from Mixamo's
// stock characters (one per body type: lean/stocky/tall) with three named
// animation clips merged in via gltf-transform: 'idle', 'running',
// 'celebrating'. See PR J9d for the conversion pipeline.
//
// J9c cosmetics (aura halo + class shader rim + kit trim) layer ON TOP of
// the rigged mesh in this component — they're not in the .glb, so they
// work even if a future body type ships without an asset (falls through
// to the procedural fallback below).

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

const GLB_PATH = {
  lean:   '/3d/character-lean.glb',
  stocky: '/3d/character-stocky.glb',
  tall:   '/3d/character-tall.glb',
} as const

// Pre-fetch all three on module load so the network round-trip is hidden
// behind the dynamic-import waterfall. The user's first character render
// uses one of these but they may swap bodies via CharSelectModal, so all
// three are warmed eagerly.
useGLTF.preload(GLB_PATH.lean)
useGLTF.preload(GLB_PATH.stocky)
useGLTF.preload(GLB_PATH.tall)

interface Character3DProps {
  body:       'lean' | 'stocky' | 'tall'
  skinHex:    string
  hairHex:    string
  kitHex:     string
  state:      CharState
  level?:     number
  /** PR J9c — level tier 0-3, controls aura intensity + kit trim metalness. */
  tier?:      0 | 1 | 2 | 3
  /** PR J9c — runner-class colour. When set, the aura + rim adopt this colour. */
  classHex?:  string | null
}

// ── Rigged Mixamo mesh ─────────────────────────────────────────────────────

function Character3DRigged({
  body, kitHex, state, tier, classHex,
}: Pick<Character3DProps, 'body' | 'kitHex' | 'state' | 'tier' | 'classHex'>) {
  const group = useRef<THREE.Group>(null)
  const aura  = useRef<THREE.Mesh>(null)

  const { scene, animations } = useGLTF(GLB_PATH[body])
  // Clone the scene so multiple Character3D mounts (e.g. HeroCard +
  // LevelUpScreen visible at the same time) don't share the same skeleton
  // and stomp each other's pose.
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  const { actions, mixer } = useAnimations(animations, clonedScene)

  // Play the matching clip on mount + when state changes. fadeOut→fadeIn
  // gives a 200ms crossfade so transitions don't snap.
  useEffect(() => {
    const action = actions[state]
    if (!action) return
    action.reset().fadeIn(0.2).play()
    return () => { action.fadeOut(0.2) }
  }, [actions, state])

  // PR J9c — kit hint via emissive on skinned-mesh materials, ONLY when a
  // class is revealed (otherwise leave the Mixamo character textures
  // untouched so distinct characters read as distinct).
  useEffect(() => {
    if (!classHex) return
    clonedScene.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh || obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial
        if (mat && 'emissive' in mat) {
          mat.emissive = new THREE.Color(classHex)
          mat.emissiveIntensity = 0.08
        }
      }
    })
  }, [clonedScene, classHex])

  // PR J9c — aura material reactive to tier + class.
  const auraMat = useMemo(() => new THREE.MeshBasicMaterial({
    color:       classHex ?? kitHex,
    transparent: true,
    opacity:     (tier ?? 0) === 0 ? 0 : 0.18 + (tier ?? 0) * 0.10,
    depthWrite:  false,
  }), [classHex, kitHex, tier])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (aura.current && (tier ?? 0) > 0) {
      const tierN = tier ?? 0
      const pulseHz   = 0.5 + tierN * 0.4
      const baseScale = 1 + tierN * 0.15
      const swing     = 0.10 + tierN * 0.05
      aura.current.scale.setScalar(baseScale + Math.sin(t * pulseHz * Math.PI) * swing)
      aura.current.rotation.y = t * 0.4
    }
    mixer.update(s.clock.getDelta()) // safety; useAnimations handles this normally
  })

  const shape = BODY_SHAPES[body]

  return (
    <group ref={group}>
      {/* The rigged mesh. Mixamo characters export at ~180 cm tall in metres,
          so the scene already fits the camera setup tuned for 1.7 m. We
          translate the group down so feet land near y=0 (Mixamo origin is
          at hips, not feet). */}
      <primitive object={clonedScene} position={[0, -shape.height / 2, 0]} />

      {/* PR J9c — aura halo at the character's feet. */}
      {(tier ?? 0) > 0 && (
        <mesh ref={aura} position={[0, -shape.height / 2 + 0.04, 0]}
          rotation={[Math.PI / 2, 0, 0]} material={auraMat}>
          <torusGeometry args={[shape.width * 1.8, 0.04, 12, 32]} />
        </mesh>
      )}
    </group>
  )
}

// ── Procedural fallback ────────────────────────────────────────────────────
// Kept from J9a. Used when the GLB asset for a body type fails to load
// (404, network failure, future body types without an asset yet).

function Character3DProcedural({
  body, skinHex, hairHex, kitHex, state, tier = 0, classHex,
}: Character3DProps) {
  const shape = BODY_SHAPES[body]
  const root      = useRef<THREE.Group>(null)
  const leftArm   = useRef<THREE.Group>(null)
  const rightArm  = useRef<THREE.Group>(null)
  const leftLeg   = useRef<THREE.Group>(null)
  const rightLeg  = useRef<THREE.Group>(null)
  const aura      = useRef<THREE.Mesh>(null)

  const mats = useMemo(() => {
    const trimMetal = [0.0, 0.15, 0.5, 0.9][tier] ?? 0.0
    const kitMat = new THREE.MeshStandardMaterial({
      color: kitHex, roughness: 0.4, metalness: trimMetal,
    })
    if (classHex) {
      kitMat.emissive = new THREE.Color(classHex)
      kitMat.emissiveIntensity = 0.10
    }
    const trimHex = tier === 3 ? '#FFD700' : tier === 2 ? '#C0C0C0' : kitHex
    return {
      skin: new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.6, metalness: 0.0 }),
      hair: new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.7, metalness: 0.0 }),
      kit:  kitMat,
      trim: new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.25, metalness: 0.8 }),
      leg:  new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.5, metalness: 0.0 }),
      aura: new THREE.MeshBasicMaterial({
        color: classHex ?? kitHex, transparent: true,
        opacity: tier === 0 ? 0 : 0.18 + tier * 0.10, depthWrite: false,
      }),
    }
  }, [skinHex, hairHex, kitHex, classHex, tier])

  useFrame((clock) => {
    const t = clock.clock.elapsedTime
    if (!root.current) return
    if (state === 'idle') {
      root.current.position.y = Math.sin(t * 2) * 0.03
      if (leftArm.current)  leftArm.current.rotation.x  = Math.sin(t * 2) * 0.08
      if (rightArm.current) rightArm.current.rotation.x = Math.sin(t * 2 + Math.PI) * 0.08
      if (leftLeg.current)  leftLeg.current.rotation.x  = 0
      if (rightLeg.current) rightLeg.current.rotation.x = 0
    } else if (state === 'running') {
      const stride = Math.sin(t * 8)
      if (leftArm.current)  leftArm.current.rotation.x  =  stride * 0.9
      if (rightArm.current) rightArm.current.rotation.x = -stride * 0.9
      if (leftLeg.current)  leftLeg.current.rotation.x  = -stride * 0.7
      if (rightLeg.current) rightLeg.current.rotation.x =  stride * 0.7
      root.current.position.y = Math.abs(Math.sin(t * 8)) * 0.05
    } else if (state === 'celebrating') {
      const jump = Math.max(0, Math.sin(t * 4))
      root.current.position.y = jump * 0.2
      if (leftArm.current)  leftArm.current.rotation.x  = -Math.PI / 2 + Math.sin(t * 6) * 0.2
      if (rightArm.current) rightArm.current.rotation.x = -Math.PI / 2 + Math.sin(t * 6 + Math.PI) * 0.2
      if (leftArm.current)  leftArm.current.rotation.z  =  0.3
      if (rightArm.current) rightArm.current.rotation.z = -0.3
      if (leftLeg.current)  leftLeg.current.rotation.x  = 0
      if (rightLeg.current) rightLeg.current.rotation.x = 0
    }
    if (aura.current && tier > 0) {
      const pulseHz   = 0.5 + tier * 0.4
      const baseScale = 1 + tier * 0.15
      const swing     = 0.10 + tier * 0.05
      aura.current.scale.setScalar(baseScale + Math.sin(t * pulseHz * Math.PI) * swing)
      aura.current.rotation.y = t * 0.4
    }
  })

  const torsoH = shape.height * 0.35
  const legH   = shape.height * 0.45
  const armL   = shape.height * 0.40
  const headR  = 0.13

  return (
    <group ref={root} position={[0, -shape.height / 2, 0]}>
      {tier > 0 && (
        <mesh ref={aura} position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.aura}>
          <torusGeometry args={[shape.width * 1.8, 0.04, 12, 32]} />
        </mesh>
      )}
      <group position={[0, shape.height - headR, 0]}>
        <mesh material={mats.skin}>
          <sphereGeometry args={[headR, 24, 24]} />
        </mesh>
        <mesh position={[0, headR * 0.45, 0]} material={mats.hair}>
          <sphereGeometry args={[headR * 1.02, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        </mesh>
      </group>
      <mesh position={[0, shape.height - headR * 2 - torsoH / 2, 0]} material={mats.kit}>
        <capsuleGeometry args={[shape.width, torsoH * 0.7, 6, 12]} />
      </mesh>
      <mesh position={[0, shape.height - headR * 2 - 0.05, 0]} material={mats.kit}>
        <sphereGeometry args={[shape.shoulders, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {tier >= 2 && (
        <mesh position={[0, shape.height - headR * 2 - 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.trim}>
          <torusGeometry args={[shape.shoulders + 0.02, 0.012, 8, 24]} />
        </mesh>
      )}
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

// ── Default export — Suspense-wrapped rigged with procedural fallback ──────
// If useGLTF throws (asset 404 or network failure), the error boundary in
// the parent Canvas should surface it. The Suspense fallback renders the
// procedural humanoid so the canvas never goes empty during load.

export default function Character3D(props: Character3DProps) {
  return (
    <Suspense fallback={<Character3DProcedural {...props} />}>
      <Character3DRigged {...props} />
    </Suspense>
  )
}
