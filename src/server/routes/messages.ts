import { Router } from 'express';
import db from '../db/setup';
import { requireAuth } from './auth';

const messagesRouter = Router();

// Public: Submit a message
messagesRouter.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    await db.execute({ sql: 'INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)', args: [name, email, phone || null, message] });
    
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Protected: Get all messages
messagesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const messages = await db.execute('SELECT * FROM messages ORDER BY created_at DESC').then(r => r.rows);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Protected: Mark as read
messagesRouter.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await db.execute({ sql: 'UPDATE messages SET is_read = 1 WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating message' });
  }
});

// Protected: Delete message
messagesRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM messages WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message' });
  }
});

export default messagesRouter;
