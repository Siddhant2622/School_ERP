import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Calendar, CheckCircle, XCircle, Save } from 'lucide-react'

export default function AttendancePage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedClass, setSelectedClass] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name')
    setClasses(data || [])
  }

  const loadAttendance = async () => {
    if (!selectedDate) return
    setLoading(true)

    if (user.role === 'student') {
      // Student sees own attendance
      const { data } = await supabase.from('attendance').select('*').eq('student_id', user.id).order('date', { ascending: false }).limit(30)
      setStudents([])
      setAttendance({})
      // Show as a list
      const attMap = {}
      ;(data || []).forEach(a => { attMap[a.date] = a.status })
      setAttendance(attMap)
      setLoading(false)
      return
    }

    if (!selectedClass) { setLoading(false); return }

    // Load students + attendance for date
    const { data: stuData } = await supabase.from('students').select('*').eq('class_id', selectedClass).order('roll_no')
    const { data: attData } = await supabase.from('attendance').select('*').eq('date', selectedDate)

    const attMap = {}
    ;(attData || []).forEach(a => { attMap[a.student_id] = a.status })

    setStudents(stuData || [])
    setAttendance(attMap)
    setLoading(false)
  }

  useEffect(() => {
    loadAttendance()
  }, [selectedDate, selectedClass])

  const toggleStatus = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }))
  }

  const markAll = (status) => {
    const map = {}
    students.forEach(s => { map[s.id] = status })
    setAttendance(map)
  }

  const handleSave = async () => {
    const entries = students.map(s => ({
      student_id: s.id,
      date: selectedDate,
      status: attendance[s.id] || 'present'
    }))

    for (const entry of entries) {
      const { error: err } = await supabase.from('attendance').upsert(entry, {
        onConflict: 'student_id,date'
      })
      if (err) { error(err.message); return }
    }
    success(`Attendance saved for ${entries.length} students`)
  }

  const isEditable = user.role === 'admin' || user.role === 'teacher'

  // Student view - show own attendance history
  if (user.role === 'student') {
    return (
      <>
        <Header title="Attendance" />
        <ToastContainer toasts={toasts} />
        <div className="page-content page-enter">
          <div className="page-header">
            <div><h2>My Attendance</h2><p>View your attendance history</p></div>
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : Object.keys(attendance).length === 0 ? (
            <div className="empty-state"><Calendar /><h3>No attendance records found</h3></div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {Object.entries(attendance).sort((a, b) => b[0].localeCompare(a[0])).map(([date, status]) => (
                    <tr key={date}>
                      <td>{date}</td>
                      <td><span className={`badge ${status === 'present' ? 'badge-success' : 'badge-danger'}`}>{status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Attendance" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Attendance</h2><p>Mark and manage daily attendance</p></div>
          {isEditable && students.length > 0 && (
            <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Save Attendance</button>
          )}
        </div>

        <div className="filters-bar">
          <input className="form-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: 'auto' }} />
          <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} - {c.section}</option>)}
          </select>
          {isEditable && students.length > 0 && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => markAll('present')}><CheckCircle size={14} /> All Present</button>
              <button className="btn btn-secondary btn-sm" onClick={() => markAll('absent')}><XCircle size={14} /> All Absent</button>
            </>
          )}
        </div>

        {!selectedClass ? (
          <div className="empty-state"><Calendar /><h3>Select a class</h3><p>Choose a class to mark attendance.</p></div>
        ) : loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="empty-state"><Calendar /><h3>No students in this class</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Roll No</th><th>Name</th><th>Status</th></tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const status = attendance[s.id] || 'present'
                  return (
                    <tr key={s.id}>
                      <td>{s.roll_no || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>
                        {isEditable ? (
                          <button
                            className={`btn btn-sm ${status === 'present' ? 'btn-primary' : 'btn-danger'}`}
                            onClick={() => toggleStatus(s.id)}
                            style={{ minWidth: 90 }}
                          >
                            {status === 'present' ? <><CheckCircle size={14} /> Present</> : <><XCircle size={14} /> Absent</>}
                          </button>
                        ) : (
                          <span className={`badge ${status === 'present' ? 'badge-success' : 'badge-danger'}`}>{status}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
