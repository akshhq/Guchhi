import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    // A client-supplied Content-Type is trivially spoofable — this is a
    // first-pass filter only. The real check is validateImageMagicBytes
    // below, which inspects the actual file bytes after upload.
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
    }
    cb(null, true);
  },
});

/**
 * Each format's magic bytes (file signature). Checking these against the
 * actual uploaded buffer — rather than trusting the declared MIME type or
 * file extension — is what actually prevents someone from uploading, say,
 * an HTML/SVG/script payload renamed to look like a JPEG.
 */
const MAGIC_BYTES: Array<{ mime: string; check: (buf: Buffer) => boolean }> = [
  { mime: 'image/jpeg', check: (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff },
  {
    mime: 'image/png',
    check: (buf) =>
      buf.length > 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    mime: 'image/gif',
    check: (buf) =>
      buf.length > 6 &&
      (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a'),
  },
  {
    mime: 'image/webp',
    check: (buf) =>
      buf.length > 12 &&
      buf.toString('ascii', 0, 4) === 'RIFF' &&
      buf.toString('ascii', 8, 12) === 'WEBP',
  },
];

/** Runs after multer; rejects the request if the uploaded bytes don't actually match a known image format. */
export function validateImageMagicBytes(req: Request, _res: Response, next: NextFunction) {
  if (!req.file) return next(); // let downstream "file is required" checks handle this
  const buffer = req.file.buffer;
  const isValidImage = MAGIC_BYTES.some(({ check }) => {
    try {
      return check(buffer);
    } catch {
      return false;
    }
  });

  if (!isValidImage) {
    return next(ApiError.badRequest('The uploaded file is not a valid image'));
  }
  next();
}
