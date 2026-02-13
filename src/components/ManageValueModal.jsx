import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Building2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Check,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import Modal from './Modal'

export default function ManageValueModal({ isOpen, onClose, tenantId, onComplete }) {
  // ── data ──
  const [orgData, setOrgData] = useState([])       // rows from org_structure
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ── UI state ──
  const [expandedDepts, setExpandedDepts] = useState(new Set())
  const [creatingDept, setCreatingDept] = useState(false)
  const [deptDraft, setDeptDraft] = useState('')
  const [addingPosTo, setAddingPosTo] = useState(null)   // department name
  const [posDraft, setPosDraft] = useState('')
  const [editingItem, setEditingItem] = useState(null)     // { type, dept, oldValue }
  const [editValue, setEditValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { type, dept, value }

  const deptInputRef = useRef(null)
  const posInputRef = useRef(null)

  // ── helpers ──
  const getSupabase = useCallback(async () => {
    const { supabase } = await import('../lib/supabaseClient')
    return supabase
  }, [])

  // ── fetch ──
  const fetchOrg = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const supabase = await getSupabase()
      const { data, error: fetchErr } = await supabase
        .from('org_structure')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('department')
        .order('position')
      if (fetchErr) throw fetchErr
      setOrgData(data || [])
      // auto-expand all departments on first load
      const depts = new Set((data || []).map(r => r.department))
      setExpandedDepts(depts)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenantId, getSupabase])

  useEffect(() => {
    if (isOpen) {
      fetchOrg()
      setError('')
      setCreatingDept(false)
      setAddingPosTo(null)
      setEditingItem(null)
      setDeleteConfirm(null)
    }
  }, [isOpen, fetchOrg])

  // ── derived tree ──
  const tree = useMemo(() => {
    const map = {}
    orgData.forEach(row => {
      if (!map[row.department]) map[row.department] = []
      if (row.position) map[row.department].push(row.position)
    })
    // sort positions inside each dept
    Object.values(map).forEach(arr => arr.sort((a, b) => a.localeCompare(b)))
    return map
  }, [orgData])

  const deptList = useMemo(() => Object.keys(tree).sort(), [tree])

  // ── toggles ──
  const toggleDept = (dept) => {
    const next = new Set(expandedDepts)
    if (next.has(dept)) next.delete(dept)
    else next.add(dept)
    setExpandedDepts(next)
  }

  // ── CRUD: Department ──
  const handleCreateDept = async () => {
    const name = deptDraft.trim()
    if (!name) return
    setSaving(true)
    try {
      const supabase = await getSupabase()
      const { error: insErr } = await supabase
        .from('org_structure')
        .insert({ tenant_id: tenantId, department: name, position: null })
      if (insErr) throw insErr
      setCreatingDept(false)
      setDeptDraft('')
      await fetchOrg()
      // auto-expand new dept & start adding position
      setExpandedDepts(prev => new Set([...prev, name]))
      setAddingPosTo(name)
      setPosDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRenameDept = async () => {
    const newName = editValue.trim()
    if (!newName || !editingItem) return
    const oldName = editingItem.oldValue
    if (newName === oldName) { setEditingItem(null); return }
    setSaving(true)
    try {
      const supabase = await getSupabase()
      // 1. Update org_structure
      const { error: e1 } = await supabase
        .from('org_structure')
        .update({ department: newName })
        .eq('tenant_id', tenantId)
        .eq('department', oldName)
      if (e1) throw e1
      // 2. Propagate to staff & inventory
      await supabase.from('staff').update({ department: newName }).eq('tenant_id', tenantId).eq('department', oldName)
      await supabase.from('inventory').update({ department: newName }).eq('tenant_id', tenantId).eq('department', oldName)
      setEditingItem(null)
      setEditValue('')
      await fetchOrg()
      if (onComplete) onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDept = async (dept) => {
    setSaving(true)
    try {
      const supabase = await getSupabase()
      // 1. Remove from org_structure
      const { error: e1 } = await supabase
        .from('org_structure')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('department', dept)
      if (e1) throw e1
      // 2. Unassign in staff & inventory
      await supabase.from('staff').update({ department: null, position: null }).eq('tenant_id', tenantId).eq('department', dept)
      await supabase.from('inventory').update({ department: null, position: null }).eq('tenant_id', tenantId).eq('department', dept)
      setDeleteConfirm(null)
      await fetchOrg()
      if (onComplete) onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── CRUD: Position ──
  const handleCreatePos = async (dept) => {
    const name = posDraft.trim()
    if (!name) return
    setSaving(true)
    try {
      const supabase = await getSupabase()
      const { error: insErr } = await supabase
        .from('org_structure')
        .insert({ tenant_id: tenantId, department: dept, position: name })
      if (insErr) throw insErr
      setPosDraft('')
      await fetchOrg()
      // keep adding-position mode open for "Add More"
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRenamePos = async () => {
    const newName = editValue.trim()
    if (!newName || !editingItem) return
    const { dept, oldValue } = editingItem
    if (newName === oldValue) { setEditingItem(null); return }
    setSaving(true)
    try {
      const supabase = await getSupabase()
      // 1. Update org_structure
      const { error: e1 } = await supabase
        .from('org_structure')
        .update({ position: newName })
        .eq('tenant_id', tenantId)
        .eq('department', dept)
        .eq('position', oldValue)
      if (e1) throw e1
      // 2. Propagate
      await supabase.from('staff').update({ position: newName }).eq('tenant_id', tenantId).eq('position', oldValue)
      await supabase.from('inventory').update({ position: newName }).eq('tenant_id', tenantId).eq('position', oldValue)
      setEditingItem(null)
      setEditValue('')
      await fetchOrg()
      if (onComplete) onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePos = async (dept, pos) => {
    setSaving(true)
    try {
      const supabase = await getSupabase()
      const { error: e1 } = await supabase
        .from('org_structure')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('department', dept)
        .eq('position', pos)
      if (e1) throw e1
      await supabase.from('staff').update({ position: null }).eq('tenant_id', tenantId).eq('position', pos)
      await supabase.from('inventory').update({ position: null }).eq('tenant_id', tenantId).eq('position', pos)
      setDeleteConfirm(null)
      await fetchOrg()
      if (onComplete) onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── focus helpers ──
  useEffect(() => {
    if (creatingDept && deptInputRef.current) deptInputRef.current.focus()
  }, [creatingDept])

  useEffect(() => {
    if (addingPosTo && posInputRef.current) posInputRef.current.focus()
  }, [addingPosTo])

  // ── key handler wrapper ──
  const onKeyDown = (e, onEnter, onEscape) => {
    if (e.key === 'Enter') { e.preventDefault(); onEnter() }
    if (e.key === 'Escape') { e.preventDefault(); onEscape?.() }
  }

  // ── empty state ──
  const isEmpty = deptList.length === 0 && !creatingDept

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Categories" maxWidth="xl" hasHeader={false}>
      <div className="relative p-6 space-y-4 min-h-[200px]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : isEmpty ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-gray-300" />
            </div>
            <button
              onClick={() => { setCreatingDept(true); setDeptDraft('') }}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Create your first department
            </button>
          </div>
        ) : (
          /* ── Tree list ── */
          <div className="space-y-3">
            {deptList.map(dept => {
              const positions = tree[dept] || []
              const isExpanded = expandedDepts.has(dept)
              const isEditingThis = editingItem?.type === 'department' && editingItem.oldValue === dept

              return (
                <div key={dept} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-soft-sm">
                  {/* Department header */}
                  <div className="flex items-center gap-2 p-3 bg-gray-50/50 group">
                    <button onClick={() => toggleDept(dept)} className="p-1 rounded-lg hover:bg-gray-200/50 transition-colors">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center shadow-soft-sm text-gray-400">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>

                    {isEditingThis ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => onKeyDown(e, handleRenameDept, () => setEditingItem(null))}
                          className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-sm font-bold focus:outline-none focus:border-gray-400"
                        />
                        <button onClick={handleRenameDept} disabled={saving} className="p-1 rounded-lg text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => toggleDept(dept)} className="flex-1 text-left">
                          <span className="text-sm font-bold text-gray-900">{dept}</span>
                          <span className="ml-2 text-[10px] text-gray-400 font-medium">{positions.length} position{positions.length !== 1 ? 's' : ''}</span>
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingItem({ type: 'department', oldValue: dept }); setEditValue(dept) }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Rename department"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'department', value: dept })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete department"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Positions sub-list */}
                  {isExpanded && (
                    <div className="border-t border-gray-50">
                      {positions.map(pos => {
                        const isEditingPos = editingItem?.type === 'position' && editingItem.dept === dept && editingItem.oldValue === pos
                        return (
                          <div key={pos} className="flex items-center gap-2 pl-12 pr-3 py-2 hover:bg-gray-50/50 group/pos transition-colors">
                            <Briefcase className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                            {isEditingPos ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => onKeyDown(e, handleRenamePos, () => setEditingItem(null))}
                                  className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:border-gray-400"
                                />
                                <button onClick={handleRenamePos} disabled={saving} className="p-1 rounded-lg text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingItem(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1 text-sm font-medium text-gray-700">{pos}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover/pos:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingItem({ type: 'position', dept, oldValue: pos }); setEditValue(pos) }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Rename position"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm({ type: 'position', dept, value: pos })}
                                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete position"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}

                      {/* Inline position creator */}
                      {addingPosTo === dept ? (
                        <div className="flex items-center gap-2 pl-12 pr-3 py-2">
                          <Briefcase className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          <input
                            ref={posInputRef}
                            value={posDraft}
                            onChange={e => setPosDraft(e.target.value)}
                            onKeyDown={e => onKeyDown(e, () => handleCreatePos(dept), () => { setAddingPosTo(null); setPosDraft('') })}
                            placeholder={positions.length === 0 ? 'Create your first position' : 'Add more...'}
                            className="flex-1 px-2 py-1 rounded-lg border border-dashed border-gray-200 text-sm font-medium placeholder:text-gray-300 focus:outline-none focus:border-gray-400 bg-transparent"
                          />
                          <button
                            onClick={() => handleCreatePos(dept)}
                            disabled={saving || !posDraft.trim()}
                            className="p-1 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-30 transition-colors"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setAddingPosTo(null); setPosDraft('') }}
                            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingPosTo(dept); setPosDraft('') }}
                          className="flex items-center gap-2 pl-12 pr-3 py-2 w-full text-left text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">
                            {positions.length === 0 ? 'Create your first position' : 'Add position'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add department row */}
            {creatingDept ? (
              <div className="border border-dashed border-gray-200 rounded-2xl p-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <input
                  ref={deptInputRef}
                  value={deptDraft}
                  onChange={e => setDeptDraft(e.target.value)}
                  onKeyDown={e => onKeyDown(e, handleCreateDept, () => { setCreatingDept(false); setDeptDraft('') })}
                  placeholder="Department name..."
                  className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-sm font-bold placeholder:text-gray-300 focus:outline-none focus:border-gray-400"
                />
                <button onClick={handleCreateDept} disabled={saving || !deptDraft.trim()} className="p-1 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-30"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setCreatingDept(false); setDeptDraft('') }} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <button
                onClick={() => { setCreatingDept(true); setDeptDraft('') }}
                className="flex items-center gap-2 px-4 py-3 w-full text-left text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-2xl hover:border-gray-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add department</span>
              </button>
            )}
          </div>
        )}

        {/* ── Delete confirmation overlay ── */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/5 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">
                    Delete {deleteConfirm.type}
                  </h3>
                  <p className="text-gray-400 text-[10px]">"{deleteConfirm.value}"</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                  {deleteConfirm.type === 'department'
                    ? 'All positions under this department will also be removed. Staff and inventory currently assigned will be unassigned.'
                    : 'Staff and inventory currently assigned to this position will be unassigned.'
                  }
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={() => {
                    if (deleteConfirm.type === 'department') handleDeleteDept(deleteConfirm.value)
                    else handleDeletePos(deleteConfirm.dept, deleteConfirm.value)
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-200"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
