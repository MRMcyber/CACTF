const router = require('../lib/router')();
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
  const transferAmount = Number(amount);

  if (!recipient || !Number.isFinite(transferAmount) || transferAmount === 0) {
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

  // Easy 3: Negative Transfer Logic Flaw
  let isNegativeExploit = false;
  if (transferAmount < 0) {
    isNegativeExploit = true;
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

  if (recv.id === sender.id) {
    return res.status(400).render('transfer', {
      title: 'Fund Transfer', user: req.session.user, message: null,
      error: 'Choose a different recipient.', balance: sender.balance, flag: null
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

  // Lock both accounts in a consistent order and apply both changes atomically.
  // Negative amounts remain intentionally accepted for the CTF challenge.
  const updated = await query(`
    WITH participants AS MATERIALIZED (
      SELECT id, balance FROM users WHERE id IN ($2, $3) ORDER BY id FOR UPDATE
    ), eligible AS (
      SELECT COUNT(*) AS count FROM participants
      HAVING COUNT(*) = 2 AND MAX(CASE WHEN id = $2 THEN balance END) >= $1
    )
    UPDATE users SET balance = users.balance + CASE WHEN users.id = $2 THEN -$1 ELSE $1 END
    FROM participants WHERE users.id = participants.id AND EXISTS (SELECT 1 FROM eligible)
    RETURNING users.id, users.balance
  `, [transferAmount, sender.id, recv.id]);
  const updatedSender = updated.find(user => user.id === sender.id);
  if (!updatedSender) {
    return res.status(400).render('transfer', {
      title: 'Fund Transfer', user: req.session.user, message: null,
      error: 'Insufficient balance or recipient unavailable.', balance: sender.balance, flag: null
    });
  }

  // The challenge is triggered by the amount sent, regardless of prior balances.
  let flag = null;
  if (transferAmount > 5000) {
    flag = 'flag{294851}';
  }
  
  if (isNegativeExploit) {
    flag = 'flag{837465}';
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
