import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2, Info } from 'lucide-react'

const variants = {
  danger: {
    icon: Trash2,
    iconClass: 'confirm-icon-danger',
    confirmClass: 'btn btn-danger',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'confirm-icon-warning',
    confirmClass: 'btn btn-warning',
  },
  info: {
    icon: Info,
    iconClass: 'confirm-icon-info',
    confirmClass: 'btn btn-primary',
  },
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Focus the confirm button for accessibility
    setTimeout(() => confirmRef.current?.focus(), 100)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onConfirm, onCancel])

  if (!isOpen) return null

  const v = variants[variant] || variants.danger
  const Icon = v.icon

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-dialog-icon ${v.iconClass}`}>
          <Icon size={28} />
        </div>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={v.confirmClass}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span
                className="spinner"
                style={{ width: 16, height: 16, borderWidth: 2 }}
              />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
