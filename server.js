const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const auditRoutes = require('./src/routes/auditRoutes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('GhostGuard Auditor API is running.');
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`GhostGuard server running at http://localhost:${PORT}`);
});

app.server = server;
module.exports = app;
