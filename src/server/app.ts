import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { ensureDatabaseInitialized } from './db/setup';
import { uploadDir } from './utils/upload';

import authRouter from './routes/auth';
import packagesRouter from './routes/packages';
import galleryRouter from './routes/gallery';
import teamRouter from './routes/team';
import messagesRouter from './routes/messages';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static uploaded media if stored locally
app.use('/uploads', express.static(uploadDir));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Ensure database and initial schemas/data are loaded
app.use(async (req, res, next) => {
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (err) {
    console.error('Database connection error in request:', err);
    res.status(500).json({ message: 'Database initialization failure' });
  }
});

// Health check endpoint
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    mode: process.env.DB_HOST ? 'mysql' : 'demo',
    timestamp: new Date().toISOString()
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// API Routes mounted on both /api/* and root paths for seamless Vercel / serverless routing
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);

app.use('/api/packages', packagesRouter);
app.use('/packages', packagesRouter);

app.use('/api/gallery', galleryRouter);
app.use('/gallery', galleryRouter);

app.use('/api/team', teamRouter);
app.use('/team', teamRouter);

app.use('/api/messages', messagesRouter);
app.use('/messages', messagesRouter);

export default app;
