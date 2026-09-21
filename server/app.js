require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const folderRoutes = require('./routes/folderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Kicks off the (cached) connection at module load. On Vercel this runs once
// per cold start; warm invocations reuse the same connection - see config/db.js.
connectDB().catch((err) => console.error('Initial MongoDB connection failed:', err.message));

const app = express();

// CLIENT_URL may hold one origin or several, comma-separated.
const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// General rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Stricter limit on auth endpoints to slow down credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/bootstrap', authLimiter);

// Shared files are shown inside the frontend, which lives on a different origin
// in production (two Vercel projects). helmet()'s defaults - X-Frame-Options:
// SAMEORIGIN, CSP frame-ancestors 'self' and Cross-Origin-Resource-Policy:
// same-origin - make the browser refuse to embed them, which is exactly the
// "kstorebackend.vercel.app refused to connect" error. Relax that for the
// public file routes ONLY, and only for our own frontend origin(s); every
// other route keeps helmet's strict defaults.
const allowShareEmbedding = (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', `frame-ancestors ${clientOrigins.join(' ')}`);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};
app.use('/api/public/documents', allowShareEmbedding);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'KStore API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
