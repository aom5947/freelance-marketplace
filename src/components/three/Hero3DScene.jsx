import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Line, MeshDistortMaterial, RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { detectWebGL } from './webgl'
import { SceneFallback } from './SceneFallback'

/**
 * HERO 3D SCENE — "The collaboration network"
 *
 * A distorted core (the platform), orbiting nodes (clients & freelancers),
 * connection lines (contracts), and glass panels (projects) rendered with real
 * WebGL. Mouse parallax is applied to the outer group; reduced-motion users get
 * the same composition without animation.
 *
 * Performance guards: single canvas for the whole app, capped DPR, low-quality
 * variant for mobile, no external models/textures/environment maps.
 */

const NODES = [
  { position: [1.95, 0.75, 0.3], color: '#a5b4fc', size: 0.26, shape: 'icosahedron', speed: 1.3 },
  { position: [-1.85, 1.05, -0.2], color: '#c4b5fd', size: 0.22, shape: 'octahedron', speed: 1.7 },
  { position: [-1.6, -1.1, 0.45], color: '#93c5fd', size: 0.3, shape: 'dodecahedron', speed: 1.1 },
  { position: [1.5, -1.3, 0.15], color: '#f0abfc', size: 0.19, shape: 'torus', speed: 1.9 },
  { position: [0.35, 1.95, 0.4], color: '#e0e7ff', size: 0.15, shape: 'sphere', speed: 2.1 },
  { position: [-0.4, -1.95, 0.2], color: '#a5b4fc', size: 0.17, shape: 'box', speed: 1.5 },
  { position: [2.35, -0.4, -0.35], color: '#7dd3fc', size: 0.12, shape: 'sphere', speed: 2.4 },
]

function NodeShape({ shape }) {
  switch (shape) {
    case 'octahedron':
      return <octahedronGeometry args={[1, 0]} />
    case 'dodecahedron':
      return <dodecahedronGeometry args={[1, 0]} />
    case 'torus':
      return <torusGeometry args={[0.8, 0.28, 12, 32]} />
    case 'box':
      return <boxGeometry args={[1.25, 1.25, 1.25]} />
    case 'icosahedron':
      return <icosahedronGeometry args={[1, 0]} />
    default:
      return <sphereGeometry args={[1, 24, 24]} />
  }
}

function OrbitNode({ node, reduced, index, quality }) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (!ref.current) return
    const target = hovered ? 1.45 : 1
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12)
    if (!reduced) {
      const time = state.clock.elapsedTime
      ref.current.rotation.x = time * 0.25 * node.speed + index
      ref.current.rotation.y = time * 0.32 * node.speed
      ref.current.position.y = node.position[1] + Math.sin(time * node.speed + index) * 0.09
    }
  })

  return (
    <mesh
      ref={ref}
      position={node.position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <NodeShape shape={node.shape} />
      <meshStandardMaterial
        color={node.color}
        roughness={0.22}
        metalness={0.55}
        emissive={node.color}
        emissiveIntensity={hovered ? 0.7 : 0.22}
      />
    </mesh>
  )
}

function Connection({ position, reduced, index }) {
  const opacity = reduced ? 0.28 : 0.34
  return (
    <Line
      points={[
        [0, 0, 0],
        position,
      ]}
      color={index % 2 === 0 ? '#a5b4fc' : '#c4b5fd'}
      lineWidth={0.7}
      transparent
      opacity={opacity}
      dashed={false}
    />
  )
}

function GlassPanel({ position, rotation, size, color, reduced }) {
  return (
    <Float
      speed={reduced ? 0 : 1.4}
      rotationIntensity={reduced ? 0 : 0.35}
      floatIntensity={reduced ? 0 : 0.9}
    >
      <group position={position} rotation={rotation}>
        <RoundedBox args={size} radius={0.06} smoothness={4}>
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={0.2}
            roughness={0.08}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </RoundedBox>
        <RoundedBox args={[size[0] * 0.9, 0.045, 0.012]} radius={0.02} position={[0, size[1] * 0.28, size[2] / 2 + 0.002]}>
          <meshBasicMaterial color="#e0e7ff" transparent opacity={0.85} />
        </RoundedBox>
        <RoundedBox args={[size[0] * 0.62, 0.035, 0.012]} radius={0.02} position={[-size[0] * 0.14, size[1] * 0.12, size[2] / 2 + 0.002]}>
          <meshBasicMaterial color="#c7d2fe" transparent opacity={0.6} />
        </RoundedBox>
        <RoundedBox args={[size[0] * 0.45, 0.035, 0.012]} radius={0.02} position={[-size[0] * 0.22, -size[1] * 0.05, size[2] / 2 + 0.002]}>
          <meshBasicMaterial color="#a5b4fc" transparent opacity={0.45} />
        </RoundedBox>
      </group>
    </Float>
  )
}

