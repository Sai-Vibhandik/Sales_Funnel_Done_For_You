const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const taskDeliverablesDir = path.join(uploadsDir, 'task-deliverables');
const brandAssetsDir = path.join(uploadsDir, 'brand-assets');
const avatarsDir = path.join(uploadsDir, 'avatars');

[uploadsDir, taskDeliverablesDir, brandAssetsDir, avatarsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Local disk storage configurations
const localStorageTask = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, taskDeliverablesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const localStorageBrand = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, brandAssetsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const localStorageAvatar = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
         process.env.CLOUDINARY_API_KEY &&
         process.env.CLOUDINARY_API_SECRET &&
         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
         process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
         process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';
};

// Import appropriate storage based on configuration
let brandAssetsStorage, avatarStorage, taskFilesStorage;

if (isCloudinaryConfigured()) {
  // Use Cloudinary storage
  console.log('Using Cloudinary storage for file uploads');
  const cloudinaryConfig = require('../config/cloudinary');
  brandAssetsStorage = cloudinaryConfig.brandAssetsStorage;
  avatarStorage = cloudinaryConfig.avatarStorage;
  taskFilesStorage = cloudinaryConfig.taskFilesStorage;
} else {
  // Use local storage fallback
  console.log('Cloudinary not configured - using local file storage');
  taskFilesStorage = localStorageTask;
  brandAssetsStorage = localStorageBrand;
  avatarStorage = localStorageAvatar;
}

// File filter for brand assets
const brandAssetsFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
  }
};

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

// File filter for avatars
const avatarFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed for avatars.'), false);
  }
};

// Multer upload for brand assets
const uploadBrandAssets = multer({
  storage: brandAssetsStorage,
  fileFilter: brandAssetsFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
}).array('files', 10); // Max 10 files

// Multer upload for single avatar
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max
  }
}).single('avatar');

// Multer upload for task deliverables
const uploadTaskFiles = multer({
  storage: taskFilesStorage,
  fileFilter: taskFilesFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max for videos
  }
}).array('files', 20); // Max 20 files per task

// Error handling wrapper
const handleUpload = (upload) => {
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 100MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum is 20 files.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadBrandAssets,
  uploadAvatar,
  uploadTaskFiles,
  handleUpload
};