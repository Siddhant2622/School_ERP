import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function AssignmentSubmissionsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  
  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [gradeModalOpen, setGradeModalOpen] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [gradeForm, setGradeForm] = useState({ marks: '', feedback: '' })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    
    // Load Assignment details
    const { data: asgn } = await supabase
      .from('assignments')
      .select('*, classes(class_name), sections(section_name), subjects(name)')
      .eq('id', id)
      .single()
      
    if (asgn) {
      setAssignment({
        ...asgn,
        className: asgn.classes?.class_name,
        sectionName: asgn.sections?.section_name,
        subjectName: asgn.subjects?.name
      })
    }

    // Load Submissions
    const { data: subs, error: err } = await supabase
      .from('assignment_submissions')
      .select('*, students(users!students_id_fkey(full_name), roll_no)')
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })
      
    if (err) error(err.message)
    else setSubmissions((subs || []).map(s => ({
      ...s,
      studentName: s.students?.users?.full_name || 'Unknown',
      rollNo: s.students?.roll_no || '-'
    })))
    
    setLoading(false)
  }

  const handleGrade = async () => {
    const { error: err } = await supabase
      .from('assignment_submissions')
      .update({
        marks_obtained: parseInt(gradeForm.marks) || 0,
        feedback: gradeForm.feedback,
        status: 'graded'
      })
      .eq('id', selectedSub.id)
      
    if (err) return error(err.message)
    
    success('Submission graded successfully')
    setGradeModalOpen(false)
    loadData()
  }

  if (loading) {
    return <><Header title="Submissions" /><div className="page-content"><div className="loading-spinner"><div className="spinner" /></div></div></>
  }

  return (
    <>
      <Header title="Assignment Submissions" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <Link to="/assignments" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary-600)', textDecoration: 'none', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>
              <ArrowLeft size={16} /> Back to Assignments
            </Link>
            <h2>{assignment?.title}</h2>
            <p>{assignment?.subjectName} | {assignment?.className} - {assignment?.sectionName} | Total Marks: {assignment?.total_marks}</p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="empty-state">
            <CheckCircle />
            <h3>No submissions yet</h3>
            <p>Students have not submitted this assignment yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Submitted At</th>
                  <th>Content</th>
                  <th>Status</th>
                  <th>Marks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>{sub.rollNo}</td>
                    <td style={{ fontWeight: 600 }}>{sub.studentName}</td>
                    <td>{new Date(sub.submitted_at).toLocaleString()}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.submission_text}
                    </td>
                    <td>
                      <span className={`badge ${sub.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                        {sub.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{sub.status === 'graded' ? `${sub.marks_obtained} / ${assignment?.total_marks}` : '-'}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        setSelectedSub(sub)
                        setGradeForm({ marks: sub.marks_obtained || '', feedback: sub.feedback || '' })
                        setGradeModalOpen(true)
                      }}>
                        {sub.status === 'graded' ? 'Edit Grade' : 'Grade'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        title={`Grade Submission: ${selectedSub?.studentName}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setGradeModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleGrade}>Save Grade</button>
          </>
        }
      >
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
          <strong>Submission:</strong>
          <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{selectedSub?.submission_text}</p>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Marks Obtained (Out of {assignment?.total_marks})</label>
            <input className="form-input" type="number" min="0" max={assignment?.total_marks} value={gradeForm.marks} onChange={e => setGradeForm({ ...form, marks: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Feedback</label>
          <textarea className="form-textarea" rows={3} value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
        </div>
      </Modal>
    </>
  )
}
