const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/task-deliverables');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Local storage for task deliverables
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for task deliverables (images, videos, design files)
const taskFilesFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Design files
    'application/postscript',
    'image/vnd.adobe.photoshop',
    'application/illustrator',
    // Archives
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Images, videos, documents, and design files are allowed.'), false);
  }
};

// Multer upload for task deliverables using local storage
const uploadTaskFilesLocal = multer({
  storage: localStorage,
  fileFilter: taskFilesFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max for videos
  }
}).array('files', 20); // Max 20 files per task

module.exports = {
  uploadTaskFilesLocal,
  uploadsDir
};