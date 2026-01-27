import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    CheckCircle,
    Clock,
    Code,
    TrendingUp,
    Github,
    Layout,
    ExternalLink
} from 'lucide-react';

import { API_BASE } from '../../config';

export default function StudentDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resp = await axios.get(`${API_BASE}/student/dashboard`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setData(resp.data);
            } catch (err) {
                console.error("Error fetching student dashboard:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="main-content">Loading...</div>;
    if (!data) return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column'
        }}>
            <h1 style={{ fontSize: '4rem', color: 'red', fontWeight: '900' }}>FAILED TO LOAD</h1>
        </div>
    );

    const { profile, stats, recent_activity, deadlines } = data;

    return (
        <div className="main-content">
            <header className="header" style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <img
                        src={profile.avatar_url || `https://github.com/${profile.github_username}.png`}
                        alt=""
                        className="avatar"
                        style={{ width: '80px', height: '80px', borderRadius: '1.5rem', boxShadow: 'var(--shadow-lg)' }}
                    />
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Welcome, {profile.name}!</h1>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Github size={14} /> @{profile.github_username}
                            </span>
                            {profile.leetcode_username && (
                                <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Code size={14} /> {profile.leetcode_username}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-4" style={{ marginBottom: '3rem' }}>
                <div className="card glass stat-card">
                    <CheckCircle size={24} color="#10b981" />
                    <span className="stat-value">{stats.assignments_completed}</span>
                    <span className="stat-label">Assignments Done</span>
                </div>
                <div className="card glass stat-card">
                    <Clock size={24} color="var(--primary)" />
                    <span className="stat-value">{stats.pending_assignments}</span>
                    <span className="stat-label">Pending Tasks</span>
                </div>
                <div className="card glass stat-card">
                    <Code size={24} color="#f59e0b" />
                    <span className="stat-value">{stats.leetcode_solved}</span>
                    <span className="stat-label">LeetCode Solved</span>
                </div>
                <div className="card glass stat-card">
                    <TrendingUp size={24} color="var(--secondary)" />
                    <span className="stat-value">%{stats.completion_rate}</span>
                    <span className="stat-label">Overall Progress</span>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card glass">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Layout size={20} color="var(--primary)" />
                        Recent GitHub Activity
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Array.isArray(recent_activity) && recent_activity.length > 0 ? (
                            recent_activity.map((log, i) => (
                                <div key={i} className="leaderboard-row" style={{ background: 'rgba(255,255,255,0.4)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.prs} pull requests</div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>+{log.commits} commits</div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted">No recent activity found.</p>
                        )}
                    </div>
                </div>

                <div className="card glass">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Clock size={20} color="var(--accent)" />
                        Upcoming Deadlines
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Array.isArray(deadlines) && deadlines.length > 0 ? (
                            deadlines.map(d => (
                                <div key={d.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{d.title}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            Due {new Date(d.deadline).toLocaleDateString()} at {new Date(d.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}>
                                        Submit <ExternalLink size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted">You're all caught up! No upcoming deadlines.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
