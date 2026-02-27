import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Building2, Search, Users, BookOpen, LayoutDashboard, Settings } from 'lucide-react';
import { API_BASE } from '../config';

export default function DepartmentHome() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await axios.get(`${API_BASE}/departments/`);
            setDepartments(res.data);
        } catch (err) {
            console.error("Error fetching departments:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredDepartments = departments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="main-content">Loading...</div>;

    return (
        <div className="main-content">
            <header className="header">
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Welcome, Admin</h1>
                    <p className="text-muted">Department Management Interface</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input glass"
                            placeholder="Search departments..."
                            style={{ paddingLeft: '3rem', width: '300px' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/departments')}>
                        <Settings size={18} /> Manage All
                    </button>
                </div>
            </header>

            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Select Department</h2>
                <div className="grid grid-3">
                    {filteredDepartments.map(dept => (
                        <div key={dept.id} className="card glass stat-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => navigate(`/departments/${dept.id}`)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'var(--primary-glow)', padding: '0.75rem', borderRadius: '12px' }}>
                                    <Building2 size={24} color="var(--primary)" />
                                </div>
                                <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{dept.code}</span>
                            </div>

                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{dept.name}</h3>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>
                                {dept.description || `Management dashboard for ${dept.name}`}
                            </p>

                            <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={16} color="var(--primary)" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{dept.student_count}</div>
                                        <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Students</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <BookOpen size={16} color="var(--secondary)" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{dept.classroom_count}</div>
                                        <div className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Classrooms</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div
                        className="card glass"
                        style={{
                            cursor: 'pointer',
                            border: '2px dashed var(--border)',
                            background: 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            minHeight: '200px'
                        }}
                        onClick={() => navigate('/departments')}
                    >
                        <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '50%' }}>
                            <Plus size={32} className="text-muted" />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Create New Department</span>
                    </div>
                </div>
            </div>

            {/* Quick Access to Global Dashboard */}
            <div className="card glass" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <LayoutDashboard size={24} color="var(--primary)" />
                    <div>
                        <h4 style={{ fontWeight: 700 }}>Full Admin Dashboard</h4>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>View global statistics and platform-wide user management</p>
                    </div>
                </div>
                <button className="btn btn-secondary glass" onClick={() => navigate('/dashboard')}>
                    Open Dashboard
                </button>
            </div>
        </div>
    );
}
