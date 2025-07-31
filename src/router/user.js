const express = require('express');
const { userAuth } = require('../middleware/auth');
const { protect } = require('../middleware/authMiddleware');
const { User } = require('../models/user');
const { Notification } = require('../models/Notification');
const { LoanInstallment } = require('../models/LoanInstallment');
const userRouter = express.Router();

// Get current user profile
userRouter.get('/profile', protect, async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            data: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                photoURL: user.photoURL,
                skills: user.skills,
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile'
        });
    }
});

// Get user by ID (backward compatibility)
userRouter.get('/getUser', userAuth, async (req, res) => {
    try {
        const user = req.user;
        res.json({
            success: true,
            data: {
                id: user._id,
                name: `${user.firstName} ${user.lastName}`.trim(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user data'
        });
    }
});

// Get all users (admin functionality)
userRouter.get('/getAllUsers', protect, async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// Update user profile
userRouter.patch('/profile', protect, async (req, res) => {
    try {
        const { firstName, lastName, photoURL, skills, gender } = req.body;
        const userId = req.user._id;

        const updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (photoURL) updateData.photoURL = photoURL;
        if (skills) updateData.skills = skills;
        if (gender) updateData.gender = gender;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: updatedUser._id,
                name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                photoURL: updatedUser.photoURL,
                skills: updatedUser.skills,
                gender: updatedUser.gender
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
});

// Edit user (backward compatibility)
userRouter.patch('/editUser', userAuth, async (req, res) => {
    try {
        const { firstName, lastName, photoURL, skills, gender } = req.body;
        const userId = req.user._id;

        const updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (photoURL) updateData.photoURL = photoURL;
        if (skills) updateData.skills = skills;
        if (gender) updateData.gender = gender;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Edit user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

// Delete user account
userRouter.delete('/account', protect, async (req, res) => {
    try {
        const userId = req.user._id;
        
        await User.findByIdAndDelete(userId);
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
});

// Delete user (backward compatibility)
userRouter.post('/deleteUser', userAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        
        await User.findByIdAndDelete(userId);
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

// Get user wallet
userRouter.get('/wallet', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('wallet');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user.wallet
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wallet data'
        });
    }
});

// Get user notifications
userRouter.get('/notifications', protect, async (req, res) => {
    try {
        const { page = 1, limit = 10, unreadOnly = false } = req.query;
        
        const query = { userId: req.user._id };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('loanId', 'amount loanType');

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ 
            userId: req.user._id, 
            isRead: false 
        });

        res.json({
            success: true,
            data: {
                notifications,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total,
                unreadCount
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// Mark notification as read
userRouter.patch('/notifications/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
userRouter.patch('/notifications/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read'
        });
    }
});

// Delete notification
userRouter.delete('/notifications/:id', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification'
        });
    }
});

// Get user loan installments
userRouter.get('/installments', protect, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        const query = { userId: req.user._id };
        if (status) {
            query.status = status;
        }

        const installments = await LoanInstallment.find(query)
            .populate('loanId', 'amount loanType')
            .sort({ dueDate: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await LoanInstallment.countDocuments(query);

        res.json({
            success: true,
            data: {
                installments,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                total
            }
        });
    } catch (error) {
        console.error('Get installments error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch installments'
        });
    }
});

module.exports = {
    userRouter
}