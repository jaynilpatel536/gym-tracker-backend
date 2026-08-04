const mongoose = require('mongoose');

const NOTIFICATION_TYPES = {
  NEW_REGISTRATION: 'NEW_REGISTRATION',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  WORKOUT_ALERT: 'WORKOUT_ALERT',
  APP_UPDATE: 'APP_UPDATE',
};

const notificationSchema = new mongoose.Schema(
  {
    recipientRole: { type: String, enum: ['ADMIN', 'USER', 'ALL'], default: 'ADMIN', index: true },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    autoResolved: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
  NOTIFICATION_TYPES,
};
