import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle size={18} style={{ color: '#4ade80' }} />}
          {t.type === 'error' && <XCircle size={18} style={{ color: '#f87171' }} />}
          {t.type === 'info' && <Info size={18} style={{ color: '#60a5fa' }} />}
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
