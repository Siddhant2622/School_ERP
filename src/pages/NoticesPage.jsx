import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ToastContainer from '../components/ui/ToastContainer'
import { useToast } from '../hooks/useToast'
import { Plus, Trash2, Bell } from 'lucide-react'

export default function NoticesPage() {
  const { user } = useAuth()
  const { toasts, success, error } = useToast()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '', targetAudience: 'all' })

  useEffect(() => { loadNotices() }, [])

  const loadNotices = async () => {
    const { data, error: err } = await supabase.from('notices').select('*').order('published_at', { ascending: false }).limit(50)
    if (err) error(err.message)
    else setNotices(data || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    const { error: err } = await supabase.from('notices').insert([{
      title: form.title, content: form.content,
      category: form.category || null, target_audience: form.targetAudience
    }])
    if (err) return error(err.message)
    success('Notice published')
    setModalOpen(false)
    loadNotices()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return
    const { error: err } = await supabase.from('notices').delete().eq('id', id)
    if (err) return error(err.message)
    success('Notice deleted')
    loadNotices()
  }

  const canCreate = user.role === 'admin' || user.role === 'teacher'
  const canDelete = user.role === 'admin' || user.role === 'teacher'

  const categoryColors = {
    general: 'badge-info',
    academic: 'badge-purple',
    event: 'badge-warning',
    urgent: 'badge-danger',
  }

  return (
    <>
      <Header title="Notices" />
      <ToastContainer toasts={toasts} />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Notice Board</h2><p>School announcements and updates</p></div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => {
              setForm({ title: '', content: '', category: '', targetAudience: 'all' })
              setModalOpen(true)
            }}>
              <Plus size={16} /> Post Notice
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : notices.length === 0 ? (
          <div className="empty-state"><Bell /><h3>No notices</h3><p>No announcements at this time.</p></div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {notices.map(n => (
              <div key={n.id} className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{n.title}</h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {n.category && (
                        <span className={`badge ${categoryColors[n.category] || 'badge-default'}`}>
                          {n.category}
                        </span>
                      )}
                      <span className="badge badge-default">
                        {n.target_audience === 'all' ? 'Everyone' : n.target_audience}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {n.published_at ? new Date(n.published_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                  {canDelete && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(n.id)}><Trash2 size={14} /></button>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {n.content || 'No content.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Post Notice"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Publish</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" placeholder="Notice title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Content</label>
          <textarea className="form-textarea" rows={4} placeholder="Notice content..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="">Select Category</option>
              <option value="general">General</option>
              <option value="academic">Academic</option>
              <option value="event">Event</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Target Audience</label>
            <select className="form-select" value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })}>
              <option value="all">Everyone</option>
              <option value="teachers">Teachers Only</option>
              <option value="students">Students Only</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  )
}
