import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

export const UploadService = {
  async uploadBuffer(buffer: Buffer, folder = 'guchhi/products'): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      Readable.from(buffer).pipe(stream);
    });
  },

  async deleteByPublicId(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  },
};
