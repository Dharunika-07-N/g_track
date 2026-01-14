import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Calendar, Clock, Filter, Plus, Download, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const AssignmentsPage = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [newAsgn, setNewAsgn] = useState({
        title: '',
        description: '',
        classroom_id: '',
        deadline: '',
        type: 'individual',
        points: 100,
        response_link: '',
        google_sheet_url: ''
    });
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedAssignmentStudents, setSelectedAssignmentStudents] = useState([]);
    const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // First get classrooms to map IDs to names
            const clsResp = await axios.get(`${API_BASE}/classrooms/`);
            const clsMap = {};
            clsResp.data.forEach(c => clsMap[c.id] = c.name);
            setClassrooms(clsMap);

            // Fetch all assignments by iterating classrooms (or if there's a global endpoint)
            // The backend doesn't seem to have a global /assignments/ endpoint yet.
            // Let's check router/assignments.py again.

            let allAsgn = [];
            for (let cid of Object.keys(clsMap)) {
                const asgnResp = await axios.get(`${API_BASE}/assignments/classroom/${cid}`);
                allAsgn = [...allAsgn, ...asgnResp.data];
            }
            setAssignments(allAsgn);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/assignments/`, newAsgn);
            setShowModal(false);
            setNewAsgn({ title: '', description: '', classroom_id: '', deadline: '', type: 'individual', points: 100, response_link: '', google_sheet_url: '' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleTrackProgress = async (assignment) => {
        setSelectedAssignment(assignment);
        setLoadingStudents(true);
        try {
            const [stdResp, subResp] = await Promise.all([
                axios.get(`${API_BASE}/students/?classroom_id=${assignment.classroom_id}`),
                axios.get(`${API_BASE}/submissions/assignment/${assignment.id}`)
            ]);
            setSelectedAssignmentStudents(stdResp.data);
            setSelectedAssignmentSubmissions(subResp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleAnalyze = async (assignmentId) => {
        setLoadingStudents(true);
        try {
            const resp = await axios.post(`${API_BASE}/assignments/${assignmentId}/analyze`);
            alert(`Analysis complete! \nCompleted: ${resp.data.summary.completed}\nPending: ${resp.data.summary.pending}`);
            // Refresh data
            handleTrackProgress(selectedAssignment);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to analyze submissions");
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleSendReminders = async (assignmentId) => {
        if (!confirm("Are you sure you want to send reminder emails to all pending students?")) return;
        setLoadingStudents(true);
        try {
            const resp = await axios.post(`${API_BASE}/assignments/${assignmentId}/send-reminders`);
            alert(resp.data.message);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to send reminders");
        } finally {
            setLoadingStudents(false);
        }
    };

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Global Assignments</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Overview of all assignments across your classrooms</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary glass" onClick={() => window.open(`${API_BASE}/analytics/export/csv`, '_blank')}>
                        <Download size={20} />
                        Export
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} />
                        New Assignment
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Loading assignments...</div>
            ) : (
                <div className="grid grid-3">
                    {assignments.length > 0 ? (
                        assignments.map(a => (
                            <div key={a.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {classrooms[a.classroom_id]}
                                    </div>
                                    <span className="badge badge-info">{a.type}</span>
                                </div>
                                <h3 style={{ fontSize: '1.25rem' }}>{a.title}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {a.description}
                                </p>
                                {a.response_link && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Filter size={12} /> Response Link Set
                                    </div>
                                )}
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        <Calendar size={14} />
                                        {new Date(a.deadline).toLocaleDateString()}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                            onClick={() => handleTrackProgress(a)}
                                        >
                                            Track Progress
                                        </button>
                                        <Link to={`/classrooms/${a.classroom_id}`} className="btn btn-secondary glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                            View Classroom
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="card glass" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
                            <BookOpen size={48} style={{ margin: '0 auto 1.5rem', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <h3>No assignments found</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Create your first assignment in a classroom to see it here.</p>
                        </div>
                    )}
                </div>
            )}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div className="card glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Create Assignment</h2>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Assignment Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    required
                                    value={newAsgn.title}
                                    onChange={e => setNewAsgn({ ...newAsgn, title: e.target.value })}
                                    placeholder="Assignment Title"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Classroom</label>
                                <select
                                    className="input"
                                    required
                                    value={newAsgn.classroom_id}
                                    onChange={e => setNewAsgn({ ...newAsgn, classroom_id: e.target.value })}
                                >
                                    <option value="">Select Classroom</option>
                                    {Object.entries(classrooms).map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Deadline</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    required
                                    value={newAsgn.deadline}
                                    onChange={e => setNewAsgn({ ...newAsgn, deadline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Response/Submission Link Template</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newAsgn.response_link}
                                    onChange={e => setNewAsgn({ ...newAsgn, response_link: e.target.value })}
                                    placeholder="https://forms.google.com/..."
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Google Sheets Response URL (for Analyzer)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newAsgn.google_sheet_url}
                                    onChange={e => setNewAsgn({ ...newAsgn, google_sheet_url: e.target.value })}
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Share the sheet with your service account email for analysis.
                                </p>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Description</label>
                                <textarea
                                    className="input"
                                    rows="3"
                                    value={newAsgn.description}
                                    onChange={e => setNewAsgn({ ...newAsgn, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary glass" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedAssignment && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div className="card glass" style={{ width: '90%', maxWidth: '1000px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem' }}>{selectedAssignment.title} - Progress</h2>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {classrooms[selectedAssignment.classroom_id]} • {selectedAssignmentStudents.length} Students Assigned
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                {selectedAssignment.google_sheet_url && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleAnalyze(selectedAssignment.id)}
                                        disabled={loadingStudents}
                                    >
                                        Analyze Submissions
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary glass"
                                    onClick={() => handleSendReminders(selectedAssignment.id)}
                                    disabled={loadingStudents}
                                    style={{ color: '#fbbf24', borderColor: '#fbbf24' }}
                                >
                                    Send Reminders
                                </button>
                                {selectedAssignment.response_link && (
                                    <button
                                        className="btn btn-secondary glass"
                                        onClick={() => window.open(selectedAssignment.response_link, '_blank')}
                                        title="Open Submission Form/Responses"
                                    >
                                        <BookOpen size={18} /> View Form
                                    </button>
                                )}
                                <button className="btn btn-secondary glass" onClick={() => setSelectedAssignment(null)}><XCircle size={24} /></button>
                            </div>
                        </div>

                        {!loadingStudents && (
                            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                                        {selectedAssignmentSubmissions.filter(s => s.status !== 'pending').length}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
                                </div>
                                <div style={{ textAlign: 'center', flex: 1, borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>
                                        {selectedAssignmentStudents.length - selectedAssignmentSubmissions.filter(s => s.status !== 'pending').length}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending</div>
                                </div>
                                <div style={{ textAlign: 'center', flex: 1 }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedAssignmentStudents.length}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Students</div>
                                </div>
                            </div>
                        )}

                        {loadingStudents ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading student data...</div>
                        ) : (
                            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left' }}>Student</th>
                                            <th>Submission Status</th>
                                            <th>Commits</th>
                                            <th>Activity Score</th>
                                            <th>Submission Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedAssignmentStudents.map(s => {
                                            const sub = selectedAssignmentSubmissions.find(sub => sub.student_id === s.id);
                                            const isCompleted = sub?.status === 'submitted' || sub?.status === 'graded' || s.total_commits > 0;

                                            return (
                                                <tr key={s.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <img src={s.avatar_url || 'https://github.com/identicons/jasonlong.png'} className="avatar" style={{ width: '2rem', height: '2rem' }} alt="" />
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{s.github_username}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge badge-${isCompleted ? 'success' : 'warning'}`}>
                                                            {isCompleted ? (sub?.status || 'Active') : 'No Activity'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>{s.total_commits}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '100px', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${Math.min(s.activity_score, 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{s.activity_score}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                        {sub ? new Date(sub.submitted_at).toLocaleString() : '-'}
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
        </div>
    );
};

export default AssignmentsPage;
