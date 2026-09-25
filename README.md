# Shree Satiji Textiles — 3D Factory View

Interactive 3D visualisation of a waterjet weaving plant, built procedurally with
React + Vite + Three.js / React Three Fiber + drei, Tailwind CSS and Lucide icons.
No external 3D models or image assets — everything is generated in code.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## What's inside

| Area | Details |
|---|---|
| Waterjet production | 18 procedural looms (WJ-01 … WJ-18): cast frames, warp beam, heald frames, beating reed, water jet, weft package, HMI panel, signal tower, motor, pipes, cables. Running / Idle / Maintenance each look different. |
| Yarn stock | 12 pallet racks with instanced yarn cones & cartons, receiving shutter, forklift, weighing scale |
| Finished goods | 8 roll racks + floor lots, bales, cartons |
| Offices | Glass Accounts office; Factory Manager office on a mezzanine overlooking the floor; visitor lounge; security desk |
| Dispatch | Dock platform, ramp, staging bays, truck being loaded (animated loader) |
| Entrance | Facade sign, canopy, compound gate, boom barrier, guard cabin |
| People | 27 staff from the roster (operators, stores, QC, dispatch, accounts, manager, security) with idle / walk / carry / sit animations |
| Flow | Floor chevrons for Yarn → Weaving → Inspection → Finished → Dispatch, plus glowing EMS data links into Accounts and the Manager |

## Controls

* **Orbit** – left-drag rotate, right-drag pan, wheel zoom. Hover for tooltips, click anything for a detail panel.
* **Keys** – `1–7` camera views · `P` presentation · `G` walkthrough · `L` labels · `F` flow · `H` help · `Esc` close/exit.
* **Walkthrough** – click to capture the mouse, `WASD` move, `Shift` run, `Esc` exit. On touch devices use the on-screen pad and drag to look.
* **Presentation** – automatic 8-stop guided tour (`Space` pause, `←/→` step).
* **Quality** – High (AO + bloom), Balanced, Performance. It drops from High to Balanced automatically if the frame rate falls.

## Connecting your EMS

All figures come from `src/services/factoryApi.js`, which serves the mock data in
`src/data/`. To go live, set `VITE_EMS_API_URL` in a `.env` file and expose these
endpoints, returning the same JSON shapes as the files in `src/data/`:

```
GET /api/machines            → machines.js
GET /api/inventory/yarn      → yarnInventory.js
GET /api/inventory/finished  → finishedStock.js
GET /api/workers             → workers.js
GET /api/accounts/summary    → accountsData.js
GET /api/dispatch | /api/quality | /api/maintenance | /api/company → operationsData.js
```

Machines are polled every 4 s (`subscribeToLiveUpdates`); swap in a WebSocket if your EMS supports one.
The 3D positions live separately in `src/data/layout.js`, so data changes never require scene changes.

## Structure

```
src/
  components/   WaterjetLoom, Worker, Racks, Props, Vehicles, Office, Interactive, primitives
  data/         layout (positions, camera views, tour) + demo EMS data
  hooks/        zustand store, data loading, keyboard shortcuts
  services/     factoryApi.js (mock ⇄ real EMS)
  scene/        building, zones, lighting, effects, camera rig, walkthrough, flow paths, textures, materials
  ui/           HUD, detail panels, minimap, overlays, SVG charts
```
