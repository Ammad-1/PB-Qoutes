import { useEffect, useState } from 'react'
import axios from 'axios'

function TierRow({ tier, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-1">
      <input type="number" className="border rounded px-2 py-1" aria-label="Min Qty" title="Minimum Quantity" placeholder="Min Qty" value={tier.min_qty}
             onChange={e => onChange({ ...tier, min_qty: parseInt(e.target.value || 0) })} />
      <input type="number" step="0.01" className="border rounded px-2 py-1" aria-label="Per Unit (£)" title="Per Unit (£)" placeholder="Per Unit (£)" value={tier.per_unit_cost ?? ''}
             onChange={e => onChange({ ...tier, per_unit_cost: e.target.value === '' ? null : parseFloat(e.target.value) })} />
      <input type="number" step="0.01" className="border rounded px-2 py-1" aria-label="Per Colour (£)" title="Per Colour (£)" placeholder="Per Colour (£)" value={tier.per_colour_cost ?? ''}
             onChange={e => onChange({ ...tier, per_colour_cost: e.target.value === '' ? null : parseFloat(e.target.value) })} />
      <button className="text-red-600" onClick={onRemove}>Remove</button>
    </div>
  )
}

export default function PrintMethods() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', per_colour_cost: 0, per_unit_cost: 0, setup_fee: 0, tiers: [] })
  const [file, setFile] = useState(null)

  const load = async () => {
    const res = await axios.get('/api/print-methods')
    setItems(res.data)
  }
  useEffect(() => { load() }, [])

  const addTier = () => setForm({ ...form, tiers: [...form.tiers, { min_qty: 0, per_unit_cost: null, per_colour_cost: null }] })
  const create = async () => { await axios.post('/api/print-methods', form); setForm({ name: '', per_colour_cost: 0, per_unit_cost: 0, setup_fee: 0, tiers: [] }); load() }
  const remove = async (id) => { await axios.delete(`/api/print-methods/${id}`); load() }
  const removeAll = async () => { if (!confirm('Delete ALL print methods and tiers?')) return; await axios.delete('/api/print-methods'); load() }
  const importCsv = async () => { if (!file) return; const fd = new FormData(); fd.append('file', file); await axios.post('/api/print-methods/import', fd); setFile(null); load() }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-white border rounded">
        <div className="font-medium mb-2">New Print Method</div>
        <div className="grid sm:grid-cols-4 gap-2 mb-2 text-xs text-gray-600">
          <label>
            <div>Name</div>
            <input className="border rounded px-2 py-1 w-full" placeholder="e.g., Screen Print" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <div>Per Colour (£)</div>
            <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" placeholder="0.35" value={form.per_colour_cost} onChange={e => setForm({ ...form, per_colour_cost: parseFloat(e.target.value || 0) })} />
          </label>
          <label>
            <div>Per Unit (£)</div>
            <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" placeholder="1.20" value={form.per_unit_cost} onChange={e => setForm({ ...form, per_unit_cost: parseFloat(e.target.value || 0) })} />
          </label>
          <label>
            <div>Setup Fee (£)</div>
            <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" placeholder="0.00" value={form.setup_fee} onChange={e => setForm({ ...form, setup_fee: parseFloat(e.target.value || 0) })} />
          </label>
        </div>
        <div>
          <div className="mb-2">Tiers (optional)</div>
          <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 font-medium mb-1">
            <div>Min Qty</div>
            <div>Per Unit (£)</div>
            <div>Per Colour (£)</div>
            <div></div>
          </div>
          {form.tiers.map((t, i) => (
            <TierRow key={i} tier={t} onChange={v => setForm({ ...form, tiers: form.tiers.map((x, ix) => ix === i ? v : x) })} onRemove={() => setForm({ ...form, tiers: form.tiers.filter((_, ix) => ix !== i) })} />
          ))}
          <button className="bg-gray-100 border rounded px-2 py-1" onClick={addTier}>Add Tier</button>
        </div>
        <div className="mt-3"><button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={create}>Create</button></div>
      </div>

      <div className="bg-white border rounded">
        <div className="p-2 text-right"><button className="text-red-700" onClick={removeAll}>Delete All</button></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Per Colour</th>
              <th className="text-left p-2">Per Unit</th>
              <th className="text-left p-2">Tiers</th>
              <th className="text-left p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(pm => (
              <tr key={pm.id} className="border-b">
                <td className="p-2">{pm.name}</td>
                <td className="p-2">£{Number(pm.per_colour_cost).toFixed(2)}</td>
                <td className="p-2">£{Number(pm.per_unit_cost).toFixed(2)}</td>
                <td className="p-2">{(pm.tiers || []).map(t => (<div key={t.id}>{t.min_qty}+ → £{t.per_unit_cost ?? t.per_colour_cost}</div>))}</td>
                <td className="p-2 text-right"><button className="text-red-600" onClick={() => remove(pm.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <input type="file" accept='.csv' onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="px-3 py-1 border rounded" onClick={importCsv}>Import CSV</button>
      </div>
    </div>
  )
}



