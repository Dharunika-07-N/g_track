import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Calendar, Clock, Filter, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const AssignmentsPage = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState({});

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

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Global Assignments</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Overview of all assignments across your classrooms</p>
                </div>
                <button className="btn btn-primary">
                    <Plus size={20} />
                    New Assignment
                </button>
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
        </div>
    );
};

export default AssignmentsPage;
