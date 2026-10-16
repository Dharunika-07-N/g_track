import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, GraduationCap, Shield, AlertCircle, Github, Mail, Lock, UserCheck, BookOpen, Fingerprint } from 'lucide-react';
import axios from 'axios';
import '../styles/Auth.css';
import logoImg from '../assets/logo.png';

import { API_BASE as API_URL } from '../config';

export default function RegisterPage(props) {
  const [formData, setFormData] = useState({
    name: '',
    github_username: '',
    email: '',
    password: '',
    department: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submissionData = {
      role: 'hod', // Forced HOD role
      github_username: formData.github_username,
      email: formData.email,
      password: formData.password,
      name: formData.name,
      department: formData.department,
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, submissionData);

      if (typeof props.onRegister === 'function') {
        props.onRegister(response.data.access_token, response.data.role);
        navigate('/dashboard');
      } else {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('role', response.data.role);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logoImg} alt="GitTrack" style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'contain', marginBottom: '0.75rem' }} />
          <h1 className="auth-title">Create HOD Account</h1>
          <p className="auth-subtitle">Join the GitHub Activity Tracker</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            {/* Name */}
            <div className="auth-input-group">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrapper">
                <UserCheck className="auth-icon" size={18} />
                <input
                  type="text"
                  name="name"
                  className="auth-input"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* GitHub Username */}
            <div className="auth-input-group">
              <label className="auth-label">GitHub Username</label>
              <div className="auth-input-wrapper">
                <Github className="auth-icon" size={18} />
                <input
                  type="text"
                  name="github_username"
                  className="auth-input"
                  placeholder="octocat"
                  value={formData.github_username}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-icon" size={18} />
              <input
                type="email"
                name="email"
                className="auth-input"
                placeholder="name@institution.edu"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Department</label>
            <div className="auth-input-wrapper">
              <Shield className="auth-icon" size={18} />
              <input
                type="text"
                name="department"
                className="auth-input"
                placeholder="CS"
                value={formData.department}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-icon" size={18} />
              <input
                type="password"
                name="password"
                className="auth-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
