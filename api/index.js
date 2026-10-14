const app = require('../server');
const { ensureRuntimeSchema } = require('../db/schema');

// Vercel rewrites all requests to /api, but we need Express
// to see the original URL so its router matches correctly.
module.exports = async (req, res) => {
  // Vercel sets x-vercel-proxy-path or we can use the original url
  // The rewrite preserves req.url as the original path
  try {
    await ensureRuntimeSchema();
    return app(req, res);
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Service temporarily unavailable. Please try again.' }));
  }
};
