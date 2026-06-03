import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Pencil, Trash2, GraduationCap, Search } from 'lucide-react'

export default function StudentsPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [confirmState, setConfirmState] = useState({ open: false, id: null, name: '' })
  const [formErrors, setFormErrors] = useState({})
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: 'student123',
    classId: '', rollNo: '', admissionNo: '', fatherName: '', motherName: '',
    parentPhone: '', parentEmail: '', address: '', dateOfBirth: '', gender: ''
  })

  useEffect(() => {
    loadStudents()
    loadClasses()
  }, [])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name')
    setClasses(data || [])
  }

  const loadStudents = async () => {
    let query = supabase.from('students').select('*, classes(class_name, section)').order('name')

    // Teacher: only show students in their classes
    if (user.role === 'teacher') {
      const classIds = [...new Set([user.classId, ...(user.subjectClasses || [])].filter(Boolean))]
      if (!classIds.length) { setStudents([]); setLoading(false); return }
      query = query.in('class_id', classIds)
    }

    const { data, error: err } = await query
    if (err) { error(err.message); setLoading(false); return }

    const mapped = (data || []).map(s => {
      const parts = (s.name || '').split(' ')
      return {
        ...s,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        className: s.classes?.class_name || '',
        classSection: s.classes?.section || '',
      }
    })
    setStudents(mapped)
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({
      firstName: '', lastName: '', email: '', password: 'student123',
      classId: '', rollNo: '', admissionNo: '', fatherName: '', motherName: '',
      parentPhone: '', parentEmail: '', address: '', dateOfBirth: '', gender: ''
    })
    setModalOpen(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      firstName: s.firstName, lastName: s.lastName, email: s.email || '',
      password: s.password || 'student123', classId: s.class_id || '',
      rollNo: s.roll_no || '', admissionNo: s.admission_no || '',
      fatherName: s.father_name || '', motherName: s.mother_name || '',
      parentPhone: s.parent_phone || '', parentEmail: s.parent_email || '',
      address: s.address || '', dateOfBirth: s.date_of_birth || '', gender: s.gender || ''
    })
    setModalOpen(true)
  }

  const validateStudentForm = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validateStudentForm()) return

    const name = `${form.firstName} ${form.lastName}`.trim()
    const payload = {
      name, email: form.email, password: form.password,
      class_id: form.classId ? parseInt(form.classId) : null,
      roll_no: form.rollNo || null, admission_no: form.admissionNo || null,
      father_name: form.fatherName || null, mother_name: form.motherName || null,
      parent_phone: form.parentPhone || null, parent_email: form.parentEmail || null,
      address: form.address || null, date_of_birth: form.dateOfBirth || null,
      gender: form.gender || null
    }

    if (editing) {
      const { error: err } = await supabase.from('students').update(payload).eq('id', editing.id)
      if (err) return error(err.message)
      success('Student updated')
    } else {
      const { error: err } = await supabase.from('students').insert([payload])
      if (err) return error(err.message)
      success('Student added')
    }
    setModalOpen(false)
    loadStudents()
  }

  const requestDelete = (s) => {
    setConfirmState({ open: true, id: s.id, name: s.name })
  }

  const handleDelete = async () => {
    const { error: err } = await supabase.from('students').delete().eq('id', confirmState.id)
    if (err) error(err.message)
    else {
      success('Student deleted')
      loadStudents()
    }
    setConfirmState({ open: false, id: null, name: '' })
  }

  const filtered = students.filter(s => {
    const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.roll_no || '').toLowerCase().includes(search.toLowerCase())
    const matchClass = !filterClass || String(s.class_id) === filterClass
    return matchSearch && matchClass
  })

  const isEditable = user.role === 'admin' || user.role === 'teacher'

  return (
    <>
      <Header title="Students" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Students</h2>
            <p>Manage student records ({students.length} total)</p>
          </div>
          {isEditable && (
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Student</button>
          )}
        </div>

        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search />
            <input className="form-input" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} - {c.section}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><GraduationCap /><h3>No students found</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Father's Name</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  {isEditable && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge badge-info">{s.roll_no || '-'}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.className} {s.classSection ? `(${s.classSection})` : ''}</td>
                    <td>{s.father_name || '-'}</td>
                    <td>{s.parent_phone || '-'}</td>
                    <td>{s.gender || '-'}</td>
                    {isEditable && (
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => requestDelete(s)}><Trash2 size={14} /></button>
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Student' : 'Add Student'}
        large
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name <span className="required-asterisk">*</span></label>
            <input className={`form-input ${formErrors.firstName ? 'invalid' : ''}`} value={form.firstName} onChange={e => { setForm({ ...form, firstName: e.target.value }); setFormErrors({...formErrors, firstName: null}) }} />
            {formErrors.firstName && <div className="form-error-text">{formErrors.firstName}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email <span className="required-asterisk">*</span></label>
            <input className={`form-input ${formErrors.email ? 'invalid' : ''}`} type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setFormErrors({...formErrors, email: null}) }} />
            {formErrors.email && <div className="form-error-text">{formErrors.email}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Class</label>
            <select className="form-select" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} - {c.section}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Roll No</label>
            <input className="form-input" value={form.rollNo} onChange={e => setForm({ ...form, rollNo: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Admission No</label>
            <input className="form-input" value={form.admissionNo} onChange={e => setForm({ ...form, admissionNo: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Father's Name</label>
            <input className="form-input" value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Mother's Name</label>
            <input className="form-input" value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Parent Phone</label>
            <input className="form-input" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="form-textarea" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, id: null, name: '' })}
        title="Delete Student"
        message={`Are you sure you want to delete "${confirmState.name}"? This will remove all their records including fees, marks, and attendance.`}
        confirmLabel="Delete Student"
        variant="danger"
      />
    </>
  )
}
