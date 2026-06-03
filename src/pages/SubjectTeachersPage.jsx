import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, UserCog } from 'lucide-react'

export default function SubjectTeachersPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterClass, setFilterClass] = useState('')
  const [form, setForm] = useState({ classId: '', teacherId: '', subjectName: '' })
  const [formErrors, setFormErrors] = useState({})
  const [confirmState, setConfirmState] = useState({ open: false, id: null, name: '' })

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const [asgn, cls, tch, subj] = await Promise.all([
      supabase.from('subject_teachers').select('*, teachers(name), classes(class_name, section)').order('id'),
      supabase.from('classes').select('*').order('class_name'),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('subjects_master').select('*').eq('is_active', true).order('subject_name'),
    ])

    setAssignments((asgn.data || []).map(a => ({
      ...a,
      teacherName: a.teachers?.name || '-',
      className: a.classes?.class_name || '-',
      section: a.classes?.section || '',
    })))
    setClasses(cls.data || [])
    setTeachers(tch.data || [])
    setSubjects(subj.data || [])
    setLoading(false)
  }

  const validateForm = () => {
    const errs = {}
    if (!form.classId) errs.classId = 'Please select a class'
    if (!form.subjectName) errs.subjectName = 'Please select a subject'
    if (!form.teacherId) errs.teacherId = 'Please select a teacher'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return

    const { error: err } = await supabase.from('subject_teachers').upsert({
      class_id: parseInt(form.classId),
      teacher_id: parseInt(form.teacherId),
      subject_name: form.subjectName
    }, { onConflict: 'class_id,subject_name' })
    if (err) return error(err.message)
    success('Subject assigned successfully')
    setModalOpen(false)
    loadAll()
  }

  const requestDelete = (a) => {
    setConfirmState({
      open: true,
      id: a.id,
      name: `${a.subject_name} → ${a.teacherName} (${a.className})`
    })
  }

  const handleDelete = async () => {
    const { error: err } = await supabase.from('subject_teachers').delete().eq('id', confirmState.id)
    if (err) error(err.message)
    else {
      success('Assignment removed')
      loadAll()
    }
    setConfirmState({ open: false, id: null, name: '' })
  }

  const filtered = filterClass
    ? assignments.filter(a => String(a.class_id) === filterClass)
    : assignments

  return (
    <>
      <Header title="Subject Assignment" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Subject-Teacher Assignment</h2>
            <p>Assign teachers to subjects for each class ({assignments.length} assignments)</p>
          </div>
          {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher') && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ classId: '', teacherId: '', subjectName: '' })
              setFormErrors({})
              setModalOpen(true)
            }}>
              <Plus size={16} /> Assign Subject
            </button>
          )}
        </div>

        <div className="filters-bar">
          <select className="form-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.section ? `- ${c.section}` : ''}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <UserCog />
            <h3>No assignments found</h3>
            <p>{filterClass ? 'No subjects assigned for this class.' : 'Start by assigning subjects to teachers.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher') && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td>{a.className} {a.section ? `(${a.section})` : ''}</td>
                    <td style={{ fontWeight: 600 }}>{a.subject_name}</td>
                    <td>{a.teacherName}</td>
                    {(user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher') && (
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => requestDelete(a)} title="Remove assignment">
                          <Trash2 size={14} />
                        </button>
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
        title="Assign Subject to Teacher"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Assign</button>
          </>
        }
      >
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
        <div className="form-group">
          <label className="form-label">Subject <span className="required-asterisk">*</span></label>
          <select
            className={`form-select ${formErrors.subjectName ? 'invalid' : ''}`}
            value={form.subjectName}
            onChange={e => { setForm({ ...form, subjectName: e.target.value }); setFormErrors({ ...formErrors, subjectName: null }) }}
          >
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.subject_name}>{s.subject_name}</option>)}
          </select>
          {formErrors.subjectName && <div className="form-error-text">{formErrors.subjectName}</div>}
          <div className="form-hint">Only active subjects are shown.</div>
        </div>
        <div className="form-group">
          <label className="form-label">Teacher <span className="required-asterisk">*</span></label>
          <select
            className={`form-select ${formErrors.teacherId ? 'invalid' : ''}`}
            value={form.teacherId}
            onChange={e => { setForm({ ...form, teacherId: e.target.value }); setFormErrors({ ...formErrors, teacherId: null }) }}
          >
            <option value="">Select Teacher</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {formErrors.teacherId && <div className="form-error-text">{formErrors.teacherId}</div>}
        </div>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, id: null, name: '' })}
        title="Remove Assignment"
        message={`Remove subject assignment: ${confirmState.name}?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </>
  )
}
