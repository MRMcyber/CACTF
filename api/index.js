const app = require('../server');
const { initSQL } = require('../db/database');

const ready = initSQL();

module.exports = async (req, res) => {
  await ready;
  return app(req, res);
};