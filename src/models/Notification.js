const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['loan_approved', 'loan_rejected', 'payment_due', 'payment_reminder', 'general'],
        default: 'general'
    },
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoanApplication'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date
    }
}, {
    timestamps: true
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = { Notification };