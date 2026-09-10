import pb from './pocketbaseClient.js';

// Was the relative path "/hcgi/api" under Hostinger Horizons. Self-hosted on
// a real subdomain, the Express API has its own origin.
const API_SERVER_URL = import.meta.env.VITE_API_URL;

const apiServerClient = {
    fetch: async (url, options = {}) => {
        const headers = { ...(options.headers || {}) };

        if (pb.authStore.isValid && pb.authStore.token) {
            headers['Authorization'] = `Bearer ${pb.authStore.token}`;
        }

        return await window.fetch(API_SERVER_URL + url, { ...options, headers });
    }
};

export default apiServerClient;

export { apiServerClient };
