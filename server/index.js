/* ─────────────────────────────────────────────
   Devriz HRMS — Express Server Entry Point
   ───────────────────────────────────────────── */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize DB connection
require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// ─── Routes ───
app.use('/api/auth', require('./routes/auth'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/system', require('./routes/system'));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Devriz HRMS API is running' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Devriz HRMS',
    api: '/health'
  });
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
