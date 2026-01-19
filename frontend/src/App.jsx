import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CurtainNav from './components/CurtainNav';
import ClassroomList from './components/ClassroomList';
import ClassroomDetail from './components/ClassroomDetail';
import StudentsPage from './components/StudentsPage';
import AssignmentsPage from './components/AssignmentsPage';
import AnalyticsPage from './components/AnalyticsPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import HodDashboard from './components/dashboards/HodDashboard';
import FacultyDashboard from './components/dashboards/FacultyDashboard';
import StudentDashboard from './components/dashboards/StudentDashboard';
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

import { API_BASE } from './config';

const DashboardSwitcher = ({ role }) => {
  if (role === 'admin' || role === 'hod') return <HodDashboard />;
  if (role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (token) {
      axios.get(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          setIsAuthenticated(true);
          setUserRole(res.data.role);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (token, role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.href = '/login';
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5rem' }}>Loading...</div>;

  return (
    <Router>
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterPage onRegister={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <div className="layout">
          <CurtainNav onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<DashboardSwitcher role={userRole} />} />
            <Route path="/dashboard" element={<Navigate to="/" />} />
            <Route path="/classrooms" element={<ClassroomList />} />
            <Route path="/classrooms/:id" element={<ClassroomDetail />} />
            <Route path="/analysis" element={<AnalyticsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />

            {/* Conditional Routes based on Role */}
            {(userRole === 'admin' || userRole === 'hod' || userRole === 'faculty') && (
              <>
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/assignments" element={<AssignmentsPage />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}

export default App;
