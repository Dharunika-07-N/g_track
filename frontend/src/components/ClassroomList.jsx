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
            alert("Failed to create classroom. Please check the backend logs.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this classroom? It will be moved to the history page.")) return;
        try {
            await axios.post(`${API_BASE}/classrooms/${id}/archive`);
            fetchClassrooms();
        } catch (err) {
            console.error(err);
            alert("Delete failed");
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
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} />
                        Create Classroom
                    </button>
                </div>
            </header>

            <div className="grid grid-3">
                {classrooms.filter(c => !c.is_archived).map(c => (
                    <div key={c.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <BookOpen size={24} />
                            </div>
                            <button
                                className="btn-icon"
                                style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}
                                onClick={() => handleDelete(c.id)}
                                title="Delete Classroom"
                            >
                                <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
                            </button>
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
