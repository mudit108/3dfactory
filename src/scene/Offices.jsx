// Accounts office, manager's mezzanine office, visitor lounge & security.
import { useMemo } from 'react'
import * as THREE from 'three'
import { ACCOUNTS_OFFICE as AO, MANAGER_MEZZ as MZ, ENTRANCE } from '../data/layout'
import { Interactive } from '../components/Interactive'
import { Box, Label, RBox, Cyl, TexPlane } from '../components/primitives'
import { Desk, OfficeChair, FilingCabinet, Printer, Papers, Calculator, Files, Sofa, Whiteboard, Safe, CoffeeTable, Monitor } from '../components/Office'
import { Plant, WaterDispenser } from '../components/Props'
import { MAT, colorMaterial } from './materials'
import { GEO } from './geometries'
import { tileTexture, monitorTexture } from './textures'

const alu = () => colorMaterial('#aab2ba', { metalness: 0.8, roughness: 0.3 })

/** Glass partition along a line with mullions; optional door gap [a,b]. */
function GlassWall({ axis, fixed, from, to, height, y = 0, door }) {
  const mull = useMemo(alu, [])
  const frost = useMemo(() => colorMaterial('#e8eef2', { transparent: true, opacity: 0.55, roughness: 0.4 }), [])
  const segs = door ? [[from, door[0]], [door[1], to]] : [[from, to]]
  const len = to - from
  const nM = Math.max(1, Math.round(len / 1.2))
  const place = (u, yy, z = 0) => (axis === 'x' ? [u, yy, fixed + z] : [fixed + z, yy, u])
  const rot = axis === 'x' ? 0 : Math.PI / 2
  return (
    <group position={[0, y, 0]}>
      {segs.map(([a, b], i) =>
        b - a > 0.05 ? (
          <group key={i}>
            <mesh geometry={GEO.plane} material={MAT.glass} position={place((a + b) / 2, height / 2)} rotation={[0, rot, 0]} scale={[b - a, height, 1]} />
            <mesh geometry={GEO.plane} material={frost} position={place((a + b) / 2, 1.25, 0.004)} rotation={[0, rot, 0]} scale={[b - a, 0.12, 1]} />
          </group>
        ) : null,
      )}
      {Array.from({ length: nM + 1 }, (_, i) => {
        const u = from + (len * i) / nM
        if (door && u > door[0] + 0.05 && u < door[1] - 0.05) return null
        return <Box key={i} size={axis === 'x' ? [0.05, height, 0.07] : [0.07, height, 0.05]} position={place(u, height / 2)} material={mull} />
      })}
      <Box size={axis === 'x' ? [len, 0.08, 0.09] : [0.09, 0.08, len]} position={place((from + to) / 2, height - 0.04)} material={mull} />
      <Box size={axis === 'x' ? [len, 0.1, 0.08] : [0.08, 0.1, len]} position={place((from + to) / 2, 0.05)} material={mull} />
      {door && (
        <group>
          <Box size={axis === 'x' ? [0.06, height, 0.08] : [0.08, height, 0.06]} position={place(door[0], height / 2)} material={mull} />
          <Box size={axis === 'x' ? [0.06, height, 0.08] : [0.08, height, 0.06]} position={place(door[1], height / 2)} material={mull} />
          <Box size={axis === 'x' ? [door[1] - door[0], 0.3, 0.08] : [0.08, 0.3, door[1] - door[0]]} position={place((door[0] + door[1]) / 2, 2.25)} material={mull} />
          {/* door leaf, ajar */}
          <group position={place(door[0], 0)} rotation={[0, rot - 0.9, 0]}>
            <mesh geometry={GEO.plane} material={MAT.glass} position={[(door[1] - door[0]) / 2 - 0.03, 1.05, 0]} scale={[door[1] - door[0] - 0.06, 2.1, 1]} />
            <Box size={[0.03, 0.4, 0.05]} position={[door[1] - door[0] - 0.15, 1.05, 0.04]} material={MAT.chrome} />
          </group>
        </group>
      )}
    </group>
  )
}

