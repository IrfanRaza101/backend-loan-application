const mongoose = require('mongoose');

const loanInstallmentSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoanApplication',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    installmentNumber: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'bank_transfer', 'cash'],
        default: 'stripe'
    },
    stripePaymentIntentId: {
        type: String
    },
    lateFee: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

const LoanInstallment = mongoose.models.LoanInstallment || mongoose.model('LoanInstallment', loanInstallmentSchema);

module.exports = { LoanInstallment };