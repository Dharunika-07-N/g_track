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
    TrendingUp,
    X,
    Send,
    Eye,
    FileText
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

    // Compose Mail Modal
    const [showMailModal, setShowMailModal] = useState(false);
    const [mailForm, setMailForm] = useState({ to: '', subject: '', body: '' });
    const [mailSending, setMailSending] = useState(false);
    const [mailSent, setMailSent] = useState(false);

    // Incomplete Export Preview Modal
    const [showIncompleteModal, setShowIncompleteModal] = useState(false);
    const [incompleteStudents, setIncompleteStudents] = useState([]);
    const [incompleteLoading, setIncompleteLoading] = useState(false);

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
                axios.get(`${API_BASE}/analytics/dashboard/leaderboard?period=monthly&limit=5`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);
            setStats(statsRes.data || { total_students: 0, total_faculty: 0 });
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
            setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
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
            setImportStatus({ success: true, message: resp.data.message, errors: resp.data.errors });
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

    // ─── Email Faculty ────────────────────────────────────────────────
    const openMailModal = () => {
        // Pre-populate To with faculty emails from users list
        const facultyEmails = users
            .filter(u => u.role === 'faculty' && u.email)
            .map(u => u.email)
            .join(', ');
        setMailForm({
            to: facultyEmails || '',
            subject: '',
            body: ''
        });
        setMailSent(false);
        setShowMailModal(true);
    };

    const handleSendMail = () => {
        if (!mailForm.to || !mailForm.subject || !mailForm.body) {
            alert('Please fill in all fields.');
            return;
        }
        setMailSending(true);
        // Open system mailto link (real email client)
        const mailto = `mailto:${encodeURIComponent(mailForm.to)}?subject=${encodeURIComponent(mailForm.subject)}&body=${encodeURIComponent(mailForm.body)}`;
        window.open(mailto, '_blank');
        setTimeout(() => {
            setMailSending(false);
            setMailSent(true);
        }, 800);
    };

    // ─── Export Incomplete Preview ─────────────────────────────────────
    const handleIncompletePreview = async () => {
        setShowIncompleteModal(true);
        setIncompleteLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE}/analytics/export/csv?status=incomplete&format=json`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setIncompleteStudents(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            if (error.response?.status === 404) {
                setIncompleteStudents([]);
            } else {
                console.error('Failed to load incomplete data', error);
                setIncompleteStudents([]);
            }
        } finally {
            setIncompleteLoading(false);
        }
    };

    const handleExportIncomplete = async () => {
        try {
            const response = await axios.get(
                `${API_BASE}/analytics/export/csv?status=incomplete`,
                {
                    responseType: 'blob',
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'incomplete_students_report.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            if (error.response?.status === 404) {
                alert("No assignments found — please create assignments first.");
            } else {
                alert("Export failed");
            }
        }
    };

    if (loading) return <div className="main-content">Loading...</div>;

    return (
        <div className="main-content">
            <header className="header">
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>HOD Dashboard</h1>
                    <p className="text-muted">Department Overview &amp; User Management</p>
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
                            {Array.isArray(importStatus.errors) && importStatus.errors.map((err, i) => (
                                <div key={i} style={{ marginBottom: '0.25rem', color: 'var(--error)' }}>
                                    Row {err.row}: {err.reason}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-4" style={{ marginBottom: '3rem' }}>
                <div className="card glass stat-card">
                    <Users size={24} color="var(--primary)" />
                    <span className="stat-value">{stats.total_students}</span>
                    <span className="stat-label">Total Students</span>
                </div>
                <div className="card glass stat-card">
                    <BookOpen size={24} color="var(--secondary)" />
                    <span className="stat-value">{stats.total_classrooms || 0}</span>
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

            {/* Top Performers + Quick Actions */}
            <div className="grid grid-2" style={{ marginBottom: '3rem' }}>
                <div className="card glass">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Trophy size={20} color="#fbbf24" />
                        Top Performers
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {Array.isArray(leaderboard) && leaderboard.map((student, index) => (
                            <div key={student.id} className="leaderboard-row">
                                <div className={`rank-badge rank-${index + 1}`}>{index + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{student.github_username}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{student.score ?? student.activity_score ?? 0} pts</div>
                                </div>
                            </div>
                        ))}
                        {(!Array.isArray(leaderboard) || leaderboard.length === 0) && (
                            <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No active students found</div>
                        )}
                    </div>
                </div>

                <div className="card glass">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <TrendingUp size={20} color="var(--secondary)" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-2" style={{ gap: '1rem' }}>
                        {/* Email Faculty — opens compose mail modal */}
                        <button
                            className="btn btn-secondary glass"
                            style={{ height: '100px', flexDirection: 'column' }}
                            onClick={openMailModal}
                        >
                            <Mail size={24} />
                            <span style={{ marginTop: '0.5rem' }}>Email Faculty</span>
                        </button>

                        {/* Export Incomplete — opens preview modal */}
                        <button
                            className="btn btn-secondary glass"
                            style={{ height: '100px', flexDirection: 'column' }}
                            onClick={handleIncompletePreview}
                        >
                            <Download size={24} />
                            <span>Export Incomplete</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* User Management */}
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
                                <th><input type="checkbox" onChange={(e) => setSelectedUsers(e.target.checked && Array.isArray(users) ? users.map(u => u.id) : [])} /></th>
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
                            {Array.isArray(users) && users.map(user => (
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

            {/* ─── Compose Mail Modal ──────────────────────────────────── */}
            {showMailModal && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal glass" style={{ maxWidth: '560px', width: '90%' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                                    <Mail size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Compose Mail</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Send message to faculty</p>
                                </div>
                            </div>
                            <button
                                className="btn-icon"
                                onClick={() => { setShowMailModal(false); setMailSent(false); }}
                                style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '50%', padding: '0.4rem', border: 'none', cursor: 'pointer', display: 'flex' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {mailSent ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                <div style={{ background: 'rgba(16,185,129,0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <CheckCircle size={40} color="#10b981" />
                                </div>
                                <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Mail Client Opened!</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                    Your default mail client has been opened with the composed message.
                                </p>
                                <button className="btn btn-primary" onClick={() => { setShowMailModal(false); setMailSent(false); }}>
                                    Close
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
                                    <input
                                        className="input"
                                        type="email"
                                        multiple
                                        placeholder="faculty@college.edu, another@college.edu"
                                        value={mailForm.to}
                                        onChange={e => setMailForm(p => ({ ...p, to: e.target.value }))}
                                        style={{ width: '100%' }}
                                    />
                                    {users.filter(u => u.role === 'faculty' && u.email).length > 0 && (
                                        <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick add:</span>
                                            {users.filter(u => u.role === 'faculty' && u.email).map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => {
                                                        const emails = mailForm.to ? mailForm.to.split(',').map(e => e.trim()).filter(Boolean) : [];
                                                        if (!emails.includes(u.email)) {
                                                            setMailForm(p => ({ ...p, to: [...emails, u.email].join(', ') }));
                                                        }
                                                    }}
                                                    style={{ fontSize: '0.72rem', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '20px', padding: '0.1rem 0.5rem', cursor: 'pointer' }}
                                                >
                                                    + {u.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="e.g. Reminder: Submit grades by Friday"
                                        value={mailForm.subject}
                                        onChange={e => setMailForm(p => ({ ...p, subject: e.target.value }))}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</label>
                                    <textarea
                                        className="input"
                                        rows={6}
                                        placeholder="Type your message to faculty here..."
                                        value={mailForm.body}
                                        onChange={e => setMailForm(p => ({ ...p, body: e.target.value }))}
                                        style={{ width: '100%', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                                    <button className="btn btn-secondary glass" onClick={() => setShowMailModal(false)}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSendMail}
                                        disabled={mailSending}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <Send size={16} />
                                        {mailSending ? 'Opening...' : 'Send Mail'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Incomplete Students Preview Modal ──────────────────── */}
            {showIncompleteModal && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal glass" style={{ maxWidth: '900px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                                    <FileText size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Incomplete Submissions</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                                        Students who haven't completed assignments
                                    </p>
                                </div>
                            </div>
                            <button
                                className="btn-icon"
                                onClick={() => setShowIncompleteModal(false)}
                                style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '50%', padding: '0.4rem', border: 'none', cursor: 'pointer', display: 'flex' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Summary bar */}
                        {!incompleteLoading && incompleteStudents.length > 0 && (
                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '1rem', flexShrink: 0 }}>
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{incompleteStudents.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Incomplete</div>
                                </div>
                                <div style={{ width: '1px', background: 'var(--border)' }} />
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                                        {Math.round(incompleteStudents.reduce((acc, s) => acc + (s['Commits'] || 0), 0) / incompleteStudents.length)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Commits</div>
                                </div>
                                <div style={{ width: '1px', background: 'var(--border)' }} />
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f97316' }}>
                                        {Math.round(incompleteStudents.reduce((acc, s) => acc + (s['Activity Score'] || 0), 0) / incompleteStudents.length)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Score</div>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div style={{ overflowY: 'auto', flex: 1, borderRadius: '12px' }}>
                            {incompleteLoading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '1rem' }}>Loading incomplete student data...</div>
                                </div>
                            ) : incompleteStudents.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                    <p>No incomplete submissions found, or no assignments exist yet.</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Student</th>
                                                <th>Roll No</th>
                                                <th>Email</th>
                                                <th>GitHub</th>
                                                <th>Commits</th>
                                                <th>Activity Score</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {incompleteStudents.map((s, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{s.Rank}</td>
                                                    <td style={{ fontWeight: 600 }}>{s.Name}</td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s['Roll No'] || '—'}</td>
                                                    <td style={{ fontSize: '0.85rem' }}>{s.Email}</td>
                                                    <td>
                                                        {s.GitHub ? (
                                                            <a href={`https://github.com/${s.GitHub}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                                                                @{s.GitHub}
                                                            </a>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.Commits}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(s['Activity Score'] || 0, 100)}%`, height: '100%', background: 'var(--primary)' }} />
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s['Activity Score']}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                            Incomplete
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                            <button className="btn btn-secondary glass" onClick={() => setShowIncompleteModal(false)}>
                                Close
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleExportIncomplete}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Download size={16} /> Download Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
