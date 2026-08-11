const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // Token version check: invalidates sessions after password reset or suspension.
    // decoded.tokenVersion is 0 (or missing) for tokens issued before this fix —
    // those are treated as version 0, which matches users whose tokenVersion is also 0
    // (i.e., no invalidation has ever occurred), so existing valid sessions keep working.
    const decodedVersion = decoded.tokenVersion ?? 0;
    const userVersion = user.tokenVersion ?? 0;
    if (decodedVersion !== userVersion) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    // Verify account status
    if (user.status === 'Suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact the administrator.',
        status: 'Suspended',
      });
    }
    if (user.status === 'Pending') {
      return res.status(403).json({
        message: 'Your account is waiting for administrator approval.',
        status: 'Pending',
      });
    }
    if (user.status === 'Rejected') {
      return res.status(403).json({
        message: 'Your registration request was rejected by the administrator.',
        status: 'Rejected',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid session token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin && req.user.status === 'Approved') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Administrative privileges required.' });
};

module.exports = { protect, admin };
