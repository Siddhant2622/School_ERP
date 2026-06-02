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
      let userData = { id: userId, role }
      let extraData = {}

      if (role === 'admin') {
        const { data } = await supabase.from('admins').select('*').eq('id', userId).maybeSingle()
        if (data) userData = { ...userData, ...data }
      } else if (role === 'student') {
        const { data } = await supabase.from('students').select('*, classes(class_name, section)').eq('id', userId).maybeSingle()
        if (data) extraData = data
      } else if (role === 'teacher') {
        const { data } = await supabase.from('teachers').select('*').eq('id', userId).maybeSingle()
        if (data) extraData = data
        
        // Fetch subjects using the actual schema tables instead of the dummy table
        const { data: classes } = await supabase.from('subject_teachers').select('class_id').eq('teacher_id', userId)
        extraData.subjectClasses = classes ? [...new Set(classes.map(c => c.class_id))] : []
      }
      
      setUser({ ...userData, ...extraData })
    } catch (err) {
      console.error(err)
    }
  }

  const login = async (email, password, role = 'admin') => {
    setLoading(true)
    try {
      let table = 'users'
      if (role === 'admin') table = 'admins'
      if (role === 'teacher') table = 'teachers'
      if (role === 'student') table = 'students'

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single()
      
      if (error || !data) {
        throw new Error(`Invalid email or password for ${role.charAt(0).toUpperCase() + role.slice(1)}`)
      }

      const sessionObj = { user: { id: data.id, role: role, email: data.email, name: data.name } }
      setSession(sessionObj)
      localStorage.setItem('school_erp_session', JSON.stringify(sessionObj))
      await fetchUserProfile(data.id, role)
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
