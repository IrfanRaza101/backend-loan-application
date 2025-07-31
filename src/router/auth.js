const express = require('express');
const appRouter = express.Router()
const { User } = require('../models/user')
const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require("jsonwebtoken");

appRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Set cookie for backward compatibility
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return user data and token
        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
})

appRouter.post('/signup', async (req, res) => {
    try {
        const { name, email, password, firstName, lastName } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Handle name field - split into firstName and lastName if provided
        let userFirstName = firstName;
        let userLastName = lastName;
        
        if (name && !firstName) {
            const nameParts = name.trim().split(' ');
            userFirstName = nameParts[0];
            userLastName = nameParts.slice(1).join(' ');
        }

        if (!userFirstName) {
            return res.status(400).json({
                success: false,
                message: 'First name is required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            firstName: userFirstName,
            lastName: userLastName,
            email,
            password: hashedPassword
        });

        await newUser.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id },
            process.env.SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Set cookie for backward compatibility
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return user data and token
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: newUser._id,
                name: `${newUser.firstName} ${newUser.lastName || ''}`.trim(),
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            },
            token
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
})

appRouter.post('/admin-login', async (req, res) => {
    try {
        const { email, secretKey } = req.body;

        // Validate input
        if (!email || !secretKey) {
            return res.status(400).json({
                success: false,
                message: 'Email and secret key are required'
            });
        }

        // Admin credentials check
        const ADMIN_EMAIL = 'admin@loanportal.com';
        const ADMIN_SECRET = 'irfan123';

        if (email !== ADMIN_EMAIL || secretKey !== ADMIN_SECRET) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        // Generate JWT token for admin
        const token = jwt.sign(
            { 
                userId: 'admin-001',
                isAdmin: true,
                role: 'admin'
            },
            process.env.SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Set cookie for backward compatibility
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Return admin data and token
        res.json({
            success: true,
            message: 'Admin login successful',
            user: {
                id: 'admin-001',
                name: 'Admin',
                email: ADMIN_EMAIL,
                isAdmin: true,
                role: 'admin'
            },
            token
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

appRouter.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
})

module.exports = {
    appRouter
}