function Ceiling({ minX, maxX, minZ, maxZ, y }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e7e1', roughness: 0.9, side: THREE.BackSide }), [])
  const w = maxX - minX
  const d = maxZ - minZ
  const panels = []
  for (let x = minX + 1.5; x < maxX - 0.8; x += 2.6) for (let z = minZ + 1.4; z < maxZ - 0.8; z += 2.6) panels.push([x, z])
  return (
    <group>
      <mesh geometry={GEO.plane} material={mat} position={[(minX + maxX) / 2, y, (minZ + maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} />
      {panels.map(([x, z]) => (
        <mesh key={x + '_' + z} geometry={GEO.plane} material={MAT.panelEmissive} position={[x, y - 0.01, z]} rotation={[Math.PI / 2, 0, 0]} scale={[0.6, 0.6, 1]} />
      ))}
      {/* top edge fascia */}
      <Box size={[w, 0.12, 0.12]} position={[(minX + maxX) / 2, y + 0.06, minZ]} material={MAT.aluminium} />
    </group>
  )
}

function TileFloor({ minX, maxX, minZ, maxZ, y = 0 }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tileTexture([(maxX - minX) / 0.6, (maxZ - minZ) / 0.6]), roughness: 0.35 }), [minX, maxX, minZ, maxZ])
  return (
    <mesh geometry={GEO.plane} material={mat} position={[(minX + maxX) / 2, y + 0.015, (minZ + maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[maxX - minX, maxZ - minZ, 1]} receiveShadow />
  )
}

function OfficeSign({ text, position, rotation = 0, width = 3.2, accent = '#f59e0b' }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[width + 0.12, width * 0.2 + 0.1, 0.06]} material={MAT.darkSteel} />
      <Label
        width={width}
        height={width * 0.2}
        position={[0, 0, 0.032]}
        opts={{ width: 800, height: 160, bg: '#0f172a', radius: 8, stripe: accent, lines: [{ text, size: text.length > 10 ? 60 : 76, color: '#ffffff', weight: 800, letter: text.length > 10 ? 4 : 8, y: 76 }] }}
        emissive
      />
    </group>
  )
}

export function AccountsOffice() {
  return (
    <Interactive type="accounts" id="accounts" label="Accounts Office" sub="Click to open accounts dashboard" view="accounts">
      <TileFloor minX={AO.minX} maxX={AO.maxX} minZ={AO.minZ} maxZ={AO.maxZ} />
      <GlassWall axis="x" fixed={AO.minZ} from={AO.minX} to={AO.maxX} height={AO.height} door={AO.doorX} />
      <GlassWall axis="z" fixed={AO.minX} from={AO.minZ} to={AO.maxZ} height={AO.height} />
      <GlassWall axis="z" fixed={AO.maxX} from={AO.minZ} to={AO.maxZ} height={AO.height} />
      <Ceiling minX={AO.minX} maxX={AO.maxX} minZ={AO.minZ} maxZ={AO.maxZ} y={AO.height} />
      <OfficeSign text="ACCOUNTS" position={[(AO.minX + AO.maxX) / 2, AO.height + 0.45, AO.minZ - 0.05]} rotation={Math.PI} accent="#f472b6" />
      {/* workstation 1 (occupied) */}
      <Desk position={[6.6, 0, 24.6]} rotation={-Math.PI / 2} width={1.7} />
      <OfficeChair position={[5.75, 0, 24.6]} rotation={Math.PI / 2} />
      <Papers position={[6.55, 0.775, 25.1]} rotation={0.3} n={4} />
      <Calculator position={[6.35, 0.78, 24.0]} rotation={0.2} />
      <Files position={[6.85, 0.77, 25.2]} rotation={Math.PI / 2} />
      {/* workstation 2 */}
      <Desk position={[11.2, 0, 24.6]} rotation={-Math.PI / 2} width={1.7} />
      <OfficeChair position={[10.3, 0, 24.3]} rotation={Math.PI / 2 + 0.4} />
      <Papers position={[11.1, 0.775, 25.0]} rotation={-0.2} />
      {/* back wall storage */}
      {[3.6, 4.15, 4.7, 5.25].map((x) => (
        <FilingCabinet key={x} position={[x, 0, 29.3]} rotation={Math.PI} />
      ))}
      <Safe position={[6.3, 0, 29.3]} rotation={Math.PI} />
      <Box size={[1.2, 0.75, 0.6]} position={[13.8, 0.375, 29.2]} material={MAT.wood} />
      <Printer position={[13.6, 0.75, 29.2]} rotation={Math.PI} />
      <Papers position={[14.15, 0.755, 29.1]} n={5} />
      <Box size={[3, 0.03, 0.3]} position={[9.5, 1.9, 29.62]} material={MAT.wood} />
      <Files position={[8.4, 1.915, 29.6]} rotation={0} />
      <Files position={[9.6, 1.915, 29.6]} rotation={0} />
      <Plant position={[14.3, 0, 21.8]} scale={1.1} />
      <Plant position={[3.7, 0, 21.7]} scale={0.9} />
      <WaterDispenser position={[12.6, 0, 29.3]} rotation={Math.PI} />
      {/* wall clock */}
      <group position={[9.5, 2.6, 29.65]} rotation={[Math.PI / 2, 0, 0]}>
        <Cyl r={0.18} h={0.04} material={MAT.white} />
        <Cyl r={0.2} h={0.03} position={[0, 0.005, 0]} material={MAT.black} low />
      </group>
    </Interactive>
  )
}

