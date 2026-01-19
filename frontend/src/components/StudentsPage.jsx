import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Users, ExternalLink, RefreshCw, Filter, Trash2, Download } from 'lucide-react';
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

    useEffect(() => {
        fetchStudents();
    }, [period]);

    const setPeriod = (p) => {
        setSearchParams({ period: p });
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const resp = await axios.get(`${API_BASE}/students/?period=${period}&limit=100`);
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
                    <div className="glass" style={{ display: 'flex', padding: '0.25rem', borderRadius: '0.75rem' }}>
                        {['weekly', 'monthly', 'yearly', 'all'].map(p => (
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
                    <button className="btn btn-secondary glass" onClick={() => window.open(`${API_BASE}/analytics/export/csv?period=${period}`, '_blank')}>
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
        </div >
    );
};

export default StudentsPage;
