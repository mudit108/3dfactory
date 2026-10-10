# Shree Satiji Textiles — 3D Weaving Shed (focused version)

Interactive 3D visualisation of a waterjet weaving plant, built procedurally with
React + Vite + Three.js / React Three Fiber + drei, Tailwind CSS and Lucide icons.
No external 3D models or image assets — everything is generated in code.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the prod## What's inside

A 110 m × 44 m weaving shed with three areas, left to right:

| Area | Details |
|---|---|
| Yarn Stock | 12 pallet racks with instanced yarn cones & cartons, receiving shutter, forklift, weighing scale |
| Waterjet Looms | 38 procedural looms (WJ-01 … WJ-38) in 4 rows (10 + 10 + 9 + 9), one operator each. Running / Idle / Maintenance look different. |
| Finished Stock | 8 roll racks + floor lots, bales, cartons, out-going shutter |

The factory name is on the front facade sign and the hanging banners. Floor chevrons show the flow Yarn Stock → Waterjet Looms → Finished Stock.

## Controls — total free view

* **Unlimited orbit** – left-drag rotate (all the way over and under), right-drag / arrow keys pan, wheel zoom from 0.3 m to 900 m. No angle, distance or pan limits.
* **Open view** (`O`, on by default) – roof, roof lights and the outer wall skin are hidden so nothing blocks the view. Turn it off to see the shed with its roof.
* **Free Fly** (`V`) – fly anywhere from wherever you are: `WASD` move, mouse look, `Space`/`E` up, `Q`/`C` down, `Shift` fast, `Esc` back to orbit (keeps your viewpoint).
* **Walkthrough** (`G`) – eye-height walking with collisions.
* **Keys** – `1–6` camera views (Overview, Top View, Waterjet Looms, Loom Close-up, Yarn Stock, Finished Stock) · `P` guided tour · `L` labels · `F` flow · `M` factory sound · `H` help.
* **Open view** (`O`) removes the roof only when you look in from outside/above. Once the camera is inside the shed the roof, skylights, tube lights and fans come back automatically, because they no longer block anything.
* Hover for tooltips, click any loom, rack, worker or the factory sign for a detail panel.

rame rate falls.

## Phones and tablets

* **Portrait:** a slim header with the factory name, live time and shift, plus Tour and ☰ Menu buttons. Below it is a 4-figure status strip (tap it to open attendance), and swipeable view chips sit at the bottom.
* **Menu (☰):** a bottom sheet with the plant map (tap a zone to fly there), Walk, Free fly, Guided tour, Open view, Labels, Flow, Sound, Quality, Full screen, Settings and Help.
* **Camera views** are reframed for tall screens, so the whole shed fits. Rotating the phone reframes the current view.
* **Tap** any loom, rack or person to open a bottom sheet. Drag its handle down to peek at the 3D view. In landscape the details open on the right.
* **Walk and fly** use drag-to-look with an on-screen arrow pad. Fly mode adds ▲▼ buttons for up and down.
* **Settings** open full screen. Attendance and looms show one card per row with large P/H/A/L buttons.
* Notch and home-bar safe areas are respected, and phones start in "Balanced" quality.

## Realism

* **Lighting:** the roof casts shadows when you are inside, so sunlight only comes through the skylight strips. The default "High" quality adds ambient occlusion and light colour grading.
* **Materials:** worn loom paint, stainless parts and a floor wear map with water and oil stains under each loom, puddles, tyre tracks along the aisles and dirt along the walls.
* **Waterjet looms:** a tube light on a stand over each loom (one flickers), weft creel with two cones and a guide eyelet, catch tray, suction hose and pump, flywheel with belt guard, rubber pads, water mist at the jet and slight frame vibration while running.
* **Shed:** oscillating wall fans, pedestal fans between the looms, a distribution board on every row, waste bins, a shop-floor shrine, a wall clock showing the real time, notice boards and a drinking-water point.
* **Motion:** a forklift working the yarn store (it reverses back with a flashing beacon) and a warp-beam trolley pushed down the loom aisle, alongside the existing operators and carriers.
* **Sound** (`M` or the Sound button, off by default): loom clatter, motor hum and water hiss, all generated in the browser. It gets louder near the looms and muffled outside the shed.

