import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import {
  Plus, Pencil, Trash2, BookOpen, Search,
  CheckCircle, XCircle, ToggleLeft, ToggleRight
} from 'lucide-react'

export default function SubjectsPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmState, setConfirmState] = useState({ open: false, id: null, name: '' })
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    subjectName: '', subjectCode: '', description: '',
    isGraded: false, isActive: true
  })

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isTeacher = user?.role === 'teacher'
  const canManage = isAdmin || isTeacher

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('subjects_master')
      .select('*')
      .order('subject_name')
    if (err) error(err.message)
    else setSubjects(data || [])
    setLoading(false)
  }

  const validateForm = () => {
    const errs = {}
    if (!form.subjectName.trim()) errs.subjectName = 'Subject name is required'
    else if (form.subjectName.trim().length < 2) errs.subjectName = 'Name must be at least 2 characters'

    // Check for duplicate name (excluding current editing subject)
    const duplicate = subjects.find(
      s => s.subject_name.toLowerCase() === form.subjectName.trim().toLowerCase() &&
        (!editing || s.id !== editing.id)
    )
    if (duplicate) errs.subjectName = 'A subject with this name already exists'

    if (form.subjectCode && form.subjectCode.trim().length > 10) {
      errs.subjectCode = 'Code must be 10 characters or less'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ subjectName: '', subjectCode: '', description: '', isGraded: false, isActive: true })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      subjectName: s.subject_name || '',
      subjectCode: s.subject_code || '',
      description: s.description || '',
      isGraded: !!s.is_graded,
      isActive: s.is_active !== false
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!validateForm()) return

    const payload = {
      subject_name: form.subjectName.trim(),
      subject_code: form.subjectCode.trim().toUpperCase() || null,
      description: form.description.trim() || null,
      is_graded: form.isGraded,
      is_active: form.isActive
    }

    if (editing) {
      const { error: err } = await supabase
        .from('subjects_master')
        .update(payload)
        .eq('id', editing.id)
      if (err) return error(err.message)
      success('Subject updated successfully')
    } else {
      const { error: err } = await supabase
        .from('subjects_master')
        .insert([payload])
      if (err) {
        if (err.message.includes('duplicate') || err.message.includes('unique')) {
          return error('A subject with this name already exists')
        }
        return error(err.message)
      }
      success('Subject added successfully')
    }

    setModalOpen(false)
    loadSubjects()
  }

  const requestDelete = (s) => {
    setConfirmState({ open: true, id: s.id, name: s.subject_name })
  }

  const handleDelete = async () => {
    const { error: err } = await supabase
      .from('subjects_master')
      .delete()
      .eq('id', confirmState.id)
    if (err) {
      error(err.message)
    } else {
      success(`"${confirmState.name}" deleted successfully`)
      loadSubjects()
    }
    setConfirmState({ open: false, id: null, name: '' })
  }

  const toggleActive = async (s) => {
    const { error: err } = await supabase
      .from('subjects_master')
      .update({ is_active: !s.is_active })
      .eq('id', s.id)
    if (err) return error(err.message)
    success(`${s.subject_name} ${s.is_active ? 'deactivated' : 'activated'}`)
    loadSubjects()
  }

  const filtered = subjects.filter(s => {
    const matchSearch = (s.subject_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.subject_code || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter ||
      (statusFilter === 'active' && s.is_active) ||
      (statusFilter === 'inactive' && !s.is_active) ||
      (statusFilter === 'graded' && s.is_graded)
    return matchSearch && matchStatus
  })

  const totalActive = subjects.filter(s => s.is_active).length
  const totalInactive = subjects.filter(s => !s.is_active).length
  const totalGraded = subjects.filter(s => s.is_graded).length

  return (
    <>
      <Header title="Subjects" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Subjects Master</h2>
            <p>Manage all subjects offered by the school ({subjects.length} total)</p>
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Subject
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card">
            <div className="stat-icon purple"><BookOpen size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{subjects.length}</div>
              <div className="stat-label">Total Subjects</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{totalActive}</div>
              <div className="stat-label">Active</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><XCircle size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{totalInactive}</div>
              <div className="stat-label">Inactive</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><BookOpen size={22} /></div>
            <div className="stat-content">
              <div className="stat-value">{totalGraded}</div>
              <div className="stat-label">Graded (Non-Scholastic)</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search />
            <input
              className="form-input"
              placeholder="Search by name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Subjects</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="graded">Graded Only</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <BookOpen />
            <h3>No subjects found</h3>
            <p>{search || statusFilter ? 'Try adjusting your filters.' : 'Add your first subject to get started.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.6 }}>
                    <td style={{ fontWeight: 600 }}>{s.subject_name}</td>
                    <td>
                      {s.subject_code ? (
                        <span className="badge badge-info">{s.subject_code}</span>
                      ) : '-'}
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.description || '-'}
                    </td>
                    <td>
                      <span className={`badge ${s.is_graded ? 'badge-warning' : 'badge-purple'}`}>
                        {s.is_graded ? 'Graded' : 'Scholastic'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${s.is_active ? 'paid' : 'overdue'}`} />
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleActive(s)}
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {s.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(s)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => requestDelete(s)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Subject' : 'Add Subject'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editing ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">
            Subject Name <span className="required-asterisk">*</span>
          </label>
          <input
            className={`form-input ${errors.subjectName ? 'invalid' : ''}`}
            placeholder="e.g., Mathematics"
            value={form.subjectName}
            onChange={e => {
              setForm({ ...form, subjectName: e.target.value })
              if (errors.subjectName) setErrors({ ...errors, subjectName: null })
            }}
          />
          {errors.subjectName && (
            <div className="form-error-text">{errors.subjectName}</div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Subject Code</label>
            <input
              className={`form-input ${errors.subjectCode ? 'invalid' : ''}`}
              placeholder="e.g., MAT"
              value={form.subjectCode}
              onChange={e => {
                setForm({ ...form, subjectCode: e.target.value })
                if (errors.subjectCode) setErrors({ ...errors, subjectCode: null })
              }}
              maxLength={10}
            />
            {errors.subjectCode && (
              <div className="form-error-text">{errors.subjectCode}</div>
            )}
            <div className="form-hint">Max 10 characters. Auto-capitalized.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="Brief description (optional)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Subject Type</label>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                cursor: 'pointer'
              }}
              onClick={() => setForm({ ...form, isGraded: !form.isGraded })}
            >
              {form.isGraded ? (
                <ToggleRight size={22} style={{ color: 'var(--warning-500)' }} />
              ) : (
                <ToggleLeft size={22} style={{ color: 'var(--text-tertiary)' }} />
              )}
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {form.isGraded ? 'Graded (Non-Scholastic)' : 'Scholastic (Marks-based)'}
              </span>
            </div>
            <div className="form-hint">
              Graded subjects show grade (A/B/C), scholastic subjects show marks.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                cursor: 'pointer'
              }}
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
            >
              {form.isActive ? (
                <ToggleRight size={22} style={{ color: 'var(--success-500)' }} />
              ) : (
                <ToggleLeft size={22} style={{ color: 'var(--text-tertiary)' }} />
              )}
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="form-hint">
              Inactive subjects won't appear in assignment dropdowns.
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, id: null, name: '' })}
        title="Delete Subject"
        message={`Are you sure you want to delete "${confirmState.name}"? This will remove it from the master list. Existing marks and assignments using this subject will not be affected.`}
        confirmLabel="Delete Subject"
        variant="danger"
      />
    </>
  )
}
