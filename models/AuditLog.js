const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'USER_REGISTERED',
        'USER_RE_REGISTERED',
        'USER_APPROVED',
        'USER_REJECTED',
        'USER_SUSPENDED',
        'USER_LOGIN',
        'SUPER_ADMIN_REGISTERED',
      ],
      required: true,
      index: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
