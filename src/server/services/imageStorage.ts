import path from 'path';
import fs from 'fs';
import { put, del } from '@vercel/blob';

export class ImageStorageService {
  private uploadDir: string;

  public get isProduction(): boolean {
    return Boolean(process.env.VERCEL || process.env.VERCEL_ENV === 'production');
  }

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads');

    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (e) {
      // Fallback for restricted filesystems
    }
  }

  /**
   * Check if Vercel Blob token is available
   */
  public getBlobToken(): string | null {
    return process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || null;
  }

  public isBlobConfigured(): boolean {
    return Boolean(this.getBlobToken());
  }

  /**
   * Normalizes an image URL for production and local environments.
   * Handles:
   * - Static assets: /images/...
   * - Persistent Vercel Blob URLs: https://...blob.vercel-storage.com/...
   * - Local uploads: /uploads/...
   * - Data URIs: data:image/...
   * - Safe fallback
   */
  public normalizeUrl(url: string | null | undefined, fallback: string = '/images/fallback-tour.jpg'): string {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return fallback;
    }

    const trimmed = url.trim();

    // Preserve Data URIs, HTTPS/HTTP URLs, and Blob URLs
    if (
      trimmed.startsWith('data:image/') || 
      trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('blob:')
    ) {
      // Strip any accidental localhost or loopback host prepended in development
      const stripped = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, '');
      if (stripped.startsWith('http://') || stripped.startsWith('https://') || stripped.startsWith('data:image/')) {
        return stripped;
      }
      return this.ensureLeadingSlash(stripped);
    }

    return this.ensureLeadingSlash(trimmed);
  }

  private ensureLeadingSlash(pathStr: string): string {
    const cleaned = pathStr.replace(/^\/+/, '/');
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  }

  /**
   * Processes an uploaded file and returns a permanent, production-safe persistent image URL.
   * 
   * PRODUCTION (Vercel):
   * - Uploads directly to Vercel Blob via @vercel/blob and returns the public HTTPS Blob URL.
   * - Fails with a clear server configuration error if BLOB_READ_WRITE_TOKEN is missing.
   * 
   * LOCAL / DEMO MODE:
   * - Writes to local public/uploads/ or generates a clean fallback URI for development.
   */
  public async saveImage(
    file?: Express.Multer.File, 
    existingOrProvidedUrl?: string | null
  ): Promise<string | null> {
    if (!file) {
      if (existingOrProvidedUrl) {
        return this.normalizeUrl(existingOrProvidedUrl);
      }
      return null;
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 30);
    const uniqueFilename = `chiltan-${cleanBase || 'img'}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;

    // --- 1. PRODUCTION MODE (Vercel) ---
    if (this.isProduction) {
      const token = this.getBlobToken();
      if (!token) {
        const errorMsg = 'Vercel Blob storage is not configured in production. Please set BLOB_READ_WRITE_TOKEN in your Vercel project Environment Variables.';
        console.error(`[Production ImageStorage Error] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      try {
        const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
        if (!buffer || buffer.length === 0) {
          throw new Error('Image file buffer is empty');
        }

        const blob = await put(`uploads/${uniqueFilename}`, buffer, {
          access: 'public',
          token,
          contentType: file.mimetype || 'image/jpeg'
        });

        console.log(`[Production ImageStorage] Successfully uploaded to Vercel Blob: ${blob.url}`);
        return blob.url;
      } catch (err: any) {
        console.error('[Production ImageStorage] Vercel Blob upload failed:', err.message || err);
        throw new Error(`Failed to upload image to Vercel Blob: ${err.message || 'Unknown error'}`);
      }
    }

    // --- 2. LOCAL / DEMO MODE ---
    // If running in development / Google AI Studio Preview
    if (file.buffer && file.buffer.length > 0) {
      try {
        const diskPath = path.join(this.uploadDir, uniqueFilename);
        fs.writeFileSync(diskPath, file.buffer);
        return `/uploads/${uniqueFilename}`;
      } catch (diskErr) {
        // Fallback to data URI if disk write fails in restricted container
        const mimeType = file.mimetype || 'image/jpeg';
        const base64 = file.buffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
      }
    }

    if (file.path && fs.existsSync(file.path)) {
      try {
        const buffer = fs.readFileSync(file.path);
        const diskPath = path.join(this.uploadDir, uniqueFilename);
        fs.writeFileSync(diskPath, buffer);
        return `/uploads/${uniqueFilename}`;
      } catch (err) {
        if (file.filename) {
          return `/uploads/${file.filename}`;
        }
      }
    }

    if (existingOrProvidedUrl) {
      return this.normalizeUrl(existingOrProvidedUrl);
    }

    return null;
  }

  /**
   * Safely deletes an image when replaced or deleted.
   * - Deletes from Vercel Blob if it's a blob storage URL.
   * - Deletes from /uploads/ if it's a local upload.
   * - Never deletes repository static assets in /images/.
   */
  public async deleteImage(imagePath: string | null | undefined): Promise<void> {
    if (!imagePath || typeof imagePath !== 'string') return;

    const trimmed = imagePath.trim();

    // Never touch repository static assets
    if (trimmed.startsWith('/images/')) {
      return;
    }

    // 1. Vercel Blob URL Deletion
    if (trimmed.includes('blob.vercel-storage.com') || trimmed.includes('blob.vercel.com')) {
      const token = this.getBlobToken();
      if (token) {
        try {
          await del(trimmed, { token });
          console.log(`[ImageStorage] Deleted image from Vercel Blob: ${trimmed}`);
        } catch (err: any) {
          console.warn(`[ImageStorage] Non-critical warning deleting old Blob: ${err.message}`);
        }
      }
      return;
    }

    // 2. Local uploads deletion
    if (trimmed.startsWith('/uploads/')) {
      const relative = trimmed.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadDir, relative);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        // Ignored in read-only local modes
      }
    }
  }

  /**
   * Roll back newly uploaded local file from disk if database transaction fails
   */
  public rollbackFile(file: Express.Multer.File | undefined): void {
    if (!file || !file.path) return;
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      // Ignored
    }
  }
}

export const imageStorageService = new ImageStorageService();
export default imageStorageService;
