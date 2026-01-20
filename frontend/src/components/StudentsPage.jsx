import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Users, ExternalLink, RefreshCw, Filter, Trash2, Download, Plus, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { API_BASE } from '../config';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const period = searchParams.get('period') || 'monthly';
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [classrooms, setClassrooms] = useState([]);
    const [newStudent, setNewStudent] = useState({
        name: '',
        github_username: '',
        student_id: '',
        email: '',
        department: '',
        classroom_id: ''
    });

    useEffect(() => {
        fetchStudents();
        fetchClassrooms();
    }, [period, startDate, endDate]);

    const fetchClassrooms = async () => {
        try {
            const resp = await axios.get(`${API_BASE}/classrooms/`);
            setClassrooms(resp.data);
        } catch (err) {
            console.error("Failed to fetch classrooms", err);
        }
    };

    const setPeriod = (p) => {
        if (p === 'custom') {
            setShowDatePicker(true);
        } else {
            setShowDatePicker(false);
            setStartDate('');
            setEndDate('');
        }
        setSearchParams({ period: p });
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE}/students/?period=${period}&limit=100`;
            if (period === 'custom' && startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
            }
            const resp = await axios.get(url);
            setStudents(resp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async (id) => {
        try {
            await axios.post(`${API_BASE}/students/${id}/refresh`);
            alert("Refresh scheduled for student");
        } catch (err) {
            console.error(err);
        }
    };

    const handleSyncAll = async () => {
        try {
            await axios.post(`${API_BASE}/students/sync-all`);
            alert("Background sync started for all students. Data will update progressively.");
        } catch (err) {
            console.error(err);
            alert("Failed to start sync");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to archive this student?")) return;
        try {
            await axios.delete(`${API_BASE}/students/${id}`);
            fetchStudents();
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to archive ${selectedStudents.length} students?`)) return;
        try {
            await axios.post(`${API_BASE}/students/bulk-delete`, { student_ids: selectedStudents });
            setSelectedStudents([]);
            fetchStudents();
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            await axios.post(`${API_BASE}/students/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Students imported successfully");
            fetchStudents();
        } catch (err) {
            console.error(err);
            alert("Upload failed");
        } finally {
            setUploading(false);
            e.target.value = null; // reset input
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...newStudent };
            if (!payload.classroom_id) {
                delete payload.classroom_id;
            } else {
                payload.classroom_id = parseInt(payload.classroom_id);
            }

            await axios.post(`${API_BASE}/students/`, payload);
            alert("Student added successfully");
            setShowAddModal(false);
            setNewStudent({ name: '', github_username: '', student_id: '', email: '', department: '', classroom_id: '' });
            fetchStudents();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to add student");
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedStudents(filteredStudents.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    const toggleSelectStudent = (id) => {
        if (selectedStudents.includes(id)) {
            setSelectedStudents(selectedStudents.filter(sid => sid !== id));
        } else {
            setSelectedStudents([...selectedStudents, id]);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.github_username?.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(s => s.status !== 'archived'); // By default hide archived unless we mean "remove all" from view

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Students Registry</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Global view of all tracked students and their activity</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass" style={{ display: 'flex', padding: '0.25rem', borderRadius: '0.75rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {['today', 'weekly', 'monthly', 'yearly', 'all', 'custom'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`btn ${period === p ? 'btn-primary' : ''}`}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: period === p ? 'var(--primary)' : 'transparent',
                                    border: 'none',
                                    textTransform: 'capitalize',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    {showDatePicker && period === 'custom' && (
                        <div className="glass" style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: '0.75rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>From:</label>
                            <input
                                type="date"
                                className="input"
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: 'auto' }}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>To:</label>
                            <input
                                type="date"
                                className="input"
                                style={{ padding: '0.5rem', fontSize: '0.875rem', width: 'auto' }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    )}
                    <button className="btn btn-secondary glass" onClick={() => {
                        let url = `${API_BASE}/analytics/export/csv?period=${period}`;
                        if (period === 'custom' && startDate && endDate) {
                            url += `&start_date=${startDate}&end_date=${endDate}`;
                        }
                        window.open(url, '_blank');
                    }}>
                        <Download size={20} />
                        Export
                    </button>
                </div>
            </header>

            <div className="card glass" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ flex: 1, minWidth: '300px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Search by name or GitHub username..."
                            style={{ paddingLeft: '3rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {/* Excel Upload */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                id="excel-upload"
                                accept=".xlsx, .xls, .csv"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                            <label htmlFor="excel-upload" className="btn btn-secondary glass" style={{ cursor: 'pointer' }}>
                                {uploading ? 'Uploading...' : 'Import Excel'}
                            </label>
                        </div>

                        <button className="btn btn-primary glass" onClick={() => setShowAddModal(true)} style={{ padding: '0.5rem', minWidth: 'auto' }}>
                            <Plus size={20} />
                        </button>

                        {/* Remove All (Bulk Delete) */}
                        {selectedStudents.length > 0 && (
                            <button className="btn btn-danger glass" onClick={handleBulkDelete}>
                                Remove Selected ({selectedStudents.length})
                            </button>
                        )}

                        <button className="btn btn-secondary glass" onClick={fetchStudents}>
                            <RefreshCw size={18} />
                            Reload
                        </button>

                        <button className="btn btn-primary glass" onClick={handleSyncAll}>
                            <RefreshCw size={18} />
                            Sync All
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Loading students...</div>
                ) : (
                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem', width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            onChange={toggleSelectAll}
                                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                        />
                                    </th>
                                    <th style={{ padding: '1rem' }}>Student</th>
                                    <th>GitHub</th>
                                    <th>Score</th>
                                    <th>Commits</th>
                                    <th>PRs</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(s.id)}
                                                onChange={() => toggleSelectStudent(s.id)}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <img src={s.avatar_url || 'https://github.com/identicons/jasonlong.png'} className="avatar" alt="" style={{ width: '40px', height: '40px' }} />
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{s.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email || 'No email'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <a href={s.profile_url} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: 'var(--secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                @{s.github_username}
                                                <ExternalLink size={14} />
                                            </a>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{s.activity_score}</div>
                                        </td>
                                        <td>{s.total_commits}</td>
                                        <td>{s.pull_requests}</td>
                                        <td>
                                            <span className={`badge badge-${s.status === 'active' ? 'success' : 'warning'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-secondary glass"
                                                    style={{ padding: '0.4rem' }}
                                                    onClick={() => handleRefresh(s.id)}
                                                    title="Refresh Data"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                                {/* Delete Icon */}
                                                <button
                                                    className="btn btn-danger glass"
                                                    style={{ padding: '0.4rem' }}
                                                    onClick={() => handleDelete(s.id)}
                                                    title="Archive Student"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' }}>
                    <div className="card glass" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Add Student Manually</h2>
                            <button className="btn btn-secondary glass" style={{ padding: '0.25rem', minWidth: 'auto', border: 'none' }} onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    required
                                    placeholder="e.g. John Doe"
                                    value={newStudent.name}
                                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>GitHub Username</label>
                                <input
                                    type="text"
                                    className="input"
                                    required
                                    placeholder="e.g. johndoe"
                                    value={newStudent.github_username}
                                    onChange={e => setNewStudent({ ...newStudent, github_username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Student ID / Roll No</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. 2021CS101"
                                    value={newStudent.student_id}
                                    onChange={e => setNewStudent({ ...newStudent, student_id: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="e.g. john@example.com"
                                    value={newStudent.email}
                                    onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Department</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. CSE, AIML"
                                    value={newStudent.department}
                                    onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Classroom (Optional)</label>
                                <select
                                    className="input"
                                    value={newStudent.classroom_id}
                                    onChange={e => setNewStudent({ ...newStudent, classroom_id: e.target.value })}
                                >
                                    <option value="">None</option>
                                    {classrooms.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-secondary glass" onClick={() => setShowAddModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default StudentsPage;
