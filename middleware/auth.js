const config = require('config');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWTsecret || config.get('jwtSecret');
module.exports = function (req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ msg: 'No token. Authorization denided' });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'invalid token' });
  }
};
