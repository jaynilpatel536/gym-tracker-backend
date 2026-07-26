const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER_PREFIX = process.env.CLOUDINARY_FOLDER_PREFIX || 'gym_plan';

/**
 * Upload a local file buffer/path to Cloudinary under a structured folder.
 * type: 'images' | 'videos'
 */
const uploadToCloudinary = (filePath, { type = 'images', publicId } = {}) => {
  return cloudinary.uploader.upload(filePath, {
    folder: `${FOLDER_PREFIX}/${type}`,
    public_id: publicId,
    resource_type: type === 'videos' ? 'video' : 'image',
    overwrite: true,
  });
};

const deleteFromCloudinary = (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary, FOLDER_PREFIX };
