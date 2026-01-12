import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ClassroomList from './components/ClassroomList';
import ClassroomDetail from './components/ClassroomDetail';
import StudentsPage from './components/StudentsPage';
import AssignmentsPage from './components/AssignmentsPage';
import AnalyticsPage from './components/AnalyticsPage';
import axios from 'axios';
import {
  Github,
  Activity,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  Calendar
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const DashboardHome = () => {
  const [stats, setStats] = useState({ total_students: 0, active_students: 0, total_commits: 0 });

  useEffect(() => {
    axios.get(`${API_BASE}/dashboard/stats`).then(res => setStats(res.data));
  }, []);

  return (
    <div className="main-content">
      <header className="header" style={{ borderBottom: 'none' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Command Center</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time overview of your GitHub Classrooms</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
          <Calendar size={18} />
          <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </header>

      <div className="grid grid-4" style={{ marginBottom: '2.5rem' }}>
        <div className="card glass stat-card">
          <Activity size={24} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.total_students}</span>
          <span className="stat-label">Total Students</span>
        </div>
        <div className="card glass stat-card">
          <Users size={24} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.active_students}</span>
          <span className="stat-label">Active This Month</span>
        </div>
        <div className="card glass stat-card">
          <TrendingUp size={24} color="#10b981" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.total_commits}</span>
          <span className="stat-label">Total Commits</span>
        </div>
        <div className="card glass stat-card">
          <BookOpen size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">12</span>
          <span className="stat-label">Graded Today</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="var(--primary)" />
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Github size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>student-repo-{i} submitted Lab 2</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>2 minutes ago • CS101</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>Upcoming Deadlines</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.1)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Data Structures: Assignment 3</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>Tonight at 11:59 PM</div>
              </div>
              <span className="badge badge-error">Critical</span>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Web Dev: Final Project</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>In 4 days</div>
              </div>
              <span className="badge badge-info">Normal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="layout">
        <Sidebar />
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/classrooms" element={<ClassroomList />} />
          <Route path="/classrooms/:id" element={<ClassroomDetail />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
