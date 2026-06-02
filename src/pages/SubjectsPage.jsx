import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Header from '../components/Layout/Header'
import { BookOpen } from 'lucide-react'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('subjects_master').select('*').order('subject_name')
      setSubjects(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <Header title="Subjects" />
      <div className="page-content page-enter">
        <div className="page-header">
          <div><h2>Subjects Master</h2><p>All available subjects</p></div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : subjects.length === 0 ? (
          <div className="empty-state"><BookOpen /><h3>No subjects found</h3><p>Add subjects via the Supabase dashboard.</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject Name</th>
                  <th>Code</th>
                  <th>Graded</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td style={{ fontWeight: 600 }}>{s.subject_name}</td>
                    <td>{s.subject_code || '-'}</td>
                    <td><span className={`badge ${s.is_graded ? 'badge-warning' : 'badge-default'}`}>{s.is_graded ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
