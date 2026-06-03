import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Layout/Header'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { AlertCircle, Send, MessageSquare, Search, Hash } from 'lucide-react'

export default function FeeRemindersPage() {
  const { toasts, success, error } = useToast()
  
  const [defaulters, setDefaulters] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState(null)
  const [search, setSearch] = useState('')
  
  useEffect(() => {
    loadDefaulters()
  }, [])

  const loadDefaulters = async () => {
    setLoading(true)
    
    // Get all unpaid/overdue fees with student info
    const { data: unpaidFees, error: err } = await supabase
      .from('fees')
      .select('*, students(name, admission_no, class_id, parent_phone, father_name, classes(class_name, section))')
      .neq('status', 'paid')
      .order('id', { ascending: false })
    
    if (err) {
      error(err.message)
      setLoading(false)
      return
    }
    
    // Group by student
    const studentMap = {}
    
    ;(unpaidFees || []).forEach(f => {
      if (!f.students) return
      const sid = f.student_id
      
      if (!studentMap[sid]) {
        studentMap[sid] = {
          studentId: sid,
          studentName: f.students.name || 'Unknown',
          admissionNo: f.students.admission_no || 'N/A',
          className: f.students.classes?.class_name || 'Unknown',
          section: f.students.classes?.section || '',
          fatherName: f.students.father_name || 'Unknown',
          parentPhone: f.students.parent_phone || 'N/A',
          totalDue: 0,
          overdueCount: 0,
          records: 0
        }
      }
      
      studentMap[sid].totalDue += parseFloat(f.amount || 0)
      studentMap[sid].records++
      
      if (f.due_date && new Date(f.due_date) < new Date()) {
        studentMap[sid].overdueCount++
      }
    })
    
    setDefaulters(Object.values(studentMap).sort((a, b) => b.totalDue - a.totalDue))
    setLoading(false)
  }

  const handleSendReminder = async (studentId) => {
    setSendingId(studentId)
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke('send-fee-reminder', {
        body: { studentId }
      })
      
      if (funcError) throw funcError
      if (data?.error) throw new Error(data.error)
      
      success('SMS reminder sent successfully!')
    } catch (err) {
      console.error(err)
      // Show a more helpful error message
      if (err.message?.includes('Edge Function') || err.message?.includes('not found')) {
        error('SMS service not configured. Set up the Supabase Edge Function "send-fee-reminder" to enable SMS reminders.')
      } else {
        error(err.message || 'Failed to send reminder.')
      }
    } finally {
      setSendingId(null)
    }
  }

  const handleSendBulk = async () => {
    let successCount = 0
    
    for (const d of filtered) {
      if (d.parentPhone === 'N/A') continue
      try {
        setSendingId(d.studentId)
        await supabase.functions.invoke('send-fee-reminder', {
          body: { studentId: d.studentId }
        })
        successCount++
      } catch (err) {
        console.error(`Failed to send to ${d.studentName}:`, err)
      }
    }
    
    setSendingId(null)
    if (successCount > 0) {
      success(`Sent ${successCount} reminders successfully.`)
    } else {
      error('SMS service not configured. No reminders could be sent.')
    }
  }

  const filtered = defaulters.filter(d => {
    const q = search.toLowerCase()
    if (!q) return true
    return (d.studentName || '').toLowerCase().includes(q) ||
      (d.admissionNo || '').toLowerCase().includes(q) ||
      (d.className || '').toLowerCase().includes(q)
  })

  return (
    <>
      <Header title="Fee Reminders" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Fee Defaulters</h2>
            <p>Students with unpaid or overdue fees ({defaulters.length} total)</p>
          </div>
          {filtered.length > 0 && (
            <button className="btn btn-warning" onClick={handleSendBulk} disabled={sendingId !== null}>
              <MessageSquare size={16} /> Send Bulk Reminders ({filtered.length})
            </button>
          )}
        </div>

        {/* Summary Stats */}
        {defaulters.length > 0 && (
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat-card">
              <div className="stat-icon red"><AlertCircle size={22} /></div>
              <div className="stat-content">
                <div className="stat-value">{defaulters.length}</div>
                <div className="stat-label">Total Defaulters</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><AlertCircle size={22} /></div>
              <div className="stat-content">
                <div className="stat-value">
                  ₹{defaulters.reduce((s, d) => s + d.totalDue, 0).toLocaleString('en-IN')}
                </div>
                <div className="stat-label">Total Outstanding</div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search />
            <input
              className="form-input"
              placeholder="Search by name or admission number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <AlertCircle />
            <h3>{search ? 'No matching defaulters found' : 'No defaulters found'}</h3>
            <p>{search ? 'Try adjusting your search.' : 'All students have paid their fees up to date!'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class</th>
                  <th>Father's Name</th>
                  <th>Phone</th>
                  <th>Total Due (₹)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.studentId}>
                    <td style={{ fontWeight: 600 }}>{d.studentName}</td>
                    <td>
                      {d.admissionNo !== 'N/A' ? (
                        <span className="badge badge-info">{d.admissionNo}</span>
                      ) : '-'}
                    </td>
                    <td>{d.className} {d.section ? `(${d.section})` : ''}</td>
                    <td>{d.fatherName}</td>
                    <td>{d.parentPhone}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger-500)' }}>
                      ₹{d.totalDue.toLocaleString('en-IN')}
                    </td>
                    <td>
                      {d.overdueCount > 0 ? (
                        <span className="badge badge-danger">
                          <span className="status-dot overdue" />
                          {d.overdueCount} Overdue
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <span className="status-dot pending" />
                          {d.records} Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleSendReminder(d.studentId)}
                        disabled={sendingId === d.studentId || d.parentPhone === 'N/A'}
                        title={d.parentPhone === 'N/A' ? 'No phone number available' : 'Send SMS reminder'}
                      >
                        {sendingId === d.studentId ? (
                          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        ) : (
                          <><Send size={14} /> SMS</>
                        )}
                      </button>
                    </td>
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
