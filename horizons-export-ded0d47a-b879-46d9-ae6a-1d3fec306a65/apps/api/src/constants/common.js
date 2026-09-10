const NodeEnv = {
	Development: 'development',
	Production: 'production',
};

// Every JSON body this API accepts is a handful of short fields (plan, market,
// subscription id). 20MB was the scaffold default and just widens the
// request-flooding surface; the Stripe webhook route has its own raw parser
// with body-parser's 100kb default.
const BodyLimit = 100 * 1024;

export { NodeEnv, BodyLimit };