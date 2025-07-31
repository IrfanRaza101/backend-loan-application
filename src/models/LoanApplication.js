const mongoose = require('mongoose');

const loanApplicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1000,
        max: 500000
    },
    term: {
        type: Number,
        required: true,
        min: 12,
        max: 120
    },
    purpose: {
        type: String,
        required: true,
        minLength: 10,
        maxLength: 500
    },
    loanType: {
        type: String,
        enum: ['personal', 'business', 'home', 'auto', 'education'],
        default: 'personal'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    monthlyIncome: {
        type: Number,
        min: 0
    },
    employmentStatus: {
        type: String,
        enum: ['employed', 'self-employed', 'unemployed', 'student', 'retired']
    },
    creditScore: {
        type: Number,
        min: 300,
        max: 850
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

const LoanApplication = mongoose.models.LoanApplication || mongoose.model('LoanApplication', loanApplicationSchema);

module.exports = { LoanApplication };