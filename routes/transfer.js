const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /transfer - Fund transfer form
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const rows = await query('SELECT balance FROM users WHERE id = $1', [req.session.user.id]);
  const user = rows.length > 0 ? rows[0] : null;

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
router.post('/', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { recipient, amount } = req.body;
  const transferAmount = parseFloat(amount);

  if (!recipient || isNaN(transferAmount) || transferAmount <= 0) {
    const rows = await query('SELECT balance FROM users WHERE id = $1', [req.session.user.id]);
    const user = rows.length > 0 ? rows[0] : null;
    return res.render('transfer', {
      title: 'Fund Transfer',
      user: req.session.user,
      message: null,
      error: 'Invalid transfer details',
      balance: user ? user.balance : 0,
      flag: null
    });
  }

  const senderRows = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
  const sender = senderRows.length > 0 ? senderRows[0] : null;

  const recvRows = await query('SELECT * FROM users WHERE username = $1', [recipient]);
  const recv = recvRows.length > 0 ? recvRows[0] : null;

  if (!recv) {
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
  await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [transferAmount, sender.id]);
  await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [transferAmount, recv.id]);

  const updatedSenderRows = await query('SELECT balance FROM users WHERE id = $1', [sender.id]);
  const updatedRecvRows = await query('SELECT balance FROM users WHERE id = $1', [recv.id]);

  const updatedSender = updatedSenderRows[0];
  const updatedRecv = updatedRecvRows[0];

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
