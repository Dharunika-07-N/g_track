import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Users,
    Award,
    BarChart,
    Plus,
    Search,
    Download,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Clock,
    History,
    AlertCircle,
    Mail,
    BookOpen
} from 'lucide-react';
import AssignmentForm from './AssignmentForm';

import { API_BASE } from '../config';

const ClassroomDetail = () => {
    const { id } = useParams();
    const [classroom, setClassroom] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);

    useEffect(() => {
        fetchClassroomData();
    }, [id]);

    const fetchClassroomData = async () => {
        setLoading(true);
        try {
            const [clsResp, stdResp, asgnResp] = await Promise.all([
                axios.get(`${API_BASE}/classrooms/${id}`),
                axios.get(`${API_BASE}/students/?classroom_id=${id}`),
                axios.get(`${API_BASE}/assignments/classroom/${id}`)
            ]);
            setClassroom(clsResp.data);
            setStudents(stdResp.data);
            setAssignments(asgnResp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!window.confirm("Are you sure? This will mark all students as inactive and archive the classroom for historical reference. This action cannot be undone.")) return;
        try {
            await axios.post(`${API_BASE}/classrooms/${id}/archive`);
            fetchClassroomData();
        } catch (err) {
            console.error(err);
            alert("Archive failed");
        }
    };

    const handleSync = async () => {
        try {
            await axios.post(`${API_BASE}/classrooms/${id}/sync`);
            alert("Sync started for all students. Data will update in the background.");
        } catch (err) {
            console.error(err);
            alert("Failed to start sync");
        }
    };

    const handleTrackProgress = async (asgn) => {
        setSelectedAssignment(asgn);
        setLoadingSubmissions(true);
        try {
            const resp = await axios.get(`${API_BASE}/submissions/assignment/${asgn.id}`);
            setSelectedAssignmentSubmissions(resp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleAnalyze = async (assignmentId) => {
        if (!confirm("Analyze responses from the linked Google Sheet? This will update student statuses.")) return;
        setLoadingSubmissions(true);
        try {
            await axios.post(`${API_BASE}/assignments/${assignmentId}/analyze`);
            const resp = await axios.get(`${API_BASE}/submissions/assignment/${assignmentId}`);
            setSelectedAssignmentSubmissions(resp.data);
            alert("Submissions analyzed and updated successfully.");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to analyze submissions");
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleRunAutograder = async (submissionId) => {
        setLoadingSubmissions(true);
        try {
            const resp = await axios.post(`${API_BASE}/submissions/${submissionId}/grade_auto`);
            alert(`Graded! Score: ${resp.data.score}/${resp.data.max_score}\n\n${resp.data.results.map(r => `${r.test}: ${r.passed ? 'PASS' : 'FAIL'}`).join('\n')}`);
            // Refresh
            const subResp = await axios.get(`${API_BASE}/submissions/assignment/${selectedAssignment.id}`);
            setSelectedAssignmentSubmissions(subResp.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Autograding failed");
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleSendIndividualReminder = async (studentId, studentEmail, studentName) => {
        if (!studentEmail) {
            alert("This student doesn't have an email address configured.");
            return;
        }
        if (!confirm(`Send reminder to ${studentName} (${studentEmail})?`)) return;

        try {
            const resp = await axios.post(`${API_BASE}/assignments/${selectedAssignment.id}/send-reminder/${studentId}`);
            alert(resp.data.message);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to send reminder");
        }
    };

    const handleSendBulkReminders = async (assignmentId) => {
        if (!confirm("Send reminders to all students who haven't completed this assignment?")) return;
        try {
            const resp = await axios.post(`${API_BASE}/assignments/${assignmentId}/send-reminders`);
            alert(resp.data.message);
        } catch (err) {
            console.error(err);
            alert("Failed to send reminders");
        }
    };

    if (loading) return <div className="main-content">Loading...</div>;

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none', marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{classroom?.name}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{classroom?.subject_code} • {classroom?.term}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {classroom?.is_archived && <span className="badge badge-silver" style={{ alignSelf: 'center', marginRight: '1rem' }}>Archived Registry</span>}
                    <button className="btn btn-secondary glass" onClick={() => window.open(`${API_BASE}/analytics/export/csv?classroom_id=${id}`, '_blank')}>
                        <Download size={18} />
                        Export
                    </button>
                    {!classroom?.is_archived && (
                        <button className="btn btn-danger glass" onClick={handleArchive}>
                            <History size={18} />
                            Archive
                        </button>
                    )}
                    <button className="btn btn-secondary glass" onClick={handleSync}>
                        <RefreshCcw size={18} />
                        Sync All
                    </button>
                    {!classroom?.is_archived && (
                        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} />
                            Create Assignment
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="glass" style={{ display: 'flex', gap: '2rem', padding: '0 1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                {['overview', 'assignments', 'students', 'analytics'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '1rem 0.5rem',
                            background: 'none',
                            border: 'none',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="grid grid-4">
                        <div className="card glass">
                            <span className="stat-label">Total Students</span>
                            <span className="stat-value">{students.length}</span>
                        </div>
                        <div className="card glass">
                            <span className="stat-label">Active Assignments</span>
                            <span className="stat-value">{assignments.length}</span>
                        </div>
                        <div className="card glass">
                            <span className="stat-label">Completion Rate</span>
                            <span className="stat-value">
                                {assignments.length > 0 && students.length > 0
                                    ? Math.round((students.filter(s => s.total_commits > 0).length / students.length) * 100)
                                    : 0}%
                            </span>
                        </div>
                        <div className="card glass">
                            <span className="stat-label">Class Activity</span>
                            <span className="stat-value">
                                {students.length > 0
                                    ? Math.round(students.reduce((acc, s) => acc + s.activity_score, 0) / students.length)
                                    : 0}
                            </span>
                        </div>
                    </div>

                    {assignments.filter(a => new Date(a.deadline) > new Date() && new Date(a.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length > 0 && (
                        <div className="card glass" style={{ borderLeft: '4px solid rgb(244, 63, 94)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <AlertCircle size={20} color="rgb(244, 63, 94)" />
                                <h3 style={{ fontSize: '1.1rem', color: 'rgb(244, 63, 94)' }}>Deadlines Approaching</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {assignments.filter(a => new Date(a.deadline) > new Date() && new Date(a.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).map(a => (
                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ fontWeight: 600 }}>{a.title}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>Due: {new Date(a.deadline).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'students' && (
                <div className="card glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div className="input-group" style={{ width: '300px' }}>
                            <input type="text" className="input" placeholder="Search students..." />
                        </div>
                        <button className="btn btn-secondary glass">
                            <Download size={18} />
                            Export Roster
                        </button>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Student</th>
                                <th>GitHub</th>
                                <th>Email</th>
                                <th>Last Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={s.avatar_url || 'https://github.com/identicons/jasonlong.png'} className="avatar" alt="" style={{ width: '32px' }} />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.student_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <a href={s.profile_url} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>
                                            @{s.github_username}
                                        </a>
                                    </td>
                                    <td>{s.email || '-'}</td>
                                    <td>{new Date(s.last_updated).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-secondary glass" style={{ padding: '0.5rem' }} title="View Stats">
                                                <BarChart size={16} />
                                            </button>
                                            <button className="btn btn-secondary glass" style={{ padding: '0.5rem' }} title="Send Message" onClick={() => window.location.href = `mailto:${s.email}`}>
                                                <Mail size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'assignments' && (
                <div className="grid grid-2">
                    {assignments.map(a => (
                        <div key={a.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem' }}>{a.title}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{a.type} • {a.points} Points</p>
                                </div>
                                <span className="badge badge-info">Open</span>
                            </div>
                            <p style={{ fontSize: '0.875rem' }}>{a.description}</p>
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    <Clock size={14} />
                                    Due: {new Date(a.deadline).toLocaleDateString()}
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem' }}
                                    onClick={() => handleTrackProgress(a)}
                                >
                                    Track Progress
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedAssignment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div className="card glass" style={{ width: '90%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem' }}>{selectedAssignment.title} - Progress</h2>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{students.length} Students Assigned</div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {selectedAssignment.google_sheet_url && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleAnalyze(selectedAssignment.id)}
                                        disabled={loadingSubmissions}
                                    >
                                        Analyze Submissions
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary glass"
                                    style={{ color: '#fbbf24', borderColor: '#fbbf24' }}
                                    onClick={() => handleSendBulkReminders(selectedAssignment.id)}
                                >
                                    Remind All Pending
                                </button>
                                {selectedAssignment.response_link && (
                                    <button className="btn btn-secondary glass" onClick={() => window.open(selectedAssignment.response_link, '_blank')}>
                                        <BookOpen size={18} /> View Form
                                    </button>
                                )}
                                <button className="btn btn-secondary glass" onClick={() => setSelectedAssignment(null)}><XCircle size={24} /></button>
                            </div>
                        </div>

                        {loadingSubmissions ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading submissions...</div>
                        ) : (
                            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left' }}>Student</th>
                                            <th>Status</th>
                                            <th>Commits</th>
                                            <th>Activity Score</th>
                                            <th>Submission Time</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(s => {
                                            const sub = selectedAssignmentSubmissions.find(sub => sub.student_id === s.id);
                                            const isCompleted = sub?.status === 'submitted' || sub?.status === 'graded';
                                            return (
                                                <tr key={s.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div
                                                                style={{
                                                                    width: '2.5rem',
                                                                    height: '2.5rem',
                                                                    borderRadius: '50%',
                                                                    background: 'var(--primary-glow)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontWeight: 700,
                                                                    color: 'var(--primary)',
                                                                    fontSize: '0.9rem'
                                                                }}
                                                            >
                                                                {s.name ? s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name || 'Unknown Student'}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {s.student_id || 'N/A'} • @{s.github_username}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            className={`badge`}
                                                            style={{
                                                                background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                color: isCompleted ? '#10b981' : '#ef4444',
                                                                border: `1px solid ${isCompleted ? '#10b981' : '#ef4444'}`,
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '20px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            {isCompleted ? 'Completed' : 'Not Completed'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>{s.total_commits}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(s.activity_score, 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{s.activity_score}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                        {sub && sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {!isCompleted && (
                                                            <button
                                                                className="btn btn-secondary glass"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#fbbf24', borderColor: '#fbbf24' }}
                                                                onClick={() => handleSendIndividualReminder(s.id, s.email, s.name)}
                                                            >
                                                                Send Reminder
                                                            </button>
                                                        )}
                                                        {sub && sub.repo_url && (
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', marginLeft: '0.5rem' }}
                                                                onClick={() => handleRunAutograder(sub.id)}
                                                            >
                                                                Autograde
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <AssignmentForm
                            classroomId={id}
                            onSuccess={() => {
                                setShowCreateModal(false);
                                fetchClassroomData();
                            }}
                            onCancel={() => setShowCreateModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassroomDetail;
