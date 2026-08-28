import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { imageStorageService } from '../services/imageStorage';

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
  // Memory storage is optimal for serverless, cloud environments, and fast streaming
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
 * Resolves the image URI using ImageStorageService.
 */
export async function resolveImageUri(file: Express.Multer.File | undefined, existingUrl?: string | null): Promise<string | null> {
  return imageStorageService.saveImage(file, existingUrl);
}

/**
 * Normalizes an image URL for display or storage.
 */
export function normalizeImageUrl(url: string | null | undefined, fallback?: string): string {
  return imageStorageService.normalizeUrl(url, fallback);
}

/**
 * Safely removes a file from /uploads/ if no longer referenced.
 */
export async function safeDeleteUploadedFile(imagePath: string | null | undefined): Promise<void> {
  return imageStorageService.deleteImage(imagePath);
}

/**
 * Rolls back newly uploaded file from disk if the database update failed.
 */
export function rollbackUploadedFile(file: Express.Multer.File | undefined): void {
  return imageStorageService.rollbackFile(file);
}

export { imageStorageService };
