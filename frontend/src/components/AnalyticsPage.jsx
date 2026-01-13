import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Download,
    History,
    BarChart3,
    Calendar,
    FileSpreadsheet,
    AlertCircle,
    Building,
    Users,
    BookOpen,
    CheckCircle,
    X,
    Save,
    Clock,
    ChevronRight,
    AlertTriangle,
    Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const AnalyticsPage = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archives, setArchives] = useState([]);

    // Modal Form State
    const [formData, setFormData] = useState({
        department: '',
        batch: '',
        semester: '',
        start_date: '',
        end_date: '',
        title: '',
        notes: ''
    });

    // Preview & Processing State
    const [previewData, setPreviewData] = useState(null);
    const [fetchingPreview, setFetchingPreview] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [archiveSuccess, setArchiveSuccess] = useState(false);
    const [archiveError, setArchiveError] = useState(null);
    const [progressStep, setProgressStep] = useState(0); // 0-100
    const [progressText, setProgressText] = useState('');
    const [confirmationChecked, setConfirmationChecked] = useState(false);

    useEffect(() => {
        fetchSummary();
        fetchArchives();
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

    const fetchArchives = async () => {
        try {
            const resp = await axios.get(`${API_BASE}/analytics/archives`);
            setArchives(resp.data);
        } catch (err) {
            console.error("Failed to fetch archives", err);
        }
    };

    // --- Form Handlers ---

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset preview if critical fields change
        if (['department', 'batch', 'start_date', 'end_date'].includes(name)) {
            setPreviewData(null);
            setArchiveSuccess(false);
            setArchiveError(null);
        }
    };

    const calculateDuration = () => {
        if (!formData.start_date || !formData.end_date) return null;
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        const months = Math.floor(diffDays / 30);
        const remainingDays = diffDays % 30;

        return {
            days: diffDays,
            weeks: weeks,
            text: `${months} months, ${remainingDays} days`,
            valid: end > start,
            unusual: diffDays < 60 || diffDays > 240 // < 2 months or > 8 months
        };
    };

    const fetchPreview = async () => {
        if (!formData.department || !formData.batch || !formData.start_date || !formData.end_date) return;

        setFetchingPreview(true);
        try {
            // Simulate network delay for effect
            await new Promise(r => setTimeout(r, 800));

            const resp = await axios.post(`${API_BASE}/analytics/archive/preview`, null, {
                params: {
                    department: formData.department,
                    batch: formData.batch,
                    start_date: formData.start_date,
                    end_date: formData.end_date
                }
            });
            setPreviewData(resp.data);
        } catch (err) {
            console.error(err);
        } finally {
            setFetchingPreview(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (formData.department && formData.batch && formData.start_date && formData.end_date) {
                fetchPreview();
            }
        }, 1000); // Auto fetch after 1s of inactivity
        return () => clearTimeout(timeoutId);
    }, [formData.department, formData.batch, formData.start_date, formData.end_date]);


    const handleArchive = async () => {
        setArchiving(true);
        setArchiveError(null);

        // Fake Progress Steps
        const steps = [
            { pct: 25, text: "Collecting student data..." },
            { pct: 50, text: "Collecting assignment data..." },
            { pct: 75, text: "Collecting classroom data..." },
            { pct: 90, text: "Finalizing archive..." }
        ];

        for (const step of steps) {
            setProgressStep(step.pct);
            setProgressText(step.text);
            await new Promise(r => setTimeout(r, 600));
        }

        try {
            await axios.post(`${API_BASE}/analytics/archive`, formData);
            setProgressStep(100);
            setProgressText("Archiving complete!");
            setArchiveSuccess(true);
            fetchArchives(); // Refresh list
        } catch (err) {
            setArchiveError("Failed to archive data. Please try again.");
            console.error(err);
        } finally {
            setArchiving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            department: '',
            batch: '',
            semester: '',
            start_date: '',
            end_date: '',
            title: '',
            notes: ''
        });
        setPreviewData(null);
        setArchiveSuccess(false);
        setConfirmationChecked(false);
        setProgressStep(0);
    };

    if (loading) return <div className="main-content">Loading history...</div>;

    const duration = calculateDuration();

    return (
        <div className="main-content">
            <header className="header" style={{ borderBottom: 'none' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }} className="text-gradient">History</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Administrative Data Archival & Historical Records</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={() => window.open(`${API_BASE}/analytics/export/csv`, '_blank')}>
                        <Download size={20} />
                        Export Report
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowArchiveModal(true)}>
                        <History size={20} />
                        Archive Semester Data
                    </button>
                </div>
            </header>

            {/* Existing Archives List / Hierarchy View */}
            <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem', fontWeight: 700 }}>
                    <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '8px', color: 'white', display: 'flex' }}><BookOpen size={20} /></div>
                    Archived Semesters
                </h3>
                {archives.length === 0 ? (
                    <div className="glass-morphism" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ background: '#f1f5f9', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-muted)' }}>
                            <History size={32} />
                        </div>
                        <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>No Archives Found</h4>
                        <p>Use the "Archive Semester Data" tool creates a snapshot of your semester.</p>
                    </div>
                ) : (
                    <div className="grid grid-3">
                        {archives.map(arc => {
                            const snap = JSON.parse(arc.snapshot_data || '{}');
                            return (
                                <div key={arc.id} className="archive-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                                                {arc.department} • {arc.batch}
                                            </div>
                                            <h4 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>Semester {arc.semester}</h4>
                                        </div>
                                        <div style={{ background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                            {new Date(arc.created_at || Date.now()).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={14} />
                                        {new Date(arc.start_date).toLocaleDateString()} - {new Date(arc.end_date).toLocaleDateString()}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: 'auto' }}>
                                        <div className="stat-pill">
                                            <Users size={16} /> <span>{snap.students}</span>
                                        </div>
                                        <div className="stat-pill" style={{ color: 'var(--secondary)', background: 'rgba(14, 165, 233, 0.05)' }}>
                                            <CheckCircle size={16} /> <span>{snap.assignments}</span>
                                        </div>
                                        <div className="stat-pill" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}>
                                            <FileSpreadsheet size={16} /> <span>{snap.classrooms}</span>
                                        </div>
                                        <div className="stat-pill" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                                            <Clock size={16} /> <span>{snap.commits}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Existing Analytics Below (Optional, or removed/hidden) */}
            <div className="card glass">
                <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} />
                    Global Activity Trends
                </h3>
                <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '0 1rem' }}>
                    {summary?.trends.slice(0, 30).reverse().map((t, i) => (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                height: `${Math.min(100, (t.commits / (summary.metrics.commits / 30 || 1)) * 50)}%`,
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
            </div>


            {/* ARCHIVE MODAL */}
            {showArchiveModal && (
                <div className="modal-overlay">
                    <div className="modal glass" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>

                        {/* HEADER */}
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }} className="text-gradient">Archive Semester Data</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Create a historical snapshot of your academic data for long-term storage.</p>
                            </div>
                            <button className="btn-icon" onClick={() => setShowArchiveModal(false)} disabled={archiving && !archiveSuccess}>
                                <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '50%' }}><X size={20} /></div>
                            </button>
                        </div>

                        {!archiveSuccess ? (
                            <>
                                {/* PROCESSING OVERLAY */}
                                {archiving && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                        <Loader2 size={56} className="spin" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
                                        <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Archiving in Progress</h3>
                                        <div style={{ width: '60%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                                            <div style={{ width: `${progressStep}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', transition: 'width 0.4s ease' }}></div>
                                        </div>
                                        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{progressText}</p>
                                    </div>
                                )}

                                {/* FORM SECTION 1: HIERARCHY */}
                                <div className="form-section" style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                                        Hierarchy Details
                                    </h4>

                                    <div className="grid grid-2" style={{ gap: '2rem' }}>
                                        <div className="form-group">
                                            <label style={{ marginLeft: '4px' }}>Department Name <span className="text-red">*</span></label>
                                            <div className="input-group">
                                                <Building size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="text"
                                                    name="department"
                                                    value={formData.department}
                                                    onChange={handleInputChange}
                                                    className="input"
                                                    placeholder="e.g. Computer Science"
                                                    style={{ paddingLeft: '48px', height: '48px', fontSize: '1rem' }}
                                                />
                                            </div>
                                            <p className="helper-text" style={{ marginTop: '0.5rem', marginLeft: '4px' }}>Enter the full name or code (e.g. CSE)</p>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ marginLeft: '4px' }}>Batch / Cohort <span className="text-red">*</span></label>
                                            <div className="input-group">
                                                <Users size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="text"
                                                    name="batch"
                                                    value={formData.batch}
                                                    onChange={handleInputChange}
                                                    className="input"
                                                    placeholder="e.g. 2024-2028"
                                                    style={{ paddingLeft: '48px', height: '48px', fontSize: '1rem' }}
                                                />
                                            </div>
                                            <p className="helper-text" style={{ marginTop: '0.5rem', marginLeft: '4px' }}>Academic year range or batch ID</p>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: '2rem' }}>
                                        <label style={{ marginLeft: '4px' }}>Semester <span className="text-red">*</span></label>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                                <button
                                                    key={num}
                                                    className="btn"
                                                    onClick={() => handleInputChange({ target: { name: 'semester', value: num } })}
                                                    style={{
                                                        minWidth: '50px',
                                                        height: '50px',
                                                        borderRadius: '12px',
                                                        background: formData.semester == num ? 'var(--primary)' : 'white',
                                                        color: formData.semester == num ? 'white' : 'var(--text-main)',
                                                        border: formData.semester == num ? 'none' : '1px solid var(--border)',
                                                        fontSize: '1.1rem',
                                                        boxShadow: formData.semester == num ? '0 4px 12px var(--primary-glow)' : 'none',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* FORM SECTION 2: DATES */}
                                <div className="form-section" style={{ marginBottom: '2.5rem' }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                                        Time Period
                                    </h4>

                                    <div className="grid grid-2" style={{ gap: '2rem' }}>
                                        <div className="form-group">
                                            <label style={{ marginLeft: '4px' }}>Start Date <span className="text-red">*</span></label>
                                            <div className="input-group">
                                                <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="date"
                                                    name="start_date"
                                                    value={formData.start_date}
                                                    onChange={handleInputChange}
                                                    className="input"
                                                    style={{ paddingLeft: '48px', height: '48px' }}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ marginLeft: '4px' }}>End Date <span className="text-red">*</span></label>
                                            <div className="input-group">
                                                <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="date"
                                                    name="end_date"
                                                    value={formData.end_date}
                                                    onChange={handleInputChange}
                                                    className="input"
                                                    style={{ paddingLeft: '48px', height: '48px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Duration Calc */}
                                    {duration && duration.valid && (
                                        <div style={{
                                            marginTop: '1.5rem',
                                            padding: '1.25rem',
                                            borderRadius: '1rem',
                                            background: duration.unusual ? '#fffbeb' : '#f0fdf4',
                                            border: `1px solid ${duration.unusual ? '#fcd34d' : '#86efac'}`,
                                            display: 'flex',
                                            gap: '1rem',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ background: duration.unusual ? '#f59e0b' : '#10b981', padding: '0.5rem', borderRadius: '50%', color: 'white' }}>
                                                {duration.unusual ? <AlertTriangle size={20} /> : <Clock size={20} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: duration.unusual ? '#b45309' : '#15803d', fontSize: '1.05rem' }}>
                                                    Duration: {duration.text}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: duration.unusual ? '#b45309' : '#15803d', opacity: 0.9, marginTop: '2px' }}>
                                                    {new Date(formData.start_date).toLocaleDateString(undefined, { dateStyle: 'long' })} — {new Date(formData.end_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* FORM SECTION 3: DATA PREVIEW */}
                                <div className="form-section" style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
                                        Data Verification
                                    </h4>

                                    {/* OVERWRITE WARNING */}
                                    {archives.find(a => a.department === formData.department && a.batch === formData.batch && a.semester == formData.semester) && (
                                        <div style={{
                                            background: '#fff7ed',
                                            border: '1px solid #fdba74',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            gap: '0.75rem'
                                        }}>
                                            <AlertTriangle color="#f97316" style={{ flexShrink: 0 }} />
                                            <div>
                                                <h4 style={{ color: '#c2410c', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                                                    Warning: Semester {formData.semester} already archived
                                                </h4>
                                                <p style={{ fontSize: '0.85rem', color: '#9a3412', marginBottom: '0.5rem' }}>
                                                    Proceeding will overwrite the existing historical record for this semester.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* DATE OVERLAP WARNING */}
                                    {archives.filter(a =>
                                        a.department === formData.department &&
                                        a.batch === formData.batch &&
                                        a.semester != formData.semester &&
                                        ((new Date(formData.start_date) <= new Date(a.end_date) && new Date(formData.end_date) >= new Date(a.start_date)))
                                    ).map(conflict => (
                                        <div key={conflict.id} style={{
                                            background: '#fff7ed',
                                            border: '1px solid #fdba74',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            gap: '0.75rem'
                                        }}>
                                            <AlertTriangle color="#f97316" style={{ flexShrink: 0 }} />
                                            <div>
                                                <h4 style={{ color: '#c2410c', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                                                    Warning: Date Overlap Detected
                                                </h4>
                                                <p style={{ fontSize: '0.85rem', color: '#9a3412', marginBottom: '0.5rem' }}>
                                                    These dates overlap with Semester {conflict.semester} ({new Date(conflict.start_date).toLocaleDateString()} - {new Date(conflict.end_date).toLocaleDateString()}).
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)' }}>
                                        <h4 style={{ marginBottom: '1rem' }}>Data Found in Selected Date Range</h4>

                                        {fetchingPreview ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)' }}>
                                                <Loader2 className="spin" size={16} /> Fetching data...
                                            </div>
                                        ) : previewData ? (
                                            <div className="grid grid-2">
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {previewData.student_count > 0 ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#eab308" />}
                                                    <span>{previewData.student_count} Students Enrolled</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {previewData.assignment_count > 0 ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#eab308" />}
                                                    <span>{previewData.assignment_count} Assignments Created</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {previewData.classroom_count > 0 ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#eab308" />}
                                                    <span>{previewData.classroom_count} Classrooms Created</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    {previewData.commit_count > 0 ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#eab308" />}
                                                    <span>{previewData.commit_count} Total Commits</span>
                                                </div>
                                                {/* Warning if no data */}
                                                {Object.values(previewData).every(v => v === 0) && (
                                                    <div style={{ gridColumn: '1/-1', marginTop: '1rem', color: '#eab308', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <AlertTriangle size={16} />
                                                        No data found for this date range. Please verify the dates are correct.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Select hierarchy and dates to view preview</div>
                                        )}
                                    </div>
                                </div>

                                {/* FORM SECTION 4: OPTIONAL METADATA */}
                                <div className="form-section" style={{ marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ background: 'var(--primary)', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>4</span>
                                        Additional Information (Optional)
                                    </h4>

                                    <div className="form-group">
                                        <label style={{ marginLeft: '4px' }}>Notes</label>
                                        <textarea
                                            name="notes"
                                            rows={3}
                                            maxLength={500}
                                            placeholder="Any special notes about this semester..."
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            className="input"
                                        />
                                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            {formData.notes.length}/500
                                        </div>
                                    </div>
                                </div>

                                {/* FORM SECTION 5: CONFIRMATION & ACTIONS */}
                                <div className="form-section">
                                    <label className="checkbox-container" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={confirmationChecked}
                                            onChange={e => setConfirmationChecked(e.target.checked)}
                                            style={{ marginTop: '4px' }}
                                        />
                                        <span style={{ fontWeight: 600 }}>I confirm that the information above is correct and I want to archive this semester's data</span>
                                    </label>

                                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <button className="btn btn-ghost" onClick={() => setShowArchiveModal(false)}>
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            disabled={!confirmationChecked || !formData.department || !formData.batch || !formData.semester || !formData.start_date || !formData.end_date}
                                            onClick={handleArchive}
                                        >
                                            <Save size={18} />
                                            Archive Semester
                                        </button>
                                    </div>
                                    {archiveError && (
                                        <div style={{ marginTop: '1rem', color: 'var(--error)' }}>
                                            {archiveError}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* SUCCESS STATE */
                            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <CheckCircle size={48} color="#10b981" />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginBottom: '0.5rem' }}>Semester Archived Successfully!</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                                    Semester {formData.semester} data for {formData.department} {formData.batch} has been archived.
                                </p>

                                <div className="card glass" style={{ maxWidth: '400px', margin: '0 auto 2rem', textAlign: 'left' }}>
                                    <h4 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Archived Data Summary</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div>✓ {previewData?.student_count || 0} students</div>
                                        <div>✓ {previewData?.assignment_count || 0} assignments</div>
                                        <div>✓ {previewData?.classroom_count || 0} classrooms</div>
                                        <div>✓ {previewData?.commit_count || 0} commits</div>
                                        <div>✓ {previewData?.project_count || 0} projects</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <button className="btn btn-outline" onClick={resetForm}>
                                        Archive Another
                                    </button>
                                    <button className="btn btn-primary" onClick={() => setShowArchiveModal(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
