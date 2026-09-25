// Yarn stock room and finished goods warehouse.
import { useMemo } from 'react'
import { yarnRackPlacements, finishedRackPlacements, YARN_RACK, FG_RACK, RECEIVING_DOOR } from '../data/layout'
import { useFactoryStore } from '../hooks/useFactoryStore'
import { Interactive } from '../components/Interactive'
import { YarnRack, FabricRack } from '../components/Racks'
import { CartonStack, RollStack, BaleStack, PalletJack, Forklift, Pallet } from '../components/Props'
import { Box, Label, RBox } from '../components/primitives'
import { MAT, colorMaterial } from './materials'
import { ZoneBanner } from './ProductionZone'
import { GEO } from './geometries'

function WeighScale({ position }) {
  return (
    <group position={position}>
      <Box size={[1.2, 0.1, 1.2]} position={[0, 0.05, 0]} material={MAT.galvanized} />
      <Box size={[0.06, 1.0, 0.06]} position={[0.55, 0.55, -0.55]} material={MAT.darkSteel} />
      <RBox size={[0.36, 0.26, 0.12]} radius={0.03} position={[0.55, 1.15, -0.55]} material={MAT.loomBody} />
      <Box size={[0.28, 0.1, 0.005]} position={[0.55, 1.18, -0.487]} material={colorMaterial('#6ee7b7', { emissive: '#10b981', emissiveIntensity: 1.2 })} />
    </group>
  )
}

function ShutterDoor({ position, rotation = 0, width = 6, height = 4.4, openFrac = 0.85 }) {
  const rollH = height * openFrac
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[width + 0.3, 0.55, 0.55]} position={[0, height + 0.3, 0]} material={MAT.galvanized} />
      <mesh geometry={GEO.box} material={MAT.cladding} position={[0, height - (height - rollH) / 2, 0]} scale={[width, height - rollH, 0.05]} />
      <Box size={[0.12, height, 0.2]} position={[-width / 2 - 0.06, height / 2, 0]} material={MAT.yellow} />
      <Box size={[0.12, height, 0.2]} position={[width / 2 + 0.06, height / 2, 0]} material={MAT.yellow} />
    </group>
  )
}

export function YarnStore() {
  const inventory = useFactoryStore((s) => s.yarnInventory)
  const byRack = useMemo(() => Object.fromEntries(inventory.map((y) => [y.rackId, y])), [inventory])
  return (
    <group>
      {yarnRackPlacements.map((p, i) => {
        const inv = byRack[p.id]
        return (
          <Interactive
            key={p.id}
            type="yarn"
            id={p.id}
            label={`Yarn Rack ${p.id}`}
            sub={inv ? `${inv.yarnType} ${inv.count} · ${inv.availableKg.toLocaleString('en-IN')} kg` : ''}
            position={p.position}
            rotation={[0, p.rotation, 0]}
          >
            <YarnRack rack={p.id} inventory={inv} dims={YARN_RACK} seed={i + 1} />
          </Interactive>
        )
      })}
      {/* receiving area near the left-wall shutter */}
      <ShutterDoor position={[-49.9, 0, (RECEIVING_DOOR.minZ + RECEIVING_DOOR.maxZ) / 2]} rotation={Math.PI / 2} width={RECEIVING_DOOR.maxZ - RECEIVING_DOOR.minZ} height={RECEIVING_DOOR.height} />
      <CartonStack position={[-46.5, 0, 2.2]} ny={3} seed={3} wrap />
      <CartonStack position={[-46.5, 0, 4.0]} ny={2} seed={5} wrap />
      <CartonStack position={[-44.8, 0, 2.2]} ny={3} seed={7} />
      <CartonStack position={[-46.5, 0, 10.5]} ny={2} seed={11} />
      <CartonStack position={[-44.8, 0, 10.5]} ny={3} seed={13} wrap />
      <WeighScale position={[-42.5, 0, 9.5]} />
      <PalletJack position={[-43.2, 0, 5.5]} rotation={-0.6} />
      <Forklift position={[-38.6, 0, 9.8]} rotation={Math.PI} />
      <Pallet position={[-36.4, 0, 11.6]} />
      <Pallet position={[-36.4, 0.145, 11.6]} />
      <Pallet position={[-36.4, 0.29, 11.6]} />
      <Label
        width={2.2}
        height={0.55}
        position={[-49.7, 5.2, 6]}
        rotation={[0, Math.PI / 2, 0]}
        opts={{ width: 512, height: 128, bg: '#1e293b', radius: 8, stripe: '#60a5fa', lines: [{ text: 'YARN RECEIVING', size: 52, color: '#fff', weight: 800 }] }}
      />
      <ZoneBanner text="YARN STOCK" sub="RAW MATERIAL · FILAMENT YARN" position={[-40.5, 6.3, 12]} width={6.4} accent="#60a5fa" />
      <ZoneBanner text="YARN STOCK" position={[-31.2, 5.8, -13]} width={4.2} accent="#60a5fa" rotation={Math.PI / 2} />
    </group>
  )
}

export function FinishedGoods() {
  const stock = useFactoryStore((s) => s.finishedStock)
  const byRack = useMemo(() => Object.fromEntries(stock.map((f) => [f.rackId, f])), [stock])
  const floor = byRack['FG-FLOOR']
  return (
    <group>
      {finishedRackPlacements.map((p, i) => {
        const st = byRack[p.id]
        return (
          <Interactive
            key={p.id}
            type="finished"
            id={p.id}
            label={`Finished Goods ${p.id}`}
            sub={st ? `${st.fabricType} · ${st.availableM.toLocaleString('en-IN')} m` : ''}
            position={p.position}
            rotation={[0, p.rotation, 0]}
          >
            <FabricRack rack={p.id} stock={st} dims={FG_RACK} seed={i + 2} />
          </Interactive>
        )
      })}
      {/* floor stacks & bales: one clickable lot */}
      <Interactive type="finished" id="FG-FLOOR" label="Finished Goods — Floor Lots" sub={floor ? `${floor.availableM.toLocaleString('en-IN')} m staged` : ''}>
        {[-27.5, -24.8, -22.1, -19.4, -16.7].map((z, i) => (
          <RollStack key={z} position={[46.8, 0, z]} rows={4} layers={i % 2 ? 3 : 4} colors={[['#e8e6df'], ['#28324a', '#3b3f45'], ['#d9d2c1'], ['#8fb3cf'], ['#e8e6df', '#c9b99a']][i]} seed={i + 21} />
        ))}
        <BaleStack position={[44.6, 0, -8.6]} n={4} />
        <BaleStack position={[44.6, 0, -6.9]} n={3} color="#dcd6c6" />
        <BaleStack position={[46.4, 0, -8.6]} n={4} />
        <CartonStack position={[46.4, 0, -6.6]} ny={3} seed={33} wrap />
        <CartonStack position={[46.4, 0, -4.6]} ny={2} seed={35} />
      </Interactive>
      <PalletJack position={[43.4, 0, -14.5]} rotation={1.2} />
      <ZoneBanner text="FINISHED GOODS" sub="GRADED · LOT-TRACKED" position={[34.4, 6.2, -9.6]} width={6.8} accent="#fbbf24" />
    </group>
  )
}