function Railing({ from, to, y, height = 1.05 }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  const ang = Math.atan2(dz, dx)
  const n = Math.max(1, Math.round(len / 1.5))
  const mat = MAT.yellow
  return (
    <group position={[from[0], y, from[1]]} rotation={[0, -ang, 0]}>
      <Box size={[len, 0.05, 0.05]} position={[len / 2, height, 0]} material={mat} />
      <Box size={[len, 0.04, 0.04]} position={[len / 2, height / 2, 0]} material={mat} />
      <Box size={[len, 0.12, 0.01]} position={[len / 2, 0.06, 0]} material={mat} />
      {Array.from({ length: n + 1 }, (_, i) => (
        <Box key={i} size={[0.05, height, 0.05]} position={[(len * i) / n, height / 2, 0]} material={mat} />
      ))}
    </group>
  )
}

function Mezzanine() {
  const slabMat = useMemo(() => colorMaterial('#a7a49d', { roughness: 0.9 }), [])
  const { stair } = MZ
  const steps = 17
  const rise = MZ.floorY / steps
  const run = (stair.fromX - stair.toX) / steps
  const stairW = stair.maxZ - stair.minZ
  const stairZ = (stair.minZ + stair.maxZ) / 2
  const stringerLen = Math.hypot(stair.fromX - stair.toX, MZ.floorY)
  const stringerAng = Math.atan2(MZ.floorY, stair.fromX - stair.toX)
  return (
    <group>
      <Box size={[MZ.maxX - MZ.minX, 0.3, MZ.maxZ - MZ.minZ]} position={[(MZ.minX + MZ.maxX) / 2, MZ.floorY - 0.15, (MZ.minZ + MZ.maxZ) / 2]} material={slabMat} cast receive />
      <Box size={[MZ.maxX - MZ.minX, 0.45, 0.2]} position={[(MZ.minX + MZ.maxX) / 2, MZ.floorY - 0.3, MZ.minZ + 0.1]} material={MAT.structure} />
      {[
        [-25.8, 18.7], [-20, 18.7], [-14.2, 18.7], [-25.8, 24.2], [-14.2, 24.2], [-20, 24.2],
      ].map(([x, z]) => (
        <Box key={x + '_' + z} size={[0.25, MZ.floorY - 0.3, 0.25]} position={[x, (MZ.floorY - 0.3) / 2, z]} material={MAT.structure} cast />
      ))}
      <Railing from={[MZ.minX, MZ.minZ + 0.08]} to={[MZ.maxX, MZ.minZ + 0.08]} y={MZ.floorY} />
      <Railing from={[MZ.maxX - 0.05, MZ.minZ + 0.08]} to={[MZ.maxX - 0.05, stair.minZ]} y={MZ.floorY} />
      <Railing from={[MZ.maxX - 0.05, stair.maxZ]} to={[MZ.maxX - 0.05, MZ.office.minZ]} y={MZ.floorY} />
      <Railing from={[MZ.minX + 0.05, MZ.minZ + 0.08]} to={[MZ.minX + 0.05, MZ.office.minZ]} y={MZ.floorY} />
      {/* staircase */}
      {Array.from({ length: steps }, (_, i) => (
        <Box key={i} size={[run + 0.04, 0.05, stairW]} position={[stair.fromX - run * (i + 0.5), rise * (i + 1) - 0.025, stairZ]} material={MAT.grating} cast />
      ))}
      {[stair.minZ, stair.maxZ].map((z) => (
        <group key={z}>
          <Box size={[stringerLen, 0.25, 0.06]} position={[(stair.fromX + stair.toX) / 2, MZ.floorY / 2 - 0.05, z]} rotation={[0, 0, -stringerAng]} material={MAT.yellow} />
          <Box size={[stringerLen, 0.05, 0.05]} position={[(stair.fromX + stair.toX) / 2, MZ.floorY / 2 + 0.95, z]} rotation={[0, 0, -stringerAng]} material={MAT.yellow} />
          {[0.15, 0.5, 0.85].map((k) => (
            <Box key={k} size={[0.05, 1.0, 0.05]} position={[stair.fromX - (stair.fromX - stair.toX) * k, MZ.floorY * k + 0.45, z]} material={MAT.yellow} />
          ))}
        </group>
      ))}
    </group>
  )
}

