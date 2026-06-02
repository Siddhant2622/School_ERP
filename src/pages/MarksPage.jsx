import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Save, Award, Lock, Unlock, Send } from 'lucide-react'

export default function MarksPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  
  const [academicYears, setAcademicYears] = useState([])
  const [classes, setClasses] = useState([])
  const [sections, setSections] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [results, setResults] = useState({})
  
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedExamType, setSelectedExamType] = useState('midterm')
  
  const [loading, setLoading] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  const examTypes = [
    { value: 'unit_test', label: 'Unit Test' },
    { value: 'midterm', label: 'Midterm' },
    { value: 'final', label: 'Final' },
    { value: 'annual', label: 'Annual' }
  ]

  useEffect(() => {
    loadDropdowns()
  }, [])

  const loadDropdowns = async () => {
    const { data: years } = await supabase.from('academic_years').select('*').order('start_date', { ascending: false })
    const { data: cls } = await supabase.from('classes').select('*').order('class_name')
    const { data: secs } = await supabase.from('sections').select('*').order('section_name')
    const { data: subs } = await supabase.from('subjects').select('*').order('name')
    
    setAcademicYears(years || [])
    setClasses(cls || [])
    setSections(secs || [])
    setSubjects(subs || [])
    
    if (years && years.length > 0) setSelectedYear(years[0].id)
  }

  const loadStudentsAndResults = async () => {
    if (!selectedYear || !selectedClass || !selectedSection || !selectedSubject) return
    setLoading(true)

    // 1. Check Lock Status
    const { data: lockData } = await supabase
      .from('result_locks')
      .select('is_locked')
      .eq('class_id', selectedClass)
      .eq('exam_type', selectedExamType)
      .eq('academic_year_id', selectedYear)
      .maybeSingle()
      
    setIsLocked(lockData?.is_locked || false)

    // 2. Load Students
    const { data: stuData } = await supabase
      .from('students')
      .select('id, roll_no, users!students_id_fkey(full_name)')
      .eq('class_id', selectedClass)
      .eq('section_id', selectedSection)
      .order('roll_no')

    // 3. Load Results
    const { data: resData } = await supabase
      .from('results')
      .select('*')
      .eq('academic_year_id', selectedYear)
      .eq('exam_type', selectedExamType)
      .eq('subject_id', selectedSubject)
      
    const resMap = {}
    let anyPublished = false;
    (resData || []).forEach(r => {
      resMap[r.student_id] = r
      if (r.is_published) anyPublished = true
    })

    setStudents(stuData || [])
    setResults(resMap)
    setIsPublished(anyPublished)
    setLoading(false)
  }

  useEffect(() => {
    loadStudentsAndResults()
  }, [selectedYear, selectedClass, selectedSection, selectedSubject, selectedExamType])

  const updateResult = (studentId, field, value) => {
    setResults(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        student_id: studentId,
        subject_id: selectedSubject,
        exam_type: selectedExamType,
        academic_year_id: selectedYear,
        [field]: value
      }
    }))
  }

  const handleSaveAll = async () => {
    const entries = Object.values(results).filter(r => r.student_id && r.subject_id)
    if (!entries.length) return error('No results to save')

    for (const r of entries) {
      const payload = {
        student_id: r.student_id,
        subject_id: r.subject_id,
        exam_type: r.exam_type,
        academic_year_id: r.academic_year_id,
        marks_obtained: parseFloat(r.marks_obtained) || 0,
        total_marks: parseFloat(r.total_marks) || 100,
        grade: r.grade || '',
        remarks: r.remarks || '',
        last_edited_by: user.id,
        last_edited_at: new Date().toISOString()
      }
      
      const { error: err } = await supabase.from('results').upsert(payload, {
        onConflict: 'student_id,subject_id,exam_type,academic_year_id'
      })
      if (err) { error(err.message); return }
    }
    success(`Results saved for ${entries.length} students`)
    loadStudentsAndResults()
  }
  
  const handleToggleLock = async () => {
    const payload = {
      class_id: selectedClass,
      exam_type: selectedExamType,
      academic_year_id: selectedYear,
      is_locked: !isLocked,
      locked_by: user.id,
      locked_at: new Date().toISOString()
    }
    const { error: err } = await supabase.from('result_locks').upsert(payload, {
      onConflict: 'class_id,exam_type,academic_year_id'
    })
    
    if (err) return error(err.message)
    setIsLocked(!isLocked)
    success(`Results ${!isLocked ? 'locked' : 'unlocked'} successfully`)
  }

  const handlePublish = async () => {
    if (!confirm('Are you sure you want to publish these results to students?')) return
    const studentIds = students.map(s => s.id)
    
    const { error: err } = await supabase
      .from('results')
      .update({ is_published: true })
      .in('student_id', studentIds)
      .eq('subject_id', selectedSubject)
      .eq('exam_type', selectedExamType)
      .eq('academic_year_id', selectedYear)
      
    if (err) return error(err.message)
    setIsPublished(true)
    success('Results published successfully')
  }

  const canEdit = user.role === 'admin' || user.role === 'super_admin' || (!isLocked && user.role === 'teacher')
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  return (
    <>
      <Header title="Result Management" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Result Management</h2>
            <p>Enter marks, lock results, and publish</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && selectedClass && (
              <button className={`btn ${isLocked ? 'btn-secondary' : 'btn-danger'}`} onClick={handleToggleLock}>
                {isLocked ? <><Unlock size={16}/> Unlock Results</> : <><Lock size={16}/> Lock Results</>}
              </button>
            )}
            {isAdmin && selectedClass && !isPublished && (
              <button className="btn btn-warning" onClick={handlePublish}>
                <Send size={16}/> Publish
              </button>
            )}
            {canEdit && students.length > 0 && (
              <button className="btn btn-primary" onClick={handleSaveAll}>
                <Save size={16} /> Save Marks
              </button>
            )}
          </div>
        </div>

        <div className="filters-bar" style={{ display: 'flex', flexWrap: 'wrap' }}>
          <select className="form-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">Academic Year</option>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
          </select>
          <select className="form-select" value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)}>
            {examTypes.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
          <select className="form-select" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
            <option value="">Select Section</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}
          </select>
          <select className="form-select" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">Select Subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        
        {isLocked && user.role === 'teacher' && (
          <div className="alert alert-warning" style={{ marginBottom: 16, padding: 12, backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} /> Results for this class and exam type have been locked by the administrator. You cannot make further edits.
          </div>
        )}

        {!selectedYear || !selectedClass || !selectedSection || !selectedSubject ? (
          <div className="empty-state">
            <Award />
            <h3>Select filters to view students</h3>
          </div>
        ) : loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : students.length === 0 ? (
          <div className="empty-state"><Award /><h3>No students in this class/section</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Marks Obtained</th>
                  <th>Total Marks</th>
                  <th>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const r = results[s.id] || {}
                  return (
                    <tr key={s.id}>
                      <td>{s.roll_no || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{s.users?.full_name || 'Unknown'}</td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 80, padding: '4px 6px', textAlign: 'center' }}
                          value={r.marks_obtained !== undefined ? r.marks_obtained : ''}
                          onChange={e => updateResult(s.id, 'marks_obtained', e.target.value)}
                          min="0"
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 80, padding: '4px 6px', textAlign: 'center' }}
                          value={r.total_marks !== undefined ? r.total_marks : 100}
                          onChange={e => updateResult(s.id, 'total_marks', e.target.value)}
                          min="0"
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: 60, padding: '4px 6px', textAlign: 'center' }}
                          value={r.grade || ''}
                          onChange={e => updateResult(s.id, 'grade', e.target.value)}
                          disabled={!canEdit}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '100%', padding: '4px 6px' }}
                          value={r.remarks || ''}
                          onChange={e => updateResult(s.id, 'remarks', e.target.value)}
                          placeholder="Optional"
                          disabled={!canEdit}
                        />
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
