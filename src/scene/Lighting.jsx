import { Environment, Lightformer, Sky } from '@react-three/drei'
import { useFactoryStore } from '../hooks/useFactoryStore'

export default function Lighting() {
  const quality = useFactoryStore((s) => s.quality)
  const shadows = quality !== 'performance'
  const size = quality === 'high' ? 4096 : 2048
  return (
    <>
      <color attach="background" args={['#b9c7d3']} />
      <fog attach="fog" args={['#c3ccd4', 140, 520]} />
      <Sky distance={4500} sunPosition={[120, 70, 90]} turbidity={6} rayleigh={1.2} mieCoefficient={0.006} mieDirectionalG={0.8} />
      <hemisphereLight args={['#eef3f7', '#6f675c', 1.15]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[32, 70, 26]}
        intensity={1.9}
        color="#fff4e2"
        castShadow={shadows}
        shadow-mapSize={[size, size]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={20}
        shadow-camera-far={160}
      />
      <directionalLight position={[-40, 30, -30]} intensity={0.35} color="#cfe0ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 20, 1]} color="#fff7ea" />
        <Lightformer form="rect" intensity={1.2} position={[20, 5, -10]} rotation-y={-Math.PI / 2} scale={[20, 5, 1]} color="#e7f0ff" />
        <Lightformer form="rect" intensity={1.2} position={[-20, 5, 10]} rotation-y={Math.PI / 2} scale={[20, 5, 1]} color="#e7f0ff" />
        <Lightformer form="ring" intensity={0.8} position={[0, 4, 20]} scale={6} color="#ffffff" />
        <mesh scale={100}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#7d8791" side={1} />
        </mesh>
      </Environment>
    </>
  )
}
