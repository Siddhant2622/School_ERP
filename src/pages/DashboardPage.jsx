import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Header from '../components/Layout/Header'
import {
  Users, GraduationCap, School, Calendar, DollarSign,
  ClipboardList, CheckCircle, XCircle, BookOpen, UserCog,
  Bell, Clock, Award, TrendingUp, Briefcase
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

const PIE_COLORS = ['#4ade80', '#fbbf24', '#f87171']

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [feeChartData, setFeeChartData] = useState([])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      if (user.role === 'admin' || user.role === 'super_admin') {
        const [students, teachers, classes, presentToday, absentToday, upcomingExams, allFees] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('teachers').select('id', { count: 'exact', head: true }),
          supabase.from('classes').select('id', { count: 'exact', head: true }),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', new Date().toISOString().slice(0, 10)).eq('status', 'present'),
          supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', new Date().toISOString().slice(0, 10)).eq('status', 'absent'),
          supabase.from('exams').select('id', { count: 'exact', head: true }).gte('start_date', new Date().toISOString().slice(0, 10)),
          supabase.from('fees').select('amount, status, due_date'),
        ])

        const fees = allFees.data || []
        const paid = fees.filter(f => f.status === 'paid')
        const pending = fees.filter(f => f.status !== 'paid')
        const overdue = pending.filter(f => f.due_date && new Date(f.due_date) < new Date())

        const totalPaid = paid.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
        const totalPending = pending.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

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

        // Fee pie chart
        const chartData = [
          { name: 'Collected', value: paid.length },
          { name: 'Pending', value: pending.length - overdue.length },
          { name: 'Overdue', value: overdue.length },
        ].filter(d => d.value > 0)
        setFeeChartData(chartData)

      } else if (user.role === 'teacher') {
        const classIds = [...new Set([user.classId, ...(user.subjectClasses || [])].filter(Boolean))]
        let studentCount = 0
        if (classIds.length) {
          const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).in('class_id', classIds)
          studentCount = count || 0
        }
        setStats({ totalStudents: studentCount, presentToday: 0, absentToday: 0 })
      } else if (user.role === 'student') {
        // Load student fee summary
        const { data: myFees } = await supabase.from('fees').select('amount, status, due_date').eq('student_id', user.id)
        const fees = myFees || []
        const paid = fees.filter(f => f.status === 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0)
        const pending = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + parseFloat(f.amount || 0), 0)
        setStats({ feePaid: paid, feePending: pending, totalFeeRecords: fees.length })
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
    { icon: DollarSign, label: 'Fee Collected', value: `₹${(stats.totalFeeCollected || 0).toLocaleString('en-IN')}`, color: 'green' },
    { icon: DollarSign, label: 'Pending Fees', value: `₹${(stats.pendingFees || 0).toLocaleString('en-IN')}`, color: 'red' },
  ]

  const teacherStats = [
    { icon: GraduationCap, label: 'My Students', value: stats.totalStudents, color: 'purple' },
    { icon: CheckCircle, label: 'Present Today', value: stats.presentToday, color: 'green' },
    { icon: XCircle, label: 'Absent Today', value: stats.absentToday, color: 'red' },
  ]

  const displayStats = (user.role === 'admin' || user.role === 'super_admin') ? adminStats : user.role === 'teacher' ? teacherStats : []

  const adminQuickLinks = [
    { to: '/students', icon: GraduationCap, label: 'Manage Students', color: 'purple' },
    { to: '/teachers', icon: Users, label: 'Manage Teachers', color: 'blue' },
    { to: '/fees', icon: DollarSign, label: 'Fee Management', color: 'green' },
    { to: '/subjects', icon: BookOpen, label: 'Subjects', color: 'cyan' },
    { to: '/attendance', icon: Calendar, label: 'Attendance', color: 'orange' },
    { to: '/notices', icon: Bell, label: 'Notices', color: 'red' },
  ]

  const teacherQuickLinks = [
    { to: '/students', icon: GraduationCap, label: 'My Students', color: 'purple' },
    { to: '/marks', icon: Award, label: 'Enter Marks', color: 'blue' },
    { to: '/attendance', icon: Calendar, label: 'Take Attendance', color: 'green' },
    { to: '/assignments', icon: Briefcase, label: 'Assignments', color: 'orange' },
    { to: '/timetable', icon: Clock, label: 'Timetable', color: 'cyan' },
    { to: '/subjects', icon: BookOpen, label: 'Subjects', color: 'red' },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <div className="page-content page-enter">
        <div className="page-header">
          <div>
            <h2>Welcome back, {user?.name || user?.full_name || user?.email} 👋</h2>
            <p>Here's what's happening at your school today.</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : (
          <>
            {/* Stats Grid */}
            {displayStats.length > 0 && (
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

            {/* Admin: Quick Links + Fee Chart */}
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
                  {/* Quick Links */}
                  <div style={{ flex: '1 1 500px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
                      Quick Actions
                    </h3>
                    <div className="quick-links-grid">
                      {adminQuickLinks.map(link => (
                        <div
                          key={link.to}
                          className="quick-link-card"
                          onClick={() => navigate(link.to)}
                        >
                          <div className={`quick-link-icon stat-icon ${link.color}`}>
                            <link.icon size={20} />
                          </div>
                          <div className="quick-link-label">{link.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fee Collection Chart */}
                  {feeChartData.length > 0 && (
                    <div style={{ flex: '0 0 280px' }}>
                      <div className="chart-card">
                        <div className="chart-card-header">
                          <div className="chart-card-title">Fee Collection</div>
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={feeChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {feeChartData.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)',
                                borderRadius: 8, color: '#f1f5f9', fontSize: '0.8rem'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                          {feeChartData.map((d, i) => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block', flexShrink: 0 }} />
                              {d.name}: {d.value} records
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Teacher: Quick Links */}
            {user.role === 'teacher' && (
              <>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
                  Quick Actions
                </h3>
                <div className="quick-links-grid">
                  {teacherQuickLinks.map(link => (
                    <div
                      key={link.to}
                      className="quick-link-card"
                      onClick={() => navigate(link.to)}
                    >
                      <div className={`quick-link-icon stat-icon ${link.color}`}>
                        <link.icon size={20} />
                      </div>
                      <div className="quick-link-label">{link.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Student Dashboard */}
            {user.role === 'student' && (
              <>
                <div className="fee-summary-widget">
                  <div className="fee-summary-item">
                    <div className="fee-summary-amount green">
                      ₹{(stats.feePaid || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="fee-summary-label">Fees Paid</div>
                  </div>
                  <div className="fee-summary-item">
                    <div className="fee-summary-amount orange">
                      ₹{(stats.feePending || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="fee-summary-label">Fees Pending</div>
                  </div>
                  <div className="fee-summary-item">
                    <div className="fee-summary-amount" style={{ color: 'var(--text-primary)' }}>
                      {stats.totalFeeRecords || 0}
                    </div>
                    <div className="fee-summary-label">Total Records</div>
                  </div>
                </div>

                <div className="quick-links-grid">
                  {[
                    { to: '/fees', icon: DollarSign, label: 'View Fees', color: 'green' },
                    { to: '/report-card', icon: Award, label: 'Report Card', color: 'purple' },
                    { to: '/attendance', icon: Calendar, label: 'Attendance', color: 'blue' },
                    { to: '/assignments', icon: Briefcase, label: 'Assignments', color: 'orange' },
                    { to: '/timetable', icon: Clock, label: 'Timetable', color: 'cyan' },
                    { to: '/notices', icon: Bell, label: 'Notices', color: 'red' },
                  ].map(link => (
                    <div
                      key={link.to}
                      className="quick-link-card"
                      onClick={() => navigate(link.to)}
                    >
                      <div className={`quick-link-icon stat-icon ${link.color}`}>
                        <link.icon size={20} />
                      </div>
                      <div className="quick-link-label">{link.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
