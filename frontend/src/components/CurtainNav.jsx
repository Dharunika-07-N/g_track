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
    Radar,
    History
} from 'lucide-react';

const CurtainNav = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const menuItems = [
        { icon: <LayoutDashboard />, label: 'Dashboard', path: '/' },
        { icon: <BookOpen />, label: 'Classrooms', path: '/classrooms' },
        { icon: <Users />, label: 'Students', path: '/students' },
        { icon: <Award />, label: 'Assignments', path: '/assignments' },
        { icon: <History />, label: 'History', path: '/analytics' },
    ];

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <>
            <div className="navbar-trigger" onClick={toggleMenu} title="Toggle Navigation">
                {isOpen ? <X size={24} /> : <Radar size={24} />}
            </div>

            <div className={`curtain-menu ${isOpen ? 'open' : ''}`}>
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
