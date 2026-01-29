import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireRoleMiddleware } from '../../middleware/auth';
import { Role } from '@prisma/client';
import { asyncHandler } from '../../middleware/asyncHandler';
import { S3Service } from '../../services/s3';

const router = Router();
const s3Service = new S3Service();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for avatars
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// POST /api/v1/organizer/profile/upload-avatar
router.post(
  '/upload-avatar',
  requireRoleMiddleware(Role.ORGANIZER),
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No avatar file provided' });
    }

    const file = req.file;
    if (file.size > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File size exceeds 2MB limit' });
    }

    try {
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const key = `organizer/${userId}/avatar-${timestamp}${ext}`;
      const avatarUrl = await s3Service.uploadFile(key, file.buffer, file.mimetype);

      const profile = await req.prisma.organizerProfile.findUnique({
        where: { userId },
      });
      if (profile) {
        await req.prisma.organizerProfile.update({
          where: { userId },
          data: { avatarUrl },
        });
      }
      // If no profile yet, still return avatarUrl so frontend can send it in PUT /users/me/profile

      const events = await req.prisma.event.findMany({
        where: { organizerId: userId },
        select: { id: true, slug: true },
      });
      await req.redis.invalidateEventCachesForOrganizer(events);

      res.json({
        success: true,
        data: { avatarUrl },
      });
    } catch (error: any) {
      console.error('Error uploading organizer avatar:', error);
      const msg = error.message || 'Failed to upload avatar';
      const isSchemaError =
        msg.includes('avatarUrl') ||
        msg.includes('Unknown arg') ||
        msg.includes('column') ||
        (error?.code && ['P2009', 'P2010', 'P2021'].includes(error.code));
      res.status(500).json({
        success: false,
        error: isSchemaError
          ? 'Database missing avatar column. Run: ALTER TABLE "organizer_profiles" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT; in Supabase SQL Editor (see DATABASE_CONNECTION.md).'
          : msg,
      });
    }
  })
);

export default router;
