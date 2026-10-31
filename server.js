const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const { authMiddleware } = require('./src/middleware/authMiddleware');

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
app.use(authMiddleware);

// Routes
app.use('/auth', authRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('GhostGuard Auditor API is running.');
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[GhostGuard Server] Active and listening on http://localhost:${PORT} (bound to ${HOST})`);
});

// Handle port collision or binding failures cleanly
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[GhostGuard Server] Error: Port ${PORT} is already occupied by another process.`);
  } else {
    console.error('[GhostGuard Server] Startup error:', err);
  }
  process.exit(1);
});

// Global process-level error traps to prevent Node crashes
process.on('uncaughtException', (err) => {
  console.error('[GhostGuard Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[GhostGuard Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

app.server = server;
module.exports = app;
