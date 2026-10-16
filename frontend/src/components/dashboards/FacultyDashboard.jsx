import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus,
    Users,
    BookOpen,
    Send,
    Download,
    BarChart,
    ArrowRight
} from 'lucide-react';

import { API_BASE } from '../../config';

export default function FacultyDashboard() {
    const [stats, setStats] = useState({ total_students: 0, active_students: 0, total_commits: 0 });
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, classRes] = await Promise.all([
                    axios.get(`${API_BASE}/analytics/dashboard/stats?period=monthly`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    }),
                    axios.get(`${API_BASE}/classrooms`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    })
                ]);
                setStats(statsRes.data || { total_students: 0, active_students: 0, total_commits: 0 });
                setClassrooms(Array.isArray(classRes.data) ? classRes.data : []);
            } catch (err) {
                console.error("Error fetching faculty dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="main-content">Loading...</div>;

    return (
        <div className="main-content">
            <header className="header" style={{ marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Faculty Portal</h1>
                    <p className="text-muted">Manage your classes and monitor student progress</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/classrooms')}>
                        <Plus size={18} /> New Classroom
                    </button>
                    <button className="btn btn-secondary glass" onClick={() => navigate('/assignments')}>
                        <BookOpen size={18} /> Assignments
                    </button>
                </div>
            </header>

            <div className="grid grid-3" style={{ marginBottom: '3rem' }}>
                <div className="card glass stat-card">
                    <Users size={24} color="var(--primary)" />
                    <span className="stat-value">{stats.total_students}</span>
                    <span className="stat-label">Students Tracked</span>
                </div>
                <div className="card glass stat-card">
                    <BarChart size={24} color="var(--secondary)" />
                    <span className="stat-value">{stats.active_students}</span>
                    <span className="stat-label">Active This Month</span>
                </div>
                <div className="card glass stat-card">
                    <Send size={24} color="#10b981" />
                    <span className="stat-value">{classrooms.length}</span>
                    <span className="stat-label">Total Classrooms</span>
                </div>
            </div>

            <div className="card glass">
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>My Classrooms</h2>
                <div className="grid grid-3">
                    {Array.isArray(classrooms) && classrooms.map(cls => (
                        <div
                            key={cls.id}
                            className="card glass clickable"
                            onClick={() => navigate(`/classrooms/${cls.id}`)}
                            style={{ border: '1px solid var(--border)' }}
                        >
                            <div style={{ marginBottom: '1rem' }}>
                                <span className="badge badge-info">{cls.subject_code || 'CS'}</span>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{cls.name}</h3>
                            <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>{cls.description}</p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={16} className="text-muted" />
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active</span>
                                </div>
                                <ArrowRight size={18} className="text-muted" />
                            </div>
                        </div>
                    ))}
                    {(!Array.isArray(classrooms) || classrooms.length === 0) && <p className="text-muted">No classrooms created yet.</p>}
                </div>
            </div>
        </div>
    );
}
