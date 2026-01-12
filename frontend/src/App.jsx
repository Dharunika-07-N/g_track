import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CurtainNav from './components/CurtainNav';
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
  Calendar,
  Trophy,
  ArrowRight
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const DashboardHome = () => {
  const [period, setPeriod] = useState('monthly');
  const [stats, setStats] = useState({ total_students: 0, active_students: 0, total_commits: 0, graded_today: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, leaderboardRes] = await Promise.all([
          axios.get(`${API_BASE}/dashboard/stats?period=${period}`),
          axios.get(`${API_BASE}/dashboard/leaderboard?period=${period}`)
        ]);
        setStats(statsRes.data);
        setLeaderboard(leaderboardRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  return (
    <div className="main-content">
      <header className="header" style={{ borderBottom: 'none' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Command Center</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="glass" style={{ display: 'flex', padding: '0.25rem', borderRadius: '0.75rem' }}>
            {['weekly', 'monthly', 'yearly', 'all'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`btn ${period === p ? 'btn-primary' : ''}`}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: period === p ? 'var(--primary)' : 'transparent',
                  border: 'none',
                  textTransform: 'capitalize',
                  fontSize: '0.75rem'
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Calendar size={18} />
            <span style={{ fontSize: '0.875rem' }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-4" style={{ marginBottom: '2.5rem' }}>
        <div
          className="card glass stat-card clickable"
          onClick={() => navigate('/students')}
          style={{ cursor: 'pointer' }}
        >
          <Activity size={24} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.total_students}</span>
          <span className="stat-label">Total Students</span>
        </div>
        <div
          className="card glass stat-card clickable"
          onClick={() => navigate(`/students?period=${period}`)}
          style={{ cursor: 'pointer' }}
        >
          <Users size={24} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.active_students}</span>
          <span className="stat-label">Active {period === 'all' ? 'Users' : `this ${period.replace('ly', '')}`}</span>
        </div>
        <div className="card glass stat-card">
          <TrendingUp size={24} color="#10b981" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.total_commits}</span>
          <span className="stat-label">Total Commits</span>
        </div>
        <div className="card glass stat-card">
          <BookOpen size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">{stats.graded_today}</span>
          <span className="stat-label">Graded Today</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Trophy size={20} color="#fbbf24" />
            Classroom Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaderboard.length > 0 ? (
              leaderboard.map((student, index) => (
                <div key={student.id} className="leaderboard-row">
                  <div className={`rank-badge rank-${index + 1}`}>{index + 1}</div>
                  <img src={student.avatar_url || 'https://github.com/identicons/jasonlong.png'} alt="" className="avatar" style={{ width: '32px', height: '32px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{student.github_username}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{student.score} pts</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{student.commits} commits</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No activity data available yet.
              </div>
            )}
            <button
              className="btn btn-secondary"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => navigate('/students')}
            >
              View Full Rankings <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="card glass">
          <h3 style={{ marginBottom: '1.5rem' }}>System Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>GitHub API Connection</div>
                <div style={{ fontSize: '0.875rem', color: '#047857' }}>{stats.github_token_configured ? 'Active and Healthy' : 'Token Not Configured'}</div>
              </div>
              <span className={`badge ${stats.github_token_configured ? 'badge-success' : 'badge-error'}`}>
                {stats.github_token_configured ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Background Sync</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Next update in ~45 minutes</div>
              </div>
              <span className="badge badge-info">Scheduled</span>
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
        <CurtainNav />
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
