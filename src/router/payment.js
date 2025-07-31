const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { LoanInstallment } = require('../models/LoanInstallment');
const { User } = require('../models/user');
const { Notification } = require('../models/Notification');
const stripeService = require('../services/stripeService');
const paymentRouter = express.Router();

// Create payment intent for installment
paymentRouter.post('/create-payment-intent', protect, async (req, res) => {
    try {
        const { installmentId } = req.body;

        const installment = await LoanInstallment.findOne({
            _id: installmentId,
            userId: req.user._id,
            status: 'pending'
        }).populate('loanId');

        if (!installment) {
            return res.status(404).json({
                success: false,
                error: 'Installment not found or already paid'
            });
        }

        const paymentIntent = await stripeService.createPaymentIntent(
            installment.amount,
            'usd',
            {
                installmentId: installment._id.toString(),
                userId: req.user._id.toString(),
                loanId: installment.loanId._id.toString()
            }
        );

        if (!paymentIntent.success) {
            return res.status(400).json({
                success: false,
                error: paymentIntent.error
            });
        }

        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.data.clientSecret,
                amount: installment.amount,
                installment
            }
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment intent'
        });
    }
});

// Confirm payment
paymentRouter.post('/confirm-payment', protect, async (req, res) => {
    try {
        const { paymentIntentId, installmentId } = req.body;

        const installment = await LoanInstallment.findOne({
            _id: installmentId,
            userId: req.user._id,
            status: 'pending'
        });

        if (!installment) {
            return res.status(404).json({
                success: false,
                error: 'Installment not found or already paid'
            });
        }

        const paymentConfirmation = await stripeService.confirmPaymentIntent(paymentIntentId);

        if (!paymentConfirmation.success) {
            return res.status(400).json({
                success: false,
                error: paymentConfirmation.error
            });
        }

        if (paymentConfirmation.data.status === 'succeeded') {
            // Update installment status
            installment.status = 'paid';
            installment.paidDate = new Date();
            installment.paymentMethod = 'stripe';
            installment.stripePaymentIntentId = paymentIntentId;
            await installment.save();

            // Add transaction to user wallet
            const user = await User.findById(req.user._id);
            user.wallet.transactions.push({
                type: 'debit',
                amount: installment.amount,
                description: `Loan installment payment #${installment.installmentNumber}`,
                loanId: installment.loanId,
                date: new Date()
            });
            await user.save();

            // Create notification
            await Notification.create({
                userId: req.user._id,
                type: 'payment_success',
                title: 'Payment Successful',
                message: `Your installment payment of $${installment.amount} has been processed successfully.`,
                loanId: installment.loanId,
                priority: 'medium'
            });

            res.json({
                success: true,
                message: 'Payment processed successfully',
                data: installment
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Payment not completed'
            });
        }
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm payment'
        });
    }
});

// Get payment methods
paymentRouter.get('/payment-methods', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user.stripeCustomerId) {
            return res.json({
                success: true,
                data: []
            });
        }

        const paymentMethods = await stripeService.getPaymentMethods(user.stripeCustomerId);

        if (!paymentMethods.success) {
            return res.status(400).json({
                success: false,
                error: paymentMethods.error
            });
        }

        res.json({
            success: true,
            data: paymentMethods.data
        });
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment methods'
        });
    }
});

// Create setup intent for saving payment method
paymentRouter.post('/setup-intent', protect, async (req, res) => {
    try {
        let user = await User.findById(req.user._id);

        // Create Stripe customer if doesn't exist
        if (!user.stripeCustomerId) {
            const customer = await stripeService.createCustomer(
                user.email,
                `${user.firstName} ${user.lastName}`,
                { userId: user._id.toString() }
            );

            if (!customer.success) {
                return res.status(400).json({
                    success: false,
                    error: customer.error
                });
            }

            user.stripeCustomerId = customer.data.id;
            await user.save();
        }

        const setupIntent = await stripeService.createSetupIntent(user.stripeCustomerId);

        if (!setupIntent.success) {
            return res.status(400).json({
                success: false,
                error: setupIntent.error
            });
        }

        res.json({
            success: true,
            data: setupIntent.data
        });
    } catch (error) {
        console.error('Create setup intent error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create setup intent'
        });
    }
});

module.exports = {
    paymentRouter
};