import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, FileSignature, Pencil, Copy, Users } from 'lucide-react'

export default function FeeStructuresPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  
  const [structures, setStructures] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmState, setConfirmState] = useState({ open: false, id: null })
  const [applyingId, setApplyingId] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  
  const [form, setForm] = useState({
    classId: '', academicYearId: '', feeType: '', amount: '', dueDate: '', lateFee: '0'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    const { data: years } = await supabase.from('academic_years').select('*').order('start_date', { ascending: false })
    const { data: cls } = await supabase.from('classes').select('*').order('class_name')
    setAcademicYears(years || [])
    setClasses(cls || [])
    
    const { data: structs, error: err } = await supabase
      .from('fee_structures')
      .select('*, classes(class_name), academic_years(year_name)')
      .order('id', { ascending: false })
      
    if (err) error(err.message)
    else setStructures((structs || []).map(s => ({
      ...s,
      className: s.classes?.class_name || 'Unknown',
      yearName: s.academic_years?.year_name || 'Unknown'
    })))
    
    setLoading(false)
  }

  const validateForm = () => {
    const errs = {}
    if (!form.classId) errs.classId = 'Please select a class'
    if (!form.feeType) errs.feeType = 'Please select a fee type'
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Amount must be greater than 0'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ classId: '', academicYearId: '', feeType: '', amount: '', dueDate: '', lateFee: '0' })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      classId: s.class_id || '',
      academicYearId: s.academic_year_id || '',
      feeType: s.fee_type || '',
      amount: s.amount || '',
      dueDate: s.due_date || '',
      lateFee: s.late_fee_per_day || '0'
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openCopy = (s) => {
    setEditing(null)
    setForm({
      classId: '',
      academicYearId: s.academic_year_id || '',
      feeType: s.fee_type || '',
      amount: s.amount || '',
      dueDate: s.due_date || '',
      lateFee: s.late_fee_per_day || '0'
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!validateForm()) return

    const payload = {
      class_id: form.classId,
      academic_year_id: form.academicYearId || null,
      fee_type: form.feeType,
      amount: parseFloat(form.amount) || 0,
      due_date: form.dueDate || null,
      late_fee_per_day: parseFloat(form.lateFee) || 0
    }
    
    if (editing) {
      const { error: err } = await supabase.from('fee_structures').update(payload).eq('id', editing.id)
      if (err) return error(err.message)
      success('Fee structure updated successfully')
    } else {
      const { error: err } = await supabase.from('fee_structures').insert([payload])
      if (err) return error(err.message)
      success('Fee structure created successfully')
    }

    setModalOpen(false)
    loadData()
  }

  const requestDelete = (id) => {
    setConfirmState({ open: true, id })
  }

  const handleDelete = async () => {
    const { error: err } = await supabase.from('fee_structures').delete().eq('id', confirmState.id)
    if (err) error(err.message)
    else {
      success('Fee structure deleted')
      loadData()
    }
    setConfirmState({ open: false, id: null })
  }

  const handleApplyToAll = async (structure) => {
    setApplyingId(structure.id)
    try {
      // Get all students in the class
      const { data: studentsInClass } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', structure.class_id)

      if (!studentsInClass || studentsInClass.length === 0) {
        error('No students found in this class')
        return
      }

      // Create fee records for each student
      const feeRecords = studentsInClass.map(s => ({
        student_id: s.id,
        fee_type: structure.fee_type,
        amount: structure.amount,
        due_date: structure.due_date || null,
        month: null,
        year: null,
        status: 'pending'
      }))

      const { error: insertErr } = await supabase.from('fees').insert(feeRecords)
      if (insertErr) return error(insertErr.message)
      
      success(`Fee applied to ${studentsInClass.length} students in ${structure.className}`)
    } catch (err) {
      error(err.message || 'Failed to apply fees')
    } finally {
      setApplyingId(null)
    }
  }

  const feeTypes = ['Tuition', 'Transport', 'Lab', 'Sports', 'Library', 'Exam', 'Other']

  return (
    <>
      <Header title="Fee Structures" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Fee Structures</h2>
            <p>Define standard fees per class and academic year ({structures.length} structures)</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Structure
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : structures.length === 0 ? (
          <div className="empty-state">
            <FileSignature />
            <h3>No fee structures defined</h3>
            <p>Create a fee structure to start generating invoices for students.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Class</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Late Fee / Day</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {structures.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge badge-info">{s.yearName}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.className}</td>
                    <td>{s.fee_type}</td>
                    <td style={{ fontWeight: 700 }}>₹{parseFloat(s.amount).toLocaleString('en-IN')}</td>
                    <td>{s.due_date ? new Date(s.due_date).toLocaleDateString('en-IN') : '-'}</td>
                    <td>₹{parseFloat(s.late_fee_per_day || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleApplyToAll(s)}
                          title="Apply to all students in class"
                          disabled={applyingId === s.id}
                        >
                          {applyingId === s.id ? (
                            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                          ) : (
                            <Users size={14} />
                          )}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openCopy(s)} title="Copy structure">
                          <Copy size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => requestDelete(s.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
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
        title={editing ? 'Edit Fee Structure' : 'Create Fee Structure'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <select className="form-select" value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value })}>
              <option value="">Select Year</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Class <span className="required-asterisk">*</span></label>
            <select
              className={`form-select ${formErrors.classId ? 'invalid' : ''}`}
              value={form.classId}
              onChange={e => { setForm({ ...form, classId: e.target.value }); setFormErrors({ ...formErrors, classId: null }) }}
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.section ? `- ${c.section}` : ''}</option>)}
            </select>
            {formErrors.classId && <div className="form-error-text">{formErrors.classId}</div>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fee Type <span className="required-asterisk">*</span></label>
            <select
              className={`form-select ${formErrors.feeType ? 'invalid' : ''}`}
              value={form.feeType}
              onChange={e => { setForm({ ...form, feeType: e.target.value }); setFormErrors({ ...formErrors, feeType: null }) }}
            >
              <option value="">Select Type</option>
              {feeTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {formErrors.feeType && <div className="form-error-text">{formErrors.feeType}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) <span className="required-asterisk">*</span></label>
            <input
              className={`form-input ${formErrors.amount ? 'invalid' : ''}`}
              type="number"
              min="1"
              placeholder="0.00"
              value={form.amount}
              onChange={e => { setForm({ ...form, amount: e.target.value }); setFormErrors({ ...formErrors, amount: null }) }}
            />
            {formErrors.amount && <div className="form-error-text">{formErrors.amount}</div>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Late Fee Per Day (₹)</label>
            <input className="form-input" type="number" min="0" value={form.lateFee} onChange={e => setForm({ ...form, lateFee: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
        title="Delete Fee Structure"
        message="Are you sure you want to delete this fee structure? Existing fee records linked to this structure will not be affected."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}
