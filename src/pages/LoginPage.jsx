import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 4) errs.password = 'Password must be at least 4 characters'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password, role)
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle">S</div>
          <h2>Sri Guru Nanak Public School</h2>
          <p>School ERP Management System</p>
        </div>

        <div className="role-selector">
          {['admin', 'teacher', 'student'].map(r => (
            <button
              key={r}
              className={`role-btn ${role === r ? 'active' : ''}`}
              onClick={() => { setRole(r); setError(''); setFieldErrors({}) }}
              type="button"
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="email"
                className={`form-input ${fieldErrors.email ? 'invalid' : ''}`}
                style={{ paddingLeft: 34 }}
                placeholder={`Enter ${role} email`}
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors({ ...fieldErrors, email: null }) }}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <div className="form-error-text">{fieldErrors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'invalid' : ''}`}
                style={{ paddingLeft: 34, paddingRight: 38 }}
                placeholder="Enter password"
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors({ ...fieldErrors, password: null }) }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-tertiary)', padding: 4,
                  display: 'flex', alignItems: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <div className="form-error-text">{fieldErrors.password}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : (
              <>
                <LogIn size={18} />
                Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
