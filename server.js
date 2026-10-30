const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const auditRoutes = require('./src/routes/auditRoutes');

const app = express();

// Enable CORS for frontend dashboard (http://localhost:3000) and Chrome extensions (chrome-extension://)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, extension background scripts)
      if (!origin) return callback(null, true);
      if (
        origin.startsWith('chrome-extension://') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin === (process.env.FRONTEND_URL || 'http://localhost:3000')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
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
