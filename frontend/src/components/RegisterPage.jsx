import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GraduationCap, Shield, AlertCircle, Github, Mail, Lock, UserCheck, BookOpen, Fingerprint } from 'lucide-react';
import axios from 'axios';
import '../styles/Auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function RegisterPage(props) {
  const [selectedRole, setSelectedRole] = useState('student');
  const [formData, setFormData] = useState({
    name: '',
    github_username: '',
    email: '',
    password: '',
    department: '',
    subjectName: '',
    studentId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const roles = [
    { id: 'student', label: 'Student', icon: User },
    { id: 'faculty', label: 'Faculty', icon: GraduationCap },
    { id: 'hod', label: 'HOD', icon: Shield },
  ];

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    // We keep common fields but can clear specialized ones if desired 
    // though usually users prefer keeping what they typed if they toggle
  };

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
      role: selectedRole,
      github_username: formData.github_username,
      email: formData.email,
      password: formData.password,
      name: formData.name,
      department: formData.department,
    };

    if (selectedRole === 'student') {
      submissionData.student_id = formData.studentId;
    } else if (selectedRole === 'faculty') {
      submissionData.subject_name = formData.subjectName;
    }

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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the GitHub Activity Tracker</p>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div className="auth-input-group">
            <label className="auth-label">I am a...</label>
            <div className="role-grid">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
                  onClick={() => handleRoleChange(role.id)}
                >
                  <role.icon size={24} className="role-icon" />
                  <span className="role-name">{role.label}</span>
                </div>
              ))}
            </div>
          </div>

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

          {/* Role-specific fields */}
          <div className="grid grid-2" style={{ gap: '1rem', transition: 'all 0.3s ease' }}>
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

            {selectedRole === 'student' && (
              <div className="auth-input-group animate-slide-in">
                <label className="auth-label">Student ID</label>
                <div className="auth-input-wrapper">
                  <Fingerprint className="auth-icon" size={18} />
                  <input
                    type="text"
                    name="studentId"
                    className="auth-input"
                    placeholder="2024CS01"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}

            {selectedRole === 'faculty' && (
              <div className="auth-input-group animate-slide-in">
                <label className="auth-label">Subject</label>
                <div className="auth-input-wrapper">
                  <BookOpen className="auth-icon" size={18} />
                  <input
                    type="text"
                    name="subjectName"
                    className="auth-input"
                    placeholder="DSA"
                    value={formData.subjectName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}
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
          <a href="/login" className="auth-link">Sign in</a>
        </div>
      </div>
    </div>
  );
}
