const app = require('../server');

module.exports = async (req, res) => {
  return app(req, res);
};