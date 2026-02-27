import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CurtainNav from './components/CurtainNav';
import ClassroomList from './components/ClassroomList';
import ClassroomDetail from './components/ClassroomDetail';
import StudentsPage from './components/StudentsPage';
import AssignmentsPage from './components/AssignmentsPage';
import AnalyticsPage from './components/AnalyticsPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import HodDashboard from './components/dashboards/HodDashboard';
import DepartmentsPage from './components/DepartmentsPage';
import DepartmentDetail from './components/DepartmentDetail';
import DepartmentHome from './components/DepartmentHome';
import axios from 'axios';
import { API_BASE } from './config';

// Global axios interceptor for auth
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_BASE}/auth/me`)
        .then(() => setIsAuthenticated(true))
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
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
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
            {/* The new "Interface Layer" (Landing Page) */}
            <Route path="/" element={<DepartmentHome />} />

            {/* Original Dashboard */}
            <Route path="/dashboard" element={<HodDashboard />} />

            {/* Department Management */}
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/departments/:deptId" element={<DepartmentDetail />} />

            {/* Other existing routes */}
            <Route path="/classrooms" element={<ClassroomList />} />
            <Route path="/classrooms/:id" element={<ClassroomDetail />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/analysis" element={<AnalyticsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}

export default App;
