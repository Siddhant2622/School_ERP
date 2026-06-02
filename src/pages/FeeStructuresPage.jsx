import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, FileSignature } from 'lucide-react'

export default function FeeStructuresPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  
  const [structures, setStructures] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [form, setForm] = useState({
    classId: '', academicYearId: '', feeType: '', amount: '', dueDate: '', lateFee: '0'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Load dropdowns
    const { data: years } = await supabase.from('academic_years').select('*').order('start_date', { ascending: false })
    const { data: cls } = await supabase.from('classes').select('*').order('class_name')
    setAcademicYears(years || [])
    setClasses(cls || [])
    
    // Load structures
    const { data: structs, error: err } = await supabase
      .from('fee_structures')
      .select('*, classes(class_name), academic_years(year_name)')
      .order('created_at', { ascending: false }) // using default generated if created_at not present, or maybe just sort by class
      
    if (err) error(err.message)
    else setStructures((structs || []).map(s => ({
      ...s,
      className: s.classes?.class_name || 'Unknown',
      yearName: s.academic_years?.year_name || 'Unknown'
    })))
    
    setLoading(false)
  }

  const handleCreate = async () => {
    const payload = {
      class_id: form.classId,
      academic_year_id: form.academicYearId,
      fee_type: form.feeType,
      amount: parseFloat(form.amount) || 0,
      due_date: form.dueDate || null,
      late_fee_per_day: parseFloat(form.lateFee) || 0
    }
    
    const { error: err } = await supabase.from('fee_structures').insert([payload])
    if (err) return error(err.message)
    
    success('Fee structure created successfully')
    setModalOpen(false)
    loadData()
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return
    const { error: err } = await supabase.from('fee_structures').delete().eq('id', id)
    if (err) return error(err.message)
    
    success('Fee structure deleted')
    loadData()
  }

  const feeTypes = ['Tuition', 'Transport', 'Lab', 'Sports', 'Library', 'Other']

  return (
    <>
      <Header title="Fee Structures" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Fee Structures</h2>
            <p>Define standard fees per class and academic year</p>
          </div>
          <button className="btn btn-primary" onClick={() => {
            setForm({ classId: '', academicYearId: '', feeType: '', amount: '', dueDate: '', lateFee: '0' })
            setModalOpen(true)
          }}>
            <Plus size={16} /> Add Structure
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : structures.length === 0 ? (
          <div className="empty-state">
            <FileSignature />
            <h3>No fee structures defined</h3>
            <p>Create a fee structure to start generating invoices for students.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Class</th>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Late Fee / Day</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {structures.map(s => (
                  <tr key={s.id}>
                    <td><span className="badge badge-info">{s.yearName}</span></td>
                    <td style={{ fontWeight: 600 }}>{s.className}</td>
                    <td>{s.fee_type}</td>
                    <td style={{ fontWeight: 700 }}>₹{parseFloat(s.amount).toLocaleString()}</td>
                    <td>{s.due_date ? new Date(s.due_date).toLocaleDateString() : '-'}</td>
                    <td>₹{parseFloat(s.late_fee_per_day).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>
                        <Trash2 size={14} />
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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Fee Structure"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Academic Year</label>
            <select className="form-select" value={form.academicYearId} onChange={e => setForm({ ...form, academicYearId: e.target.value })}>
              <option value="">Select Year</option>
              {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Class</label>
            <select className="form-select" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fee Type</label>
            <select className="form-select" value={form.feeType} onChange={e => setForm({ ...form, feeType: e.target.value })}>
              <option value="">Select Type</option>
              {feeTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Late Fee Per Day (₹)</label>
            <input className="form-input" type="number" min="0" value={form.lateFee} onChange={e => setForm({ ...form, lateFee: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  )
}
