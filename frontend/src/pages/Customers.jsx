import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Customers() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ company_name: '', contact_person: '', email: '', phone: '', address: '' })
  const [q, setQ] = useState('')

  const load = async () => {
    const res = await axios.get('/api/customers', { params: { q } })
    setItems(res.data)
  }
  useEffect(() => { load() }, [])

  const create = async () => { await axios.post('/api/customers', form); setForm({ company_name: '', contact_person: '', email: '', phone: '', address: '' }); load() }
  const remove = async (id) => { await axios.delete(`/api/customers/${id}`); load() }
  const removeAll = async () => { if (!confirm('Delete ALL customers?')) return; await axios.delete('/api/customers'); load() }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white border rounded">
        <div className="font-medium mb-2">New Customer</div>
        <div className="grid sm:grid-cols-3 gap-2 mb-2 text-xs text-gray-600">
          <label>
            <div>Company</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="Company" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
          </label>
          <label>
            <div>Contact Person</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="Jane Doe" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
          </label>
          <label>
            <div>Email</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="name@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <div>Phone</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="+44 ..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="sm:col-span-3">
            <div>Address</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="Street, City" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          </label>
        </div>
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={create}>Create</button>
      </div>

      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="Search customers..." value={q} onChange={e => setQ(e.target.value)} />
        <button className="px-3 py-1 border rounded" onClick={load}>Search</button>
      </div>

      <div className="bg-white border rounded">
        <div className="p-2 text-right"><button className="text-red-700" onClick={removeAll}>Delete All</button></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Company</th>
              <th className="text-left p-2">Contact</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Phone</th>
              <th className="text-left p-2">Address</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.company_name}</td>
                <td className="p-2">{c.contact_person}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.phone}</td>
                <td className="p-2">{c.address}</td>
                <td className="p-2 text-right"><button className="text-red-600" onClick={() => remove(c.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



