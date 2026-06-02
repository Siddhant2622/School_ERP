import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import { FileText, Printer } from 'lucide-react'

export default function ReportCardPage() {
  const { user } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    const studentId = user.id

    // Load student info with class
    const { data: student } = await supabase
      .from('students')
      .select('*, classes(class_name, section)')
      .eq('id', studentId)
      .single()

    if (!student) { setLoading(false); return }

    // Load marks for this student
    const { data: marks } = await supabase.from('marks').select('*').eq('student_id', studentId)

    // Load rankings (all students in same class)
    const { data: allMarks } = await supabase
      .from('marks')
      .select('student_id, pt1, nb1, se1, ma1, hf, pt2, nb2, se2, ma2, ann, students!inner(class_id)')
      .eq('students.class_id', student.class_id)

    // Compute totals per student
    const studentTotals = {}
    ;(allMarks || []).forEach(m => {
      const total = (m.pt1||0)+(m.nb1||0)+(m.se1||0)+(m.ma1||0)+(m.hf||0)+(m.pt2||0)+(m.nb2||0)+(m.se2||0)+(m.ma2||0)+(m.ann||0)
      studentTotals[m.student_id] = (studentTotals[m.student_id] || 0) + total
    })

    const sorted = Object.entries(studentTotals).sort((a, b) => b[1] - a[1])
    let rank = '-'
    sorted.forEach(([sid, total], i) => {
      if (parseInt(sid) === studentId) rank = i + 1
    })

    // Compute subjects
    const subjects = []
    let t1Total = 0, t2Total = 0
    ;(marks || []).forEach(mk => {
      const t1 = (mk.pt1||0)+(mk.nb1||0)+(mk.se1||0)+(mk.ma1||0)+(mk.hf||0)
      const t2 = (mk.pt2||0)+(mk.nb2||0)+(mk.se2||0)+(mk.ma2||0)+(mk.ann||0)
      t1Total += t1
      t2Total += t2
      subjects.push({
        subject: mk.subject_name || '',
        isGraded: ['Drawing', 'G.K.', 'Computer'].includes(mk.subject_name),
        term1: { pt1: mk.pt1||0, nb1: mk.nb1||0, se1: mk.se1||0, ma1: mk.ma1||0, hf: mk.hf||0, total: t1 },
        term2: { pt2: mk.pt2||0, nb2: mk.nb2||0, se2: mk.se2||0, ma2: mk.ma2||0, ann: mk.ann||0, total: t2 },
        termTotal: t1+t2,
        yearlyAvg: (t1+t2)/2,
      })
    })

    const nameParts = (student.name || '').split(' ')
    setReport({
      student: {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        className: student.classes?.class_name || '',
        section: student.classes?.section || '',
        rollNo: student.roll_no || '',
        admissionNo: student.admission_no || '',
        fatherName: student.father_name || '',
        motherName: student.mother_name || '',
        dateOfBirth: student.date_of_birth || '',
      },
      subjects,
      term1Total: t1Total,
      term2Total: t2Total,
      overallTotal: t1Total + t2Total,
      subjectCount: subjects.length,
      term1Pct: subjects.length ? ((t1Total / (subjects.length * 100)) * 100).toFixed(1) : 0,
      term2Pct: subjects.length ? ((t2Total / (subjects.length * 100)) * 100).toFixed(1) : 0,
      overallPct: subjects.length ? (((t1Total+t2Total) / (subjects.length * 200)) * 100).toFixed(1) : 0,
      rank,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <><Header title="Report Card" /><div className="page-content"><div className="loading-spinner"><div className="spinner" /></div></div></>
    )
  }

  if (!report) {
    return (
      <><Header title="Report Card" /><div className="page-content"><div className="empty-state"><FileText /><h3>No report card data</h3></div></div></>
    )
  }

  const { student: s } = report

  return (
    <>
      <Header title="Report Card" />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Report Card</h2><p>{s.firstName} {s.lastName} — {s.className} ({s.section})</p></div>
          <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print</button>
        </div>

        <div className="report-card-container">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Sri Guru Nanak Public School</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Annual Report Card</p>
          </div>

          {/* Student Info */}
          <table style={{ marginBottom: 20 }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Name:</td>
                <td>{s.firstName} {s.lastName}</td>
                <td style={{ fontWeight: 600 }}>Class:</td>
                <td>{s.className} ({s.section})</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Roll No:</td>
                <td>{s.rollNo}</td>
                <td style={{ fontWeight: 600 }}>Admission No:</td>
                <td>{s.admissionNo}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Father's Name:</td>
                <td>{s.fatherName}</td>
                <td style={{ fontWeight: 600 }}>Mother's Name:</td>
                <td>{s.motherName}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Date of Birth:</td>
                <td>{s.dateOfBirth}</td>
                <td style={{ fontWeight: 600 }}>Overall Rank:</td>
                <td style={{ fontWeight: 700, color: '#4f46e5' }}>{report.rank}</td>
              </tr>
            </tbody>
          </table>

          {/* Marks Table */}
          <table>
            <thead>
              <tr>
                <th rowSpan={2}>Subject</th>
                <th colSpan={6} style={{ background: '#e0e7ff', color: '#4338ca' }}>Term 1</th>
                <th colSpan={6} style={{ background: '#fef3c7', color: '#92400e' }}>Term 2</th>
                <th rowSpan={2}>Grand Total</th>
              </tr>
              <tr>
                <th>PT1</th><th>NB</th><th>SE</th><th>MA</th><th>HF</th><th>Total</th>
                <th>PT2</th><th>NB</th><th>SE</th><th>MA</th><th>ANN</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {report.subjects.map((sub, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, textAlign: 'left' }}>{sub.subject}</td>
                  <td>{sub.term1.pt1}</td><td>{sub.term1.nb1}</td><td>{sub.term1.se1}</td><td>{sub.term1.ma1}</td><td>{sub.term1.hf}</td>
                  <td style={{ fontWeight: 600 }}>{sub.term1.total}</td>
                  <td>{sub.term2.pt2}</td><td>{sub.term2.nb2}</td><td>{sub.term2.se2}</td><td>{sub.term2.ma2}</td><td>{sub.term2.ann}</td>
                  <td style={{ fontWeight: 600 }}>{sub.term2.total}</td>
                  <td style={{ fontWeight: 700 }}>{sub.termTotal}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                <td style={{ textAlign: 'left' }}>Total</td>
                <td colSpan={5}></td>
                <td>{report.term1Total}</td>
                <td colSpan={5}></td>
                <td>{report.term2Total}</td>
                <td>{report.overallTotal}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 20, textAlign: 'center' }}>
            <div style={{ padding: 12, background: '#e0e7ff', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#4338ca' }}>{report.term1Pct}%</div>
              <div style={{ fontSize: '0.8rem', color: '#6366f1' }}>Term 1</div>
            </div>
            <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#92400e' }}>{report.term2Pct}%</div>
              <div style={{ fontSize: '0.8rem', color: '#d97706' }}>Term 2</div>
            </div>
            <div style={{ padding: 12, background: '#d1fae5', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#065f46' }}>{report.overallPct}%</div>
              <div style={{ fontSize: '0.8rem', color: '#059669' }}>Overall</div>
            </div>
          </div>

          <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
            <div><strong>Result:</strong> PASS</div>
            <div><strong>Remarks:</strong> Good effort.</div>
            <div><strong>Class Teacher:</strong> _______________</div>
          </div>
        </div>
      </div>
    </>
  )
}
