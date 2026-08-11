const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['android'], default: 'android', required: true },
    versionName: { type: String, required: true }, // e.g. "1.1.0"
    versionCode: { type: Number, required: true, unique: true }, // e.g. 2
    minimumSupportedVersionCode: { type: Number, required: true }, // e.g. 1
    apkUrl: { type: String, required: true },
    sha256: { type: String, required: true, lowercase: true, trim: true },
    fileSizeBytes: { type: Number, default: 0 },
    releaseNotes: [{ type: String }],
    forceUpdate: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

appVersionSchema.index({ platform: 1, isActive: 1, versionCode: -1 });

module.exports = mongoose.model('AppVersion', appVersionSchema);
