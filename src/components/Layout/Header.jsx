import { useAuth } from '../../contexts/AuthContext'
import { Bell, Search } from 'lucide-react'

export default function Header({ title }) {
  const { user } = useAuth()
  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      <div className="header-actions">
        <button className="btn btn-ghost btn-icon" title="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
