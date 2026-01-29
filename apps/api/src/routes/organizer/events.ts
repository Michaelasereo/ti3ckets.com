import { Router } from 'express';
import multer from 'multer';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { S3Service } from '../../services/s3';
import path from 'path';

const router = Router();
const s3Service = new S3Service();

// Configure multer for memory storage (we'll upload directly to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

// POST /api/v1/organizer/events/upload-image - Upload event image
router.post(
  '/upload-image',
  requireRoleMiddleware(Role.ORGANIZER),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { eventId, type } = req.body;
    const file = req.file;

    // Validate file size (already done by multer, but double-check)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File size exceeds 5MB limit' });
    }

    try {
      // Generate S3 key
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${timestamp}${ext}`;
      
      let key: string;
      if (eventId) {
        // For existing events
        key = `events/${eventId}/${type === 'banner' ? 'banner' : 'image'}-${filename}`;
      } else {
        // For new events (temporary upload, will be moved later)
        key = `events/temp/${userId}/${type === 'banner' ? 'banner' : 'image'}-${filename}`;
      }

      // Upload to S3
      const imageUrl = await s3Service.uploadFile(key, file.buffer, file.mimetype);

      res.json({
        success: true,
        data: { imageUrl },
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload image',
      });
    }
  })
);

export default router;
