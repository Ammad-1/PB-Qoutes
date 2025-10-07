import { useEffect, useState } from 'react'
import axios from 'axios'

export default function QuoteHistory() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    const res = await axios.get('/api/quotes', { params: { q, status, customer_id: customerId || undefined, from: from || undefined, to: to || undefined } })
    setItems(res.data)
  }
  useEffect(() => { (async () => { const c = await axios.get('/api/customers'); setCustomers(c.data); await load() })() }, [])

  const exportCsv = async () => {
    const res = await fetch('/api/quotes/export/csv')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quotes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const generatePdf = async (id) => {
    await axios.get(`/api/pdf/quote/${id}`)
    alert('PDF saved to Quotes folder')
  }

  const cloneQuote = async (id) => {
    const res = await axios.post(`/api/quotes/clone/${id}`)
    alert(`Cloned as ${res.data.quote_number}`)
    await load()
  }

  const updateStatus = async (id, status) => {
    await axios.put(`/api/quotes/${id}`, { status })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input className="border rounded px-2 py-1" aria-label="Search" title="Search quotes or customer" placeholder="Search..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="border rounded px-2 py-1" aria-label="Status" title="Status" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Pending</option>
          <option>Sent</option>
          <option>Accepted</option>
          <option>Lost</option>
        </select>
        <select className="border rounded px-2 py-1" aria-label="Customer" title="Customer" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <input type="date" className="border rounded px-2 py-1" aria-label="From date" title="From date" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" className="border rounded px-2 py-1" aria-label="To date" title="To date" value={to} onChange={e => setTo(e.target.value)} />
        <button className="px-3 py-1 border rounded" onClick={load}>Filter</button>
        <button className="px-3 py-1 border rounded" onClick={exportCsv}>Export CSV</button>
        <a className="px-3 py-1 border rounded" href="/api/quotes/export/xlsx">Export Excel</a>
      </div>

      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Quote #</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Customer</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Total</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(q => (
              <tr key={q.id} className="border-b">
                <td className="p-2">{q.quote_number}</td>
                <td className="p-2">{new Date(q.date).toLocaleDateString()}</td>
                <td className="p-2">{q.company_name}</td>
                <td className="p-2">{q.status}</td>
                <td className="p-2 text-right">£{Number(q.total).toFixed(2)}</td>
                <td className="p-2 text-right space-x-2">
                  <button className="text-blue-700" onClick={() => generatePdf(q.id)}>PDF</button>
                  <button className="text-green-700" onClick={() => cloneQuote(q.id)}>Clone</button>
                  <button className="text-red-700" onClick={async () => { if (confirm('Delete this quote?')) { await axios.delete(`/api/quotes/${q.id}`); load() } }}>Delete</button>
                  <select className="border rounded px-1 py-0.5" value={q.status} onChange={e => updateStatus(q.id, e.target.value)}>
                    <option>Pending</option>
                    <option>Sent</option>
                    <option>Accepted</option>
                    <option>Lost</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



