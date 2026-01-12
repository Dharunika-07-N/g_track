import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Users, ExternalLink, RefreshCw, Filter } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const StudentsPage = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.github_username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                </div>
            </header>

            <div className="card glass" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', alignItems: 'center' }}>
                    <div className="input-group" style={{ flex: 1 }}>
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
                    <button className="btn btn-secondary glass" onClick={fetchStudents}>
                        <RefreshCw size={18} />
                        Reload
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Loading students...</div>
                ) : (
                    <div className="table-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
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
                                            <button
                                                className="btn btn-secondary glass"
                                                style={{ padding: '0.4rem' }}
                                                onClick={() => handleRefresh(s.id)}
                                            >
                                                <RefreshCw size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentsPage;
