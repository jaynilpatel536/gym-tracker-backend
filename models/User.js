const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phoneNumber: { type: String, default: '', trim: true },
    rememberMe: { type: Boolean, default: false },

    // Account Status System: Pending | Approved | Rejected | Suspended
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Suspended'],
      default: 'Pending',
      index: true,
    },
    isAdmin: { type: Boolean, default: false },
    statusChangedAt: { type: Date, default: null },
    statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, default: '' },

    // Token version for revoking active sessions on suspension or password updates
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ email: 1, status: 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
