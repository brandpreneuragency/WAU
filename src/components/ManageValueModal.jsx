import React, { useState, useMemo } from 'react'
import Modal from './Modal'
import Card from './Card'

export default function ManageValueModal({ isOpen, onClose, staff = [], inventory = [], tenantId, onComplete }) {
  const [type, setType] = useState('department')
  const [value, setValue] = useState('')
  const [action, setAction] = useState('unassign')
  const [replacement, setReplacement] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const uniqueValues = useMemo(() => {
    const setVals = new Set()
    if (type === 'department') {
      staff.forEach(s => s.department && setVals.add(s.department))
      inventory.forEach(i => i.department && setVals.add(i.department))
    } else {
      staff.forEach(s => s.position && setVals.add(s.position))
      inventory.forEach(i => i.position && setVals.add(i.position))
    }
    return Array.from(setVals).sort()
  }, [type, staff, inventory])

  const preview = () => {
    // Client-side preview counts
    const staffCount = staff.filter(s => (type === 'department' ? s.department === value : s.position === value)).length
    const invCount = inventory.filter(i => (type === 'department' ? i.department === value : i.position === value)).length
    return { staffCount, invCount }
  }

  const handleConfirm = async () => {
    if (!value) return setError('Choose a value to manage')
    if (action === 'reassign' && !replacement) return setError('Provide replacement value')
    setError('')
    setLoading(true)

    try {
      // Use supabase auth session token for Authorization header
      const { data: { session } } = await (await import('../lib/supabaseClient')).supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/functions/manage-value-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ tenant_id: tenantId, type, old_value: value, action: action === 'reassign' ? 'reassign' : 'unassign', new_value: replacement || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Server error')
      setResult(data)
      if (onComplete) onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const counts = preview()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Departments / Positions" maxWidth="lg">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label>
            <select value={type} onChange={(e) => { setType(e.target.value); setValue('') }} className="input-soft w-full">
              <option value="department">Department</option>
              <option value="position">Position</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Value</label>
            <select value={value} onChange={(e) => setValue(e.target.value)} className="input-soft w-full">
              <option value="">-- Select value --</option>
              {uniqueValues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="input-soft w-full">
              <option value="unassign">Mark as Unassigned</option>
              <option value="reassign">Reassign to another value</option>
            </select>
          </div>
        </div>

        {action === 'reassign' && (
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Replacement value</label>
            <input value={replacement} onChange={(e) => setReplacement(e.target.value)} className="input-soft w-full" />
          </div>
        )}

        <Card padding="small">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Staff affected</div>
              <div className="text-2xl font-bold">{counts.staffCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Inventory items affected</div>
              <div className="text-2xl font-bold">{counts.invCount}</div>
            </div>
          </div>
        </Card>

        {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded">{error}</div>}
        {result && <div className="p-3 text-sm text-green-700 bg-green-50 rounded">{result.message || 'Updated'}</div>}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200">Cancel</button>
          <button onClick={handleConfirm} disabled={loading || !value} className="px-4 py-2 rounded-xl bg-gray-900 text-white">{loading ? 'Processing...' : 'Confirm'}</button>
        </div>
      </div>
    </Modal>
  )
}
