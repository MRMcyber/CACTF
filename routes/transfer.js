const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

// Helper to get single row as object
function getRow(db, query, params) {
  const stmt = db.prepare(query);
  if (params) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
  }
  stmt.free();
  return row;
}

// GET /transfer - Fund transfer form
router.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const db = getDb();
  const user = getRow(db, 'SELECT balance FROM users WHERE id = ?', [req.session.user.id]);
  db.close();

  res.render('transfer', {
    title: 'Fund Transfer',
    user: req.session.user,
    message: null,
    error: null,
    balance: user ? user.balance : 0,
    flag: null
  });
});

// POST /transfer - Process payment
router.post('/', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { recipient, amount } = req.body;
  const transferAmount = parseFloat(amount);

  if (!recipient || isNaN(transferAmount) || transferAmount <= 0) {
    const db = getDb();
    const user = getRow(db, 'SELECT balance FROM users WHERE id = ?', [req.session.user.id]);
    db.close();
    return res.render('transfer', {
      title: 'Fund Transfer',
      user: req.session.user,
      message: null,
      error: 'Invalid transfer details',
      balance: user ? user.balance : 0,
      flag: null
    });
  }

  const db = getDb();

  const sender = getRow(db, 'SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  const recv = getRow(db, 'SELECT * FROM users WHERE username = ?', [recipient]);

  if (!recv) {
    db.close();
    return res.render('transfer', {
      title: 'Fund Transfer',
      user: req.session.user,
      message: null,
      error: 'Recipient not found',
      balance: sender.balance,
      flag: null
    });
  }

  if (sender.balance < transferAmount) {
    db.close();
    return res.render('transfer', {
      title: 'Fund Transfer',
      user: req.session.user,
      message: null,
      error: 'Insufficient balance',
      balance: sender.balance,
      flag: null
    });
  }

  // Perform transfer
  let stmt = db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?');
  stmt.run([transferAmount, sender.id]);
  stmt.free();

  stmt = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
  stmt.run([transferAmount, recv.id]);
  stmt.free();

  const updatedSender = getRow(db, 'SELECT balance FROM users WHERE id = ?', [sender.id]);
  const updatedRecv = getRow(db, 'SELECT balance FROM users WHERE id = ?', [recv.id]);

  saveDb(db);
  db.close();

  // Flag condition: if recipient's balance exceeds 5000 after transfer
  let flag = null;
  if (updatedRecv.balance > 5000) {
    flag = 'flag{294851}';
  }

  res.render('transfer', {
    title: 'Fund Transfer',
    user: req.session.user,
    message: `Successfully transferred $${transferAmount.toFixed(2)} to ${recipient}`,
    error: null,
    balance: updatedSender.balance,
    flag: flag
  });
});

module.exports = router;
