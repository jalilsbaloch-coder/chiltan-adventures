import path from 'path';
import fs from 'fs';

export class ImageStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.VERCEL
      ? path.join('/tmp', 'uploads')
      : path.join(process.cwd(), 'public', 'uploads');

    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (e) {
      // Graceful fallback for read-only / serverless environments
    }
  }

  /**
   * Normalizes an image URL for production and local environments.
   * Ensures no duplicated slashes, no unintended localhost prefixes, and valid URL/Data URI formats.
   */
  public normalizeUrl(url: string | null | undefined, fallback: string = '/images/fallback-tour.jpg'): string {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return fallback;
    }

    const trimmed = url.trim();

    // Preserve Data URIs, HTTPS/HTTP URLs, and blob URLs as-is
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
    // Replace duplicate leading slashes e.g. ///images -> /images
    const cleaned = pathStr.replace(/^\/+/, '/');
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  }

  /**
   * Processes an uploaded Multer file and returns a stable, deployment-safe persistent image URI.
   * On Vercel / serverless deployments, encoding into a base64 Data URI or cloud storage ensures
   * the image is stored directly in the database row and remains 100% persistent across function lifecycles.
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

    // 1. Process from Memory Buffer (Multer memoryStorage)
    if (file.buffer && file.buffer.length > 0) {
      const mimeType = file.mimetype || 'image/jpeg';
      const base64 = file.buffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64}`;

      // In local development, also optionally write a copy to disk in public/uploads/
      if (!process.env.VERCEL) {
        try {
          const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
          const filename = `media-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
          const diskPath = path.join(this.uploadDir, filename);
          fs.writeFileSync(diskPath, file.buffer);
        } catch (err) {
          // Non-blocking
        }
      }

      return dataUri;
    }

    // 2. Process from Disk File (Multer diskStorage fallback)
    if (file.path && fs.existsSync(file.path)) {
      try {
        const buffer = fs.readFileSync(file.path);
        const mimeType = file.mimetype || 'image/jpeg';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
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
   * Safely cleans up a deleted or replaced local uploaded file from disk.
   * Never touches static public assets in /images/.
   */
  public async deleteImage(imagePath: string | null | undefined): Promise<void> {
    if (!imagePath || typeof imagePath !== 'string') return;

    // Only attempt deletion for local /uploads/ files, not static /images/ or data URIs
    if (imagePath.startsWith('/uploads/')) {
      const relative = imagePath.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadDir, relative);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        // Silently ignore disk cleanup failure on read-only environments
      }
    }
  }

  /**
   * Roll back newly uploaded file from disk if database transaction fails
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
