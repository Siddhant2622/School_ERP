import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Pencil, Trash2, School, Search } from 'lucide-react'

export default function ClassesPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ className: '', section: '', roomNo: '' })

  useEffect(() => { loadClasses() }, [])

  const loadClasses = async () => {
    const { data, error: err } = await supabase.from('classes').select('*').order('class_name')
    if (err) error(err.message)
    else setClasses(data || [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ className: '', section: '', roomNo: '' })
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ className: c.class_name, section: c.section || '', roomNo: c.room_no || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const payload = { class_name: form.className, section: form.section, room_no: form.roomNo || null }
    if (editing) {
      const { error: err } = await supabase.from('classes').update(payload).eq('id', editing.id)
      if (err) return error(err.message)
      success('Class updated successfully')
    } else {
      const { error: err } = await supabase.from('classes').insert([payload])
      if (err) return error(err.message)
      success('Class created successfully')
    }
    setModalOpen(false)
    loadClasses()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this class?')) return
    const { error: err } = await supabase.from('classes').delete().eq('id', id)
    if (err) return error(err.message)
    success('Class deleted')
    loadClasses()
  }

  const filtered = classes.filter(c =>
    (c.class_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.section || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title="Classes" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Classes</h2>
            <p>Manage all classes and sections</p>
          </div>
          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Class</button>
          )}
        </div>

        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search />
            <input className="form-input" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <School />
            <h3>No classes found</h3>
            <p>Create a new class to get started.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Class Name</th>
                  <th>Section</th>
                  <th>Room No.</th>
                  {user.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.class_name}</td>
                    <td><span className="badge badge-info">{c.section || '-'}</span></td>
                    <td>{c.room_no || '-'}</td>
                    {user.role === 'admin' && (
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
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
        title={editing ? 'Edit Class' : 'Add New Class'}
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
          <label className="form-label">Class Name</label>
          <input className="form-input" placeholder="e.g., Class 1" value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Section</label>
            <input className="form-input" placeholder="e.g., A" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Room No.</label>
            <input className="form-input" placeholder="e.g., 101" value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}
