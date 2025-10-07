import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

function LineItemRow({ line, onChange, products, printMethods, errors, showErrors }) {
  return (
    <div className="grid grid-cols-5 gap-2 items-center">
      <select className={`border rounded px-2 py-1 ${showErrors && errors?.product ? 'border-red-500' : ''}`} aria-label="Product" title="Product" value={line.product_id || ''} onChange={e => onChange({ ...line, product_id: Number(e.target.value) })}>
        <option value="">Product</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input className="border rounded px-2 py-1" placeholder="Or type product name" value={line.manual_product_name || ''} onChange={e => onChange({ ...line, manual_product_name: e.target.value })} />
      <select className={`border rounded px-2 py-1 ${showErrors && errors?.print ? 'border-red-500' : ''}`} aria-label="Print Method" title="Print Method" value={line.print_method_id || ''} onChange={e => onChange({ ...line, print_method_id: Number(e.target.value) })}>
        <option value="">Print Method</option>
        {printMethods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <input className="border rounded px-2 py-1" placeholder="Or type method" value={line.manual_print_method_name || ''} onChange={e => onChange({ ...line, manual_print_method_name: e.target.value })} />
      <input type="number" min="1" className={`border rounded px-2 py-1 ${showErrors && errors?.qty ? 'border-red-500' : ''}`} aria-label="Quantity" title="Quantity" placeholder="Quantity" value={line.quantity || 1} onChange={e => onChange({ ...line, quantity: parseInt(e.target.value || 1) })} />
    </div>
  )
}

export default function QuoteBuilder() {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [printMethods, setPrintMethods] = useState([])
  const [settings, setSettings] = useState({ vat_percent: 20, default_markup_percent: 30 })

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([])
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [markup, setMarkup] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [hideSupplier, setHideSupplier] = useState(true)
  const getLineErrors = (l) => {
    const base = {
      product: !(l.product_id || l.manual_product_name),
      print: !(l.print_method_id || l.manual_print_method_name),
      qty: !l.quantity || Number(l.quantity) <= 0,
      cost: false,
    }
    if (l.pricing_mode === 'manual_total') {
      base.cost = typeof l.manual_total === 'undefined' || isNaN(Number(l.manual_total))
    } else if (l.pricing_mode === 'manual_unit') {
      base.cost = typeof l.manual_unit_price === 'undefined' || isNaN(Number(l.manual_unit_price))
    } else {
      base.cost = typeof l.product_unit_cost === 'undefined' || isNaN(Number(l.product_unit_cost))
    }
    return base
  }
  const isComplete = (l) => {
    const e = getLineErrors(l)
    return !(e.product || e.print || e.qty || e.cost)
  }

  useEffect(() => {
    async function load() {
      const [c, p, pm, s] = await Promise.all([
        axios.get('/api/customers'),
        axios.get('/api/products'),
        axios.get('/api/print-methods'),
        axios.get('/api/settings')
      ])
      setCustomers(c.data)
      setProducts(p.data)
      setPrintMethods(pm.data)
      setSettings(s.data)
    }
    load()
  }, [])

  // Manual-only flow: suppliers not used in UI

  const addLine = () => setLines([...lines, { product_id: '', print_method_id: '', quantity: 1, pricing_mode: 'manual_unit', manual_unit_price: '', manual_total: '', line_description: '', pack_size: settings.default_pack_size || '', delivery_per_pack: settings.default_delivery_per_pack || '', delivery_flat: settings.default_delivery_flat || '' }])
  const removeLine = (ix) => setLines(lines.filter((_, i) => i !== ix))

  const submit = async () => {
    setError('')
    setSubmitted(true)
    const cleanedLines = lines
      .map(l => ({
        ...l,
        product_id: l.product_id ? Number(l.product_id) : null,
        supplier_id: l.supplier_id ? Number(l.supplier_id) : null,
        print_method_id: l.print_method_id ? Number(l.print_method_id) : null,
        colours: Number(l.colours || 0),
        quantity: Number(l.quantity || 0),
        product_unit_cost: Number(l.product_unit_cost)
      }))
      .filter(isComplete)

    const payload = {
      customer_id: Number(customerId),
      notes,
      terms,
      markup_percent: markup === '' ? undefined : Number(markup),
      hide_supplier_in_pdf: hideSupplier,
      lines: cleanedLines
    }
    if (!payload.lines.length) {
      setError('Add at least one line with Product, Print Method, Quantity (>0), and Unit Cost.')
      return
    }
    try {
      const res = await axios.post('/api/quotes', payload)
      alert(`Quote saved: ${res.data.quote_number}`)
      setLines([])
      setSubmitted(false)
      setError('')
    } catch (e) {
      const msg = e?.response?.data?.error || e.message
      setError(msg)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white border rounded space-y-4">
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <select className="border rounded px-2 py-1" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <input className="border rounded px-2 py-1" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Terms" value={terms} onChange={e => setTerms(e.target.value)} />
          <input type="text" className="border rounded px-2 py-1" placeholder="Leave blank (no auto pricing)" disabled value="Manual pricing only" />
        </div>
        <div className="space-y-3">
          {lines.length > 0 && (
            <div className="grid grid-cols-5 gap-2 text-xs text-gray-700 font-semibold">
              <div>Product</div>
              <div>Or type product name</div>
              <div>Print Method</div>
              <div>Or type method</div>
              <div>Quantity</div>
            </div>
          )}
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <LineItemRow line={l} onChange={v => setLines(lines.map((x, ix) => ix === i ? v : x))} products={products} printMethods={printMethods} errors={getLineErrors(l)} showErrors={submitted} />
              <button className="text-red-600" onClick={() => removeLine(i)}>Remove</button>
            </div>
          ))}
          <div className="flex justify-end">
            <button className="px-3 py-1 border rounded" onClick={addLine}>Add line</button>
          </div>
        </div>
        {lines.length > 0 && (
          <div className="p-4 border rounded bg-gray-50 space-y-3">
            <div className="text-sm font-medium">Manual Pricing</div>
            <div className="text-xs text-gray-600">Use these fields to charge your chosen price. Example: mugs £1.25 each and £10 delivery per box of 36, or set a manual total.</div>
            <div className="grid sm:grid-cols-6 lg:grid-cols-8 gap-3 items-end">
              <label className="text-xs text-gray-700">
                <div>Pricing Mode</div>
                <select className="border rounded px-2 py-1 w-full" value={lines[0]?.pricing_mode || 'manual_unit'} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, pricing_mode: e.target.value } : x))}>
                  <option value="manual_unit">Manual per unit (+ delivery)</option>
                  <option value="manual_total">Manual line total</option>
                </select>
              </label>
              <label className="text-xs text-gray-700">
                <div>Manual Unit (£)</div>
                <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" value={lines[0]?.manual_unit_price || ''} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, manual_unit_price: e.target.value } : x))} />
              </label>
              <label className="text-xs text-gray-700">
                <div>Manual Total (£)</div>
                <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" value={lines[0]?.manual_total || ''} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, manual_total: e.target.value } : x))} />
              </label>
              <label className="text-xs text-gray-700">
                <div>Pack Size</div>
                <input type="number" className="border rounded px-2 py-1 w-full" value={lines[0]?.pack_size || ''} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, pack_size: e.target.value } : x))} />
              </label>
              <label className="text-xs text-gray-700">
                <div>Delivery/Pack (£)</div>
                <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" value={lines[0]?.delivery_per_pack || ''} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, delivery_per_pack: e.target.value } : x))} />
              </label>
              <label className="text-xs text-gray-700">
                <div>Delivery Flat (£)</div>
                <input type="number" step="0.01" className="border rounded px-2 py-1 w-full" value={lines[0]?.delivery_flat || ''} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, delivery_flat: e.target.value } : x))} />
              </label>
              <label className="text-xs text-gray-700 sm:col-span-2">
                <div>Line Description (for PDF)</div>
                <input className="border rounded px-2 py-1 w-full" value={lines[0]?.line_description || ''} onChange={e => setLines(lines.map((x, ix) => ix === 0 ? { ...x, line_description: e.target.value } : x))} />
              </label>
              <label className="text-xs text-gray-700">
                <div>Hide Supplier on PDF</div>
                <select className="border rounded px-2 py-1 w-full" value={hideSupplier ? '1' : '0'} onChange={e => setHideSupplier(e.target.value === '1')}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
            </div>
          </div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <button disabled={!customerId || !lines.some(isComplete)} className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50" onClick={(e) => { e.preventDefault(); submit(); }}>Save Quote</button>
        </div>
      </div>
    </div>
  )
}