## Settings (⚙ button or `,`)

Everything below is saved with **Save settings** (or Ctrl/Cmd + S) and comes back when you reopen the app.
It is stored in this browser; use **Export / Import** to back it up or move it to another computer.
If `VITE_EMS_API_URL` is set it is also saved to your EMS (`GET`/`PUT /api/settings`).

| Tab | What you can set |
|---|---|
| General | Factory name & tagline (front sign, banner, header), shift names & timings, shift shown on the floor, target metres per loom per shift, weekly off, default view options |
| Operators per loom | 1 operator per N looms (slider, quick 1:4 / 1:5 / 1:6). **Automatic split** gives each present operator a block of N neighbouring looms; **Pick looms myself** lets you assign looms per operator. Shows operators needed vs present and any looms left without an operator. |
| Operator list | Add / edit / remove operators: name, shift, skill, phone, daily wage, active |
| Attendance | Per day: Present / Half day / Absent / Leave, in & out time, overtime. "Mark all present". **Month & pay** view with present/absent/leave counts, paid days and payable wages. CSV export. |
| Looms | Per loom: status (live / running / idle / maintenance), fabric, target metres, and who runs it |

In the 3D view, only operators who are present on the current shift appear; each one walks
along their own looms and stops to work at each. Absent operators leave their looms uncovered,
which shows as a red warning in Factory Status. Click an operator to see their looms,
today's attendance, days worked this month and wages earned.

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

## Live data from the Surat EMS

The EMS is a web app (not a JSON API), so a small read-only bridge in `bridge/` logs in and converts its live stream. See `bridge/README.md`. Looms (status, efficiency, RPM, picks, stops, fabric) are live; operators, water pressure, power, stock and accounts stay demo/settings-driven until connected.

## Reports, history and the assistant (added Oct 2026)

- **History**: every 5 minutes `api/ems-push.js` saves a small snapshot of all looms in Upstash Redis (`ems:hist:YYYY-MM-DD`, kept 45 days). `api/history.js` turns them into per-day and per-loom totals. Nothing to set up — it starts as soon as this version is deployed and the bridge is pushing.
- **Reports** (toolbar → Reports, key `R`): Today by hour, last 7 days, loom ranking (CSV download), operators, beam plan. *Copy report* gives a text summary for WhatsApp.
- **Heatmap** (key `C`): colours the floor under each loom by efficiency, production, stops or beam finish time.
- **Assistant** (Ask button): rule-based, free, works offline from the live data. Voice input in Chrome/Android/Safari.
- **Install as app**: the site is a PWA — "Install app" in the menu (Android/desktop Chrome) or Safari → Share → Add to Home Screen.
- **Free-tier budget**: the bridge pushes every 15 s (`PUSH_MS`) and `/api/ems` is edge-cached for 15 s (the site refreshes every 15 s), which keeps Upstash under its 500K commands/month free limit.

## Phone layout

Phones (under 768 px wide) get a normal app with bottom tabs — `src/ui/PhoneApp.jsx`:
Home (big numbers, needs-attention list, operators, quick actions) · Looms (search, filters, sort, a card per loom → full loom page) · 3D view (the factory, loaded only on this tab) · Reports · Ask.
Tablets and computers keep the full 3D layout.

## Quality history

The bridge reads the whole EMS beam list (every beam ever loaded: loom, quality, beam no., pick, length, load date) and sends it to `/api/beams` whenever it changes (new beam loaded) or every 30 min. A beam counts as finished when the EMS gives an end date or the next beam is loaded on that loom.
- Reports → **Qualities**: every quality with beams, looms, dates, average days per beam; tap one for its beam timeline.
- Each loom's page ends with its **Quality history**.
- Assistant: "where did MILTON run?", "loom 6 history", "quality history".
- From now on the 5-minute snapshots also record each loom's quality, so exact fabric metres per quality are counted per day.
