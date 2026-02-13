import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  User,
  Calendar,
  Tag,
  ChevronDown,
  Trash2,
  Edit2
} from 'lucide-react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import { supabase, getCurrentUser } from '../lib/supabaseClient'

/**
 * Support Ticket Page
 * Create, view, and manage support tickets for tenant issues
 */
export default function SupportTicketPage({ currentPath, onNavigate, onLogout, profile, overrideTenantId }) {
  const [tenantId, setTenantId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [collapsedTickets, setCollapsedTickets] = useState(new Set())

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Form state
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general'
  })

  useEffect(() => {
    async function fetchTickets() {
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

        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('tenant_id', effectiveTenantId)
          .order('created_at', { ascending: false })

        if (error) {
          console.log('Error fetching support tickets:', error)
        } else {
          setTickets(data || [])
        }
      } catch (err) {
        console.log('Something went wrong loading support tickets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [overrideTenantId])

  const handleCreateTicket = async (e) => {
    e.preventDefault()
    if (!tenantId || !ticketForm.subject || !ticketForm.description) {
      setFormError('Subject and description are required')
      return
    }

    setFormLoading(true)
    try {
      const payload = {
        tenant_id: tenantId,
        subject: ticketForm.subject,
        description: ticketForm.description,
        priority: ticketForm.priority,
        category: ticketForm.category,
        status: 'open'
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert([payload])
        .select()

      if (error) {
        setFormError(error.message)
      } else if (data && data[0]) {
        setTickets(prev => [data[0], ...prev])
        setIsCreateModalOpen(false)
        resetForm()
      }
    } catch (err) {
      setFormError('Something went wrong while creating ticket')
    } finally {
      setFormLoading(false)
    }
  }

  const resetForm = () => {
    setTicketForm({
      subject: '',
      description: '',
      priority: 'medium',
      category: 'general'
    })
    setFormError('')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setTicketForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDeleteTicket = async (ticketId) => {
    setFormLoading(true)
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId)

      if (!error) {
        setTickets(prev => prev.filter(t => t.id !== ticketId))
      } else {
        console.log('Error deleting ticket:', error)
      }
    } catch (err) {
      console.log('Something went wrong deleting ticket:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const toggleTicketCollapse = (ticketId) => {
    setCollapsedTickets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId)
      } else {
        newSet.add(ticketId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500" />
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'red'
      case 'medium':
        return 'yellow'
      case 'low':
        return 'green'
      default:
        return 'gray'
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  }

  if (loading) {
    return (
      <Layout currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} profile={profile}>
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading support tickets...</p>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Support Tickets</h1>
            <p className="text-gray-500">
              Create and manage support requests for your tenant.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsCreateModalOpen(true)
            }}
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-2xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Open</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card padding="normal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="small" className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="flex items-center gap-2 text-gray-400 pr-4 lg:border-r border-gray-100">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Filters:</span>
          </div>

          <div className="flex-1 flex flex-wrap gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-2"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-900 focus:ring-0 cursor-pointer py-2"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-gray-100 transition-all font-medium"
            />
          </div>
        </div>
      </Card>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <Card padding="normal">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500 mb-6">
              {tickets.length === 0 ? 'Create your first support ticket to get started.' : 'Try adjusting your filters or search query.'}
            </p>
            {tickets.length === 0 && (
              <button
                onClick={() => {
                  resetForm()
                  setIsCreateModalOpen(true)
                }}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-medium hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create First Ticket
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const isCollapsed = collapsedTickets.has(ticket.id)
            return (
              <Card key={ticket.id} padding="normal">
                {/* Ticket Header - Clickable to toggle */}
                <button
                  onClick={() => toggleTicketCollapse(ticket.id)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 -mx-6 px-6 py-3 rounded-t-2xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant={getPriorityColor(ticket.priority)} size="sm">
                          {ticket.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {ticket.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Ticket Details - Collapsible */}
                {!isCollapsed && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Created: {new Date(ticket.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Status: <span className="font-medium capitalize">{ticket.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket)
                            setIsDetailModalOpen(true)
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          disabled={formLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          resetForm()
        }}
        title="Create Support Ticket"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
          {formError && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm">
              {formError}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              name="subject"
              value={ticketForm.subject}
              onChange={handleInputChange}
              className="input-soft w-full"
              placeholder="Brief description of the issue"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={ticketForm.description}
              onChange={handleInputChange}
              className="input-soft w-full min-h-[120px] py-4"
              placeholder="Detailed description of your issue or question"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                name="priority"
                value={ticketForm.priority}
                onChange={handleInputChange}
                className="input-soft w-full"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                name="category"
                value={ticketForm.category}
                onChange={handleInputChange}
                className="input-soft w-full"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                resetForm()
              }}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 px-4 py-3 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTicket(null)
        }}
        title="Ticket Details"
        maxWidth="md"
      >
        {selectedTicket && (
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-3">
                  <Badge variant={getPriorityColor(selectedTicket.priority)} size="sm">
                    {selectedTicket.priority}
                  </Badge>
                  <span className="text-sm text-gray-500">{selectedTicket.category}</span>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    {getStatusIcon(selectedTicket.status)}
                    <span className="capitalize">{selectedTicket.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <div className="font-medium text-gray-900">
                    {new Date(selectedTicket.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Ticket ID:</span>
                  <div className="font-medium text-gray-900">#{selectedTicket.id}</div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    setSelectedTicket(null)
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
