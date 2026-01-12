import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    BarChart3,
    Settings,
    Github,
    Award
} from 'lucide-react';

const Sidebar = () => {
    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <BookOpen size={20} />, label: 'Classrooms', path: '/classrooms' },
        { icon: <Users size={20} />, label: 'Students', path: '/students' },
        { icon: <Award size={20} />, label: 'Assignments', path: '/assignments' },
        { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/analytics' },
    ];

    return (
        <aside className="sidebar">
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800 }}>
                <Github size={32} color="var(--primary)" />
                <span style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                    Classroom<span style={{ color: 'var(--primary)' }}>Tracker</span>
                </span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <NavLink to="/settings" className="nav-link">
                    <Settings size={20} />
                    Settings
                </NavLink>
            </div>
        </aside>
    );
};

export default Sidebar;