function Scene({ reduced, quality }) {
  const parallax = useRef(null)
  const orbitRef = useRef(null)
  const ringARef = useRef(null)
  const ringBRef = useRef(null)
  const nodeCount = quality === 'low' ? 5 : NODES.length

  useFrame((state, delta) => {
    if (!parallax.current) return
    const smoothing = 1 - Math.pow(0.001, delta)
    if (!reduced) {
      parallax.current.rotation.y = THREE.MathUtils.lerp(
        parallax.current.rotation.y,
        state.pointer.x * 0.28,
        smoothing * 0.55,
      )
      parallax.current.rotation.x = THREE.MathUtils.lerp(
        parallax.current.rotation.x,
        -state.pointer.y * 0.2,
        smoothing * 0.55,
      )
      if (orbitRef.current) orbitRef.current.rotation.z += delta * 0.06
      if (ringARef.current) ringARef.current.rotation.z += delta * 0.12
      if (ringBRef.current) ringBRef.current.rotation.x += delta * 0.09
    }
  })

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 5]} intensity={2.6} color="#ffffff" />
      <pointLight position={[-4, -2, 4]} intensity={38} color="#8b5cf6" distance={14} />
      <pointLight position={[4, 3, 3]} intensity={28} color="#3b82f6" distance={14} />

      <group ref={parallax}>
        <Float
          speed={reduced ? 0 : 1.1}
          rotationIntensity={reduced ? 0 : 0.35}
          floatIntensity={reduced ? 0 : 1.1}
        >
          <mesh>
            <icosahedronGeometry args={[1.18, 12]} />
            <MeshDistortMaterial
              color="#5b5bf0"
              emissive="#312e81"
              emissiveIntensity={0.45}
              roughness={0.16}
              metalness={0.72}
              distort={reduced ? 0 : 0.34}
              speed={reduced ? 0 : 1.5}
            />
          </mesh>
          <mesh scale={1.16}>
            <icosahedronGeometry args={[1.18, 1]} />
            <meshBasicMaterial color="#c7d2fe" wireframe transparent opacity={0.16} />
          </mesh>
          <pointLight intensity={6} color="#6366f1" distance={5} />
        </Float>

        <group ref={orbitRef}>
          {NODES.slice(0, nodeCount).map((node, index) => (
            <Connection key={`line-${index}`} position={node.position} reduced={reduced} index={index} />
          ))}
          {NODES.slice(0, nodeCount).map((node, index) => (
            <OrbitNode
              key={`node-${index}`}
              node={node}
              reduced={reduced}
              index={index}
              quality={quality}
            />
          ))}
        </group>

        <mesh ref={ringARef} rotation={[Math.PI / 2.35, 0.18, 0.15]}>
          <torusGeometry args={[2.15, 0.012, 8, 140]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.5} />
        </mesh>
        <mesh ref={ringBRef} rotation={[Math.PI / 3.1, -0.45, 0.4]}>
          <torusGeometry args={[2.55, 0.008, 8, 140]} />
          <meshBasicMaterial color="#c4b5fd" transparent opacity={0.35} />
        </mesh>

        <GlassPanel
          position={[-2.15, 1.35, 0.7]}
          rotation={[0.05, 0.45, 0.08]}
          size={[1.1, 0.72, 0.035]}
          color="#818cf8"
          reduced={reduced}
        />
        <GlassPanel
          position={[2.2, -1.15, 0.35]}
          rotation={[-0.08, -0.5, -0.12]}
          size={[0.92, 0.62, 0.03]}
          color="#7dd3fc"
          reduced={reduced}
        />

        {!reduced && (
          <Sparkles
            count={quality === 'low' ? 20 : 44}
            scale={6.4}
            size={1.7}
            speed={0.25}
            opacity={0.55}
            color="#c7d2fe"
          />
        )}
      </group>
    </>
  )
}

export default function Hero3DScene({ quality = 'high' }) {
  const reduced = useReducedMotion()
  const supported = useMemo(() => detectWebGL(), [])
  const containerRef = useRef(null)
  const [visible, setVisible] = useState(true)

  // Pause GPU work when the hero scrolls out of view.
  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (!supported) {
    return <SceneFallback message="เบราว์เซอร์นี้ไม่รองรับ WebGL — แสดงภาพทดแทน" />
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 7.4], fov: 42 }}
        dpr={quality === 'low' ? [1, 1.3] : [1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
        frameloop={reduced || !visible ? 'demand' : 'always'}
      >
        <Suspense fallback={null}>
          <Scene reduced={reduced} quality={quality} />
        </Suspense>
      </Canvas>
    </div>
  )
}
