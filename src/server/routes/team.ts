import { Router } from 'express';
import db from '../db/setup';
import { requireAuth } from './auth';
import { createImageUploader, resolveImageUri, safeDeleteUploadedFile, rollbackUploadedFile } from '../utils/upload';

const teamRouter = Router();
const upload = createImageUploader('team');

teamRouter.get('/', async (req, res) => {
  try {
    const team = await db.execute('SELECT * FROM team ORDER BY created_at ASC').then(r => r.rows);
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching team' });
  }
});

teamRouter.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, designation, bio, image: rawImageUrl } = req.body;
    const image = resolveImageUri(req.file, rawImageUrl);
    
    const result = await db.execute({ 
      sql: 'INSERT INTO team (name, designation, bio, image, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', 
      args: [name, designation, bio, image] 
    });

    const newId = result.lastInsertRowid;
    const createdItem = await db.execute({ sql: 'SELECT * FROM team WHERE id = ?', args: [newId] }).then(r => r.rows[0]);
    
    res.status(201).json({ 
      message: 'Team member added successfully',
      id: newId?.toString(),
      ...createdItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error('Error adding team member:', error);
    res.status(500).json({ message: 'Error adding team member' });
  }
});

teamRouter.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, designation, bio, image: rawImageUrl } = req.body;
    const id = req.params.id;
    
    const existing = await db.execute({ sql: 'SELECT * FROM team WHERE id = ?', args: [id] }).then(r => r.rows[0]) as any;
    if (!existing) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: 'Team member not found' });
    }

    const oldImage = existing.image;
    const image = resolveImageUri(req.file, rawImageUrl || oldImage);

    try {
      await db.execute({ 
        sql: 'UPDATE team SET name = ?, designation = ?, bio = ?, image = ? WHERE id = ?', 
        args: [name, designation, bio, image, id] 
      });
    } catch (dbErr) {
      rollbackUploadedFile(req.file);
      console.error('Database update failed in PUT /api/team/:id:', dbErr);
      return res.status(500).json({ message: 'Image replacement failed. The existing profile was preserved.' });
    }

    // Safely remove old image if replacement was successful
    if (req.file && oldImage && oldImage !== image) {
      safeDeleteUploadedFile(oldImage);
    }

    const updatedItem = await db.execute({ sql: 'SELECT * FROM team WHERE id = ?', args: [id] }).then(r => r.rows[0]);
    
    res.json({ 
      message: 'Team member updated successfully',
      ...updatedItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error('Error updating team member:', error);
    res.status(500).json({ message: 'Error updating team member' });
  }
});

teamRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await db.execute({ sql: 'SELECT image FROM team WHERE id = ?', args: [req.params.id] }).then(r => r.rows[0]) as any;
    if (existing) {
      await db.execute({ sql: 'DELETE FROM team WHERE id = ?', args: [req.params.id] });
      safeDeleteUploadedFile(existing.image);
    }
    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting team member' });
  }
});

export default teamRouter;

