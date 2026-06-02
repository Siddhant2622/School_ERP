import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, ClipboardList, Send } from 'lucide-react'

export default function ExamsPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [exams, setExams] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', term: '', academicYear: '', startDate: '', endDate: '', classId: '', status: 'scheduled'
  })

  useEffect(() => {
    loadExams()
    loadClasses()
  }, [])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name')
    setClasses(data || [])
  }

  const loadExams = async () => {
    let query = supabase.from('exams').select('*').order('start_date', { ascending: false })
    if (user.role === 'student') {
      query = query.eq('is_published', true)
    }
    const { data, error: err } = await query
    if (err) error(err.message)
    else setExams(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    const payload = {
      name: form.name, term: form.term, academic_year: form.academicYear,
      start_date: form.startDate || null, end_date: form.endDate || null,
      class_id: form.classId ? parseInt(form.classId) : null, status: form.status
    }
    const { error: err } = await supabase.from('exams').insert([payload])
    if (err) return error(err.message)
    success('Exam created')
    setModalOpen(false)
    loadExams()
  }

  const handlePublish = async (id) => {
    const { error: err } = await supabase.from('exams').update({ is_published: true }).eq('id', id)
    if (err) return error(err.message)
    success('Exam published to students')
    loadExams()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam?')) return
    const { error: err } = await supabase.from('exams').delete().eq('id', id)
    if (err) return error(err.message)
    success('Exam deleted')
    loadExams()
  }

  const getClassName = (classId) => {
    const c = classes.find(cl => cl.id === classId)
    return c ? `${c.class_name} ${c.section || ''}` : '-'
  }

  return (
    <>
      <Header title="Exams" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Examinations</h2>
            <p>Manage exams and assessments</p>
          </div>
          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ name: '', term: '', academicYear: '', startDate: '', endDate: '', classId: '', status: 'scheduled' })
              setModalOpen(true)
            }}>
              <Plus size={16} /> Create Exam
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : exams.length === 0 ? (
          <div className="empty-state"><ClipboardList /><h3>No exams found</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Term</th>
                  <th>Academic Year</th>
                  <th>Class</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Published</th>
                  {user.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {exams.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td>{e.term || '-'}</td>
                    <td>{e.academic_year || '-'}</td>
                    <td>{getClassName(e.class_id)}</td>
                    <td>{e.start_date || '-'}</td>
                    <td>{e.end_date || '-'}</td>
                    <td>
                      <span className={`badge ${e.status === 'completed' ? 'badge-success' : e.status === 'ongoing' ? 'badge-warning' : 'badge-info'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${e.is_published ? 'badge-success' : 'badge-default'}`}>
                        {e.is_published ? 'Yes' : 'No'}
                      </span>
                    </td>
                    {user.role === 'admin' && (
                      <td>
                        <div className="table-actions">
                          {!e.is_published && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handlePublish(e.id)} title="Publish"><Send size={14} /></button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
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
        title="Create Exam"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Exam Name</label>
          <input className="form-input" placeholder="e.g., Mid-Term Exam" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Term</label>
            <select className="form-select" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
              <option value="">Select Term</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Annual">Annual</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <input className="form-input" placeholder="e.g., 2025-2026" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Class</label>
          <select className="form-select" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} - {c.section}</option>)}
          </select>
        </div>
      </Modal>
    </>
  )
}
