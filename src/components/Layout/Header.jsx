import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Bell, Menu } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function Header({ title }) {
  const { user } = useAuth()
  const context = useOutletContext()
  const onMenuToggle = context?.onMenuToggle
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
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {onMenuToggle && (
          <button className="mobile-menu-btn" onClick={onMenuToggle} title="Toggle menu">
            <Menu size={20} />
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </div>
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
                backgroundColor: 'var(--danger-500)', borderRadius: '50%'
              }}></span>
            )}
          </button>
          
          {showNotifications && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 320, backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
              zIndex: 200,
              animation: 'slideUp 0.2s ease-out'
            }}>
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-default)',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--text-primary)'
              }}>
                Notifications
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notices.length === 0 ? (
                  <div style={{
                    padding: '24px 16px', textAlign: 'center',
                    color: 'var(--text-tertiary)', fontSize: '0.85rem'
                  }}>
                    No new notifications
                  </div>
                ) : (
                  notices.map(notice => (
                    <div key={notice.id} style={{ 
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        fontWeight: 600, fontSize: '0.85rem',
                        marginBottom: 4, color: 'var(--text-primary)'
                      }}>
                        {notice.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {new Date(notice.published_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
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
