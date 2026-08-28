import { Router } from 'express';
import db from '../db/setup';
import { requireAuth } from './auth';
import { createImageUploader, resolveImageUri, safeDeleteUploadedFile, rollbackUploadedFile } from '../utils/upload';

const galleryRouter = Router();
const upload = createImageUploader('gallery');

// GET /api/gallery (with filtering and sorting support)
galleryRouter.get('/', async (req, res) => {
  try {
    const { featured, destination, search, sort } = req.query;
    let sql = 'SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id';
    const conditions: string[] = [];
    const args: any[] = [];

    if (featured === 'true' || featured === '1') {
      conditions.push('g.is_featured = 1');
    }

    if (destination && typeof destination === 'string' && destination !== 'All') {
      conditions.push('g.destination = ?');
      args.push(destination);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      conditions.push('(g.title LIKE ? OR g.description LIKE ? OR g.destination LIKE ? OR p.title LIKE ?)');
      const term = `%${search.trim()}%`;
      args.push(term, term, term, term);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Sorting
    switch (sort) {
      case 'newest':
        sql += ' ORDER BY g.created_at DESC';
        break;
      case 'oldest':
        sql += ' ORDER BY g.created_at ASC';
        break;
      case 'featured':
        sql += ' ORDER BY g.is_featured DESC, g.display_order ASC, g.created_at DESC';
        break;
      case 'price_asc':
        sql += ' ORDER BY CASE WHEN g.price IS NULL THEN 1 ELSE 0 END, g.price ASC';
        break;
      case 'price_desc':
        sql += ' ORDER BY CASE WHEN g.price IS NULL THEN 1 ELSE 0 END, g.price DESC';
        break;
      case 'title':
        sql += ' ORDER BY g.title ASC';
        break;
      case 'display_order':
      default:
        sql += ' ORDER BY g.display_order ASC, g.created_at DESC';
        break;
    }

    const gallery = await db.execute({ sql, args }).then(r => r.rows);
    res.json(gallery);
  } catch (error: any) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ message: 'Error fetching gallery images' });
  }
});

// GET /api/gallery/:id
galleryRouter.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?',
      args: [req.params.id]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gallery image' });
  }
});

