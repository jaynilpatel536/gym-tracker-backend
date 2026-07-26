const multer = require('multer');
const path = require('path');
const fs = require('fs');

const tmpDir = path.join(__dirname, '..', 'tmp_uploads');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tmpDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

// Files land here only briefly; controllers delete them immediately after
// pushing to Cloudinary, since media must never be bundled/stored in the app.
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB, generous for exercise videos
});

module.exports = upload;
