import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import MainLayout from './components/Layout/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/ClassesPage'
import TeachersPage from './pages/TeachersPage'
import StudentsPage from './pages/StudentsPage'
import ExamsPage from './pages/ExamsPage'
import MarksPage from './pages/MarksPage'
import AttendancePage from './pages/AttendancePage'
import FeesPage from './pages/FeesPage'
import FeeStructuresPage from './pages/FeeStructuresPage'
import FeeRemindersPage from './pages/FeeRemindersPage'
import TimetablePage from './pages/TimetablePage'
import NoticesPage from './pages/NoticesPage'
import SubjectTeachersPage from './pages/SubjectTeachersPage'
import SubjectsPage from './pages/SubjectsPage'
import ReportCardPage from './pages/ReportCardPage'
import AssignmentsPage from './pages/AssignmentsPage'
import AssignmentSubmissionsPage from './pages/AssignmentSubmissionsPage'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  // super_admin usually has same access as admin plus more
  const allowedRoles = roles ? (roles.includes('admin') ? [...roles, 'super_admin'] : roles) : null
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AuthRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>
  if (user) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />

          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            
            {/* Admin Only */}
            <Route path="/classes" element={<ProtectedRoute roles={['admin']}><ClassesPage /></ProtectedRoute>} />
            <Route path="/teachers" element={<ProtectedRoute roles={['admin']}><TeachersPage /></ProtectedRoute>} />
            <Route path="/subjects" element={<ProtectedRoute roles={['admin']}><SubjectsPage /></ProtectedRoute>} />
            <Route path="/fee-structures" element={<ProtectedRoute roles={['admin']}><FeeStructuresPage /></ProtectedRoute>} />
            <Route path="/fee-reminders" element={<ProtectedRoute roles={['admin']}><FeeRemindersPage /></ProtectedRoute>} />
            
            {/* Admin & Teacher */}
            <Route path="/students" element={<ProtectedRoute roles={['admin', 'teacher']}><StudentsPage /></ProtectedRoute>} />
            <Route path="/marks" element={<ProtectedRoute roles={['admin', 'teacher']}><MarksPage /></ProtectedRoute>} />
            <Route path="/subject-teachers" element={<ProtectedRoute roles={['admin', 'teacher']}><SubjectTeachersPage /></ProtectedRoute>} />
            
            {/* Shared */}
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignments/:id/submissions" element={<ProtectedRoute roles={['teacher']}><AssignmentSubmissionsPage /></ProtectedRoute>} />
            
            {/* Student & Parent */}
            <Route path="/report-card" element={<ProtectedRoute roles={['student', 'parent']}><ReportCardPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}

export default App
