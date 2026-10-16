import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    BarChart3,
    Award,
    Menu,
    X,
    History,
    LogOut,
    Building2
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const CurtainNav = ({ onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        { icon: <LayoutDashboard />, label: 'Dashboard', path: '/' },
        { icon: <Building2 />, label: 'Departments', path: '/departments' },
        { icon: <BookOpen />, label: 'Classrooms', path: '/classrooms' },
        { icon: <Users />, label: 'Students', path: '/students' },
        { icon: <Award />, label: 'Assignments', path: '/assignments' },
        { icon: <History />, label: 'History', path: '/analytics' },
    ];

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <>
            <div className="navbar-trigger" onClick={toggleMenu} title="Toggle Navigation">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </div>

            <div className={`curtain-menu ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                    <img src={logoImg} alt="GitTrack" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'contain' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', background: 'linear-gradient(135deg, #06b6d4, #0284c7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GitTrack</span>
                </div>
                <div className="curtain-nav">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `curtain-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsOpen(false)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
                {onLogout && (
                    <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="curtain-nav-item"
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            style={{
                                cursor: 'pointer',
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                display: 'inline-flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.65rem 1.75rem',
                                color: '#ef4444',
                                borderRadius: '12px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                e.currentTarget.style.borderColor = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                            }}
                        >
                            <LogOut size={18} />
                            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Sign Out</span>
                        </button>
                    </div>
                )}
            </div>

            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 999,
                        background: 'transparent'
                    }}
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};

export default CurtainNav;
