import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Layout/Header'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { AlertCircle, Send, MessageSquare } from 'lucide-react'

export default function FeeRemindersPage() {
  const { toasts, success, error } = useToast()
  
  const [defaulters, setDefaulters] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState(null)
  
  // Since we use the Edge function, we don't need Supabase directly for the send, 
  // but we invoke the function via supabase client
  
  useEffect(() => {
    loadDefaulters()
  }, [])

  const loadDefaulters = async () => {
    setLoading(true)
    
    // Find all students with unpaid/overdue/partial fee payments
    // In a real scenario with thousands of records, this would be a custom view or RPC in Supabase.
    // For this ERP, we fetch payments that are not paid.
    
    const { data: payments, error: err } = await supabase
      .from('fee_payments')
      .select(`
        student_id,
        amount_paid,
        status,
        fee_structures(amount, due_date, fee_type),
        students(users!students_id_fkey(full_name), classes(class_name), parents!parents_student_id_fkey(users!parents_id_fkey(full_name), mobile_number))
      `)
      .in('status', ['unpaid', 'overdue', 'partial'])
      
    if (err) {
      error(err.message)
      setLoading(false)
      return
    }
    
    // Group by student
    const studentMap = {}
    
    ;(payments || []).forEach(p => {
      if (!p.students) return
      
      if (!studentMap[p.student_id]) {
        // Handle array or object for parents relationship safely
        const parentNode = Array.isArray(p.students.parents) ? p.students.parents[0] : p.students.parents
        
        studentMap[p.student_id] = {
          studentId: p.student_id,
          studentName: p.students.users?.full_name || 'Unknown',
          className: p.students.classes?.class_name || 'Unknown',
          parentName: parentNode?.users?.full_name || 'Unknown',
          parentMobile: parentNode?.mobile_number || 'N/A',
          totalDue: 0,
          overdueCount: 0
        }
      }
      
      const due = (p.fee_structures?.amount || 0) - (p.amount_paid || 0)
      studentMap[p.student_id].totalDue += due
      
      if (p.fee_structures?.due_date && new Date(p.fee_structures.due_date) < new Date()) {
        studentMap[p.student_id].overdueCount++
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
      error(err.message || 'Failed to send reminder. Check Edge Function logs.')
    } finally {
      setSendingId(null)
    }
  }

  const handleSendBulk = async () => {
    if (!confirm(`Are you sure you want to send reminders to ${defaulters.length} parents?`)) return
    
    let successCount = 0
    
    for (const d of defaulters) {
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
    success(`Sent ${successCount} reminders successfully.`)
  }

  return (
    <>
      <Header title="Fee Reminders" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Fee Defaulters</h2>
            <p>Send SMS reminders to parents for overdue and unpaid fees</p>
          </div>
          {defaulters.length > 0 && (
            <button className="btn btn-warning" onClick={handleSendBulk} disabled={sendingId !== null}>
              <MessageSquare size={16} /> Send Bulk Reminders
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : defaulters.length === 0 ? (
          <div className="empty-state">
            <AlertCircle />
            <h3>No defaulters found</h3>
            <p>All students have paid their fees up to date!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Parent Name</th>
                  <th>Mobile Number</th>
                  <th>Total Due (₹)</th>
                  <th>Overdue Records</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map(d => (
                  <tr key={d.studentId}>
                    <td style={{ fontWeight: 600 }}>{d.studentName}</td>
                    <td>{d.className}</td>
                    <td>{d.parentName}</td>
                    <td>{d.parentMobile}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₹{d.totalDue.toLocaleString()}</td>
                    <td>
                      {d.overdueCount > 0 ? (
                        <span className="badge badge-danger">{d.overdueCount} Overdue</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleSendReminder(d.studentId)}
                        disabled={sendingId === d.studentId || d.parentMobile === 'N/A'}
                      >
                        {sendingId === d.studentId ? (
                          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        ) : (
                          <><Send size={14} /> Send SMS</>
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
