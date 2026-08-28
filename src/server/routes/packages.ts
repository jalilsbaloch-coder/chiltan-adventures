import { Router } from 'express';
import db from '../db/setup';
import { requireAuth } from './auth';
import { createImageUploader, resolveImageUri, safeDeleteUploadedFile, rollbackUploadedFile } from '../utils/upload';

const packagesRouter = Router();
const upload = createImageUploader('package');

// Get all packages (Public)
packagesRouter.get('/', async (req, res) => {
  try {
    const packages = await db.execute('SELECT * FROM packages ORDER BY created_at DESC').then(r => r.rows);
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching packages' });
  }
});

// Get a single package by slug (Public)
packagesRouter.get('/:slug', async (req, res) => {
  try {
    const pkg = await db.execute({ sql: 'SELECT * FROM packages WHERE slug = ?', args: [req.params.slug] }).then(r => r.rows[0]);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching package' });
  }
});

// Create a package (Protected)
packagesRouter.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, slug, destination, description, duration, price, status, image: rawImageUrl } = req.body;
    const image = await resolveImageUri(req.file, rawImageUrl);

    const result = await db.execute({ 
      sql: 'INSERT INTO packages (title, slug, destination, description, duration, price, image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', 
      args: [title, slug, destination, description, duration, parseFloat(price) || 0, image, status || 'active'] 
    });
    
    const newId = result.lastInsertRowid;
    const createdItem = await db.execute({ sql: 'SELECT * FROM packages WHERE id = ?', args: [newId] }).then(r => r.rows[0]);

    res.status(201).json({ 
      id: newId?.toString(), 
      message: 'Package created successfully',
      ...createdItem
    });
  } catch (error: any) {
    rollbackUploadedFile(req.file);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Slug must be unique' });
    }
    console.error(error);
    res.status(500).json({ message: 'Error creating package' });
  }
});

// Update a package (Protected)
packagesRouter.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, slug, destination, description, duration, price, status, image: rawImageUrl } = req.body;
    const id = req.params.id;
    
    const existing = await db.execute({ sql: 'SELECT * FROM packages WHERE id = ?', args: [id] }).then(r => r.rows[0]) as any;
    if (!existing) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: 'Package not found' });
    }

    const oldImage = existing.image;
    const image = await resolveImageUri(req.file, rawImageUrl || oldImage);

    try {
      await db.execute({ 
        sql: 'UPDATE packages SET title = ?, slug = ?, destination = ?, description = ?, duration = ?, price = ?, image = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
        args: [title, slug, destination, description, duration, parseFloat(price) || 0, image, status, id] 
      });
    } catch (dbErr: any) {
      rollbackUploadedFile(req.file);
      console.error('Database update failed in PUT /api/packages/:id:', dbErr);
      if (dbErr.message && dbErr.message.includes('UNIQUE')) {
        return res.status(400).json({ message: 'Slug must be unique' });
      }
      return res.status(500).json({ message: 'Image replacement failed. The existing package was preserved.' });
    }

    // Safely remove old image if replacement was successful and old image was local
    if (req.file && oldImage && oldImage !== image) {
      safeDeleteUploadedFile(oldImage);
    }

    const updatedItem = await db.execute({ sql: 'SELECT * FROM packages WHERE id = ?', args: [id] }).then(r => r.rows[0]);
    
    res.json({ 
      message: 'Package updated successfully',
      ...updatedItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error('Error updating package:', error);
    res.status(500).json({ message: 'Error updating package' });
  }
});

// Delete a package (Protected)
packagesRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await db.execute({ sql: 'SELECT image FROM packages WHERE id = ?', args: [req.params.id] }).then(r => r.rows[0]) as any;
    if (existing) {
      await db.execute({ sql: 'DELETE FROM packages WHERE id = ?', args: [req.params.id] });
      safeDeleteUploadedFile(existing.image);
    }
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting package' });
  }
});

export default packagesRouter;

