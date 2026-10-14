const express = require('express');

// Express 4 does not forward rejected async handlers to error middleware.
module.exports = function createRouter() {
  const router = express.Router();
  for (const method of ['get', 'post']) {
    const register = router[method].bind(router);
    router[method] = (path, ...handlers) => register(path, ...handlers.map(handler =>
      function handle(req, res, next) {
        try { Promise.resolve(handler(req, res, next)).catch(next); }
        catch (error) { next(error); }
      }
    ));
  }
  return router;
};
