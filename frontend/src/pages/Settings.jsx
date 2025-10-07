import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Settings() {
  const [settings, setSettings] = useState({ vat_percent: 20, default_markup_percent: 30, quote_prefix: 'PB' })

  useEffect(() => { (async () => { const res = await axios.get('/api/settings'); setSettings(res.data) })() }, [])

  const save = async () => {
    await axios.put('/api/settings', settings)
    alert('Settings saved')
  }

  return (
    <div className="p-4 bg-white border rounded max-w-lg">
      <div className="font-medium mb-3">Settings</div>
      <div className="space-y-2">
        <label className="block">
          <div className="text-sm text-gray-600">VAT %</div>
          <input type="number" step="0.1" className="border rounded px-2 py-1 w-full" value={settings.vat_percent}
                 onChange={e => setSettings({ ...settings, vat_percent: parseFloat(e.target.value || 0) })} />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Default Markup %</div>
          <input type="number" step="0.1" className="border rounded px-2 py-1 w-full" value={settings.default_markup_percent}
                 onChange={e => setSettings({ ...settings, default_markup_percent: parseFloat(e.target.value || 0) })} />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Quote Prefix</div>
          <input className="border rounded px-2 py-1 w-full" value={settings.quote_prefix}
                 onChange={e => setSettings({ ...settings, quote_prefix: e.target.value })} />
        </label>
      </div>
      <div className="mt-3"><button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={save}>Save</button></div>
    </div>
  )
}



