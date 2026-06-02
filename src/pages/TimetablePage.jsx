import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, Clock } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [timetable, setTimetable] = useState([])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [selectedClass, setSelectedClass] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    dayOfWeek: 'Monday', period: 1, subject: '', teacherId: '', startTime: '', endTime: ''
  })

  useEffect(() => {
    loadClasses()
    loadTeachers()
  }, [])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name')
    setClasses(data || [])
  }

  const loadTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*').order('name')
    setTeachers(data || [])
  }

  const loadTimetable = async () => {
    if (!selectedClass) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('timetable')
      .select('*, teachers(name)')
      .eq('class_id', selectedClass)
      .order('period')

    if (err) error(err.message)
    else setTimetable((data || []).map(t => ({
      ...t,
      teacherName: t.teachers?.name || '-'
    })))
    setLoading(false)
  }

  useEffect(() => { loadTimetable() }, [selectedClass])

  const handleCreate = async () => {
    const payload = {
      class_id: parseInt(selectedClass),
      day_of_week: form.dayOfWeek, period: parseInt(form.period),
      subject: form.subject, teacher_id: form.teacherId ? parseInt(form.teacherId) : null,
      start_time: form.startTime || null, end_time: form.endTime || null
    }
    const { error: err } = await supabase.from('timetable').insert([payload])
    if (err) return error(err.message)
    success('Period added')
    setModalOpen(false)
    loadTimetable()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this period?')) return
    const { error: err } = await supabase.from('timetable').delete().eq('id', id)
    if (err) return error(err.message)
    success('Period deleted')
    loadTimetable()
  }

  // Group by day
  const grouped = {}
  DAYS.forEach(d => { grouped[d] = [] })
  timetable.forEach(t => {
    const day = t.day_of_week || 'Monday'
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(t)
  })
  // Sort by period
  Object.keys(grouped).forEach(d => {
    grouped[d].sort((a, b) => a.period - b.period)
  })

  const isEditable = user.role === 'admin' || user.role === 'teacher'

  return (
    <>
      <Header title="Timetable" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Timetable</h2><p>View and manage class schedules</p></div>
          {isEditable && selectedClass && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ dayOfWeek: 'Monday', period: 1, subject: '', teacherId: '', startTime: '', endTime: '' })
              setModalOpen(true)
            }}>
              <Plus size={16} /> Add Period
            </button>
          )}
        </div>

        <div className="filters-bar">
          <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} - {c.section}</option>)}
          </select>
        </div>

        {!selectedClass ? (
          <div className="empty-state"><Clock /><h3>Select a class</h3><p>Choose a class to view the timetable.</p></div>
        ) : loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : timetable.length === 0 ? (
          <div className="empty-state"><Clock /><h3>No timetable entries</h3></div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {DAYS.map(day => {
              const periods = grouped[day] || []
              if (!periods.length) return null
              return (
                <div key={day} className="card">
                  <div className="card-header">
                    <h3 className="card-title">{day}</h3>
                    <span className="badge badge-info">{periods.length} periods</span>
                  </div>
                  <div className="table-container" style={{ border: 'none' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Subject</th>
                          <th>Teacher</th>
                          <th>Time</th>
                          {isEditable && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map(p => (
                          <tr key={p.id}>
                            <td><span className="badge badge-purple">Period {p.period}</span></td>
                            <td style={{ fontWeight: 600 }}>{p.subject || '-'}</td>
                            <td>{p.teacherName}</td>
                            <td>{p.start_time && p.end_time ? `${p.start_time} - ${p.end_time}` : '-'}</td>
                            {isEditable && (
                              <td>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Period"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Add</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Day</label>
            <select className="form-select" value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: e.target.value })}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Period</label>
            <input className="form-input" type="number" min="1" max="10" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Teacher</label>
          <select className="form-select" value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })}>
            <option value="">Select Teacher</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input className="form-input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input className="form-input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}
