import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, BookOpen, Clock, Users, ArrowRight, History } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const ClassroomList = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newClass, setNewClass] = useState({
        name: '',
        description: '',
        subject_code: '',
        semester: '1',
        year: new Date().getFullYear().toString(),
        academic_year: '1',
        faculty_name: '',
        faculty_email: '',
        department: '',
        batch: ''
    });
    const [showArchived, setShowArchived] = useState(false);

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
            await axios.post(`${API_BASE}/classrooms/`, {
                ...newClass,
                term: `Year ${newClass.academic_year} | Sem ${newClass.semester} - ${newClass.year}`
            });
            setShowModal(false);
            setNewClass({
                name: '',
                description: '',
                subject_code: '',
                semester: '1',
                year: new Date().getFullYear().toString(),
                academic_year: '1',
                faculty_name: '',
                faculty_email: '',
                department: '',
                batch: ''
            });
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
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className={`btn ${showArchived ? 'btn-primary' : 'btn-secondary glass'}`} onClick={() => setShowArchived(!showArchived)}>
                        <History size={20} />
                        {showArchived ? 'Hide Archived' : 'Archived Registry'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} />
                        Create Classroom
                    </button>
                </div>
            </header>

            <div className="grid grid-3">
                {classrooms.filter(c => showArchived ? c.is_archived : !c.is_archived).map(c => (
                    <div key={c.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: c.is_archived ? 0.8 : 1 }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: c.is_archived ? '#f1f5f9' : 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.is_archived ? 'var(--text-muted)' : 'var(--primary)' }}>
                            {c.is_archived ? <History size={24} /> : <BookOpen size={24} />}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{c.name}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                {c.subject_code} • {c.term || `${c.semester || ''} ${c.year || ''}`}
                            </p>
                            {c.faculty_name && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {c.faculty_name}
                                </p>
                            )}
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
                                    <Clock size={14} /> {c.assignments?.length || 0} Assgn.
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
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Academic Year</label>
                                    <select
                                        className="input"
                                        value={newClass.academic_year}
                                        onChange={e => setNewClass({ ...newClass, academic_year: e.target.value })}
                                    >
                                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Department</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newClass.department}
                                        onChange={e => setNewClass({ ...newClass, department: e.target.value })}
                                        placeholder="e.g. CSE"
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Batch</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newClass.batch}
                                        onChange={e => setNewClass({ ...newClass, batch: e.target.value })}
                                        placeholder="e.g. 2024-2028"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Semester</label>
                                    <select
                                        className="input"
                                        value={newClass.semester}
                                        onChange={e => setNewClass({ ...newClass, semester: e.target.value })}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Year</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newClass.year}
                                        onChange={e => setNewClass({ ...newClass, year: e.target.value })}
                                        placeholder="2026"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-2" style={{ gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Faculty Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newClass.faculty_name}
                                        onChange={e => setNewClass({ ...newClass, faculty_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Faculty Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={newClass.faculty_email}
                                        onChange={e => setNewClass({ ...newClass, faculty_email: e.target.value })}
                                        required
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
