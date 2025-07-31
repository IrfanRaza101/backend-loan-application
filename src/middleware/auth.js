const jwt = require("jsonwebtoken");
const {User} = require("../models/user");

const userAuth = async (req, res, next) => {
    try {
        let token;

        // Check for token in cookies first (for backward compatibility)
        if (req.cookies.token) {
            token = req.cookies.token;
        }
        // Check for Bearer token in Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Not authorized, no token provided"
            });
        }

        const decodedObj = await jwt.verify(token, process.env.SECRET_KEY);

        const { userId, id, isAdmin, role } = decodedObj;
        const userIdToUse = userId || id; // Support both formats for backward compatibility

        // Handle admin users
        if (isAdmin && userIdToUse === 'admin-001') {
            const mongoose = require('mongoose');
            req.user = {
                _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Fixed admin ObjectId
                id: 'admin-001',
                name: 'Admin',
                email: 'admin@loanportal.com',
                isAdmin: true,
                role: 'admin'
            };
            next();
            return;
        }

        const user = await User.findById(userIdToUse);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Not authorized, user not found"
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized, invalid token'
            });
        }
        
        if (err.name === 'TokenExpiredError') {
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

// Admin authorization middleware
const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Not authorized, user not authenticated"
            });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Access denied. Admin privileges required."
            });
        }

        next();
    } catch (err) {
        console.error('Admin middleware error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error in admin authorization'
        });
    }
};

module.exports = {
    userAuth,
    isAdmin,
};