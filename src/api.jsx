// Uses VITE_API_BASE_URL in local dev; in production, relative /api/* is proxied via vercel.json for first-party cookies
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const PUBLIC_ENDPOINTS = ['/api/login', '/api/logout', '/api/assistant'];

export async function apiFetch(endpoint, method = 'GET', body = null) {
    // 1. Tell the browser to attach the HttpOnly cookies automatically!
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    };

    if (body) config.body = JSON.stringify(body);

    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(path => endpoint.startsWith(path));

    try {
        let response = await fetch(`${BASE_URL}${endpoint}`, config);

        // 2. THE SILENT RETRY LOGIC (401 or 403 means the 15-min token died)
        if (!isPublicEndpoint && (response.status === 401 || response.status === 403)) {
            console.warn("Access token expired. Attempting silent refresh...");
            const refreshResponse = await fetch(`${BASE_URL}/api/refresh`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!refreshResponse.ok) throw new Error("Session completely expired");

            // Refresh succeeded! Retry the original request
            response = await fetch(`${BASE_URL}${endpoint}`, config);
        }

        // 3. Your specific error handling logic
        if (!response.ok) {
            const errText = await response.text();
            try {
                const errJson = JSON.parse(errText);
                throw new Error(errJson.error || 'Request failed');
            } catch (e) { throw new Error(errText || 'Request failed'); }
        }

        // 4. Your specific response parsing logic
        const text = await response.text();
        if (!text) return {};
        try { return JSON.parse(text); }
        catch (e) { return text; }

    } catch (error) {
        if (error.message === "Session completely expired") {
            window.location.href = '/';
        }
        throw error;
    }
}

// Your exact custom badge rendering
export function getBadge(status) {
    if (status === 'Approved') return <span className="badge badge-success">Approved</span>;
    if (status === 'Denied') return <span className="badge badge-danger">Denied</span>;
    return <span className="badge badge-warning">Pending</span>;
}