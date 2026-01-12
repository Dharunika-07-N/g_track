import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Download,
    History,
    BarChart3,
    Calendar,
    FileSpreadsheet,
    AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const AnalyticsPage = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            const resp = await axios.get(`${API_BASE}/analytics/summary`);
            setSummary(resp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        window.open(`${API_BASE}/analytics/export/csv`, '_blank');
    };

    if (loading) return <div className="main-content">Loading archive data...</div>;

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Historical Archive</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Long-term contribution history and assignment records</p>
                </div>
                <button className="btn btn-primary" onClick={handleExport}>
                    <Download size={20} />
                    Export All History (.xlsx)
                </button>
            </header>

            <div className="grid grid-3" style={{ marginBottom: '3rem' }}>
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <History size={24} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>Records Maintained</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{summary?.metrics.commits.toLocaleString()}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total commit snapshots preserved</div>
                </div>
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <FileSpreadsheet size={24} color="var(--secondary)" />
                        <span style={{ fontWeight: 600 }}>Submissions</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800 }}>{summary?.metrics.assignments}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Assignments tracked in history</div>
                </div>
                <div className="card glass">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Calendar size={24} color="var(--accent)" />
                        <span style={{ fontWeight: 600 }}>Retention Policy</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Indefinite</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Daily activity logs are permanent</div>
                </div>
            </div>

            <div className="card glass">
                <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} />
                    Lifetime Activity Trends
                </h3>
                <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '0 1rem' }}>
                    {summary?.trends.slice(0, 30).reverse().map((t, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: `${Math.min(100, (t.commits / (summary.metrics.commits / 30)) * 50)}%`,
                                background: 'var(--primary-glow)',
                                borderRadius: '4px 4px 0 0',
                                border: '1px solid var(--primary)',
                                position: 'relative'
                            }}
                            title={`${t.date_str}: ${t.commits} commits`}
                        >
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span>Past 30 Days</span>
                    <span>Today</span>
                </div>
            </div>

            <div className="card glass" style={{ marginTop: '2rem', background: 'rgba(52, 211, 153, 0.05)', borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <AlertCircle size={20} color="#10b981" style={{ flexShrink: 0 }} />
                    <div>
                        <h4 style={{ color: '#10b981', marginBottom: '0.25rem' }}>Reference Maintenance Enabled</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            All student activity logs and assignment submissions are automatically snapshot and stored in the primary database.
                            Even if a student is deactivated, their historical data remains accessible via the Export tool.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
