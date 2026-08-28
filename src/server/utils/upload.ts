import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export function createImageUploader(prefix: string = 'media') {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });

  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
      return cb(null, true);
    }
    cb(new Error('Invalid image file format. Only JPG, JPEG, PNG, and WEBP formats are allowed.'));
  };

  return multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter
  });
}

/**
 * Safely removes a file from /uploads/ if no longer referenced.
 * Does not remove static initial assets in /images/
 */
export function safeDeleteUploadedFile(imagePath: string | null | undefined): void {
  if (!imagePath) return;
  if (typeof imagePath === 'string' && imagePath.startsWith('/uploads/')) {
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.error('Error safely deleting old uploaded image:', err);
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
    console.error('Error cleaning up failed upload file:', err);
  }
}
