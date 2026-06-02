import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Header from '../components/Layout/Header'
import {
  Users, GraduationCap, School, Calendar, DollarSign,
  ClipboardList, CheckCircle, XCircle
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      if (user.role === 'admin') {
        const [students, teachers, classes, presentToday, absentToday, upcomingExams, paidFees, pendingFees] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('teachers').select('id', { count: 'exact', head: true }),
          supabase.from('classes').select('id', { count: 'exact', head: true }),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', new Date().toISOString().slice(0, 10)).eq('status', 'present'),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', new Date().toISOString().slice(0, 10)).eq('status', 'absent'),
          supabase.from('exams').select('id', { count: 'exact', head: true }).gte('start_date', new Date().toISOString().slice(0, 10)),
          supabase.from('fees').select('amount').eq('status', 'paid'),
          supabase.from('fees').select('amount').neq('status', 'paid'),
        ])

        const totalPaid = (paidFees.data || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
        const totalPending = (pendingFees.data || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

        setStats({
          totalStudents: students.count || 0,
          totalTeachers: teachers.count || 0,
          totalClasses: classes.count || 0,
          presentToday: presentToday.count || 0,
          absentToday: absentToday.count || 0,
          upcomingExams: upcomingExams.count || 0,
          totalFeeCollected: totalPaid,
          pendingFees: totalPending,
        })
      } else if (user.role === 'teacher') {
        const classIds = [...new Set([user.classId, ...(user.subjectClasses || [])].filter(Boolean))]
        let studentCount = 0
        if (classIds.length) {
          const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).in('class_id', classIds)
          studentCount = count || 0
        }
        setStats({ totalStudents: studentCount, presentToday: 0, absentToday: 0 })
      } else {
        setStats({})
      }
    } catch (err) {
      console.error('Dashboard stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const adminStats = [
    { icon: GraduationCap, label: 'Total Students', value: stats.totalStudents, color: 'purple' },
    { icon: Users, label: 'Total Teachers', value: stats.totalTeachers, color: 'blue' },
    { icon: School, label: 'Total Classes', value: stats.totalClasses, color: 'cyan' },
    { icon: CheckCircle, label: 'Present Today', value: stats.presentToday, color: 'green' },
    { icon: XCircle, label: 'Absent Today', value: stats.absentToday, color: 'red' },
    { icon: ClipboardList, label: 'Upcoming Exams', value: stats.upcomingExams, color: 'orange' },
    { icon: DollarSign, label: 'Fee Collected', value: `₹${(stats.totalFeeCollected || 0).toLocaleString()}`, color: 'green' },
    { icon: DollarSign, label: 'Pending Fees', value: `₹${(stats.pendingFees || 0).toLocaleString()}`, color: 'red' },
  ]

  const teacherStats = [
    { icon: GraduationCap, label: 'My Students', value: stats.totalStudents, color: 'purple' },
    { icon: CheckCircle, label: 'Present Today', value: stats.presentToday, color: 'green' },
    { icon: XCircle, label: 'Absent Today', value: stats.absentToday, color: 'red' },
  ]

  const displayStats = user.role === 'admin' ? adminStats : user.role === 'teacher' ? teacherStats : []

  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Welcome back, {user?.name || user?.email} 👋</h2>
            <p>Here's what's happening at your school today.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <div className="stats-grid">
            {displayStats.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={i} className="stat-card">
                  <div className={`stat-icon ${s.color}`}>
                    <Icon size={22} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{s.value ?? 0}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {user.role === 'student' && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <GraduationCap size={48} style={{ margin: '0 auto 16px', color: 'var(--primary-400)' }} />
            <h3 style={{ marginBottom: 8, fontSize: '1.2rem' }}>Welcome, {user?.name || 'Student'}!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Use the sidebar to view your exams, report card, attendance, fees, and timetable.</p>
          </div>
        )}
      </div>
    </>
  )
}
