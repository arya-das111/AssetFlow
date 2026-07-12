const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'assetflow-super-secret-key-12345';

// Authenticate JWT token and attach user to request object
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data from database to verify role/department changes
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User session invalid. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

// Enforce role-based access control
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access Denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
