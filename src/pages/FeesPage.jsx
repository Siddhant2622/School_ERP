import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, DollarSign, Search, CheckCircle, Pencil } from 'lucide-react'

export default function FeesPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    studentId: '', feeType: '', amount: '', dueDate: '', month: '', year: ''
  })

  useEffect(() => {
    loadFees()
    if (user.role === 'admin') {
      loadSummary()
      loadStudents()
    }
  }, [])

  const loadStudents = async () => {
    const { data } = await supabase.from('students').select('id, name, class_id').order('name')
    setStudents(data || [])
  }

  const loadSummary = async () => {
    const { data: paid } = await supabase.from('fees').select('amount').eq('status', 'paid')
    const { data: pending } = await supabase.from('fees').select('amount').eq('status', 'pending')
    const { data: overdue } = await supabase.from('fees').select('amount').eq('status', 'overdue')
    setSummary({
      totalCollected: (paid || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0),
      totalPending: (pending || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0),
      paidCount: (paid || []).length,
      pendingCount: (pending || []).length,
      overdueCount: (overdue || []).length,
    })
  }

  const loadFees = async () => {
    let query = supabase.from('fees').select('*, students(name, admission_no, class_id, classes(class_name, section))').order('id', { ascending: false })
    if (user.role === 'student') {
      query = query.eq('student_id', user.id)
    }
    const { data, error: err } = await query
    if (err) error(err.message)
    else setFees((data || []).map(f => ({
      ...f,
      studentName: f.students?.name || '',
      className: f.students?.classes?.class_name || '',
      section: f.students?.classes?.section || '',
      admissionNo: f.students?.admission_no || '',
    })))
    setLoading(false)
  }

  const handleCreate = async () => {
    const payload = {
      student_id: parseInt(form.studentId),
      fee_type: form.feeType, amount: parseFloat(form.amount) || 0,
      due_date: form.dueDate || null, month: form.month || null, year: form.year || null,
      status: 'pending'
    }
    const { error: err } = await supabase.from('fees').insert([payload])
    if (err) return error(err.message)
    success('Fee record created')
    setModalOpen(false)
    loadFees()
    loadSummary()
  }

  const handlePay = async (id) => {
    const receiptNo = `REC-${Date.now()}-${id}`
    const { error: err } = await supabase.from('fees').update({
      status: 'paid', paid_at: new Date().toISOString(), receipt_no: receiptNo
    }).eq('id', id)
    if (err) return error(err.message)
    success(`Payment recorded. Receipt: ${receiptNo}`)
    loadFees()
    loadSummary()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this fee record?')) return
    const { error: err } = await supabase.from('fees').delete().eq('id', id)
    if (err) return error(err.message)
    success('Fee record deleted')
    loadFees()
    loadSummary()
  }

  const filtered = fees.filter(f => {
    const matchSearch = (f.studentName || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || f.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      <Header title="Fees" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Fee Management</h2><p>Track and manage student fees</p></div>
          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ studentId: '', feeType: '', amount: '', dueDate: '', month: '', year: '' })
              setModalOpen(true)
            }}>
              <Plus size={16} /> Add Fee
            </button>
          )}
        </div>

        {user.role === 'admin' && (
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat-card">
              <div className="stat-icon green"><DollarSign size={22} /></div>
              <div className="stat-content">
                <div className="stat-value">₹{(summary.totalCollected || 0).toLocaleString()}</div>
                <div className="stat-label">Total Collected ({summary.paidCount || 0})</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><DollarSign size={22} /></div>
              <div className="stat-content">
                <div className="stat-value">₹{(summary.totalPending || 0).toLocaleString()}</div>
                <div className="stat-label">Pending ({summary.pendingCount || 0})</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red"><DollarSign size={22} /></div>
              <div className="stat-content">
                <div className="stat-value">{summary.overdueCount || 0}</div>
                <div className="stat-label">Overdue Records</div>
              </div>
            </div>
          </div>
        )}

        <div className="filters-bar">
          <div className="search-input-wrapper">
            <Search />
            <input className="form-input" placeholder="Search by student..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><DollarSign /><h3>No fee records found</h3></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Receipt No</th>
                  {user.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.studentName}</td>
                    <td>{f.className} {f.section ? `(${f.section})` : ''}</td>
                    <td>{f.fee_type || '-'}</td>
                    <td style={{ fontWeight: 600 }}>₹{parseFloat(f.amount || 0).toLocaleString()}</td>
                    <td>{f.due_date || '-'}</td>
                    <td>
                      <span className={`badge ${f.status === 'paid' ? 'badge-success' : f.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                        {f.status}
                      </span>
                    </td>
                    <td>{f.receipt_no || '-'}</td>
                    {user.role === 'admin' && (
                      <td>
                        <div className="table-actions">
                          {f.status !== 'paid' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handlePay(f.id)} title="Mark Paid">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(f.id)}><Trash2 size={14} /></button>
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
        title="Add Fee Record"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Student</label>
          <select className="form-select" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
            <option value="">Select Student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fee Type</label>
            <select className="form-select" value={form.feeType} onChange={e => setForm({ ...form, feeType: e.target.value })}>
              <option value="">Select Type</option>
              <option value="tuition">Tuition</option>
              <option value="transport">Transport</option>
              <option value="exam">Exam</option>
              <option value="library">Library</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <input className="form-input" placeholder="e.g., January" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}
