import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Pagination from '../components/ui/Pagination'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import {
  Plus, Trash2, DollarSign, Search, CheckCircle, Pencil,
  BarChart3, User, Hash, Calendar, CreditCard, Printer,
  TrendingUp, AlertCircle, Clock, ArrowRight
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts'

const FEE_TYPES = ['Tuition', 'Transport', 'Exam', 'Library', 'Sports', 'Lab', 'Other']
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Online', 'Cheque']
const PIE_COLORS = ['#4ade80', '#fbbf24', '#f87171', '#60a5fa']

function getDaysOverdue(dueDate) {
  if (!dueDate) return 0
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function getFeeStatus(fee) {
  if (fee.status === 'paid') return 'paid'
  if (fee.due_date && new Date(fee.due_date) < new Date()) return 'overdue'
  return fee.status || 'pending'
}

export default function FeesPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  // Tab state
  const [activeTab, setActiveTab] = useState(isAdmin ? 'overview' : 'records')

  // Data
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [confirmState, setConfirmState] = useState({ open: false, id: null })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [feeTypeFilter, setFeeTypeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [classes, setClasses] = useState([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Lookup
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupStudent, setLookupStudent] = useState(null)
  const [lookupFees, setLookupFees] = useState([])
  const [lookupLoading, setLookupLoading] = useState(false)

  // Forms
  const [form, setForm] = useState({
    studentId: '', feeType: '', amount: '', dueDate: '', month: '', year: ''
  })
  const [payForm, setPayForm] = useState({
    id: null, amount: '', method: 'Cash', partialAmount: ''
  })
  const [formErrors, setFormErrors] = useState({})

  // Receipt
  const [receiptData, setReceiptData] = useState(null)
  const receiptRef = useRef(null)

  useEffect(() => {
    loadFees()
    if (isAdmin) {
      loadSummary()
      loadStudents()
      loadClasses()
    }
  }, [])

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name')
    setClasses(data || [])
  }

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, name, class_id, admission_no, father_name, classes(class_name, section)')
      .order('name')
    setStudents(data || [])
  }

  const loadSummary = async () => {
    const { data: allFees } = await supabase.from('fees').select('amount, status, due_date')
    const fees = allFees || []

    const paid = fees.filter(f => f.status === 'paid')
    const pending = fees.filter(f => f.status !== 'paid')
    const overdue = pending.filter(f => f.due_date && new Date(f.due_date) < new Date())

    const totalCollected = paid.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalPending = pending.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalAmount = totalCollected + totalPending
    const collectionRate = totalAmount > 0 ? Math.round((totalCollected / totalAmount) * 100) : 0

    setSummary({
      totalCollected,
      totalPending,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      collectionRate,
      totalRecords: fees.length
    })
  }

  const loadFees = async () => {
    let query = supabase
      .from('fees')
      .select('*, students(name, admission_no, class_id, father_name, classes(class_name, section))')
      .order('id', { ascending: false })

    if (user?.role === 'student') {
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
      fatherName: f.students?.father_name || '',
      computedStatus: getFeeStatus(f),
      daysOverdue: getDaysOverdue(f.due_date),
    })))
    setLoading(false)
  }

  // --- Admission Number Lookup ---
  const handleLookup = async () => {
    const q = lookupQuery.trim()
    if (!q) return

    setLookupLoading(true)
    setLookupStudent(null)
    setLookupFees([])

    // Search by admission_no or name
    const { data: studentData } = await supabase
      .from('students')
      .select('*, classes(class_name, section)')
      .or(`admission_no.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(1)
      .maybeSingle()

    if (!studentData) {
      error('No student found with that admission number or name.')
      setLookupLoading(false)
      return
    }

    setLookupStudent(studentData)

    const { data: feeData } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', studentData.id)
      .order('id', { ascending: false })

    setLookupFees((feeData || []).map(f => ({
      ...f,
      computedStatus: getFeeStatus(f),
      daysOverdue: getDaysOverdue(f.due_date),
    })))

    setLookupLoading(false)
  }

  // --- Form Validation ---
  const validateForm = () => {
    const errs = {}
    if (!form.studentId) errs.studentId = 'Please select a student'
    if (!form.feeType) errs.feeType = 'Please select a fee type'
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Amount must be greater than 0'
    if (!form.dueDate) errs.dueDate = 'Due date is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return

    const payload = {
      student_id: parseInt(form.studentId),
      fee_type: form.feeType,
      amount: parseFloat(form.amount) || 0,
      due_date: form.dueDate || null,
      month: form.month || null,
      year: form.year || null,
      status: 'pending'
    }
    const { error: err } = await supabase.from('fees').insert([payload])
    if (err) return error(err.message)
    success('Fee record created successfully')
    setModalOpen(false)
    loadFees()
    loadSummary()
  }

  const handlePay = async () => {
    const receiptNo = `SGNPS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    const { error: err } = await supabase.from('fees').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      receipt_no: receiptNo
    }).eq('id', payForm.id)

    if (err) return error(err.message)

    // Build receipt data
    const feeRecord = fees.find(f => f.id === payForm.id) || lookupFees.find(f => f.id === payForm.id)
    setReceiptData({
      receiptNo,
      studentName: feeRecord?.studentName || lookupStudent?.name || '',
      admissionNo: feeRecord?.admissionNo || lookupStudent?.admission_no || '',
      className: feeRecord?.className || lookupStudent?.classes?.class_name || '',
      feeType: feeRecord?.fee_type || '',
      amount: feeRecord?.amount || 0,
      paidAt: new Date().toLocaleDateString('en-IN'),
      method: payForm.method
    })

    success(`Payment recorded. Receipt: ${receiptNo}`)
    setPayModalOpen(false)
    loadFees()
    loadSummary()
    if (lookupStudent) handleLookup()
  }

  const openPayModal = (fee) => {
    setPayForm({
      id: fee.id,
      amount: fee.amount,
      method: 'Cash',
      partialAmount: ''
    })
    setPayModalOpen(true)
  }

  const requestDelete = (id) => {
    setConfirmState({ open: true, id })
  }

  const handleDelete = async () => {
    const { error: err } = await supabase.from('fees').delete().eq('id', confirmState.id)
    if (err) error(err.message)
    else {
      success('Fee record deleted')
      loadFees()
      loadSummary()
    }
    setConfirmState({ open: false, id: null })
  }

  const printReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=700')
    printWindow.document.write(`
      <html>
      <head>
        <title>Fee Receipt - ${receiptData.receiptNo}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 20px; }
          .header h2 { margin: 0 0 4px; font-size: 1.4rem; }
          .header p { margin: 0; color: #666; font-size: 0.9rem; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
          .details dt { color: #666; font-size: 0.9rem; }
          .details dd { font-weight: 600; margin: 0; font-size: 0.9rem; }
          .total { border-top: 2px solid #333; padding-top: 14px; display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; }
          .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #999; }
          .stamp { margin-top: 60px; text-align: right; font-style: italic; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Sri Guru Nanak Public School</h2>
          <p>Fee Payment Receipt</p>
        </div>
        <dl class="details">
          <dt>Receipt No:</dt><dd>${receiptData.receiptNo}</dd>
          <dt>Date:</dt><dd>${receiptData.paidAt}</dd>
          <dt>Student Name:</dt><dd>${receiptData.studentName}</dd>
          <dt>Admission No:</dt><dd>${receiptData.admissionNo || 'N/A'}</dd>
          <dt>Class:</dt><dd>${receiptData.className}</dd>
          <dt>Fee Type:</dt><dd>${receiptData.feeType}</dd>
          <dt>Payment Method:</dt><dd>${receiptData.method}</dd>
        </dl>
        <div class="total">
          <span>Amount Paid:</span>
          <span>₹${parseFloat(receiptData.amount).toLocaleString('en-IN')}</span>
        </div>
        <div class="stamp">Authorized Signature</div>
        <div class="footer">This is a computer-generated receipt and does not require a physical signature.</div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // --- Filtering & Pagination ---
  const filtered = fees.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (f.studentName || '').toLowerCase().includes(q) ||
      (f.admissionNo || '').toLowerCase().includes(q) ||
      (f.receipt_no || '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || f.computedStatus === statusFilter
    const matchType = !feeTypeFilter || (f.fee_type || '').toLowerCase() === feeTypeFilter.toLowerCase()
    const matchClass = !classFilter || String(f.students?.class_id) === classFilter
    return matchSearch && matchStatus && matchType && matchClass
  })

  const totalFiltered = filtered.length
  const paginatedFees = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Chart data
  const pieData = [
    { name: 'Paid', value: summary.paidCount || 0 },
    { name: 'Pending', value: (summary.pendingCount || 0) - (summary.overdueCount || 0) },
    { name: 'Overdue', value: summary.overdueCount || 0 },
  ].filter(d => d.value > 0)

  // Group fees by fee_type for bar chart
  const feeTypeBreakdown = FEE_TYPES.map(type => {
    const matching = fees.filter(f => (f.fee_type || '').toLowerCase() === type.toLowerCase())
    const paid = matching.filter(f => f.computedStatus === 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0)
    const pending = matching.filter(f => f.computedStatus !== 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0)
    return { name: type, Collected: paid, Pending: pending }
  }).filter(d => d.Collected > 0 || d.Pending > 0)

  // Student search list for add modal
  const studentSearchList = form.studentId
    ? students
    : students.filter(s =>
      (s.name || '').toLowerCase().includes((form._studentSearch || '').toLowerCase()) ||
      (s.admission_no || '').toLowerCase().includes((form._studentSearch || '').toLowerCase())
    ).slice(0, 50)

  return (
    <>
      <Header title="Fees" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Fee Management</h2>
            <p>Track and manage student fee payments</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ studentId: '', feeType: '', amount: '', dueDate: '', month: '', year: '', _studentSearch: '' })
              setFormErrors({})
              setModalOpen(true)
            }}>
              <Plus size={16} /> Add Fee
            </button>
          )}
        </div>

        {/* Tabs (Admin only) */}
        {isAdmin && (
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <BarChart3 size={16} /> Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'lookup' ? 'active' : ''}`}
              onClick={() => setActiveTab('lookup')}
            >
              <Search size={16} /> Student Lookup
            </button>
            <button
              className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
              onClick={() => setActiveTab('records')}
            >
              <DollarSign size={16} /> All Records
            </button>
          </div>
        )}

        {/* ==================== OVERVIEW TAB ==================== */}
        {(activeTab === 'overview' && isAdmin) && (
          <>
            {/* Summary Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon green"><DollarSign size={22} /></div>
                <div className="stat-content">
                  <div className="stat-value">₹{(summary.totalCollected || 0).toLocaleString('en-IN')}</div>
                  <div className="stat-label">Total Collected ({summary.paidCount || 0} records)</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange"><Clock size={22} /></div>
                <div className="stat-content">
                  <div className="stat-value">₹{(summary.totalPending || 0).toLocaleString('en-IN')}</div>
                  <div className="stat-label">Pending ({summary.pendingCount || 0} records)</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><AlertCircle size={22} /></div>
                <div className="stat-content">
                  <div className="stat-value">{summary.overdueCount || 0}</div>
                  <div className="stat-label">Overdue Records</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon cyan"><TrendingUp size={22} /></div>
                <div className="stat-content">
                  <div className="stat-value">{summary.collectionRate || 0}%</div>
                  <div className="stat-label">Collection Rate</div>
                  <div className="progress-bar-container" style={{ marginTop: 8 }}>
                    <div
                      className={`progress-bar-fill ${summary.collectionRate >= 75 ? 'green' : summary.collectionRate >= 50 ? 'orange' : 'red'}`}
                      style={{ width: `${summary.collectionRate || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">Payment Status Distribution</div>
                </div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)',
                          borderRadius: 8, color: '#f1f5f9', fontSize: '0.8rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <p>No data available</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block' }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-card-title">Collection by Fee Type</div>
                </div>
                {feeTypeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={feeTypeBreakdown} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
                        tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)',
                          borderRadius: 8, color: '#f1f5f9', fontSize: '0.8rem'
                        }}
                        formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                      />
                      <Bar dataKey="Collected" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pending" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <p>No data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick action: go to lookup */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <button className="btn btn-secondary" onClick={() => setActiveTab('lookup')}>
                <Search size={16} /> Look up student by Admission Number <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}

        {/* ==================== LOOKUP TAB ==================== */}
        {(activeTab === 'lookup' && isAdmin) && (
          <>
            <div className="fee-lookup-panel">
              <h3 style={{ textAlign: 'center', marginBottom: 'var(--space-4)', fontWeight: 700, fontSize: '1.1rem' }}>
                Student Fee Lookup
              </h3>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', fontSize: '0.85rem' }}>
                Enter admission number or student name to view their complete fee history
              </p>
              <div className="fee-lookup-search">
                <Search />
                <input
                  className="form-input"
                  placeholder="Enter admission number or student name..."
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                />
                <button className="btn btn-primary btn-sm lookup-btn" onClick={handleLookup} disabled={lookupLoading}>
                  {lookupLoading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Search'}
                </button>
              </div>
            </div>

            {/* Student Profile Card */}
            {lookupStudent && (
              <>
                <div className="student-profile-card">
                  <div className="student-avatar-lg">
                    {(lookupStudent.name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="student-profile-info">
                    <div className="student-profile-name">{lookupStudent.name}</div>
                    <div className="student-profile-details">
                      <span><Hash size={13} /> {lookupStudent.admission_no || 'N/A'}</span>
                      <span><User size={13} /> {lookupStudent.classes?.class_name || ''} {lookupStudent.classes?.section ? `(${lookupStudent.classes.section})` : ''}</span>
                      {lookupStudent.father_name && <span>Father: {lookupStudent.father_name}</span>}
                    </div>
                  </div>
                  <div className="student-profile-actions">
                    <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                      {lookupFees.length} Records
                    </span>
                  </div>
                </div>

                {/* Lookup Fee Summary */}
                <div className="fee-summary-widget">
                  <div className="fee-summary-item">
                    <div className="fee-summary-amount green">
                      ₹{lookupFees.filter(f => f.computedStatus === 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <div className="fee-summary-label">Total Paid</div>
                  </div>
                  <div className="fee-summary-item">
                    <div className="fee-summary-amount orange">
                      ₹{lookupFees.filter(f => f.computedStatus === 'pending').reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <div className="fee-summary-label">Pending</div>
                  </div>
                  <div className="fee-summary-item">
                    <div className="fee-summary-amount red">
                      ₹{lookupFees.filter(f => f.computedStatus === 'overdue').reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString('en-IN')}
                    </div>
                    <div className="fee-summary-label">Overdue</div>
                  </div>
                </div>

                {/* Lookup Fee Records Table */}
                {lookupFees.length === 0 ? (
                  <div className="empty-state"><DollarSign /><h3>No fee records found for this student</h3></div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fee Type</th>
                          <th>Amount</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Receipt No</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lookupFees.map(f => (
                          <tr key={f.id}>
                            <td style={{ fontWeight: 600 }}>{f.fee_type || '-'}</td>
                            <td style={{ fontWeight: 600 }}>₹{parseFloat(f.amount || 0).toLocaleString('en-IN')}</td>
                            <td>{f.due_date ? new Date(f.due_date).toLocaleDateString('en-IN') : '-'}</td>
                            <td>
                              <span className={`badge ${f.computedStatus === 'paid' ? 'badge-success' : f.computedStatus === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                                <span className={`status-dot ${f.computedStatus}`} />
                                {f.computedStatus}
                              </span>
                              {f.computedStatus === 'overdue' && f.daysOverdue > 0 && (
                                <div className="overdue-days">
                                  <AlertCircle size={11} /> {f.daysOverdue} days overdue
                                </div>
                              )}
                            </td>
                            <td>{f.receipt_no || '-'}</td>
                            <td>
                              <div className="table-actions">
                                {f.computedStatus !== 'paid' && (
                                  <button className="btn btn-ghost btn-sm" onClick={() => openPayModal(f)} title="Record Payment">
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => requestDelete(f.id)} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ==================== RECORDS TAB (or default for non-admin) ==================== */}
        {(activeTab === 'records' || !isAdmin) && (
          <>
            {/* Student Fee Summary (for student role) */}
            {user?.role === 'student' && fees.length > 0 && (
              <div className="fee-summary-widget">
                <div className="fee-summary-item">
                  <div className="fee-summary-amount green">
                    ₹{fees.filter(f => f.computedStatus === 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString('en-IN')}
                  </div>
                  <div className="fee-summary-label">Total Paid</div>
                </div>
                <div className="fee-summary-item">
                  <div className="fee-summary-amount orange">
                    ₹{fees.filter(f => f.computedStatus === 'pending').reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString('en-IN')}
                  </div>
                  <div className="fee-summary-label">Pending</div>
                </div>
                <div className="fee-summary-item">
                  <div className="fee-summary-amount red">
                    ₹{fees.filter(f => f.computedStatus === 'overdue').reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString('en-IN')}
                  </div>
                  <div className="fee-summary-label">Overdue</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="filters-bar">
              <div className="search-input-wrapper">
                <Search />
                <input
                  className="form-input"
                  placeholder="Search by name, admission no, or receipt..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                />
              </div>
              <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}>
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="form-select" value={feeTypeFilter} onChange={e => { setFeeTypeFilter(e.target.value); setCurrentPage(1) }}>
                <option value="">All Fee Types</option>
                {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {isAdmin && (
                <select className="form-select" value={classFilter} onChange={e => { setClassFilter(e.target.value); setCurrentPage(1) }}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} {c.section ? `- ${c.section}` : ''}</option>)}
                </select>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="loading-spinner"><div className="spinner" /></div>
            ) : paginatedFees.length === 0 ? (
              <div className="empty-state"><DollarSign /><h3>No fee records found</h3><p>{search || statusFilter || feeTypeFilter ? 'Try adjusting your filters.' : 'No fees have been recorded yet.'}</p></div>
            ) : (
              <>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Admission No</th>
                        <th>Class</th>
                        <th>Fee Type</th>
                        <th>Amount</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Receipt No</th>
                        {isAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFees.map(f => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{f.studentName}</td>
                          <td>
                            {f.admissionNo ? (
                              <span className="badge badge-info">{f.admissionNo}</span>
                            ) : '-'}
                          </td>
                          <td>{f.className} {f.section ? `(${f.section})` : ''}</td>
                          <td>{f.fee_type || '-'}</td>
                          <td style={{ fontWeight: 600 }}>₹{parseFloat(f.amount || 0).toLocaleString('en-IN')}</td>
                          <td>{f.due_date ? new Date(f.due_date).toLocaleDateString('en-IN') : '-'}</td>
                          <td>
                            <span className={`badge ${f.computedStatus === 'paid' ? 'badge-success' : f.computedStatus === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                              <span className={`status-dot ${f.computedStatus}`} />
                              {f.computedStatus}
                            </span>
                            {f.computedStatus === 'overdue' && f.daysOverdue > 0 && (
                              <div className="overdue-days">
                                <AlertCircle size={11} /> {f.daysOverdue} days overdue
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '0.78rem' }}>{f.receipt_no || '-'}</td>
                          {isAdmin && (
                            <td>
                              <div className="table-actions">
                                {f.computedStatus !== 'paid' && (
                                  <button className="btn btn-ghost btn-sm" onClick={() => openPayModal(f)} title="Record Payment">
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => requestDelete(f.id)} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalFiltered}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* ==================== ADD FEE MODAL ==================== */}
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
          <label className="form-label">Student <span className="required-asterisk">*</span></label>
          <input
            className="form-input"
            placeholder="Search by name or admission no..."
            value={form._studentSearch || ''}
            onChange={e => setForm({ ...form, _studentSearch: e.target.value, studentId: '' })}
            style={{ marginBottom: form._studentSearch && !form.studentId ? 4 : 0 }}
          />
          {form._studentSearch && !form.studentId && (
            <div style={{
              maxHeight: 160, overflowY: 'auto', background: 'var(--bg-input)',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
              marginTop: 4
            }}>
              {studentSearchList.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                    borderBottom: '1px solid var(--border-default)',
                    display: 'flex', justifyContent: 'space-between'
                  }}
                  onClick={() => setForm({ ...form, studentId: s.id, _studentSearch: `${s.name} (${s.admission_no || 'No Adm#'})` })}
                  onMouseEnter={e => e.target.style.background = 'rgba(99,102,241,0.1)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                    {s.admission_no || 'N/A'} • {s.classes?.class_name || ''}
                  </span>
                </div>
              ))}
              {studentSearchList.length === 0 && (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  No students found
                </div>
              )}
            </div>
          )}
          {form.studentId && (
            <div style={{ fontSize: '0.78rem', color: 'var(--success-500)', marginTop: 4 }}>
              ✓ Student selected
            </div>
          )}
          {formErrors.studentId && <div className="form-error-text">{formErrors.studentId}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fee Type <span className="required-asterisk">*</span></label>
            <select
              className={`form-select ${formErrors.feeType ? 'invalid' : ''}`}
              value={form.feeType}
              onChange={e => { setForm({ ...form, feeType: e.target.value }); setFormErrors({ ...formErrors, feeType: null }) }}
            >
              <option value="">Select Type</option>
              {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {formErrors.feeType && <div className="form-error-text">{formErrors.feeType}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) <span className="required-asterisk">*</span></label>
            <input
              className={`form-input ${formErrors.amount ? 'invalid' : ''}`}
              type="number"
              min="1"
              placeholder="0.00"
              value={form.amount}
              onChange={e => { setForm({ ...form, amount: e.target.value }); setFormErrors({ ...formErrors, amount: null }) }}
            />
            {formErrors.amount && <div className="form-error-text">{formErrors.amount}</div>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date <span className="required-asterisk">*</span></label>
            <input
              className={`form-input ${formErrors.dueDate ? 'invalid' : ''}`}
              type="date"
              value={form.dueDate}
              onChange={e => { setForm({ ...form, dueDate: e.target.value }); setFormErrors({ ...formErrors, dueDate: null }) }}
            />
            {formErrors.dueDate && <div className="form-error-text">{formErrors.dueDate}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>
              <option value="">Select Month</option>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m =>
                <option key={m} value={m}>{m}</option>
              )}
            </select>
          </div>
        </div>
      </Modal>

      {/* ==================== PAYMENT MODAL ==================== */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Record Payment"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPayModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePay}>
              <CheckCircle size={16} /> Confirm Payment
            </button>
          </>
        }
      >
        <div className="fee-summary-widget" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="fee-summary-item">
            <div className="fee-summary-amount" style={{ color: 'var(--text-primary)' }}>
              ₹{parseFloat(payForm.amount || 0).toLocaleString('en-IN')}
            </div>
            <div className="fee-summary-label">Amount Due</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Payment Method</label>
          <select
            className="form-select"
            value={payForm.method}
            onChange={e => setPayForm({ ...payForm, method: e.target.value })}
          >
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{
          background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: '0.8rem',
          color: '#4ade80', textAlign: 'center'
        }}>
          A receipt number will be auto-generated upon confirmation.
        </div>
      </Modal>

      {/* ==================== RECEIPT MODAL ==================== */}
      <Modal
        isOpen={!!receiptData}
        onClose={() => setReceiptData(null)}
        title="Payment Receipt"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReceiptData(null)}>Close</button>
            <button className="btn btn-primary" onClick={printReceipt}>
              <Printer size={16} /> Print Receipt
            </button>
          </>
        }
      >
        {receiptData && (
          <div ref={receiptRef}>
            <div style={{
              textAlign: 'center', borderBottom: '2px solid var(--border-default)',
              paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Sri Guru Nanak Public School</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fee Payment Receipt</p>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
              fontSize: '0.85rem', marginBottom: 'var(--space-5)'
            }}>
              <div style={{ color: 'var(--text-secondary)' }}>Receipt No</div>
              <div style={{ fontWeight: 600 }}>{receiptData.receiptNo}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Date</div>
              <div style={{ fontWeight: 600 }}>{receiptData.paidAt}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Student</div>
              <div style={{ fontWeight: 600 }}>{receiptData.studentName}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Admission No</div>
              <div style={{ fontWeight: 600 }}>{receiptData.admissionNo || 'N/A'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Class</div>
              <div style={{ fontWeight: 600 }}>{receiptData.className}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Fee Type</div>
              <div style={{ fontWeight: 600 }}>{receiptData.feeType}</div>
              <div style={{ color: 'var(--text-secondary)' }}>Payment Method</div>
              <div style={{ fontWeight: 600 }}>{receiptData.method}</div>
            </div>

            <div style={{
              borderTop: '2px solid var(--border-default)', paddingTop: 'var(--space-4)',
              display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700
            }}>
              <span>Amount Paid</span>
              <span style={{ color: '#4ade80' }}>₹{parseFloat(receiptData.amount).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        onConfirm={handleDelete}
        onCancel={() => setConfirmState({ open: false, id: null })}
        title="Delete Fee Record"
        message="Are you sure you want to delete this fee record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}
