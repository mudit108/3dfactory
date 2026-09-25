// Accounts dashboard (INR). Values in rupees.
export const accountsData = {
  todaySales: 485000,
  receivables: 1840000,
  payables: 920000,
  todayExpenses: 125000,
  pendingInvoices: 14,
  monthlyRevenue: 14200000,
  cashInBank: 3260000,
  gstPayable: 214000,
  weeklySales: [
    { day: 'Thu', value: 412000 },
    { day: 'Fri', value: 538000 },
    { day: 'Sat', value: 466000 },
    { day: 'Sun', value: 118000 },
    { day: 'Mon', value: 502000 },
    { day: 'Tue', value: 447000 },
    { day: 'Wed', value: 485000 },
  ],
  monthlyTrend: [
    { month: 'Apr', value: 11.2 },
    { month: 'May', value: 12.1 },
    { month: 'Jun', value: 11.6 },
    { month: 'Jul', value: 12.9 },
    { month: 'Aug', value: 13.4 },
    { month: 'Sep', value: 14.2 },
  ],
  receivablesAging: [
    { bucket: '0–30 days', value: 980000, color: '#34d399' },
    { bucket: '31–60 days', value: 560000, color: '#fbbf24' },
    { bucket: '61–90 days', value: 210000, color: '#fb923c' },
    { bucket: '90+ days', value: 90000, color: '#f43f5e' },
  ],
  expenseBreakdown: [
    { label: 'Yarn purchase', value: 62000 },
    { label: 'Power', value: 31000 },
    { label: 'Wages', value: 21000 },
    { label: 'Maintenance', value: 7000 },
    { label: 'Other', value: 4000 },
  ],
  recentInvoices: [
    { no: 'SST/26-27/1184', party: 'Mehta Fabrics, Surat', amount: 186500, status: 'Paid' },
    { no: 'SST/26-27/1185', party: 'Kanha Sarees', amount: 142300, status: 'Pending' },
    { no: 'SST/26-27/1186', party: 'BagLine Industries', amount: 98700, status: 'Pending' },
    { no: 'SST/26-27/1187', party: 'Umbrella Co. Mumbai', amount: 57500, status: 'Overdue' },
  ],
}
export default accountsData
