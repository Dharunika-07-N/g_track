import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, BookOpen, Clock, Users, ArrowRight, History } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const ClassroomList = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({ name: '', description: '', subject_code: '', term: '' });

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const fetchClassrooms = async () => {
        try {
            const resp = await axios.get(`${API_BASE}/classrooms/`);
            setClassrooms(resp.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/classrooms/`, newClass);
            setShowModal(false);
            setNewClass({ name: '', description: '', subject_code: '', term: '' });
            fetchClassrooms();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>My Classrooms</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your courses and student repositories</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} />
                    Create Classroom
                </button>
            </header>

            <div className="grid grid-3">
                {classrooms.filter(c => !c.is_archived).map(c => (
                    <div key={c.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{c.name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{c.subject_code} • {c.term}</p>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {c.description || 'No description provided.'}
                        </p>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Users size={14} /> {c.students?.length || 0}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={14} /> {c.assignments?.length || 0} Assignments
                                </span>
                            </div>
                            <Link to={`/classrooms/${c.id}`} className="btn btn-secondary glass" style={{ padding: '0.5rem' }}>
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {classrooms.some(c => c.is_archived) && (
                <>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '4rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Archived Registries</h2>
                    <div className="grid grid-3">
                        {classrooms.filter(c => c.is_archived).map(c => (
                            <div key={c.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: 0.7 }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <History size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{c.name}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{c.subject_code} • {c.term}</p>
                                </div>
                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="badge badge-silver">Archived</span>
                                    <Link to={`/classrooms/${c.id}`} className="btn btn-secondary glass" style={{ padding: '0.5rem' }}>
                                        <ArrowRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div className="card glass" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Create New Classroom</h2>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Classroom Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    required
                                    value={newClass.name}
                                    onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                                    placeholder="e.g. CS101: Introduction to Computer Science"
                                />
                            </div>
                            <div className="grid grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Subject Code</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newClass.subject_code}
                                        onChange={e => setNewClass({ ...newClass, subject_code: e.target.value })}
                                        placeholder="CS101"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Term</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newClass.term}
                                        onChange={e => setNewClass({ ...newClass, term: e.target.value })}
                                        placeholder="Spring 2026"
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Description</label>
                                <textarea
                                    className="input"
                                    rows="3"
                                    value={newClass.description}
                                    onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                                    placeholder="Brief overview of the course..."
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

export default ClassroomList;