// POST /api/gallery (Add new gallery image)
galleryRouter.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, package_id, destination, price, is_featured, display_order, image: rawImageUrl } = req.body;
    const image = await resolveImageUri(req.file, rawImageUrl);
    
    if (!image) {
      return res.status(400).json({ message: 'Image file or valid image URL is required' });
    }
    if (!title || !title.trim()) {
      rollbackUploadedFile(req.file);
      return res.status(400).json({ message: 'Image title is required' });
    }

    const parsedPackageId = package_id && package_id !== '' ? parseInt(package_id, 10) : null;
    const parsedPrice = price && price !== '' && !isNaN(parseFloat(price)) ? parseFloat(price) : null;
    const parsedFeatured = is_featured === '1' || is_featured === 'true' || is_featured === true ? 1 : 0;
    const parsedOrder = display_order && !isNaN(parseInt(display_order, 10)) ? parseInt(display_order, 10) : 0;
    const cleanDestination = destination ? destination.trim() : null;
    const cleanDescription = description ? description.trim() : null;

    const result = await db.execute({
      sql: `INSERT INTO gallery (title, description, image, package_id, destination, price, is_featured, display_order, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [title.trim(), cleanDescription, image, parsedPackageId, cleanDestination, parsedPrice, parsedFeatured, parsedOrder]
    });

    const newId = result.lastInsertRowid;
    const createdItem = await db.execute({
      sql: 'SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?',
      args: [newId]
    }).then(r => r.rows[0]);

    res.status(201).json({
      message: 'Gallery image added successfully',
      id: newId,
      ...createdItem
    });
  } catch (error: any) {
    rollbackUploadedFile(req.file);
    console.error('Error adding gallery image:', error);
    res.status(500).json({ message: error.message || 'Error adding gallery image' });
  }
});

// PUT /api/gallery/:id (Update image details and optional new image)
galleryRouter.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.execute({ sql: 'SELECT * FROM gallery WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    const currentItem = existing.rows[0];
    const oldImage = currentItem.image;

    const { title, description, package_id, destination, price, is_featured, display_order, image: rawImageUrl } = req.body;
    if (!title || !title.trim()) {
      rollbackUploadedFile(req.file);
      return res.status(400).json({ message: 'Image title is required' });
    }

    const image = await resolveImageUri(req.file, rawImageUrl || oldImage);

    const parsedPackageId = package_id && package_id !== '' ? parseInt(package_id, 10) : null;
    const parsedPrice = price !== undefined && price !== '' && price !== null && !isNaN(parseFloat(price)) ? parseFloat(price) : null;
    const parsedFeatured = is_featured === '1' || is_featured === 'true' || is_featured === true ? 1 : 0;
    const parsedOrder = display_order !== undefined && !isNaN(parseInt(display_order, 10)) ? parseInt(display_order, 10) : 0;
    const cleanDestination = destination !== undefined ? (destination ? destination.trim() : null) : currentItem.destination;
    const cleanDescription = description !== undefined ? (description ? description.trim() : null) : currentItem.description;

    try {
      await db.execute({
        sql: `UPDATE gallery 
              SET title = ?, description = ?, image = ?, package_id = ?, destination = ?, price = ?, is_featured = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [title.trim(), cleanDescription, image, parsedPackageId, cleanDestination, parsedPrice, parsedFeatured, parsedOrder, id]
      });
    } catch (dbErr: any) {
      rollbackUploadedFile(req.file);
      console.error('Database update failed in PUT /api/gallery/:id:', dbErr);
      return res.status(500).json({ 
        message: 'Image replacement failed. The existing image was preserved.' 
      });
    }

    // If new image upload succeeded and was different, safely remove old image from disk
    if (req.file && oldImage && oldImage !== image) {
      safeDeleteUploadedFile(oldImage);
    }

    const updatedItem = await db.execute({
      sql: 'SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?',
      args: [id]
    }).then(r => r.rows[0]);

    res.json({ 
      message: 'Gallery image updated successfully.',
      ...updatedItem
    });
  } catch (error: any) {
    rollbackUploadedFile(req.file);
    console.error('Error updating gallery image:', error);
    res.status(500).json({ message: error.message || 'Image replacement failed. The existing image was preserved.' });
  }
});

// POST /api/gallery/:id/image (Dedicated Replace Image endpoint)
galleryRouter.post('/:id/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file && !req.body.image) {
      return res.status(400).json({ message: 'New image file or image URI is required for replacement' });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM gallery WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    const currentItem = existing.rows[0];
    const oldImage = currentItem.image;
    const newImage = await resolveImageUri(req.file, req.body.image);

    try {
      await db.execute({
        sql: 'UPDATE gallery SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [newImage, id]
      });
    } catch (dbErr) {
      rollbackUploadedFile(req.file);
      console.error('Database update failed in POST /api/gallery/:id/image:', dbErr);
      return res.status(500).json({ message: 'Image replacement failed. The existing image was preserved.' });
    }

    // Safely remove old image after DB update succeeds
    if (oldImage && oldImage !== newImage) {
      safeDeleteUploadedFile(oldImage);
    }

    const updatedItem = await db.execute({
      sql: 'SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?',
      args: [id]
    }).then(r => r.rows[0]);

    res.json({
      message: 'Image replaced successfully.',
      image: newImage,
      ...updatedItem
    });
  } catch (error: any) {
    rollbackUploadedFile(req.file);
    console.error('Error replacing gallery image:', error);
    res.status(500).json({ message: error.message || 'Image replacement failed. The existing image was preserved.' });
  }
});

// DELETE /api/gallery/:id
galleryRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.execute({ sql: 'SELECT * FROM gallery WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    const currentItem = existing.rows[0];

    await db.execute({ sql: 'DELETE FROM gallery WHERE id = ?', args: [id] });
    safeDeleteUploadedFile(currentItem.image);

    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ message: 'Error deleting gallery image' });
  }
});

export default galleryRouter;


