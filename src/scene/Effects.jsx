import { EffectComposer, Bloom, N8AO, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useFactoryStore } from '../hooks/useFactoryStore'

export default function Effects() {
  const quality = useFactoryStore((s) => s.quality)
  if (quality === 'performance') return null
  if (quality === 'high') {
    return (
      <EffectComposer key="high" multisampling={0}>
        <N8AO halfRes aoRadius={1.6} intensity={2.0} distanceFalloff={0.6} quality="performance" />
        <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.25} darkness={0.55} />
        <SMAA />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer key="balanced" multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.4} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.25} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  )
}
