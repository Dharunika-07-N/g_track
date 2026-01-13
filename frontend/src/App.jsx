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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyStats, setDailyStats] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  useEffect(() => {
    const fetchDailyStats = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/dashboard/daily-stats?date=${selectedDate}`);
        setDailyStats(resp.data);
      } catch (err) {
        console.error("Error fetching daily stats:", err);
      }
    };
    fetchDailyStats();
  }, [selectedDate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await axios.post(`${API_BASE}/students/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Students imported successfully");
      // Refresh stats after upload
      const statsRes = await axios.get(`${API_BASE}/dashboard/stats?period=${period}`);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  return (
    <div className="main-content">
      <header className="header" style={{ borderBottom: 'none' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Command Center</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

            {/* Quick Import Button */}
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                id="dashboard-excel-upload"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label
                htmlFor="dashboard-excel-upload"
                className="btn btn-secondary glass"
                style={{
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.8rem'
                }}
              >
                {uploading ? 'Importing...' : 'Import Excel'}
              </label>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <div
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <Calendar size={18} />
              <span style={{ fontSize: '0.875rem' }}>
                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {showCalendar && (
              <div className="card glass" style={{ position: 'absolute', top: '100%', right: 0, padding: '1rem', zIndex: 10, marginTop: '0.5rem' }}>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowCalendar(false);
                  }}
                  className="input"
                />
              </div>
            )}
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
        {/* Removed Graded Today box as requested */}
        <div className="card glass stat-card">
          <Clock size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
          <span className="stat-value">
            {dailyStats ? dailyStats.commits : '-'}
          </span>
          <span className="stat-label">Commits on {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            {dailyStats ? `${dailyStats.active_students} Students Active` : 'Loading...'}
          </div>
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
          <h3 style={{ marginBottom: '1.5rem' }}>Upcoming Deadlines</h3>
          <UpcomingDeadlinesList />
        </div>
      </div>
    </div>
  );
};

const UpcomingDeadlinesList = () => {
  const [deadlines, setDeadlines] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE}/dashboard/upcoming`).then(res => setDeadlines(res.data)).catch(console.error);
  }, []);

  if (deadlines.length === 0) {
    return <div style={{ color: 'var(--text-muted)' }}>No upcoming assignments.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {deadlines.map(a => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer' }} onClick={() => navigate(`/classrooms/${a.classroom_id}`)}>
          <div>
            <div style={{ fontWeight: 600 }}>{a.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {new Date(a.deadline).toLocaleString()}</div>
          </div>
          <span className="badge badge-warning">
            {Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left
          </span>
        </div>
      ))}
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
