import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    BookOpen,
    Upload,
    Download,
    BarChart2,
    Mail,
    Trash2,
    CheckCircle,
    AlertCircle,
    Trophy,
    TrendingUp
} from 'lucide-react';

import { API_BASE } from '../../config';

export default function HodDashboard() {
    const [stats, setStats] = useState({ total_students: 0, total_faculty: 0 });
    const [users, setUsers] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [importStatus, setImportStatus] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, usersRes, leaderboardRes] = await Promise.all([
                axios.get(`${API_BASE}/hod/stats`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_BASE}/hod/users`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_BASE}/students/?period=monthly&limit=5`, { // Use students API for leaderboard
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setLeaderboard(leaderboardRes.data);
        } catch (err) {
            console.error("Error fetching HOD data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        setImportStatus(null);
        try {
            const resp = await axios.post(`${API_BASE}/hod/upload/students`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setImportStatus({
                success: true,
                message: resp.data.message,
                errors: resp.data.errors
            });
            fetchData();
        } catch (err) {
            setImportStatus({ success: false, message: err.response?.data?.detail || "Import failed" });
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return;
        try {
            await axios.post(`${API_BASE}/hod/users/bulk-delete`, { user_ids: selectedUsers }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSelectedUsers([]);
            fetchData();
        } catch {
            alert("Delete failed");
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;
        try {
            await axios.post(`${API_BASE}/hod/users/bulk-delete`, { user_ids: [userId] }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchData();
        } catch {
            alert("Delete failed");
        }
    };

    const toggleUserSelection = (id) => {
        setSelectedUsers(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    if (loading) return <div className="main-content">Loading...</div>;

    return (
        <div className="main-content">
            <header className="header">
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>HOD Dashboard</h1>
                    <p className="text-muted">Department Overview & User Management</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => window.open(`${API_BASE}/templates/student_import.xlsx`)}>
                        <Download size={18} /> Template
                    </button>
                    <label className="btn btn-secondary glass" style={{ cursor: 'pointer' }}>
                        <Upload size={18} /> {uploading ? 'Processing...' : 'Import Students'}
                        <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
                    </label>
                </div>
            </header>

            {importStatus && (
                <div className={`auth-error ${importStatus.success ? 'badge-success' : ''}`} style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: '1rem', display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: importStatus.errors?.length ? '1rem' : 0 }}>
                        {importStatus.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span style={{ fontWeight: 600 }}>{importStatus.message}</span>
                    </div>
                    {importStatus.errors?.length > 0 && (
                        <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                            <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Error Details:</p>
                            {importStatus.errors.map((err, i) => (
                                <div key={i} style={{ marginBottom: '0.25rem', color: 'var(--error)' }}>
                                    Row {err.row}: {err.reason}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-4" style={{ marginBottom: '3rem' }}>
                <div className="card glass stat-card">
                    <Users size={24} color="var(--primary)" />
                    <span className="stat-value">{stats.total_students}</span>
                    <span className="stat-label">Total Students</span>
                </div>
                <div className="card glass stat-card">
                    <BookOpen size={24} color="var(--secondary)" />
                    <span className="stat-value">{stats.total_classrooms}</span>
                    <span className="stat-label">Total Classrooms</span>
                </div>
                <div className="card glass stat-card">
                    <BarChart2 size={24} color="#10b981" />
                    <span className="stat-value">{stats.avg_completion || 0}%</span>
                    <span className="stat-label">Avg. Completion</span>
                </div>
                <div className="card glass stat-card">
                    <Mail size={24} color="var(--accent)" />
                    <span className="stat-value">{stats.pending_reminders || 0}</span>
                    <span className="stat-label">Pending Reminders</span>
                </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: '3rem' }}>
                <div className="card glass">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Trophy size={20} color="#fbbf24" />
                        Top Performers
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {leaderboard.map((student, index) => (
                            <div key={student.id} className="leaderboard-row">
                                <div className={`rank-badge rank-${index + 1}`}>{index + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{student.github_username}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{student.activity_score} pts</div>
                                </div>
                            </div>
                        ))}
                        {leaderboard.length === 0 && <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No active students found</div>}
                    </div>
                </div>
                <div className="card glass">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <TrendingUp size={20} color="var(--secondary)" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                        <button className="btn btn-secondary glass" style={{ height: '100px', flexDirection: 'column' }}>
                            <Mail size={24} />
                            <span style={{ marginTop: '0.5rem' }}>Email Faculty</span>
                        </button>
                        <button className="btn btn-secondary glass" style={{ height: '100px', flexDirection: 'column' }} onClick={() => window.open(`${API_BASE}/analytics/export/csv?status=incomplete`)}>
                            <Download size={24} />
                            <span>Export Incomplete</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="card glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>User Management</h2>
                    {selectedUsers.length > 0 && (
                        <button className="btn btn-danger" onClick={handleBulkDelete}>
                            <Trash2 size={18} /> Delete Selected ({selectedUsers.length})
                        </button>
                    )}
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th><input type="checkbox" onChange={(e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : [])} /></th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>System ID</th>
                                <th>GitHub</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUserSelection(user.id)}
                                        />
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'hod' ? 'badge-error' : user.role === 'faculty' ? 'badge-warning' : 'badge-info'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.department || '-'}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{user.student_id || '-'}</td>
                                    <td>
                                        {user.github_username ? (
                                            <a href={`https://github.com/${user.github_username}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                                @{user.github_username}
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-danger glass"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
                                            onClick={() => handleDeleteUser(user.id, user.name)}
                                            title="Delete User"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
