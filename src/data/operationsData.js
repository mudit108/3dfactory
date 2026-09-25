// Dispatch, quality, maintenance and company information (demo data).
export const dispatchData = {
  truck: {
    number: 'GJ 05 BX 4821',
    transporter: 'Shree Ganesh Roadlines',
    driver: 'Harpal Singh',
    destination: 'Bhiwandi, Maharashtra',
    order: 'SO-26-0487',
    challan: 'DC-26-2231',
    rollsLoaded: 42,
    rollsTotal: 60,
    meters: 6300,
    weightKg: 3950,
    dockedAt: '07:55',
    eta: '11:30',
  },
  dispatchedToday: { trucks: 2, meters: 11850, rolls: 118 },
  pendingOrders: [
    { order: 'SO-26-0488', party: 'Kanha Sarees', meters: 4200, due: 'Today 16:00' },
    { order: 'SO-26-0491', party: 'BagLine Industries', meters: 2600, due: 'Tomorrow' },
    { order: 'SO-26-0493', party: 'Om Sai Textiles', meters: 1900, due: '26 Sep' },
  ],
}

export const qualityData = {
  'INS-01': { status: 'Inspecting', lot: 'LT-26-0921', inspectedToday: 6240, defectsPer100m: 0.8, gradeA: 96.2, operator: 'Sunita Patil', speed: '18 m/min' },
  'INS-02': { status: 'Standby', lot: '—', inspectedToday: 4180, defectsPer100m: 1.1, gradeA: 94.8, operator: 'Unassigned (break)', speed: '0 m/min' },
}

export const maintenanceTasks = [
  { machine: 'WJ-12', task: 'Nozzle & pump seal replacement', priority: 'High', status: 'In progress', tech: 'Maintenance team' },
  { machine: 'WJ-05', task: 'Warp beam change + heald cleaning', priority: 'Medium', status: 'Scheduled 11:00', tech: 'Beam gaiting crew' },
]

export const companyInfo = {
  name: 'SHREE SATIJI TEXTILES',
  tagline: 'Textile Manufacturing',
  plant: 'Waterjet Weaving Unit',
  area: '6,000 m² covered shed',
  looms: 18,
  capacityPerMonth: '5.5 lakh metres',
  products: ['Polyester taffeta & pongee', 'Nylon taslan & ripstop', 'Oxford & georgette', 'Micro peach'],
  shifts: '2 × 12 h',
  visitorsToday: 3,
  gateStatus: 'Open · Visitor pass required',
  note: 'Demo data — connect your EMS to show live figures.',
}
