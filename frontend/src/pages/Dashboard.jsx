import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [kpis, setKpis] = useState({ totalQuotes: 0, totalRevenue: 0, averageMargin: 0 })
  const [filters, setFilters] = useState({ q: '', status: '', from: '', to: '' })
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')

  useEffect(() => {
    async function fetchData() {
      const [qs, cs] = await Promise.all([
        axios.get('/api/quotes', { params: { q: filters.q || undefined, status: filters.status || undefined, from: filters.from || undefined, to: filters.to || undefined, customer_id: customerId || undefined } }),
        axios.get('/api/customers')
      ])
      const res = { data: qs.data }
      const quotes = res.data
      const totalQuotes = quotes.length
      const totalRevenue = quotes.reduce((s, q) => s + Number(q.total || 0), 0)
      const avgMargin = quotes.length ? (quotes.reduce((s, q) => s + Number(q.markup_percent || 0), 0) / quotes.length) : 0
      setKpis({ totalQuotes, totalRevenue, averageMargin: avgMargin })
      setCustomers(cs.data)
    }
    fetchData()
  }, [filters.q, filters.status, filters.from, filters.to, customerId])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded border">
          <div className="text-gray-500 text-sm">Total Quotes</div>
          <div className="text-2xl font-semibold">{kpis.totalQuotes}</div>
        </div>
        <div className="p-4 bg-white rounded border">
          <div className="text-gray-500 text-sm">Total Revenue</div>
          <div className="text-2xl font-semibold">£{kpis.totalRevenue.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-white rounded border">
          <div className="text-gray-500 text-sm">Average Markup %</div>
          <div className="text-2xl font-semibold">{kpis.averageMargin.toFixed(1)}%</div>
        </div>
      </div>

      <div className="p-4 bg-white rounded border">
        <div className="font-medium mb-2">Filters</div>
        <div className="grid sm:grid-cols-5 gap-2">
          <input className="border rounded px-2 py-1" aria-label="Search" title="Search" placeholder="Search..." value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} />
          <select className="border rounded px-2 py-1" aria-label="Status" title="Status" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Sent</option>
            <option>Accepted</option>
            <option>Lost</option>
          </select>
          <input type="date" className="border rounded px-2 py-1" aria-label="From date" title="From date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
          <input type="date" className="border rounded px-2 py-1" aria-label="To date" title="To date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
          <select className="border rounded px-2 py-1" aria-label="Customer" title="Customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="mt-3 text-sm text-gray-600">Quick links: <a className="text-blue-600" href="/quote">New Quote</a> · <a className="text-blue-600" href="/history">Export History</a></div>
      </div>
    </div>
  )
}



