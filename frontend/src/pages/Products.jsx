import { useEffect, useState } from 'react'
import axios from 'axios'

function SupplierRow({ supplier, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-5 gap-2 mb-1">
      <input className="border rounded px-2 py-1" aria-label="Supplier Name" title="Supplier Name" placeholder="Supplier Name" value={supplier.supplier_name} onChange={e => onChange({ ...supplier, supplier_name: e.target.value })} />
      <input type="number" step="0.01" className="border rounded px-2 py-1" aria-label="Unit Cost (£)" title="Unit Cost (£)" placeholder="Unit Cost (£)" value={supplier.unit_cost} onChange={e => onChange({ ...supplier, unit_cost: parseFloat(e.target.value || 0) })} />
      <input type="number" className="border rounded px-2 py-1" aria-label="MOQ" title="Minimum Order Quantity" placeholder="MOQ" value={supplier.moq} onChange={e => onChange({ ...supplier, moq: parseInt(e.target.value || 1) })} />
      <input type="number" step="0.01" className="border rounded px-2 py-1" aria-label="Bulk Price (£)" title="Bulk Price (£)" placeholder="Bulk Price (£)" value={supplier.bulk_price ?? ''} onChange={e => onChange({ ...supplier, bulk_price: e.target.value === '' ? null : parseFloat(e.target.value) })} />
      <button className="text-red-600" onClick={onRemove}>Remove</button>
    </div>
  )
}

export default function Products() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', category: '', sku: '', suppliers: [] })
  const [q, setQ] = useState('')
  const [file, setFile] = useState(null)

  const load = async () => {
    const res = await axios.get('/api/products', { params: { q } })
    setItems(res.data)
  }
  useEffect(() => { load() }, [])

  const addSupplier = () => setForm({ ...form, suppliers: [...form.suppliers, { supplier_name: '', unit_cost: 0, moq: 1, bulk_price: null }] })

  const create = async () => {
    await axios.post('/api/products', form)
    setForm({ name: '', category: '', sku: '', suppliers: [] })
    await load()
  }

  const remove = async (id) => {
    await axios.delete(`/api/products/${id}`)
    await load()
  }
  const removeAll = async () => {
    if (!confirm('Delete ALL products and suppliers?')) return
    await axios.delete('/api/products')
    await load()
  }

  const importCsv = async () => {
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    await axios.post('/api/products/import', fd)
    setFile(null)
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white border rounded">
        <div className="font-medium mb-2">New Product</div>
        <div className="grid sm:grid-cols-3 gap-2 mb-2">
          <label className="text-xs text-gray-600">
            <div>Name</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="e.g., Premium T-Shirt" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-xs text-gray-600">
            <div>Category</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="e.g., T-shirt" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          </label>
          <label className="text-xs text-gray-600">
            <div>SKU</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="Optional SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
          </label>
        </div>
        <div>
          <div className="mb-2">Suppliers</div>
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-600 font-medium mb-1">
            <div>Supplier Name</div>
            <div>Unit Cost (£)</div>
            <div>MOQ</div>
            <div>Bulk Price (£)</div>
            <div></div>
          </div>
          {form.suppliers.map((s, i) => (
            <SupplierRow key={i} supplier={s} onChange={v => setForm({ ...form, suppliers: form.suppliers.map((x, ix) => ix === i ? v : x) })} onRemove={() => setForm({ ...form, suppliers: form.suppliers.filter((_, ix) => ix !== i) })} />
          ))}
          <button className="bg-gray-100 border rounded px-2 py-1" onClick={addSupplier}>Add Supplier</button>
        </div>
        <div className="mt-3">
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={create}>Create</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input className="border rounded px-2 py-1" placeholder="Search products..." value={q} onChange={e => setQ(e.target.value)} />
        <button className="px-3 py-1 border rounded" onClick={load}>Search</button>
        <input type="file" accept='.csv' onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="px-3 py-1 border rounded" onClick={importCsv}>Import CSV</button>
      </div>

      <div className="bg-white border rounded">
        <div className="p-2 text-right"><button className="text-red-700" onClick={removeAll}>Delete All</button></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">SKU</th>
              <th className="text-left p-2">Suppliers</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-b align-top">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.category}</td>
                <td className="p-2">{p.sku}</td>
                <td className="p-2">
                  {(p.suppliers || []).map(s => (
                    <div key={s.id} className="text-gray-700">{s.supplier_name} · £{Number(s.unit_cost).toFixed(2)} (MOQ {s.moq})</div>
                  ))}
                </td>
                <td className="p-2 text-right">
                  <button className="text-red-600" onClick={() => remove(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



