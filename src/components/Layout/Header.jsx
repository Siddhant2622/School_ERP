import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Bell, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Header({ title }) {
  const { user } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notices, setNotices] = useState([])
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchNotices()
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotices = async () => {
    try {
      const { data } = await supabase
        .from('notices')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5)
      
      if (data) setNotices(data)
    } catch (err) {
      console.error('Error fetching notices:', err)
    }
  }

  return (
    <header className="header" style={{ position: 'relative', zIndex: 50 }}>
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className="btn btn-ghost btn-icon" 
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={18} />
            {notices.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 8, height: 8, 
                backgroundColor: 'var(--danger)', borderRadius: '50%'
              }}></span>
            )}
          </button>
          
          {showNotifications && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 300, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                Notifications
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notices.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No new notifications
                  </div>
                ) : (
                  notices.map(notice => (
                    <div key={notice.id} style={{ 
                      padding: 12, borderBottom: '1px solid var(--border)',
                      cursor: 'pointer'
                    }} className="hover:bg-gray-50">
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: 4 }}>{notice.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(notice.published_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