export function ManagerOffice() {
  const O = MZ.office
  const y = MZ.floorY
  const wallMat = useMemo(() => colorMaterial('#d8d2c2', { roughness: 0.9 }), [])
  return (
    <group>
      <Mezzanine />
      <Interactive type="manager" id="manager" label="Factory Manager Office" sub="Click to open manager dashboard" view="manager">
        <TileFloor minX={O.minX} maxX={O.maxX} minZ={O.minZ} maxZ={O.maxZ} y={y} />
        <GlassWall axis="x" fixed={O.minZ} from={O.minX} to={O.maxX} height={O.height} y={y} door={[-16.3, -15.35]} />
        <GlassWall axis="z" fixed={O.maxX} from={O.minZ} to={O.maxZ} height={O.height} y={y} />
        {/* solid side wall (whiteboard wall) */}
        <mesh geometry={GEO.plane} material={wallMat} position={[O.minX, y + O.height / 2, (O.minZ + O.maxZ) / 2]} rotation={[0, Math.PI / 2, 0]} scale={[O.maxZ - O.minZ, O.height, 1]} />
        <Ceiling minX={O.minX} maxX={O.maxX} minZ={O.minZ} maxZ={O.maxZ} y={y + O.height} />
        <OfficeSign text="FACTORY MANAGER" position={[(O.minX + O.maxX) / 2, y + O.height + 0.45, O.minZ - 0.05]} rotation={Math.PI} width={4.2} accent="#22d3ee" />
        <group position={[0, y, 0]}>
          <Desk position={[-20.3, 0, 25.4]} rotation={-Math.PI / 2} width={2.0} depth={0.9} kind="ems" />
          <OfficeChair position={[-21.2, 0, 25.4]} rotation={Math.PI / 2} color="#111827" />
          <OfficeChair position={[-19.3, 0, 24.9]} rotation={-Math.PI / 2} color="#374151" />
          <OfficeChair position={[-19.3, 0, 25.9]} rotation={-Math.PI / 2} color="#374151" />
          <Files position={[-20.2, 0.77, 26.1]} rotation={Math.PI / 2} />
          <Papers position={[-20.4, 0.775, 24.8]} n={3} />
          <Sofa position={[-24.6, 0, 27.4]} rotation={Math.PI / 2} seats={3} color="#5b4636" />
          <CoffeeTable position={[-23.3, 0, 27.4]} />
          <Whiteboard position={[-25.55, 1.65, 24.3]} rotation={Math.PI / 2} />
          <FilingCabinet position={[-16, 0, 29.2]} rotation={Math.PI} />
          <FilingCabinet position={[-16.55, 0, 29.2]} rotation={Math.PI} drawers={3} />
          <Plant position={[-15.6, 0, 21.3]} />
          <Plant position={[-25.1, 0, 29.1]} scale={1.2} />
        </group>
      </Interactive>
    </group>
  )
}

