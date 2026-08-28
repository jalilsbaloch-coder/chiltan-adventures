import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { ensureDatabaseInitialized, db } from './db/setup';
import { uploadDir } from './utils/upload';
import { imageStorageService } from './services/imageStorage';

import authRouter from './routes/auth';
import packagesRouter from './routes/packages';
import galleryRouter from './routes/gallery';
import teamRouter from './routes/team';
import messagesRouter from './routes/messages';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static uploaded media if stored locally (development/demo)
app.use('/uploads', express.static(uploadDir));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health check endpoint (can be called before DB init for health probing)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    environment: db.isProduction ? 'production' : 'development',
    database: db.isMySql ? 'mysql' : (db.isProduction ? 'unconfigured_mysql' : 'sqlite_demo'),
    storage: imageStorageService.isBlobConfigured() ? 'vercel_blob' : 'local',
    admin_configured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
    timestamp: new Date().toISOString()
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Ensure database connection and initial schemas/admin user are ready
app.use(async (req, res, next) => {
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (err: any) {
    console.error('[Request Error] Database initialization failure:', err.message || err);
    res.status(500).json({ 
      error: 'Database Connection Error',
      message: err.message || 'Database initialization failed. Please check server environment variables.' 
    });
  }
});

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

// Global Error Handler for upload/server errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Unhandled Error]:', err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

export default app;
