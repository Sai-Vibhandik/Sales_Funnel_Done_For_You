const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Check if Cloudinary is properly configured
const isConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
         process.env.CLOUDINARY_API_KEY &&
         process.env.CLOUDINARY_API_SECRET &&
         process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
         process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
         process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';
};

// Only configure Cloudinary if credentials are valid
let brandAssetsStorage, avatarStorage, taskFilesStorage;

if (isConfigured()) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // Configure storage for brand assets
  brandAssetsStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'brand-assets',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'svg', 'webp'],
      resource_type: 'auto',
      transformation: [
        { width: 2000, height: 2000, crop: 'limit' }
      ]
    }
  });

  // Configure storage for avatars
  avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'avatars',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' }
      ]
    }
  });

  // Configure storage for task deliverables (creative assets)
  taskFilesStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'task-deliverables',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi', 'webm', 'pdf', 'psd', 'ai', 'sketch', 'fig', 'zip'],
      resource_type: 'auto'
    }
  });

  console.log('Cloudinary configured successfully');
} else {
  console.log('Cloudinary not configured - file uploads will use local storage');
}

module.exports = {
  cloudinary,
  brandAssetsStorage,
  avatarStorage,
  taskFilesStorage,
  isConfigured
};