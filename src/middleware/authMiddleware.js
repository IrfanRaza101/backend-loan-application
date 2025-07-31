const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

/**
 * Middleware to protect routes that require authentication
 * Verifies JWT from Authorization header or cookies and attaches user to request
 */
const protect = async (req, res, next) => {
  let token;

  try {
    // Check for token in Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (for backward compatibility)
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized, no token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Support both userId and id for backward compatibility
    const userIdToUse = decoded.userId || decoded.id;

    // Get user from database (exclude password)
    req.user = await User.findById(userIdToUse);

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized, user not found' 
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized, invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized, token expired' 
      });
    }
    
    res.status(401).json({ 
      success: false, 
      error: 'Not authorized, token failed' 
    });
  }
};

module.exports = { protect };