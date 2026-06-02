import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react'

export default function TeachersPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    subject: '', qualification: '', salary: '', password: 'teacher123',
    joiningDate: new Date().toISOString().slice(0, 10), classId: ''
  })

  useEffect(() => {
    loadTeachers()
    loadClasses()
  }, [])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name')
    setClasses(data || [])
  }

  const loadTeachers = async () => {
    // Get teachers with their assigned class
    const { data: teacherData, error: err } = await supabase
      .from('teachers')
      .select('*')
      .order('name')

    if (err) { error(err.message); setLoading(false); return }

    // Get class_teachers assignments
    const { data: ctData } = await supabase.from('class_teachers').select('*')
    const ctMap = {}
    ;(ctData || []).forEach(ct => { ctMap[ct.teacher_id] = ct.class_id })

    const mapped = (teacherData || []).map(t => {
      const parts = (t.name || '').split(' ')
      return {
        ...t,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        assigned_class_id: ctMap[t.id] || null,
        employeeId: 'TCH' + String(t.id).padStart(4, '0'),
      }
    })
    setTeachers(mapped)
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({
      firstName: '', lastName: '', email: '', phone: '',
      subject: '', qualification: '', salary: '', password: 'teacher123',
      joiningDate: new Date().toISOString().slice(0, 10), classId: ''
    })
    setModalOpen(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      firstName: t.firstName, lastName: t.lastName, email: t.email || '',
      phone: t.phone || '', subject: t.subject || '', qualification: t.qualification || '',
      salary: t.salary || '', password: t.password || 'teacher123',
      joiningDate: t.joining_date || '', classId: t.assigned_class_id || ''
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const name = `${form.firstName} ${form.lastName}`.trim()
    const payload = {
      name, email: form.email, phone: form.phone, subject: form.subject,
      qualification: form.qualification, salary: parseFloat(form.salary) || 0,
      password: form.password, joining_date: form.joiningDate || null
    }

    let teacherId
    if (editing) {
      const { error: err } = await supabase.from('teachers').update(payload).eq('id', editing.id)
      if (err) return error(err.message)
      teacherId = editing.id
      success('Teacher updated')
    } else {
      const { data, error: err } = await supabase.from('teachers').insert([payload]).select().single()
      if (err) return error(err.message)
      teacherId = data.id
      success('Teacher added')
    }

    // Assign as class teacher
    if (form.classId && form.classId !== 'none') {
      await supabase.from('class_teachers').upsert(
        { class_id: parseInt(form.classId), teacher_id: teacherId },
        { onConflict: 'class_id,teacher_id' }
      )
    }

    setModalOpen(false)
    loadTeachers()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this teacher?')) return
    await supabase.from('class_teachers').delete().eq('teacher_id', id)
    const { error: err } = await supabase.from('teachers').delete().eq('id', id)
    if (err) return error(err.message)
    success('Teacher deleted')
    loadTeachers()
  }

  const filtered = teachers.filter(t =>
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title="Teachers" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Teachers</h2>
            <p>Manage teaching staff</p>
          </div>
          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Teacher</button>
          )}
        </div>

        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search />
            <input className="form-input" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Users /><h3>No teachers found</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Subject</th>
                  <th>Qualification</th>
                  <th>Salary</th>
                  <th>Joining Date</th>
                  {user.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td><span className="badge badge-purple">{t.employeeId}</span></td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>{t.email}</td>
                    <td>{t.phone || '-'}</td>
                    <td>{t.subject || '-'}</td>
                    <td>{t.qualification || '-'}</td>
                    <td>₹{(parseFloat(t.salary) || 0).toLocaleString()}</td>
                    <td>{t.joining_date || '-'}</td>
                    {user.role === 'admin' && (
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></button>
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
        title={editing ? 'Edit Teacher' : 'Add Teacher'}
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
            <label className="form-label">First Name</label>
            <input className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Qualification</label>
            <input className="form-input" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Salary</label>
            <input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Joining Date</label>
            <input className="form-input" type="date" value={form.joiningDate} onChange={e => setForm({ ...form, joiningDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Class Teacher Of</label>
            <select className="form-select" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">None</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} - {c.section}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </>
  )
}
