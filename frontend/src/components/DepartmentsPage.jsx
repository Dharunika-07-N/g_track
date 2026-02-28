import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';
import {
  Building2, Plus, Pencil, Trash2, Users, BookOpen,
  ChevronRight, Search, X, CheckCircle, AlertCircle,
  GraduationCap, Mail, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react';

const DepartmentsPage = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', description: '', hod_name: '', hod_email: '', is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/departments/?include_inactive=true`);
      setDepartments(res.data);
    } catch (e) {
      setError('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const openCreate = () => {
    setEditDept(null);
    setFormData({ name: '', code: '', description: '', hod_name: '', hod_email: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setFormData({
      name: dept.name, code: dept.code, description: dept.description || '',
      hod_name: dept.hod_name || '', hod_email: dept.hod_email || '', is_active: dept.is_active
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('Name and Code are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editDept) {
        await axios.put(`${API_BASE}/departments/${editDept.id}`, formData);
        showToast('Department updated!');
      } else {
        await axios.post(`${API_BASE}/departments/`, formData);
        showToast('Department created!');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? Students/classrooms will be unlinked.`)) return;
    try {
      await axios.delete(`${API_BASE}/departments/${dept.id}`);
      showToast('Department deleted');
      fetchDepartments();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    (d.hod_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Building2 size={28} style={{ color: 'var(--accent)' }} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Departments</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Create and manage academic departments. Each department can have its own classrooms and student imports.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}>
          <Plus size={18} /> New Department
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '380px' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search departments..."
          style={{
            width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text)', outline: 'none',
            fontSize: '0.9rem', boxSizing: 'border-box'
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
          Loading departments...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          <Building2 size={56} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {search ? 'No departments match your search' : 'No departments yet'}
          </p>
          {!search && <p style={{ fontSize: '0.9rem' }}>Create your first department to get started</p>}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.25rem'
        }}>
          {filtered.map(dept => (
            <div
              key={dept.id}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '1.5rem',
                transition: 'box-shadow 0.2s, transform 0.2s',
                cursor: 'pointer',
                opacity: dept.is_active ? 1 : 0.6,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.18)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
              onClick={() => navigate(`/departments/${dept.id}`)}
            >
              {/* Accent stripe */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                background: 'linear-gradient(90deg, var(--accent), #6366f1)'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <span style={{
                      background: 'var(--accent)', color: '#fff',
                      borderRadius: '6px', padding: '0.2rem 0.6rem',
                      fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em'
                    }}>{dept.code}</span>
                    {!dept.is_active && (
                      <span style={{
                        background: '#78716c33', color: '#78716c',
                        borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem'
                      }}>Inactive</span>
                    )}
                  </div>
                  <h3 style={{ margin: '0.3rem 0 0.2rem', fontSize: '1.1rem', fontWeight: 700 }}>{dept.name}</h3>
                  {dept.description && (
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                      {dept.description.length > 70 ? dept.description.slice(0, 70) + '…' : dept.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(dept)}
                    title="Edit"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept)}
                    title="Delete"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {dept.hod_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <GraduationCap size={14} />
                  <span>{dept.hod_name}</span>
                  {dept.hod_email && (
                    <><span>·</span><Mail size={12} /><span style={{ fontSize: '0.8rem' }}>{dept.hod_email}</span></>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  <Users size={14} /> <strong style={{ color: 'var(--text)' }}>{dept.student_count}</strong> students
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  <BookOpen size={14} /> <strong style={{ color: 'var(--text)' }}>{dept.classroom_count}</strong> classrooms
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600 }}>
                  View <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '2.5rem',
            width: '100%', maxWidth: '540px', border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative',
            color: 'var(--text)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
                {editDept ? 'Edit Department' : 'Create Department'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>Department Name *</label>
                <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Computer Science"
                  style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>Department Code *</label>
                <input value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. CSE"
                  style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>HOD Name</label>
                <input value={formData.hod_name} onChange={e => setFormData(p => ({ ...p, hod_name: e.target.value }))}
                  placeholder="Head of Department"
                  style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>HOD Email</label>
                <input value={formData.hod_email} onChange={e => setFormData(p => ({ ...p, hod_email: e.target.value }))}
                  placeholder="hod@college.edu"
                  style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.88rem' }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description..."
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '8px', color: '#0f172a', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.88rem' }}>Active</label>
                <button onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: formData.is_active ? '#22c55e' : '#78716c', padding: 0, display: 'flex' }}>
                  {formData.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formData.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {editDept ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DepartmentsPage;
