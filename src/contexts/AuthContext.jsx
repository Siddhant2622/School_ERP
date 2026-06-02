import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const stored = localStorage.getItem('school_erp_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          setSession(parsed)
          await fetchUserProfile(parsed.user.id, parsed.user.role)
        }
      } catch (err) {
        console.error('Session restore failed:', err)
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  const fetchUserProfile = async (userId, role) => {
    try {
      // First try to fetch from the main users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && role !== 'admin') {
        console.error('Error fetching user profile:', error)
        setUser(null)
        return
      }

      let userData = data || { id: userId, role }

      // Also fetch specific data based on role from the specific tables
      let extraData = {}
      if (role === 'student') {
        const { data: studentData } = await supabase.from('students').select('*').eq('id', userId).maybeSingle()
        extraData = studentData || {}
      } else if (role === 'teacher') {
        const { data: teacherData } = await supabase.from('teachers').select('*').eq('id', userId).maybeSingle()
        extraData = teacherData || {}
      } else if (role === 'admin') {
        const { data: adminData } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle()
        extraData = adminData || {}
      }
      
      setUser({ ...userData, ...extraData })
    } catch (err) {
      console.error(err)
    }
  }

  const login = async (email, password) => {
    setLoading(true)
    try {
      // Check custom users table
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()
      
      if (error || !data) {
        // Fallback to admins table if not in users table
        const { data: adminData, error: adminErr } = await supabase
          .from('admins')
          .select('*')
          .eq('email', email)
          .eq('password', password)
          .single()

        if (adminErr || !adminData) {
          throw new Error('Invalid email or password')
        }
        
        const adminSession = { user: { id: adminData.id, role: 'admin', email: adminData.email } }
        setSession(adminSession)
        localStorage.setItem('school_erp_session', JSON.stringify(adminSession))
        await fetchUserProfile(adminData.id, 'admin')
        return adminSession
      }

      const sessionObj = { user: data }
      setSession(sessionObj)
      localStorage.setItem('school_erp_session', JSON.stringify(sessionObj))
      await fetchUserProfile(data.id, data.role)
      return sessionObj
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    localStorage.removeItem('school_erp_session')
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
