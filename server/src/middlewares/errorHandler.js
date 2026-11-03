import { ZodError } from 'zod';
import multer from 'multer';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const issues = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({
      error: 'Validation failed',
      issues
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file too large. Max size is 5 MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Max 5 images allowed.' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message && err.message.includes('Only JPG, PNG, and WebP')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

