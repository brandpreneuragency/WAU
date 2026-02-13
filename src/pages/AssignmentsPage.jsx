import React, { useState, useEffect } from 'react'
import { Users, Package, Plus, Trash2, UserCheck, ChevronDown, ChevronUp, Edit2, Search, UserPlus, X, Ruler } from 'lucide-react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import MeasurementGuide from '../components/MeasurementGuide'
import ManageValueModal from '../components/ManageValueModal'
import { supabase, getCurrentUser } from '../lib/supabaseClient'

// Staff Form Component (copied from StaffPage)
const StaffForm = ({ onSubmit, submitLabel, formData, handleInputChange, formError, staffFormLoading, onCancel, uniqueDepartments = [], uniquePositions = [] }) => {
  const IN_TO_CM = 2.54;
  const CM_TO_IN = 1 / 2.54;

  const [inches, setInches] = useState({
    height: formData.height_cm ? (formData.height_cm * CM_TO_IN).toFixed(1) : '',
    chest: formData.chest_cm ? (formData.chest_cm * CM_TO_IN).toFixed(1) : '',
    waist: formData.waist_cm ? (formData.waist_cm * CM_TO_IN).toFixed(1) : ''
  });

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  // Keep inches in sync when formData updates (opening edit modal)
  useEffect(() => {
    setInches({
      height: formData.height_cm ? (formData.height_cm * CM_TO_IN).toFixed(1) : '',
      chest: formData.chest_cm ? (formData.chest_cm * CM_TO_IN).toFixed(1) : '',
      waist: formData.waist_cm ? (formData.waist_cm * CM_TO_IN).toFixed(1) : ''
    })
  }, [formData.height_cm, formData.chest_cm, formData.waist_cm]);

  const handleInternalChange = (e, field) => {
    const { name, value } = e.target;
    const isCm = name.endsWith('_cm');
    const val = value === '' ? '' : parseFloat(value);

    if (isCm) {
      handleInputChange({ target: { name, value: val } });
      setInches(prev => ({
        ...prev,
        [field]: val === '' ? '' : (val * CM_TO_IN).toFixed(1)
      }));
    } else {
      setInches(prev => ({ ...prev, [field]: value }));
      handleInputChange({ target: { name: `${field}_cm`, value: value === '' ? '' : Math.round(val * IN_TO_CM * 10) / 10 } });
    }
  };

  const DynamicInputField = ({ label, name, value, options, placeholder }) => {
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const handleSelectChange = (e) => {
      if (e.target.value === '__NEW__') {
        setIsCreatingNew(true);
      } else {
        handleInputChange(e);
      }
    };

    return (
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        {!isCreatingNew ? (
          <div className="space-y-2">
            <select
              name={name}
              value={value}
              onChange={handleSelectChange}
              className="input-soft w-full font-bold appearance-none bg-white"
            >
              <option value="">-- Select {label} --</option>
              {options.filter(opt => opt && opt !== 'all').map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__NEW__" className="text-indigo-600 font-black">+ Create new {label}</option>
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                name={name}
                value={value}
                onChange={handleInputChange}
                className="input-soft w-full font-bold bg-white pr-20"
                placeholder={placeholder}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };



  return (
    <>
      <form onSubmit={onSubmit} className="p-8 space-y-8">
      {formError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 animate-in fade-in slide-in-from-top-2">
          {formError}
        </div>
      )}

      {/* Section: Professional Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            className="input-soft w-full text-lg font-bold"
            placeholder="e.g., John Smith"
            required
          />
        </div>

        <div className="space-y-4">
          <DynamicInputField
            label="Department"
            name="department"
            value={formData.department}
            options={uniqueDepartments}
            placeholder="Enter department..."
          />
          <DynamicInputField
            label="Position"
            name="position"
            value={formData.position}
            options={uniquePositions}
            placeholder="Enter position..."
          />
        </div>
      </div>

      <div className="h-px bg-gray-100 w-full" />

      {/* Section: Measurements */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Body Measurements
          </h3>
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
          >
            How to measure
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 items-center text-sm text-gray-500">
            <div />
            <div className="font-semibold text-xs text-gray-400 uppercase">CM</div>
            <div className="font-semibold text-xs text-gray-400 uppercase">INCHES</div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
            </div>
            <div>
              <input
                type="number"
                name="height_cm"
                value={formData.height_cm ?? ''}
                onChange={(e) => handleInternalChange(e, 'height')}
                className="input-soft w-full"
                placeholder="e.g., 170"
              />
            </div>
            <div>
              <input
                type="text"
                name="height_in"
                value={inches.height ?? ''}
                onChange={(e) => handleInternalChange(e, 'height')}
                className="input-soft w-full"
                placeholder="e.g., 5 ft 10 in"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chest</label>
            </div>
            <div>
              <input
                type="number"
                name="chest_cm"
                value={formData.chest_cm ?? ''}
                onChange={(e) => handleInternalChange(e, 'chest')}
                className="input-soft w-full"
                placeholder="e.g., 96"
              />
            </div>
            <div>
              <input
                type="text"
                name="chest_in"
                value={inches.chest ?? ''}
                onChange={(e) => handleInternalChange(e, 'chest')}
                className="input-soft w-full"
                placeholder="e.g., 38"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Waist</label>
            </div>
            <div>
              <input
                type="number"
                name="waist_cm"
                value={formData.waist_cm ?? ''}
                onChange={(e) => handleInternalChange(e, 'waist')}
                className="input-soft w-full"
                placeholder="e.g., 81"
              />
            </div>
            <div>
              <input
                type="text"
                name="waist_in"
                value={inches.waist ?? ''}
                onChange={(e) => handleInternalChange(e, 'waist')}
                className="input-soft w-full"
                placeholder="e.g., 32"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <button
          type="button"
          onClick={() => {
            if (onCancel) onCancel()
          }}
          className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={staffFormLoading}
          className="flex-1 px-6 py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all uppercase tracking-widest text-xs"
        >
          {staffFormLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title=""
        maxWidth="md"
      >
        <div className="p-6">
          <MeasurementGuide />
        </div>
      </Modal>
    </>
  );
};

/**
 * Assignments Page
 * Displays all assignments grouped by staff member in a list view
 */
export default function AssignmentsPage({ currentPath, onNavigate, onLogout, profile, overrideTenantId }) {
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState([])
  const [inventory, setInventory] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState(null)
  const [collapsedStaff, setCollapsedStaff] = useState(new Set()) // Start with all staff collapsed
  const [searchQuery, setSearchQuery] = useState('')

  // Staff modal states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    department: '',
    position: '',
    height_cm: '',
    chest_cm: '',
    waist_cm: ''
  })
  const [staffFormLoading, setStaffFormLoading] = useState(false)
  const [staffFormError, setStaffFormError] = useState('')

  // Add-assignment modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState({
    staff_id: '',
    inventory_id: '',
    quantity: 1
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Fetch data (callable to refresh after edits)
  const fetchData = async () => {
    setLoading(true)
    try {
      let effectiveTenantId = overrideTenantId

      if (!effectiveTenantId) {
        const { profile: currentProfile } = await getCurrentUser()
        if (!currentProfile) {
          setLoading(false)
          return
        }
        effectiveTenantId = currentProfile.tenant_id
      }

      setTenantId(effectiveTenantId)

      const [{ data: staffData, error: staffError }, { data: inventoryData, error: inventoryError }, { data: assignmentsData, error: assignmentsError }] =
        await Promise.all([
          supabase
            .from('staff')
            .select('*')
            .eq('tenant_id', effectiveTenantId)
            .order('full_name', { ascending: true }),
          supabase
            .from('inventory')
            .select('*')
            .eq('tenant_id', effectiveTenantId)
            .order('item_name', { ascending: true }),
          supabase
            .from('assignments')
            .select('*')
            .eq('tenant_id', effectiveTenantId)
        ])

      if (staffError) console.log('Error fetching staff for assignments:', staffError)
      if (inventoryError) console.log('Error fetching inventory for assignments:', inventoryError)
      if (assignmentsError) console.log('Error fetching assignments:', assignmentsError)

      setStaff(staffData || [])
      // Ensure rows are collapsed by default once we have staff ids
      setCollapsedStaff(new Set((staffData || []).map(s => s.id)))
      setInventory(inventoryData || [])
      setAssignments(assignmentsData || [])
    } catch (err) {
      console.log('Something went wrong loading assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [overrideTenantId])

  const handleOpenAddModal = () => {
    setAssignmentForm({
      staff_id: '',
      inventory_id: '',
      quantity: 1
    })
    setFormError('')
    setIsAddModalOpen(true)
  }

  const handleAssignmentInputChange = (e) => {
    const { name, value } = e.target
    setAssignmentForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value, 10) || 1 : value
    }))
  }

  const handleAddAssignment = async (e) => {
    e.preventDefault()
    if (!tenantId || !assignmentForm.staff_id || !assignmentForm.inventory_id) {
      setFormError('Staff member and inventory item are required')
      return
    }

    setFormLoading(true)
    try {
      const payload = {
        tenant_id: tenantId,
        staff_id: assignmentForm.staff_id,
        inventory_id: assignmentForm.inventory_id,
        quantity: assignmentForm.quantity || 1
      }

      const { data, error } = await supabase
        .from('assignments')
        .insert([payload])
        .select()

      if (error) {
        setFormError(error.message)
      } else if (data && data[0]) {
        setAssignments(prev => [...prev, data[0]])
        setIsAddModalOpen(false)
        setFormError('')
      }
    } catch (err) {
      setFormError('Something went wrong while saving assignment')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)

      if (!error) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      } else {
        console.log('Error deleting assignment:', error)
      }
    } catch (err) {
      console.log('Something went wrong deleting assignment:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const toggleStaffCollapse = (staffId) => {
    setCollapsedStaff(prev => {
      const newSet = new Set(prev)
      if (newSet.has(staffId)) {
        newSet.delete(staffId)
      } else {
        newSet.add(staffId)
      }
      return newSet
    })
  }

  // Staff management functions
  const handleOpenStaffModal = () => {
    setStaffForm({
      full_name: '',
      department: '',
      position: '',
      height_cm: '',
      chest_cm: '',
      waist_cm: ''
    })
    setStaffFormError('')
    setIsStaffModalOpen(true)
  }

  const handleOpenEditStaffModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setStaffForm({
      full_name: staffMember.full_name,
      department: staffMember.department || '',
      position: staffMember.position || '',
      height_cm: staffMember.height_cm || '',
      chest_cm: staffMember.chest_cm || '',
      waist_cm: staffMember.waist_cm || ''
    })
    setStaffFormError('')
    setIsEditStaffModalOpen(true)
  }

  const handleStaffInputChange = (e) => {
    const { name, value } = e.target
    setStaffForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    if (!tenantId || !staffForm.full_name || !staffForm.position) {
      setStaffFormError('Name and position are required')
      return
    }

    setStaffFormLoading(true)
    try {
      const payload = {
        tenant_id: tenantId,
        full_name: staffForm.full_name,
        department: staffForm.department,
        position: staffForm.position,
        height_cm: staffForm.height_cm ? parseFloat(staffForm.height_cm) : null,
        chest_cm: staffForm.chest_cm ? parseFloat(staffForm.chest_cm) : null,
        waist_cm: staffForm.waist_cm ? parseFloat(staffForm.waist_cm) : null
      }

      const { data, error } = await supabase
        .from('staff')
        .insert([payload])
        .select()

      if (error) {
        setStaffFormError(error.message)
      } else if (data && data[0]) {
        setStaff(prev => [...prev, data[0]])
        setIsStaffModalOpen(false)
        setStaffFormError('')
      }
    } catch (err) {
      setStaffFormError('Something went wrong while adding staff')
    } finally {
      setStaffFormLoading(false)
    }
  }

  const handleEditStaff = async (e) => {
    e.preventDefault()
    if (!selectedStaff || !staffForm.full_name || !staffForm.position) {
      setStaffFormError('Name and position are required')
      return
    }

    setStaffFormLoading(true)
    try {
      const payload = {
        full_name: staffForm.full_name,
        department: staffForm.department,
        position: staffForm.position,
        height_cm: staffForm.height_cm ? parseFloat(staffForm.height_cm) : null,
        chest_cm: staffForm.chest_cm ? parseFloat(staffForm.chest_cm) : null,
        waist_cm: staffForm.waist_cm ? parseFloat(staffForm.waist_cm) : null
      }

      const { data, error } = await supabase
        .from('staff')
        .update(payload)
        .eq('id', selectedStaff.id)
        .select()

      if (error) {
        setStaffFormError(error.message)
      } else if (data && data[0]) {
        setStaff(prev => prev.map(s => s.id === selectedStaff.id ? data[0] : s))
        setIsEditStaffModalOpen(false)
        setSelectedStaff(null)
        setStaffFormError('')
      }
    } catch (err) {
      setStaffFormError('Something went wrong while updating staff')
    } finally {
      setStaffFormLoading(false)
    }
  }

  // Group assignments by staff member
  const inventoryById = inventory.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})

  const assignmentsByStaff = staff.map(staffMember => {
    const staffAssignments = assignments.filter(a => a.staff_id === staffMember.id)
    return {
      staff: staffMember,
      assignments: staffAssignments.map(assignment => ({
        ...assignment,
        inventory: inventoryById[assignment.inventory_id]
      }))
    }
  }).filter(group => {
    // Filter by search query (search staff name and position)
    const matchesSearch = searchQuery === '' || 
      group.staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.staff.position.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch // Show all staff that match search, regardless of assignments
  })

  if (loading) {
    return (
      <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Assignments</h1>
            <p className="text-gray-500">
              View and manage product assignments to staff members.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex items-center gap-2 bg-white text-gray-700 px-3 py-2 rounded-2xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Manage values
            </button>
            <button
              onClick={handleOpenStaffModal}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card padding="small" className="mb-8">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff by name or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-100 transition-all font-medium"
          />
        </div>
      </Card>

      {/* Single Staff List Box */}
      <Card padding="normal">
        <div className="space-y-1">
          {assignmentsByStaff.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No staff found</h3>
              <p className="text-gray-500">
                {searchQuery ? 'Try adjusting your search query.' : 'Start by adding staff members to your tenant.'}
              </p>
            </div>
          ) : (
            assignmentsByStaff.map(({ staff, assignments }) => {
              const isCollapsed = collapsedStaff.has(staff.id)
              return (
                <div key={staff.id} className="border-b border-gray-100 last:border-b-0">
                  {/* Staff Header - Clickable to toggle */}
                  <div className="flex items-center justify-between py-3">
                    <button
                      onClick={() => toggleStaffCollapse(staff.id)}
                      className="flex items-center justify-between flex-1 text-left hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {staff.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{staff.full_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {staff.department && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                {staff.department}
                              </span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {staff.position}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="gray" size="sm">
                          {assignments.length} {assignments.length === 1 ? 'item' : 'items'}
                        </Badge>
                        {assignments.length === 0 && (
                          <span className="text-xs text-gray-400 italic">No assignments</span>
                        )}
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleOpenEditStaffModal(staff)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors ml-2"
                      title="Edit Staff"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Assignments List - Collapsible */}
                  {!isCollapsed && (
                    <div className="px-4 pb-3 bg-gray-50">
                      {assignments.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <Package className="w-6 h-6 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No assignments yet</p>
                          <p className="text-xs mt-1">This staff member hasn't been assigned any items</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {assignments.map(assignment => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-500" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {assignment.inventory ? assignment.inventory.item_name : 'Unknown item'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {assignment.inventory?.size && `Size: ${assignment.inventory.size}`}
                                    {assignment.inventory?.category && ` • ${assignment.inventory.category}`}
                                    {assignment.inventory?.sku && ` • ${assignment.inventory.sku}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="blue" size="sm">
                                  Qty: {assignment.quantity}
                                </Badge>
                                <button
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  disabled={formLoading}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false)
          setStaffFormError('')
        }}
        title=""
        maxWidth="md"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Add Staff</h2>
            <button
              onClick={() => {
                setIsStaffModalOpen(false)
                setStaffFormError('')
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {staffFormError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm mb-6">
              {staffFormError}
            </div>
          )}

          <form onSubmit={handleAddStaff} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={staffForm.full_name}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all"
                  placeholder="Enter staff member's full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <input
                  type="text"
                  name="position"
                  value={staffForm.position}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all"
                  placeholder="e.g., Chef, Server, Manager"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                name="department"
                value={staffForm.department}
                onChange={handleStaffInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all"
                placeholder="e.g., Kitchen, Front of House"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="number"
                  name="height_cm"
                  value={staffForm.height_cm}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all"
                  placeholder="170"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chest (cm)</label>
                <input
                  type="number"
                  name="chest_cm"
                  value={staffForm.chest_cm}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all"
                  placeholder="100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Waist (cm)</label>
                <input
                  type="number"
                  name="waist_cm"
                  value={staffForm.waist_cm}
                  onChange={handleStaffInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all"
                  placeholder="80"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => {
                  setIsStaffModalOpen(false)
                  setStaffFormError('')
                }}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={staffFormLoading}
                className="flex-1 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {staffFormLoading ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        isOpen={isEditStaffModalOpen}
        onClose={() => {
          setIsEditStaffModalOpen(false)
          setSelectedStaff(null)
          setStaffFormError('')
        }}
        title=""
        maxWidth="md"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Staff Member</h2>
            <button
              onClick={() => {
                setIsEditStaffModalOpen(false)
                setSelectedStaff(null)
                setStaffFormError('')
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {staffFormError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm mb-6">
              {staffFormError}
            </div>
          )}

          <StaffForm
            onSubmit={handleEditStaff}
            submitLabel="Save Changes"
            formData={staffForm}
            handleInputChange={handleStaffInputChange}
            formError={staffFormError}
            staffFormLoading={staffFormLoading}
            onCancel={() => {
              setIsEditStaffModalOpen(false)
              setSelectedStaff(null)
              setStaffFormError('')
            }}
            uniqueDepartments={[...new Set(staff.map(s => s.department)).values()].filter(Boolean)}
            uniquePositions={[...new Set(staff.map(s => s.position)).values()].filter(Boolean)}
          />
        </div>
      </Modal>

      <ManageValueModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        staff={staff}
        inventory={inventory}
        tenantId={tenantId}
        onComplete={() => {
          setIsManageModalOpen(false)
          fetchData()
        }}
      />
    </Layout>
  )
}

