import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, School, BookOpen,
  ClipboardList, Calendar, DollarSign, Bell, Clock,
  FileText, UserCog, LogOut, Award, Briefcase, FileSignature, AlertCircle
} from 'lucide-react'

const superAdminNav = [
  { section: 'Overview' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Academics' },
  { to: '/classes', icon: School, label: 'Classes' },
  { to: '/students', icon: GraduationCap, label: 'Students' },
  { to: '/teachers', icon: Users, label: 'Teachers' },
  { to: '/subject-teachers', icon: UserCog, label: 'Subject Assignment' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { section: 'Assessment' },
  { to: '/exams', icon: ClipboardList, label: 'Exams' },
  { to: '/marks', icon: Award, label: 'Marks Entry' },
  { to: '/assignments', icon: Briefcase, label: 'Assignments' },
  { section: 'Management' },
  { to: '/attendance', icon: Calendar, label: 'Attendance' },
  { to: '/fees', icon: DollarSign, label: 'Fee Payments' },
  { to: '/fee-structures', icon: FileSignature, label: 'Fee Structures' },
  { to: '/fee-reminders', icon: AlertCircle, label: 'Fee Reminders' },
  { to: '/timetable', icon: Clock, label: 'Timetable' },
  { to: '/notices', icon: Bell, label: 'Notices' },
]

const adminNav = superAdminNav

const teacherNav = [
  { section: 'Overview' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Academics' },
  { to: '/students', icon: GraduationCap, label: 'Students' },
  { to: '/subject-teachers', icon: UserCog, label: 'Subject Assignment' },
  { section: 'Assessment' },
  { to: '/exams', icon: ClipboardList, label: 'Exams' },
  { to: '/marks', icon: Award, label: 'Marks Entry' },
  { to: '/assignments', icon: Briefcase, label: 'Assignments' },
  { section: 'Management' },
  { to: '/attendance', icon: Calendar, label: 'Attendance' },
  { to: '/timetable', icon: Clock, label: 'Timetable' },
  { to: '/notices', icon: Bell, label: 'Notices' },
]

const studentNav = [
  { section: 'Overview' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Academics' },
  { to: '/exams', icon: ClipboardList, label: 'Exams' },
  { to: '/report-card', icon: FileText, label: 'Report Card' },
  { to: '/assignments', icon: Briefcase, label: 'Assignments' },
  { section: 'Others' },
  { to: '/attendance', icon: Calendar, label: 'Attendance' },
  { to: '/fees', icon: DollarSign, label: 'Fees' },
  { to: '/timetable', icon: Clock, label: 'Timetable' },
  { to: '/notices', icon: Bell, label: 'Notices' },
]

const parentNav = [
  { section: 'Overview' },
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Academics' },
  { to: '/report-card', icon: FileText, label: 'Report Card' },
  { section: 'Others' },
  { to: '/attendance', icon: Calendar, label: 'Attendance' },
  { to: '/fees', icon: DollarSign, label: 'Fees' },
  { to: '/notices', icon: Bell, label: 'Notices' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  let navItems = studentNav
  if (user?.role === 'super_admin' || user?.role === 'admin') navItems = adminNav
  else if (user?.role === 'teacher') navItems = teacherNav
  else if (user?.role === 'parent') navItems = parentNav

  const initials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">S</div>
        <div>
          <h1>SGNPS ERP</h1>
          <div className="logo-sub">School Management</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section-title">{item.section}</div>
          }
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive && location.pathname === item.to ? 'active' : ''}`
              }
              end={item.to === '/'}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || user?.email}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button className="nav-item" onClick={logout} style={{ marginTop: 8 }}>
          <LogOut />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
