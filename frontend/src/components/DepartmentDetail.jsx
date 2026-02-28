import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';
import {
    Building2, Users, BookOpen, Upload, RefreshCw, ChevronLeft,
    Plus, X, CheckCircle, AlertCircle, Search, Github,
    BarChart2, Star, Activity, Zap, Download, Clock,
    FileSpreadsheet, ArrowUpDown, ChevronDown, ChevronUp,
    Pencil, Trash2, MoreVertical, ExternalLink
} from 'lucide-react';

const TABS = ['Overview', 'Classrooms', 'Students', 'Import'];

const DepartmentDetail = () => {
    const { deptId } = useParams();
    const navigate = useNavigate();

    const [dept, setDept] = useState(null);
    const [stats, setStats] = useState(null);
    const [classrooms, setClassrooms] = useState([]);
    const [students, setStudents] = useState([]);
    const [tab, setTab] = useState('Overview');
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [classroomsLoading, setClassroomsLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('activity_score');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [showClassroomModal, setShowClassroomModal] = useState(false);
    const [classroomForm, setClassroomForm] = useState({ name: '', description: '', semester: '', year: '', batch: '', subject_code: '', faculty_name: '', faculty_email: '' });
    const [syncing, setSyncing] = useState(false);
    const [period, setPeriod] = useState('all-time');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [topLimit, setTopLimit] = useState('all');
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [newStudentForm, setNewStudentForm] = useState({ name: '', github_username: '', student_id: '', email: '', department: '', classroom_id: '' });
    const [addingStudent, setAddingStudent] = useState(false);

    // Import state
    const [importFile, setImportFile] = useState(null);
    const [importClassroomId, setImportClassroomId] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileRef = useRef();

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [deptRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE}/departments/${deptId}`),
                axios.get(`${API_BASE}/departments/${deptId}/stats`)
            ]);
            setDept(deptRes.data);
            setStats(statsRes.data);
        } catch (e) {
            showToast('Failed to load department', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassrooms = async () => {
        setClassroomsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/departments/${deptId}/classrooms`);
            setClassrooms(res.data);
        } catch (e) {
            showToast('Failed to load classrooms', 'error');
        } finally {
            setClassroomsLoading(false);
        }
    };

    const fetchStudents = async () => {
        setStudentsLoading(true);
        try {
            let params = `?period=${period}`;
            if (selectedClassroom) params += `&classroom_id=${selectedClassroom}`;
            if (period === 'custom' && customStart) {
                params += `&start_date=${customStart}`;
                if (customEnd) params += `&end_date=${customEnd}`;
            }
            const res = await axios.get(`${API_BASE}/departments/${deptId}/students${params}`);
            setStudents(res.data);
        } catch (e) {
            showToast('Failed to load students', 'error');
        } finally {
            setStudentsLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, [deptId]);
    useEffect(() => {
        if (tab === 'Classrooms') fetchClassrooms();
        if (tab === 'Students') { fetchClassrooms(); fetchStudents(); }
        if (tab === 'Import') fetchClassrooms();
    }, [tab, deptId]);
    useEffect(() => {
        if (tab === 'Students') fetchStudents();
    }, [selectedClassroom, period, customStart, customEnd]);

    const handleSort = (field) => {
        if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(field); setSortDir('desc'); }
    };

    const sortedStudents = [...students]
        .filter(s =>
            s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.github_username?.toLowerCase().includes(search.toLowerCase()) ||
            s.student_id?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            let av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
            if (typeof av === 'string') av = av.toLowerCase(), bv = (bv || '').toLowerCase();
            return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });

    const displayedStudents = topLimit === 'all'
        ? sortedStudents
        : sortedStudents.slice(0, parseInt(topLimit));

    const handleCreateClassroom = async () => {
        if (!classroomForm.name.trim()) { showToast('Classroom name required', 'error'); return; }
        try {
            await axios.post(`${API_BASE}/departments/${deptId}/classrooms`, classroomForm);
            showToast('Classroom created!');
            setShowClassroomModal(false);
            setClassroomForm({ name: '', description: '', semester: '', year: '', batch: '', subject_code: '', faculty_name: '', faculty_email: '' });
            fetchClassrooms();
        } catch (e) {
            showToast(e.response?.data?.detail || 'Failed to create classroom', 'error');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await axios.post(`${API_BASE}/departments/${deptId}/sync`);
            showToast(res.data.message);
        } catch (e) {
            showToast('Sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to remove this student?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE}/students/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Student removed successfully');
            fetchStudents();
        } catch (e) {
            showToast('Failed to remove student', 'error');
        }
    };

    const handleDeleteAllStudents = async () => {
        if (!window.confirm('WARNING: This will remove ALL students from this department. Are you sure?')) return;
        if (!window.confirm('Final confirmation: Are you absolutely sure? This action cannot be easily undone.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_BASE}/departments/${deptId}/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast(res.data.message);
            fetchStudents();
            fetchAll(); // Refresh stats
        } catch (e) {
            showToast(e.response?.data?.detail || 'Failed to remove students', 'error');
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setAddingStudent(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...newStudentForm,
                classroom_id: newStudentForm.classroom_id ? parseInt(newStudentForm.classroom_id) : null,
                department: newStudentForm.department || dept?.name || ''
            };
            if (!payload.classroom_id) delete payload.classroom_id;
            await axios.post(`${API_BASE}/students/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Student added successfully!');
            setShowAddStudentModal(false);
            setNewStudentForm({ name: '', github_username: '', student_id: '', email: '', department: '', classroom_id: '' });
            fetchStudents();
        } catch (e) {
            showToast(e.response?.data?.detail || 'Failed to add student', 'error');
        } finally {
            setAddingStudent(false);
        }
    };

    const handleImport = async () => {
        if (!importFile) { showToast('Please select a file', 'error'); return; }
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const url = importClassroomId
                ? `${API_BASE}/departments/${deptId}/upload?classroom_id=${importClassroomId}`
                : `${API_BASE}/departments/${deptId}/upload`;
            const res = await axios.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImportResult(res.data);
            showToast(res.data.message);
            setImportFile(null);
            if (fileRef.current) fileRef.current.value = '';
        } catch (e) {
            showToast(e.response?.data?.detail || 'Import failed', 'error');
        } finally {
            setImporting(false);
        }
    };

    const SortIcon = ({ field }) => (
        <span style={{ marginLeft: '0.25rem', opacity: sortBy === field ? 1 : 0.3 }}>
            {sortBy === field && sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
    );

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--text-muted)' }}>
            <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', marginRight: '0.75rem' }} /> Loading...
        </div>
    );

    if (!dept) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>
            Department not found. <button onClick={() => navigate('/departments')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Go back</button>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>

            {/* ── Sticky Top Bar ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
                borderBottom: '1px solid #e2e8f0',
                padding: '0.75rem 2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => navigate('/')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#6366f1', fontSize: '0.88rem', fontWeight: 600, padding: '0.35rem 0.65rem',
                        borderRadius: '8px', transition: 'background 0.15s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <ChevronLeft size={16} /> All Departments
                    </button>
                    <span style={{ color: '#cbd5e1' }}>/</span>
                    {dept && <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{dept.name}</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <button onClick={handleSync} disabled={syncing}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.45rem 0.9rem', cursor: syncing ? 'not-allowed' : 'pointer', color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        <RefreshCw size={14} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} /> {syncing ? 'Syncing…' : 'Sync GitHub'}
                    </button>
                    <button onClick={() => setTab('Import')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg,#6366f1,#818cf8)', border: 'none', borderRadius: '8px', padding: '0.45rem 0.9rem', cursor: 'pointer', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                        <Upload size={14} /> Import
                    </button>
                </div>
            </div>

            <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto' }}>
                {/* Toast */}
                {toast && (
                    <div style={{
                        position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                        background: toast.type === 'error' ? '#ef4444' : '#22c55e',
                        color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontWeight: 600
                    }}>
                        {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                        {toast.msg}
                    </div>
                )}

                {/* Breadcrumb + Header */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <button onClick={() => navigate('/departments')} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.88rem', padding: 0, marginBottom: '0.75rem'
                    }}>
                        <ChevronLeft size={16} /> Back to Departments
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                <span style={{
                                    background: 'var(--accent)', color: '#fff', borderRadius: '8px',
                                    padding: '0.25rem 0.75rem', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em'
                                }}>{dept.code}</span>
                                {!dept.is_active && <span style={{ background: '#78716c22', color: '#78716c', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>Inactive</span>}
                            </div>
                            <h1 style={{ margin: '0 0 0.3rem', fontSize: '2rem', fontWeight: 800 }}>{dept.name}</h1>
                            {dept.description && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>{dept.description}</p>}
                            {dept.hod_name && <p style={{ margin: '0.4rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>HOD: <strong style={{ color: 'var(--text)' }}>{dept.hod_name}</strong>{dept.hod_email && ` · ${dept.hod_email}`}</p>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', cursor: syncing ? 'not-allowed' : 'pointer', color: 'var(--text)', fontSize: '0.9rem' }}
                            >
                                <RefreshCw size={16} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
                                {syncing ? 'Syncing...' : 'Sync GitHub'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                        {[
                            { icon: <Users size={20} />, label: 'Total Students', value: stats.total_students, color: '#6366f1' },
                            { icon: <Activity size={20} />, label: 'Total Commits', value: stats.total_commits, color: '#22c55e' },
                            { icon: <BarChart2 size={20} />, label: 'Avg Commits', value: stats.avg_commits, color: '#f59e0b' },
                            { icon: <Star size={20} />, label: 'Avg Score', value: stats.avg_score, color: '#ec4899' },
                        ].map(card => (
                            <div key={card.label} style={{
                                background: 'var(--card-bg)', border: '1px solid var(--border)',
                                borderRadius: '12px', padding: '1.25rem',
                                borderLeft: `4px solid ${card.color}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: card.color, marginBottom: '0.5rem' }}>
                                    {card.icon}
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{card.label}</span>
                                </div>
                                <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{card.value ?? 0}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Top Student */}
                {stats?.top_student && (
                    <div style={{
                        background: 'linear-gradient(135deg, #6366f122, #ec489922)',
                        border: '1px solid #6366f133',
                        borderRadius: '12px', padding: '1rem 1.5rem',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        marginBottom: '1.75rem'
                    }}>
                        <Star size={18} style={{ color: '#f59e0b' }} />
                        <strong>Top Performer:</strong>
                        {stats.top_student.avatar_url && (
                            <img src={stats.top_student.avatar_url} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #6366f1' }} alt="" />
                        )}
                        <span>{stats.top_student.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>@{stats.top_student.github_username}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#6366f1' }}>Score: {stats.top_student.activity_score}</span>
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem' }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '0.65rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                            fontWeight: tab === t ? 700 : 500, color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                            marginBottom: '-2px', fontSize: '0.93rem', transition: 'all 0.15s'
                        }}>{t}</button>
                    ))}
                </div>

                {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
                {tab === 'Overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BookOpen size={18} style={{ color: 'var(--accent)' }} /> Quick Actions
                            </h3>
                            {[
                                { label: 'Manage Classrooms', desc: 'Create and view classes within this department', tab: 'Classrooms', icon: <BookOpen size={16} /> },
                                { label: 'View Students', desc: 'Browse and sort all students in this department', tab: 'Students', icon: <Users size={16} /> },
                                { label: 'Import Students', desc: 'Upload Excel/CSV to add students in bulk', tab: 'Import', icon: <Upload size={16} /> },
                            ].map(action => (
                                <button key={action.tab} onClick={() => setTab(action.tab)} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                                    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
                                    padding: '0.85rem 1rem', cursor: 'pointer', marginBottom: '0.75rem',
                                    color: 'var(--text)', textAlign: 'left', transition: 'background 0.15s'
                                }}>
                                    <span style={{ color: 'var(--accent)' }}>{action.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{action.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                                    </div>
                                    <ChevronDown size={15} style={{ marginLeft: 'auto', transform: 'rotate(-90deg)', color: 'var(--text-muted)' }} />
                                </button>
                            ))}
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={18} style={{ color: '#f59e0b' }} /> Department Info
                            </h3>
                            {[
                                { label: 'Department Name', value: dept.name },
                                { label: 'Department Code', value: dept.code },
                                { label: 'HOD', value: dept.hod_name || '—' },
                                { label: 'HOD Email', value: dept.hod_email || '—' },
                                { label: 'Status', value: dept.is_active ? '✅ Active' : '❌ Inactive' },
                                { label: 'Created', value: new Date(dept.created_at).toLocaleDateString() },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.55rem 0' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{item.label}</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── CLASSROOMS TAB ──────────────────────────────────── */}
                {tab === 'Classrooms' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button className="btn-primary" onClick={() => setShowClassroomModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.15rem' }}>
                                <Plus size={16} /> New Classroom
                            </button>
                        </div>
                        {classroomsLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                            </div>
                        ) : classrooms.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                                <p>No classrooms yet. Create one to start importing students.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {classrooms.map(c => (
                                    <div key={c.id} style={{
                                        background: 'var(--card-bg)', border: '1px solid var(--border)',
                                        borderRadius: '12px', padding: '1.25rem', cursor: 'pointer',
                                        transition: 'box-shadow 0.2s'
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)'}
                                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                                        onClick={() => navigate(`/classrooms/${c.id}`)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.2rem', fontSize: '1rem' }}>{c.name}</h4>
                                                {c.subject_code && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.subject_code}</span>}
                                            </div>
                                            <ExternalLink size={14} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                                        </div>
                                        {c.faculty_name && <p style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Faculty: {c.faculty_name}</p>}
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                                            <span><Users size={13} style={{ verticalAlign: 'middle' }} /> {c.student_count} students</span>
                                            {c.semester && <span>Sem {c.semester}</span>}
                                            {c.batch && <span>Batch {c.batch}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STUDENTS TAB ─────────────────────────────────────── */}
                {tab === 'Students' && (
                    <div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', background: '#fff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or GitHub..."
                                    style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <Clock size={16} color="#64748b" />
                                <select value={period} onChange={e => setPeriod(e.target.value)}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#f8fafc', cursor: 'pointer' }}
                                >
                                    <option value="all-time">All Time</option>
                                    <option value="daily">Today</option>
                                    <option value="weekly">Last 7 Days</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {period === 'custom' && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem', borderLeft: '2px solid #e2e8f0' }}>
                                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                        style={{ padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                                    />
                                    <span style={{ color: '#94a3b8' }}>to</span>
                                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                        style={{ padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderLeft: '2px solid #e2e8f0', paddingLeft: '0.5rem' }}>
                                <Users size={16} color="#64748b" />
                                <select value={topLimit} onChange={e => setTopLimit(e.target.value)}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    <option value="all">Top Contributors</option>
                                    <option value="5">Top 5</option>
                                    <option value="10">Top 10</option>
                                    <option value="15">Top 15</option>
                                    <option value="25">Top 25</option>
                                    <option value="50">Top 50</option>
                                </select>
                            </div>

                            <select value={selectedClassroom || ''} onChange={e => setSelectedClassroom(e.target.value || null)}
                                style={{ padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#f8fafc' }}
                            >
                                <option value="">All Classrooms</option>
                                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ background: '#f1f5f9', padding: '0.5rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                                    {displayedStudents.length} Students
                                </div>
                                <button
                                    onClick={() => setShowAddStudentModal(true)}
                                    title="Add Student Manually"
                                    style={{
                                        background: '#6366f1', color: '#fff', border: 'none',
                                        borderRadius: '8px', padding: '0.5rem 0.75rem',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
                                >
                                    <Plus size={15} /> Add Student
                                </button>
                                {displayedStudents.length > 0 && (
                                    <button
                                        onClick={handleDeleteAllStudents}
                                        title="Remove All Students"
                                        style={{
                                            background: '#fff', color: '#ef4444', border: '1px solid #fee2e2',
                                            borderRadius: '8px', padding: '0.5rem 0.75rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = '#fef2f2';
                                            e.currentTarget.style.borderColor = '#fecaca';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = '#fff';
                                            e.currentTarget.style.borderColor = '#fee2e2';
                                        }}
                                    >
                                        <Trash2 size={15} /> Remove All
                                    </button>
                                )}
                            </div>
                        </div>

                        {studentsLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading students...
                            </div>
                        ) : sortedStudents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                <Users size={48} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                                <p>No students found. <button onClick={() => setTab('Import')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Import students</button> to get started.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--card-bg)', borderBottom: '2px solid var(--border)' }}>
                                            {[
                                                { label: 'Student', field: 'name' },
                                                { label: 'GitHub', field: 'github_username' },
                                                { label: 'Contributions', field: 'total_contributions' },
                                                { label: 'PRs', field: 'pull_requests' },
                                                { label: 'Score', field: 'activity_score' },
                                                { label: 'Active Days', field: 'active_days' },
                                                { label: 'Last Sync', field: 'last_updated' },
                                                { label: 'Actions', field: 'actions' },
                                            ].map(col => (
                                                <th key={col.field} onClick={() => col.field !== 'actions' && handleSort(col.field)} style={{
                                                    padding: '0.75rem 1rem', textAlign: 'left', cursor: col.field !== 'actions' ? 'pointer' : 'default',
                                                    fontWeight: 600, color: sortBy === col.field ? 'var(--accent)' : 'var(--text-muted)',
                                                    whiteSpace: 'nowrap', userSelect: 'none'
                                                }}>
                                                    {col.label}{col.field !== 'actions' && <SortIcon field={col.field} />}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedStudents.map((s, i) => (
                                            <tr key={s.id} style={{
                                                borderBottom: '1px solid var(--border)',
                                                background: i % 2 === 0 ? 'transparent' : 'var(--card-bg)',
                                                transition: 'background 0.1s'
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#6366f111'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--card-bg)'}
                                            >
                                                <td style={{ padding: '0.7rem 1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        {s.avatar_url
                                                            ? <img src={s.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%' }} alt="" />
                                                            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                {s.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        }
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                            {s.student_id && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.student_id}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.7rem 1rem' }}>
                                                    <a href={`https://github.com/${s.github_username}`} target="_blank" rel="noreferrer"
                                                        style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Github size={13} /> {s.github_username}
                                                    </a>
                                                </td>
                                                <td style={{ padding: '0.7rem 1rem', fontWeight: 600, color: '#22c55e' }}>{s.total_contributions || s.total_commits}</td>
                                                <td style={{ padding: '0.7rem 1rem', color: '#6366f1' }}>{s.pull_requests}</td>
                                                <td style={{ padding: '0.7rem 1rem' }}>
                                                    <span style={{
                                                        background: s.activity_score > 100 ? '#22c55e22' : s.activity_score > 50 ? '#f59e0b22' : '#ef444422',
                                                        color: s.activity_score > 100 ? '#22c55e' : s.activity_score > 50 ? '#f59e0b' : '#ef4444',
                                                        borderRadius: '6px', padding: '0.2rem 0.55rem', fontWeight: 700, fontSize: '0.85rem'
                                                    }}>
                                                        {s.activity_score}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{s.active_days}</td>
                                                <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    {s.last_updated ? new Date(s.last_updated).toLocaleDateString() : '—'}
                                                </td>
                                                <td style={{ padding: '0.7rem 1rem' }}>
                                                    <button
                                                        onClick={() => handleDeleteStudent(s.id)}
                                                        style={{
                                                            background: 'none', border: 'none', color: '#ef4444',
                                                            cursor: 'pointer', padding: '0.4rem', borderRadius: '6px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#ef444411'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                        title="Remove Student"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
                }

                {/* ── IMPORT TAB ────────────────────────────────────────── */}
                {
                    tab === 'Import' && (
                        <div style={{ maxWidth: '680px' }}>
                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '2rem', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileSpreadsheet size={20} style={{ color: 'var(--accent)' }} /> Import Students from Excel / CSV
                                </h3>
                                <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                    Upload an Excel or CSV file with columns: <strong>Name</strong>, <strong>GitHub</strong>, <strong>ID</strong> (student ID), <strong>Email</strong>. Students will be linked to the <strong>{dept.name}</strong> department automatically.
                                </p>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem' }}>
                                        Assign to Classroom <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                                    </label>
                                    <select value={importClassroomId} onChange={e => setImportClassroomId(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none' }}
                                    >
                                        <option value="">No classroom (department-level only)</option>
                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem' }}>Select File *</label>
                                    <div
                                        style={{
                                            border: '2px dashed var(--border)', borderRadius: '10px', padding: '2rem',
                                            textAlign: 'center', cursor: 'pointer',
                                            transition: 'border-color 0.2s', background: 'var(--bg)'
                                        }}
                                        onClick={() => fileRef.current?.click()}
                                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                                        onDragLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        onDrop={e => {
                                            e.preventDefault();
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            const f = e.dataTransfer.files[0];
                                            if (f) setImportFile(f);
                                        }}
                                    >
                                        <Upload size={36} style={{ color: 'var(--accent)', marginBottom: '0.75rem' }} />
                                        <p style={{ margin: '0 0 0.4rem', fontWeight: 600 }}>
                                            {importFile ? importFile.name : 'Drop file here or click to browse'}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Supports .xlsx, .xls, .csv</p>
                                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                                            onChange={e => setImportFile(e.target.files[0])}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {importFile && (
                                        <button onClick={() => { setImportFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                                            style={{ padding: '0.55rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <X size={15} /> Clear
                                        </button>
                                    )}
                                    <button onClick={handleImport} disabled={!importFile || importing} className="btn-primary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', opacity: (!importFile || importing) ? 0.6 : 1 }}>
                                        {importing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                                        {importing ? 'Importing...' : 'Import Students'}
                                    </button>
                                </div>
                            </div>

                            {/* Import Result */}
                            {importResult && (
                                <div style={{
                                    background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem'
                                }}>
                                    <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle size={18} style={{ color: '#22c55e' }} /> Import Complete
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                        {[
                                            { label: 'Added', value: importResult.added, color: '#22c55e' },
                                            { label: 'Updated', value: importResult.updated || 0, color: '#6366f1' },
                                            { label: 'Skipped', value: importResult.skipped, color: '#f59e0b' },
                                            { label: 'Errors', value: importResult.errors?.length || 0, color: '#ef4444' },
                                        ].map(r => (
                                            <div key={r.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px', border: `1px solid ${r.color}33` }}>
                                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: r.color }}>{r.value}</div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {importResult.errors?.length > 0 && (
                                        <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: '8px', padding: '0.75rem' }}>
                                            <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#ef4444', fontSize: '0.88rem' }}>Errors:</p>
                                            {importResult.errors.map((e, i) => <p key={i} style={{ margin: '0.25rem 0', fontSize: '0.83rem', color: '#ef4444' }}>• {e}</p>)}
                                        </div>
                                    )}
                                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        ℹ️ GitHub profiles are being fetched in the background. Check back in a few minutes.
                                    </p>
                                </div>
                            )}

                            {/* Expected Format */}
                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 0.75rem' }}>Expected File Format</h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg)' }}>
                                                {['Name', 'GitHub', 'ID', 'Email'].map(h => (
                                                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', border: '1px solid var(--border)', color: 'var(--accent)' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                ['John Doe', 'johndoe', '21CS001', 'john@college.edu'],
                                                ['Jane Smith', 'janesmith', '21CS002', 'jane@college.edu'],
                                                ['Alex Kumar', 'https://github.com/alexkumar', '21CS003', 'alex@college.edu'],
                                            ].map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    {row.map((cell, j) => (
                                                        <td key={j} style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.83rem' }}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    GitHub column accepts plain usernames or full GitHub profile URLs. Student ID is used as the default password.
                                </p>
                            </div>
                        </div>
                    )
                }

                {/* Create Classroom Modal */}
                {
                    showClassroomModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
                            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '580px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Create Classroom in {dept.name}</h2>
                                    <button onClick={() => setShowClassroomModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                    {[
                                        { label: 'Classroom Name *', key: 'name', placeholder: 'e.g. CSE-A Morning Batch', full: true },
                                        { label: 'Description', key: 'description', placeholder: 'Optional description', full: true },
                                        { label: 'Subject Code', key: 'subject_code', placeholder: 'CS401' },
                                        { label: 'Batch', key: 'batch', placeholder: '2021-2025' },
                                        { label: 'Semester', key: 'semester', placeholder: '1' },
                                        { label: 'Year', key: 'year', placeholder: '2025' },
                                        { label: 'Faculty Name', key: 'faculty_name', placeholder: 'Prof. Kumar' },
                                        { label: 'Faculty Email', key: 'faculty_email', placeholder: 'faculty@college.edu' },
                                    ].map(field => (
                                        <div key={field.key} style={{ gridColumn: field.full ? '1 / -1' : undefined }}>
                                            <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>{field.label}</label>
                                            <input value={classroomForm[field.key]} onChange={e => setClassroomForm(p => ({ ...p, [field.key]: e.target.value }))}
                                                placeholder={field.placeholder}
                                                style={{ width: '100%', padding: '0.7rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    <button onClick={() => setShowClassroomModal(false)} className="btn-secondary" style={{ padding: '0.6rem 1.2rem' }}>Cancel</button>
                                    <button onClick={handleCreateClassroom} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>Create Classroom</button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Add Student Modal */}
                {showAddStudentModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(10px)' }}>
                        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '500px', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Plus size={20} style={{ color: 'var(--accent)' }} /> Add Student Manually
                                </h2>
                                <button onClick={() => { setShowAddStudentModal(false); setNewStudentForm({ name: '', github_username: '', student_id: '', email: '', department: '', classroom_id: '' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                    <X size={22} />
                                </button>
                            </div>
                            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { label: 'Full Name *', key: 'name', placeholder: 'e.g. John Doe', required: true, type: 'text' },
                                    { label: 'GitHub Username *', key: 'github_username', placeholder: 'e.g. johndoe or github.com/johndoe', required: true, type: 'text' },
                                    { label: 'Student ID / Roll No', key: 'student_id', placeholder: 'e.g. 21CS101 (also used as default password)', required: false, type: 'text' },
                                    { label: 'Email Address', key: 'email', placeholder: 'e.g. john@college.edu', required: false, type: 'email' },
                                    { label: 'Department', key: 'department', placeholder: dept?.name || 'e.g. CSE, AIML', required: false, type: 'text' },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.87rem' }}>{field.label}</label>
                                        <input
                                            type={field.type}
                                            required={field.required}
                                            placeholder={field.placeholder}
                                            value={newStudentForm[field.key]}
                                            onChange={e => setNewStudentForm(p => ({ ...p, [field.key]: e.target.value }))}
                                            style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
                                        />
                                    </div>
                                ))}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.87rem' }}>Classroom (Optional)</label>
                                    <select
                                        value={newStudentForm.classroom_id}
                                        onChange={e => setNewStudentForm(p => ({ ...p, classroom_id: e.target.value }))}
                                        style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
                                    >
                                        <option value="">None</option>
                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => setShowAddStudentModal(false)} className="btn-secondary" style={{ padding: '0.6rem 1.2rem' }}>Cancel</button>
                                    <button type="submit" disabled={addingStudent} className="btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {addingStudent ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                                        {addingStudent ? 'Adding...' : 'Add Student'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ` }} />
            </div >
        </div >
    );
};

export default DepartmentDetail;
