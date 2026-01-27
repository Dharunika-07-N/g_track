const getApiBase = () => {
    const { hostname, origin } = window.location;

    // 1. Explicit environment variable
    if (import.meta.env.VITE_API_URL) {
        const envBase = import.meta.env.VITE_API_URL;
        return envBase.endsWith('/api') ? envBase : `${envBase.replace(/\/$/, '')}/api`;
    }

    // 2. Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8000/api';
    }

    // 3. Production (Render, etc.)
    // We use origin + '/api' to be absolutely explicit about the domain and protocol
    return `${origin.replace(/\/$/, '')}/api`;
};

export const API_BASE = getApiBase();
