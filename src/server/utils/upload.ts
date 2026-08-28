import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'public', 'uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  // Graceful fallback for serverless or read-only filesystems
}

export function createImageUploader(prefix: string = 'media') {
  // Use memory storage for fast, reliable serverless and cloud-compatible uploads
  const storage = multer.memoryStorage();

  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/gif'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(mime)) {
      return cb(null, true);
    }
    cb(new Error('Invalid image file format. Only JPG, JPEG, PNG, WEBP, SVG, and GIF formats are allowed.'));
  };

  return multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter
  });
}

/**
 * Converts an uploaded Multer file into a persistent, cloud-compatible Data URI.
 * This guarantees the image will render 100% reliably in Vercel serverless functions,
 * MySQL, SQLite, and CDN without depending on local disk persistence.
 */
export function fileToDataUri(file: Express.Multer.File): string {
  if (!file) return '';
  
  // If buffer is available from memoryStorage
  if (file.buffer && file.buffer.length > 0) {
    const mimeType = file.mimetype || 'image/jpeg';
    const base64 = file.buffer.toString('base64');
    
    // In local dev, optionally save a backup copy to disk if public folder is writable
    if (!process.env.VERCEL) {
      try {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `media-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);
      } catch (err) {
        // Silently continue with data URI
      }
    }
    
    return `data:${mimeType};base64,${base64}`;
  }

  // Fallback for disk storage file
  if (file.path && fs.existsSync(file.path)) {
    try {
      const buffer = fs.readFileSync(file.path);
      const mimeType = file.mimetype || 'image/jpeg';
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (e) {
      return `/uploads/${file.filename}`;
    }
  }

  return '';
}

/**
 * Resolves the image value for saving to database:
 * Uses the uploaded file's persistent Data URI, or preserves the existing/provided URL.
 */
export function resolveImageUri(file: Express.Multer.File | undefined, existingUrl?: string | null): string | null {
  if (file) {
    const dataUri = fileToDataUri(file);
    if (dataUri) return dataUri;
  }
  return existingUrl || null;
}

/**
 * Safely removes a file from /uploads/ if no longer referenced.
 * Does not remove static initial assets in /images/
 */
export function safeDeleteUploadedFile(imagePath: string | null | undefined): void {
  if (!imagePath) return;
  // If it's a data URI or static /images/ path, no disk cleanup needed
  if (typeof imagePath === 'string' && imagePath.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      // Ignored
    }
  }
}

/**
 * Rolls back newly uploaded file from disk if the database update failed
 */
export function rollbackUploadedFile(file: Express.Multer.File | undefined): void {
  if (!file || !file.path) return;
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (err) {
    // Ignored
  }
}
