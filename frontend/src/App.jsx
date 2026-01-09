import { useState, useEffect } from 'react';
import { fetchStats, fetchStudents, addStudent, refreshStudent, removeStudent, uploadStudents } from './api';

function App() {
  const [stats, setStats] = useState({ total_students: 0, active_students: 0, top_contributor: 'None' });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [period, setPeriod] = useState('monthly');

  // Form state
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const loadData = async () => {
    try {
      const [statsData, studentsData] = await Promise.all([fetchStats(period), fetchStudents(period)]);
      setStats(statsData);
      setStudents(studentsData);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (id) => {
    setRefreshingId(id);
    try {
      await refreshStudent(id);
      // Wait a bit for backend to process or just reload immediately?
      // Reload immediately usually gets old data if async. 
      // Ideally we wait a second or show "Update scheduled".
      setTimeout(() => {
        loadData();
        setRefreshingId(null);
      }, 2000);
    } catch (e) {
      console.error(e);
      setRefreshingId(null);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to remove this student?")) return;
    try {
      await removeStudent(id);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to remove student");
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [period]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addStudent(newUsername, newName);
      setNewUsername('');
      setNewName('');
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setError('');
    setUploadMessage('');
    try {
      const resp = await uploadStudents(uploadFile);
      setUploadMessage(resp.message);
      setUploadFile(null);
      // Reset after 3 seconds or on close
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadMessage('');
        loadData();
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>GitTrack</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="input"
            style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all">All Time</option>
          </select>
          <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
            Upload
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Student
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="stat-value">{stats.total_students}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="card">
          <div className="stat-value">{stats.active_students}</div>
          <div className="stat-label">Active ({period})</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{stats.top_contributor}</div>
          <div className="stat-label">Top Contributor</div>
        </div>
        <div className="card">
          <div className="stat-value">
            {students.length > 0 ?
              Math.round(students.reduce((acc, s) => acc + s.total_commits, 0) / students.length)
              : 0}
          </div>
          <div className="stat-label">Avg Commits/Student</div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
          <h3>Student Rankings</h3>
          <span className="badge badge-blue">Live Updates</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Commits</th>
                <th>PRs</th>
                <th>Issues</th>
                <th>Total Events</th>
                <th>Activity Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : students.map((student, index) => (
                <tr key={student.id}>
                  <td>
                    {index === 0 && <span className="badge badge-gold">#1</span>}
                    {index === 1 && <span className="badge badge-silver">#2</span>}
                    {index === 2 && <span className="badge badge-bronze">#3</span>}
                    {index > 2 && <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>#{index + 1}</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img
                        src={student.avatar_url || `https://ui-avatars.com/api/?name=${student.name}`}
                        className="avatar"
                        alt={student.name}
                      />
                      <div>
                        <div style={{ fontWeight: '600' }}>{student.name}</div>
                        <a href={`https://github.com/${student.github_username}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                          @{student.github_username}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>
                    {student.total_commits}
                    {/* Activity Heatmap Mockup */}
                    <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                      {[...Array(5)].map((_, i) => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '1px', background: i < (student.total_commits % 5) + 1 ? '#34d399' : '#e2e8f0' }}></div>
                      ))}
                    </div>
                  </td>
                  <td>{student.pull_requests}</td>
                  <td>{student.issues}</td>
                  <td>
                    <span className={`badge ${student.total_events > 0 ? 'badge-blue' : 'badge-silver'}`}>
                      {student.total_events} events
                    </span>
                  </td>
                  <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{student.activity_score || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => handleRefresh(student.id)}
                        disabled={refreshingId === student.id}
                        title="Refresh Data"
                      >
                        {refreshingId === student.id ? '...' : '↻'}
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => handleRemove(student.id)}
                        title="Remove Student"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No students tracked yet. Add one to get started!
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)'
        }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>Track New Student</h2>
            {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAddStudent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Student Name</label>
                <input
                  className="input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>GitHub Username</label>
                <input
                  className="input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="e.g. octocat"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#f1f5f9' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Tracking</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)'
        }} onClick={() => { if (!uploading) setShowUploadModal(false); }}>
          <div className="card" style={{ width: '450px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Upload Students</h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Upload an Excel file (.xlsx) containing student names and GitHub profile URLs/usernames.
            </p>

            {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            {uploadMessage && <div style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{uploadMessage}</div>}

            <form onSubmit={handleUpload}>
              <div style={{ border: '2px dashed var(--border)', padding: '2rem', borderRadius: 'var(--radius)', textAlign: 'center', marginBottom: '1.5rem' }}>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={e => setUploadFile(e.target.files[0])}
                  style={{ display: 'none' }}
                  id="excel-upload"
                  required
                />
                <label htmlFor="excel-upload" style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                  <div style={{ fontWeight: '600' }}>{uploadFile ? uploadFile.name : 'Click to select Excel file'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Support .xlsx and .xls</div>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#f1f5f9' }} onClick={() => setShowUploadModal(false)} disabled={uploading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!uploadFile || uploading}>
                  {uploading ? 'Processing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
