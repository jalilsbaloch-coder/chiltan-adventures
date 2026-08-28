import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initializeDatabase } from './src/server/db/setup';

import authRouter from './src/server/routes/auth';
import packagesRouter from './src/server/routes/packages';
import galleryRouter from './src/server/routes/gallery';
import teamRouter from './src/server/routes/team';
import messagesRouter from './src/server/routes/messages';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database
  await initializeDatabase();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/packages', packagesRouter);
  app.use('/api/gallery', galleryRouter);
  app.use('/api/team', teamRouter);
  app.use('/api/messages', messagesRouter);

  // Vite Integration for Full-Stack Environment
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
