import Pocketbase from 'pocketbase';

// Was the relative path "/hcgi/platform" under Hostinger Horizons, which
// proxied that path to PocketBase on the same origin. Self-hosted on a real
// subdomain, PocketBase has its own origin, so this needs the full URL —
// set per environment via Vite's VITE_ build-time env vars.
const POCKETBASE_API_URL = import.meta.env.VITE_POCKETBASE_URL;

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
