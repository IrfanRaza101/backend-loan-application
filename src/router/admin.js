const express = require('express');
const { userAuth, isAdmin } = require('../middleware/auth');
const { LoanApplication } = require('../models/LoanApplication');
const { User } = require('../models/user');
const { Notification } = require('../models/Notification');
const { LoanInstallment } = require('../models/LoanInstallment');
const adminRouter = express.Router();

// Get admin dashboard stats
adminRouter.get('/stats', userAuth, isAdmin, async (req, res) => {
  try {
    const totalLoans = await LoanApplication.countDocuments();
    const pendingLoans = await LoanApplication.countDocuments({ status: 'pending' });
    const approvedLoans = await LoanApplication.countDocuments({ status: 'approved' });
    const rejectedLoans = await LoanApplication.countDocuments({ status: 'rejected' });
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    
    // Calculate total amount from approved loans
    const approvedLoansData = await LoanApplication.find({ status: 'approved' });
    const totalAmount = approvedLoansData.reduce((sum, loan) => sum + loan.amount, 0);
    
    // Get today's applications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newApplicationsToday = await LoanApplication.countDocuments({
      createdAt: { $gte: today }
    });

    res.json({
      totalLoans,
      pendingLoans,
      approvedLoans,
      rejectedLoans,
      totalAmount,
      totalUsers,
      activeUsers,
      newApplicationsToday
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all loan applications with pagination and filtering
adminRouter.get('/loans', userAuth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { 'personalInfo.fullName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { 'personalInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const loans = await LoanApplication.find(query)
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LoanApplication.countDocuments(query);

    res.json({
      loans,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update loan status
adminRouter.put('/loans/:id/status', userAuth, isAdmin, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const loan = await LoanApplication.findById(id).populate('userId');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Update loan status
    loan.status = status;
    loan.reviewedBy = req.user._id;
    loan.reviewedAt = new Date();
    
    if (status === 'rejected' && rejectionReason) {
      loan.rejectionReason = rejectionReason;
    }

    await loan.save();

    // If loan is approved, credit amount to user's wallet and create installments
    if (status === 'approved') {
      const user = loan.userId;
      
      // Credit amount to wallet
      user.wallet.balance += loan.amount;
      user.wallet.transactions.push({
        type: 'credit',
        amount: loan.amount,
        description: `Loan approved - ${loan.loanType} loan`,
        loanId: loan._id
      });
      
      await user.save();

      // Create installments
      const monthlyAmount = loan.amount / loan.term;
      const installments = [];
      
      for (let i = 1; i <= loan.term; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
        installments.push({
          loanId: loan._id,
          userId: user._id,
          installmentNumber: i,
          amount: monthlyAmount,
          dueDate: dueDate
        });
      }
      
      await LoanInstallment.insertMany(installments);

      // Create notification for loan approval
      await Notification.create({
        userId: user._id,
        title: 'Loan Approved!',
        message: `Your ${loan.loanType} loan of $${loan.amount} has been approved and credited to your wallet. First installment of $${monthlyAmount.toFixed(2)} is due on ${installments[0].dueDate.toDateString()}.`,
        type: 'loan_approved',
        loanId: loan._id,
        priority: 'high',
        dueDate: installments[0].dueDate
      });

    } else if (status === 'rejected') {
      // Create notification for loan rejection
      await Notification.create({
        userId: loan.userId._id,
        title: 'Loan Application Rejected',
        message: `Your ${loan.loanType} loan application has been rejected. ${rejectionReason || 'Please contact support for more details.'}`,
        type: 'loan_rejected',
        loanId: loan._id,
        priority: 'high'
      });
    }

    const updatedLoan = await LoanApplication.findById(id).populate('userId', 'firstName lastName email phone');
    res.json(updatedLoan);
  } catch (error) {
    console.error('Error updating loan status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users with pagination
adminRouter.get('/users', userAuth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get loan counts for each user
    const usersWithLoanData = await Promise.all(
      users.map(async (user) => {
        const userLoans = await LoanApplication.find({ userId: user._id });
        const totalLoans = userLoans.length;
        const totalBorrowed = userLoans
          .filter(loan => loan.status === 'approved')
          .reduce((sum, loan) => sum + loan.amount, 0);

        return {
          ...user.toObject(),
          totalLoans,
          totalBorrowed
        };
      })
    );

    res.json({
      users: usersWithLoanData,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status
adminRouter.put('/users/:id/status', userAuth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (soft delete)
adminRouter.delete('/users/:id', userAuth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { 
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: req.user._id
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get loan analytics data
adminRouter.get('/analytics', userAuth, isAdmin, async (req, res) => {
  try {
    // Get loan status distribution
    const statusDistribution = await LoanApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get monthly loan applications
    const monthlyApplications = await LoanApplication.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Get loan type distribution
    const loanTypeDistribution = await LoanApplication.aggregate([
      {
        $group: {
          _id: '$loanType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    res.json({
      statusDistribution,
      monthlyApplications,
      loanTypeDistribution
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate reports
adminRouter.get('/reports/:type', userAuth, isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let data;
    switch (type) {
      case 'loans':
        data = await LoanApplication.find(query)
          .populate('userId', 'firstName lastName email phone')
          .sort({ createdAt: -1 });
        break;
      case 'users':
        data = await User.find(query)
          .select('-password')
          .sort({ createdAt: -1 });
        break;
      case 'financial':
        data = await LoanApplication.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              avgAmount: { $avg: '$amount' }
            }
          }
        ]);
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = adminRouter;