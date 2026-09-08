import Pocketbase from 'pocketbase';
import { POCKETBASE_HOST } from '../utils/pocketbaseClient.js';

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    // A fresh, unauthenticated client per request is required here: the shared
    // pocketbaseClient's beforeSend hook force-injects the superuser token on
    // every outgoing request, so it can never be used to validate someone
    // else's user token — it would just always "succeed" as the superuser.
    const client = new Pocketbase(POCKETBASE_HOST);
    client.authStore.save(token, null);

    try {
        const { record } = await client.collection('users').authRefresh();
        req.userId = record.id;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
};

export default authenticate;
export { authenticate };
