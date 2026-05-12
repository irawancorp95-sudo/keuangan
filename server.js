const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'psak35',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function execute(query, params = []) {
  const [rows] = await pool.execute(query, params);
  return rows;
}

async function ensureDatabaseReady() {
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'User',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS identity (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      logo TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS coa (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      category VARCHAR(100),
      normal_balance VARCHAR(10),
      restriction VARCHAR(50),
      report VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS journals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      journal_number VARCHAR(50) NOT NULL UNIQUE,
      date DATE NOT NULL,
      customer VARCHAR(255),
      description TEXT,
      is_opening_balance TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      journal_id INT NOT NULL,
      account_id VARCHAR(10) NOT NULL,
      debit DECIMAL(20,2) DEFAULT 0,
      credit DECIMAL(20,2) DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES coa(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const identityCount = await execute('SELECT COUNT(*) AS total FROM identity');
  if (identityCount[0].total === 0) {
    await execute('INSERT INTO identity (id, name, address, logo) VALUES (1, ?, ?, ?)', [
      'Entitas Nonlaba Demo',
      '',
      ''
    ]);
  }

  const userCount = await execute('SELECT COUNT(*) AS total FROM users');
  if (userCount[0].total === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [
      'admin',
      passwordHash,
      'Administrator'
    ]);
  }

  const coaCount = await execute('SELECT COUNT(*) AS total FROM coa');
  if (coaCount[0].total === 0) {
    const defaultCOA = [
      ['111', 'Kas dan Setara Kas', 'asset', 'Lancar', 'debit', null, 'posisi-keuangan'],
      ['112', 'Piutang Usaha', 'asset', 'Lancar', 'debit', null, 'posisi-keuangan'],
      ['113', 'Perlengkapan', 'asset', 'Lancar', 'debit', null, 'posisi-keuangan'],
      ['121', 'Tanah', 'asset', 'Tidak Lancar', 'debit', null, 'posisi-keuangan'],
      ['122', 'Bangunan', 'asset', 'Tidak Lancar', 'debit', null, 'posisi-keuangan'],
      ['123', 'Akumulasi Penyusutan Bangunan', 'asset-contra', 'Tidak Lancar', 'credit', null, 'posisi-keuangan'],
      ['211', 'Utang Usaha', 'liability', 'Jangka Pendek', 'credit', null, 'posisi-keuangan'],
      ['212', 'Pendapatan Diterima Dimuka', 'liability', 'Jangka Pendek', 'credit', null, 'posisi-keuangan'],
      ['221', 'Utang Bank', 'liability', 'Jangka Panjang', 'credit', null, 'posisi-keuangan'],
      ['311', 'Aset Neto Tanpa Pembatasan', 'net-asset', null, 'credit', 'unrestricted', 'posisi-keuangan'],
      ['321', 'Aset Neto Dengan Pembatasan', 'net-asset', null, 'credit', 'restricted', 'posisi-keuangan'],
      ['411', 'Sumbangan Tanpa Pembatasan', 'revenue', null, 'credit', 'unrestricted', 'penghasilan-komprehensif'],
      ['412', 'Pendapatan Jasa', 'revenue', null, 'credit', 'unrestricted', 'penghasilan-komprehensif'],
      ['421', 'Sumbangan Dengan Pembatasan', 'revenue', null, 'credit', 'restricted', 'penghasilan-komprehensif'],
      ['511', 'Beban Program (Terkait Pembatasan)', 'expense', null, 'debit', 'restricted', 'penghasilan-komprehensif'],
      ['521', 'Beban Gaji', 'expense', null, 'debit', 'unrestricted', 'penghasilan-komprehensif'],
      ['522', 'Beban Sewa', 'expense', null, 'debit', 'unrestricted', 'penghasilan-komprehensif'],
      ['523', 'Beban Penyusutan', 'expense', null, 'debit', 'unrestricted', 'penghasilan-komprehensif'],
      ['524', 'Beban Operasional Lainnya', 'expense', null, 'debit', 'unrestricted', 'penghasilan-komprehensif']
    ];
    await Promise.all(defaultCOA.map(entry => execute(
      'INSERT INTO coa (id, name, type, category, normal_balance, restriction, report) VALUES (?, ?, ?, ?, ?, ?, ?)',
      entry
    )));
  }
}

function authenticateMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = await execute('SELECT * FROM users WHERE username = ?', [username]);
  const user = users[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '8h'
  });

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/api/me', authenticateMiddleware, async (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

app.get('/api/identity', async (req, res) => {
  const results = await execute('SELECT id, name, address, logo FROM identity WHERE id = 1');
  res.json(results[0] || { id: 1, name: '', address: '', logo: '' });
});

app.put('/api/identity', authenticateMiddleware, async (req, res) => {
  const { name, address, logo } = req.body;
  await execute('UPDATE identity SET name = ?, address = ?, logo = ? WHERE id = 1', [name, address, logo]);
  res.json({ success: true });
});

app.get('/api/users', authenticateMiddleware, async (req, res) => {
  const users = await execute('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

app.post('/api/users', authenticateMiddleware, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, and role are required' });
  }

  const existing = await execute('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length) {
    return res.status(422).json({ error: 'Username already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, passwordHash, role]);
  const [createdUser] = await execute('SELECT id, username, role, created_at FROM users WHERE id = ?', [result.insertId]);
  res.json(createdUser);
});

app.put('/api/users/:id/password', authenticateMiddleware, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password harus minimal 6 karakter' });
  }

  const hash = await bcrypt.hash(password, 10);
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  res.json({ success: true });
});

app.delete('/api/users/:id', authenticateMiddleware, async (req, res) => {
  const { id } = req.params;
  if (req.user.id === Number(id)) {
    return res.status(403).json({ error: 'Tidak dapat menghapus akun sendiri' });
  }
  await execute('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/coa', authenticateMiddleware, async (req, res) => {
  const coa = await execute('SELECT * FROM coa ORDER BY id');
  res.json(coa);
});

app.post('/api/coa', authenticateMiddleware, async (req, res) => {
  const { id, name, type, category, normal_balance, restriction, report } = req.body;
  if (!id || !name || !type || !normal_balance) {
    return res.status(400).json({ error: 'id, name, type, and normal_balance are required' });
  }
  await execute('INSERT INTO coa (id, name, type, category, normal_balance, restriction, report) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, type, category || null, normal_balance, restriction || null, report || null]);
  const created = await execute('SELECT * FROM coa WHERE id = ?', [id]);
  res.status(201).json(created[0]);
});

app.delete('/api/coa/:id', authenticateMiddleware, async (req, res) => {
  const { id } = req.params;
  const journalsUsing = await execute('SELECT COUNT(*) AS total FROM journal_entries WHERE account_id = ?', [id]);
  if (journalsUsing[0].total > 0) {
    return res.status(422).json({ error: 'Akun tidak dapat dihapus karena sudah digunakan dalam jurnal' });
  }
  await execute('DELETE FROM coa WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/journals', authenticateMiddleware, async (req, res) => {
  const journals = await execute('SELECT * FROM journals ORDER BY date DESC, id DESC');
  const journalIds = journals.map(j => j.id);
  const entries = journalIds.length
    ? await execute(`SELECT je.*, c.name AS account_name FROM journal_entries je LEFT JOIN coa c ON je.account_id = c.id WHERE je.journal_id IN (${journalIds.map(() => '?').join(',')})`, journalIds)
    : [];

  const grouped = journals.map(journal => ({
    ...journal,
    entries: entries.filter(entry => entry.journal_id === journal.id)
  }));

  res.json(grouped);
});

app.post('/api/journals', authenticateMiddleware, async (req, res) => {
  const { journal_number, date, customer, description, is_opening_balance, entries } = req.body;
  if (!journal_number || !date || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'journal_number, date, and entries are required' });
  }

  if (is_opening_balance) {
    await execute(`DELETE je FROM journal_entries je JOIN journals j ON je.journal_id = j.id WHERE j.is_opening_balance = 1`);
    await execute('DELETE FROM journals WHERE is_opening_balance = 1');
  }

  const result = await execute(
    'INSERT INTO journals (journal_number, date, customer, description, is_opening_balance) VALUES (?, ?, ?, ?, ?)',
    [journal_number, date, customer || '', description || '', is_opening_balance ? 1 : 0]
  );

  const journalId = result.insertId;
  await Promise.all(entries.map(entry => {
    const accountId = entry.account_id || entry.accountId;
    return execute(
      'INSERT INTO journal_entries (journal_id, account_id, debit, credit, notes) VALUES (?, ?, ?, ?, ?)',
      [journalId, accountId, entry.debit || 0, entry.credit || 0, entry.notes || '']
    );
  }));

  res.status(201).json({ id: journalId });
});

app.get('/api/reports/bukubesar', authenticateMiddleware, async (req, res) => {
  const { start_date, end_date } = req.query;
  const rangeFilter = [];
  const params = [];

  if (start_date) {
    rangeFilter.push('j.date >= ?');
    params.push(start_date);
  }
  if (end_date) {
    rangeFilter.push('j.date <= ?');
    params.push(end_date);
  }

  const whereClause = rangeFilter.length ? `WHERE ${rangeFilter.join(' AND ')}` : '';
  const reportRows = await execute(`
    SELECT
      je.account_id,
      c.name AS account_name,
      SUM(je.debit) AS total_debit,
      SUM(je.credit) AS total_credit
    FROM journal_entries je
    JOIN journals j ON je.journal_id = j.id
    LEFT JOIN coa c ON je.account_id = c.id
    ${whereClause}
    GROUP BY je.account_id, c.name
    ORDER BY je.account_id
  `, params);

  res.json(reportRows);
});

app.get('/api/ping', (req, res) => {
  res.json({ success: true, message: 'Backend is running' });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

ensureDatabaseReady()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PSAK35 backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
