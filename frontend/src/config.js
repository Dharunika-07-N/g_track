const getApiBase = () => {
    const { hostname, origin } = window.location;

    // Check if we have an environment variable override
    if (import.meta.env.VITE_API_URL) {
        const envBase = import.meta.env.VITE_API_URL;
        return envBase.endsWith('/api') ? envBase : `${envBase.replace(/\/$/, '')}/api`;
    }

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';
    }

    // Production/Deployed (Render, etc.)
    // Use relative path '/api' to be safe with any domain/proxy setup
    return '/api';
};

export const API_BASE = getApiBase();
