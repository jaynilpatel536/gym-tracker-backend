const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  // Permanent 1-year token for seamless 1-time login like standard production mobile apps
  const expiresIn = process.env.JWT_EXPIRES_IN || '365d';
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;
