const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { LoanApplication } = require('../models/LoanApplication');
const loanRouter = express.Router();

// Apply for a loan
loanRouter.post('/apply', protect, async (req, res) => {
    try {
        const { amount, term, purpose, loanType, monthlyIncome, employmentStatus } = req.body;
        
        // Validate required fields
        if (!amount || !term || !purpose) {
            return res.status(400).json({
                success: false,
                error: 'Amount, term, and purpose are required'
            });
        }

        // Validate amount range
        if (amount < 1000 || amount > 500000) {
            return res.status(400).json({
                success: false,
                error: 'Loan amount must be between $1,000 and $500,000'
            });
        }

        // Validate term range
        if (term < 12 || term > 120) {
            return res.status(400).json({
                success: false,
                error: 'Loan term must be between 12 and 120 months'
            });
        }

        const loanApplication = new LoanApplication({
            userId: req.user._id,
            amount,
            term,
            purpose,
            loanType: loanType || 'personal',
            monthlyIncome,
            employmentStatus
        });

        await loanApplication.save();

        res.status(201).json({
            success: true,
            message: 'Loan application submitted successfully',
            data: loanApplication
        });

    } catch (error) {
        console.error('Loan application error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit loan application'
        });
    }
});

// Get user's loan applications
loanRouter.get('/status', protect, async (req, res) => {
    try {
        const loanApplications = await LoanApplication.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: loanApplications
        });

    } catch (error) {
        console.error('Fetch loan applications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch loan applications'
        });
    }
});

// Get all loan applications (admin only - for future use)
loanRouter.get('/all', protect, async (req, res) => {
    try {
        const loanApplications = await LoanApplication.find()
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: loanApplications
        });

    } catch (error) {
        console.error('Fetch all loan applications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch loan applications'
        });
    }
});

// Update loan application status (admin only - for future use)
loanRouter.patch('/update-status/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const updateData = {
            status,
            reviewedAt: new Date(),
            reviewedBy: req.user._id
        };

        if (status === 'rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        const loanApplication = await LoanApplication.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!loanApplication) {
            return res.status(404).json({
                success: false,
                error: 'Loan application not found'
            });
        }

        res.json({
            success: true,
            message: 'Loan application status updated successfully',
            data: loanApplication
        });

    } catch (error) {
        console.error('Update loan application error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update loan application'
        });
    }
});

module.exports = { loanRouter };