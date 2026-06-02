import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, Briefcase, Download, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AssignmentsPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', classId: '', sectionId: '', subjectId: '', dueDate: '', totalMarks: 100
  })
  
  // Student specific submission modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [submissionText, setSubmissionText] = useState('')

  useEffect(() => {
    loadAssignments()
    if (user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin') {
      loadDropdownData()
    }
  }, [])

  const loadDropdownData = async () => {
    const { data: clsData } = await supabase.from('classes').select('*')
    const { data: secData } = await supabase.from('sections').select('*')
    const { data: subData } = await supabase.from('subjects').select('*')
    
    // Combining class and section for dropdown ease
    const combinedClasses = (clsData || []).flatMap(c => 
      (secData || []).map(s => ({ id: `${c.id}_${s.id}`, class_id: c.id, section_id: s.id, label: `${c.class_name} - ${s.section_name}` }))
    )
    setClasses(combinedClasses)
    setSubjects(subData || [])
  }

  const loadAssignments = async () => {
    setLoading(true)
    let query = supabase.from('assignments').select(`
      *,
      classes(class_name),
      sections(section_name),
      subjects(name),
      users!assignments_teacher_id_fkey(full_name)
    `).order('created_at', { ascending: false })

    if (user.role === 'teacher') {
      query = query.eq('teacher_id', user.id)
    } else if (user.role === 'student') {
      query = query.eq('class_id', user.class_id).eq('section_id', user.section_id)
    }

    const { data, error: err } = await query
    if (err) {
      error(err.message)
    } else {
      // If student, fetch their submission statuses
      let submissionsMap = {}
      if (user.role === 'student' && data?.length) {
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('assignment_id, status, marks_obtained')
          .eq('student_id', user.id)
          .in('assignment_id', data.map(d => d.id))
        
        subs?.forEach(sub => {
          submissionsMap[sub.assignment_id] = sub
        })
      }
      
      setAssignments((data || []).map(a => ({
        ...a,
        className: a.classes?.class_name || '',
        sectionName: a.sections?.section_name || '',
        subjectName: a.subjects?.name || '',
        teacherName: a.users?.full_name || '',
        submission: submissionsMap[a.id] || null
      })))
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    const [classId, sectionId] = form.classId.split('_')
    const payload = {
      teacher_id: user.id,
      title: form.title,
      description: form.description,
      class_id: classId,
      section_id: sectionId,
      subject_id: form.subjectId,
      due_date: new Date(form.dueDate).toISOString(),
      total_marks: parseInt(form.totalMarks) || 100
    }

    const { error: err } = await supabase.from('assignments').insert([payload])
    if (err) return error(err.message)
    
    success('Assignment created')
    setModalOpen(false)
    loadAssignments()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this assignment?')) return
    const { error: err } = await supabase.from('assignments').delete().eq('id', id)
    if (err) return error(err.message)
    success('Assignment deleted')
    loadAssignments()
  }
  
  const handleStudentSubmit = async () => {
    const payload = {
      assignment_id: selectedAssignment.id,
      student_id: user.id,
      submission_text: submissionText,
      status: 'submitted'
    }
    
    // UPSERT basically
    const { error: err } = await supabase
      .from('assignment_submissions')
      .upsert(payload, { onConflict: 'assignment_id,student_id' })
      
    if (err) return error(err.message)
    
    success('Assignment submitted successfully')
    setSubmitModalOpen(false)
    setSubmissionText('')
    loadAssignments()
  }

  const canCreate = user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin'

  return (
    <>
      <Header title="Assignments" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Assignments</h2><p>Manage class assignments</p></div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ title: '', description: '', classId: '', sectionId: '', subjectId: '', dueDate: '', totalMarks: 100 })
              setModalOpen(true)
            }}>
              <Plus size={16} /> Create Assignment
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : assignments.length === 0 ? (
          <div className="empty-state"><Briefcase /><h3>No assignments found</h3></div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {assignments.map(a => (
              <div key={a.id} className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{a.title}</h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span className="badge badge-purple">{a.subjectName}</span>
                      <span className="badge badge-info">{a.className} - {a.sectionName}</span>
                      <span className="badge badge-warning">Due: {new Date(a.due_date).toLocaleDateString()}</span>
                      {user.role === 'student' && a.submission && (
                         <span className={`badge ${a.submission.status === 'graded' ? 'badge-success' : 'badge-primary'}`}>
                           {a.submission.status.toUpperCase()}
                           {a.submission.status === 'graded' && ` (${a.submission.marks_obtained}/${a.total_marks})`}
                         </span>
                      )}
                    </div>
                  </div>
                  <div className="table-actions">
                    {canCreate && (
                      <>
                        <Link to={`/assignments/${a.id}/submissions`} className="btn btn-secondary btn-sm">Submissions</Link>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></button>
                      </>
                    )}
                    {user.role === 'student' && (!a.submission || a.submission.status === 'pending') && (
                       <button className="btn btn-primary btn-sm" onClick={() => {
                         setSelectedAssignment(a)
                         setSubmitModalOpen(true)
                       }}>
                         <Upload size={14} /> Submit
                       </button>
                    )}
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginTop: '12px' }}>
                  {a.description || 'No description provided.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Assignment"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Class & Section</label>
            <select className="form-select" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-select" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Total Marks</label>
            <input className="form-input" type="number" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: e.target.value })} />
          </div>
        </div>
      </Modal>
      
      {/* Student Submit Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title={`Submit: ${selectedAssignment?.title}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setSubmitModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleStudentSubmit}>Submit Assignment</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Submission Text / Links</label>
          <textarea className="form-textarea" rows={6} placeholder="Type your answer or paste links to your work here..." value={submissionText} onChange={e => setSubmissionText(e.target.value)} />
        </div>
      </Modal>
    </>
  )
}
