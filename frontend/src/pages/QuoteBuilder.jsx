import { useEffect, useState } from 'react'
import axios from 'axios'

export default function QuoteBuilder() {
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [printMethods, setPrintMethods] = useState([])
  const [settings, setSettings] = useState({ vat_percent: 20, default_markup_percent: 30 })

  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([])
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const addLine = () => {
    setLines([...lines, { 
      product_id: '', 
      manual_product_name: '',
      print_method_id: '', 
      manual_print_method_name: '',
      quantity: 1, 
      pricing_mode: 'manual_unit', 
      manual_unit_price: '',
      manual_total: '',
      line_description: '',
      pack_size: settings.default_pack_size || '',
      delivery_per_pack: settings.default_delivery_per_pack || '',
      delivery_flat: settings.default_delivery_flat || ''
    }])
  }

  const updateLine = (index, field, value) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }

  const removeLine = (index) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const generateQuote = async () => {
    setError('')
    setSuccess('')

    if (!customerId) {
      setError('Please select a customer')
      return
    }

    if (lines.length === 0) {
      setError('Please add at least one item')
      return
    }

    const validLines = lines.filter(l => {
      const hasProduct = l.product_id || l.manual_product_name
      const hasPrint = l.print_method_id || l.manual_print_method_name
      const hasQty = l.quantity && Number(l.quantity) > 0
      const hasPrice = l.manual_unit_price && Number(l.manual_unit_price) > 0
      return hasProduct && hasPrint && hasQty && hasPrice
    })

    if (validLines.length === 0) {
      setError('Please ensure all items have product, print method, quantity, and unit price')
      return
    }

    const payload = {
      customer_id: Number(customerId),
      notes,
      terms,
      hide_supplier_in_pdf: true,
      lines: validLines.map(l => ({
        ...l,
        product_id: l.product_id ? Number(l.product_id) : null,
        print_method_id: l.print_method_id ? Number(l.print_method_id) : null,
        quantity: Number(l.quantity),
        product_unit_cost: Number(l.manual_unit_price)
      }))
    }

    try {
      const res = await axios.post('/api/quotes', payload)
      setSuccess(`Quote ${res.data.quote_number} created successfully!`)
      setLines([])
      setCustomerId('')
      setNotes('')
      setTerms('')
    } catch (e) {
      const msg = e?.response?.data?.error || e.message
      setError(msg)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800">Create New Quote</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer <span className="text-red-500">*</span>
            </label>
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              value={customerId} 
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">Select a customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-700">Quote Items</h3>
              <button 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                onClick={addLine}
              >
                + Add Item
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet. Click "Add Item" to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                        <select 
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          value={line.product_id || ''} 
                          onChange={e => updateLine(index, 'product_id', e.target.value)}
                        >
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Or type product name</label>
                        <input 
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" 
                          placeholder="Custom product name"
                          value={line.manual_product_name || ''} 
                          onChange={e => updateLine(index, 'manual_product_name', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Print Method</label>
                        <select 
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          value={line.print_method_id || ''} 
                          onChange={e => updateLine(index, 'print_method_id', e.target.value)}
                        >
                          <option value="">Select method</option>
                          {printMethods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Or type method</label>
                        <input 
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" 
                          placeholder="Custom method"
                          value={line.manual_print_method_name || ''} 
                          onChange={e => updateLine(index, 'manual_print_method_name', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          min="1"
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" 
                          value={line.quantity} 
                          onChange={e => updateLine(index, 'quantity', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (£) <span className="text-red-500">*</span></label>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" 
                          placeholder="0.00"
                          value={line.manual_unit_price || ''} 
                          onChange={e => updateLine(index, 'manual_unit_price', e.target.value)}
                        />
                      </div>

                      <div className="flex items-end">
                        <button 
                          className="w-full bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 transition text-sm"
                          onClick={() => removeLine(index)}
                        >
                          Remove Item
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                      <input 
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" 
                        placeholder="Add any additional details for this item"
                        value={line.line_description || ''} 
                        onChange={e => updateLine(index, 'line_description', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea 
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                rows="3"
                placeholder="Any additional notes for this quote"
                value={notes} 
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms (optional)</label>
              <textarea 
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                rows="3"
                placeholder="Payment terms, delivery terms, etc."
                value={terms} 
                onChange={e => setTerms(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={generateQuote}
              disabled={!customerId || lines.length === 0}
            >
              Generate Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
