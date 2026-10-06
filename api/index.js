const app = require('../server');

// Vercel rewrites all requests to /api, but we need Express
// to see the original URL so its router matches correctly.
module.exports = (req, res) => {
  // Vercel sets x-vercel-proxy-path or we can use the original url
  // The rewrite preserves req.url as the original path
  return app(req, res);
};