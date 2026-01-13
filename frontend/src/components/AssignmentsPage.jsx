import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Calendar, Clock, Filter, Plus, Download } from 'lucide-react';
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
        response_link: ''
    });

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
            setNewAsgn({ title: '', description: '', classroom_id: '', deadline: '', type: 'individual', points: 100, response_link: '' });
            fetchData();
        } catch (err) {
            console.error(err);
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
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        <Calendar size={14} />
                                        {new Date(a.deadline).toLocaleDateString()}
                                    </div>
                                    <Link to={`/classrooms/${a.classroom_id}`} className="btn btn-secondary glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                        View Classroom
                                    </Link>
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
        </div>
    );
};

export default AssignmentsPage;
