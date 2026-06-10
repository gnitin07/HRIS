/* ─────────────────────────────────────────────
   Auth Middleware — JWT Token Verification
   
   Extracts token from "Authorization: Bearer <token>"
   and attaches decoded user to req.user
   ───────────────────────────────────────────── */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // Extract token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided. Please login.' });
  }

  try {
    // Verify and decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
