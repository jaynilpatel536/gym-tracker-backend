const jwt = require('jsonwebtoken');

const generateToken = (userId, rememberMe = false) => {
  // Remember Me extends token lifetime; otherwise use the default shorter session
  const expiresIn = rememberMe ? process.env.JWT_EXPIRES_IN || '30d' : '1d';
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;