function DisplayBoard({ position, rotation = 0 }) {
  const swatches = ['#e8e6df', '#28324a', '#3b3f45', '#8fb3cf', '#c9b99a', '#1f2124', '#d9d2c1', '#6b2430', '#2f6b6d', '#ddd8cc']
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={[3.2, 2.0, 0.06]} material={colorMaterial('#152238')} />
      <Label width={3.0} height={0.34} position={[0, 0.78, 0.035]} opts={{ width: 900, height: 100, bg: null, lines: [{ text: 'SHREE SATIJI TEXTILES', size: 64, color: '#f3d27a', weight: 800, letter: 4 }] }} />
      <Label width={3.0} height={0.18} position={[0, 0.5, 0.035]} opts={{ width: 900, height: 60, bg: null, lines: [{ text: 'OUR FABRIC RANGE', size: 36, color: '#cbd5e1', weight: 600, letter: 8 }] }} />
      {swatches.map((c, i) => (
        <Box key={i} size={[0.44, 0.44, 0.02]} position={[-1.2 + (i % 5) * 0.6, 0.02 - Math.floor(i / 5) * 0.56, 0.04]} material={colorMaterial(c, { roughness: 0.8 })} />
      ))}
    </group>
  )
}

export function Lobby() {
  const tvTex = useMemo(() => monitorTexture('ems'), [])
  const counter = useMemo(() => colorMaterial('#6d5a47', { roughness: 0.5 }), [])
  const [sx, , sz] = ENTRANCE.securityDesk
  return (
    <group>
      {/* visitor lounge beneath mezzanine */}
      <TileFloor minX={-25.6} maxX={-15} minZ={21} maxZ={29.7} />
      <Sofa position={[-22, 0, 28.9]} rotation={Math.PI} seats={3} color="#3f4a5a" />
      <Sofa position={[-24.8, 0, 25.8]} rotation={Math.PI / 2} seats={2} color="#3f4a5a" />
      <CoffeeTable position={[-22, 0, 27.2]} />
      <Plant position={[-25, 0, 29.2]} scale={1.3} />
      <Plant position={[-15.8, 0, 29.2]} scale={1.3} />
      <group position={[-18.2, 1.6, 29.66]} rotation={[0, Math.PI, 0]}>
        <Box size={[1.9, 1.1, 0.06]} material={MAT.black} />
        <TexPlane texture={tvTex} width={1.8} height={1.0} position={[0, 0, 0.035]} emissive />
      </group>
      <DisplayBoard position={[-12.2, 1.7, 29.66]} rotation={Math.PI} />
      <Label width={2.4} height={0.4} position={[-20.3, 2.75, 21.02]} rotation={[0, Math.PI, 0]} opts={{ width: 600, height: 100, bg: '#0f172a', radius: 8, stripe: '#e5e7eb', lines: [{ text: 'VISITOR LOUNGE', size: 52, color: '#fff', weight: 800, letter: 4 }] }} />
      <Label width={2.4} height={0.4} position={[-20.3, 2.75, 21.0]} opts={{ width: 600, height: 100, bg: '#0f172a', radius: 8, stripe: '#e5e7eb', lines: [{ text: 'VISITOR LOUNGE', size: 52, color: '#fff', weight: 800, letter: 4 }] }} />
      {/* entrance mat */}
      <Box size={[6.4, 0.02, 3]} position={[(ENTRANCE.opening[0] + ENTRANCE.opening[1]) / 2, 0.01, 28.3]} material={colorMaterial('#2a2e33', { roughness: 1 })} />
      {/* security desk */}
      <group position={[sx, 0, sz]}>
        <RBox size={[0.7, 1.05, 2.2]} radius={0.04} position={[0, 0.525, 0]} material={counter} cast />
        <RBox size={[1.4, 1.05, 0.6]} radius={0.04} position={[0.35, 0.525, 1.3]} material={counter} cast />
        <Box size={[0.8, 0.04, 2.3]} position={[0, 1.07, 0]} material={MAT.offWhite} />
        <Monitor position={[0.15, 1.09, -0.4]} rotation={-Math.PI / 2} kind="ems" />
        <Box size={[0.3, 0.02, 0.4]} position={[-0.1, 1.1, 0.4]} material={MAT.paper} />
        <Label width={0.9} height={0.2} position={[-0.36, 0.8, 0]} rotation={[0, -Math.PI / 2, 0]} opts={{ width: 400, height: 90, bg: '#1e3a5f', radius: 6, lines: [{ text: 'SECURITY', size: 50, color: '#fff', weight: 800, letter: 6 }] }} />
      </group>
      {/* visitor register stand */}
      <Box size={[0.05, 1.0, 0.05]} position={[-2.6, 0.5, 23.8]} material={MAT.darkSteel} />
      <Box size={[0.4, 0.03, 0.3]} position={[-2.6, 1.02, 23.8]} rotation={[0.3, 0, 0]} material={MAT.wood} />
    </group>
  )
}
