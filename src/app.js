const express = require('express');

require('dotenv').config();

const { connectToDB } = require('./config/database');
const { appRouter } = require('./router/auth');
const { userRouter } = require('./router/user');
const { loanRouter } = require('./router/loan');
const { paymentRouter } = require('./router/payment');
const adminRouter = require('./router/admin');
const { contactRouter } = require('./router/contact');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://localhost:8080', 
        'http://localhost:8081',
        'http://localhost:8082',
        'https://your-frontend-domain.vercel.app', // Add your frontend Vercel URL here
        /\.vercel\.app$/ // Allow all Vercel domains
    ],
    credentials: true, // Allow cookies to be sent with requests
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Root route for Vercel
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Irfan Loan Portal API is running',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth/*',
            user: '/api/user/*',
            loan: '/api/loan/*',
            payment: '/api/payment/*',
            admin: '/api/admin/*',
            contact: '/api/contact/*'
        }
    });
});

// Routes
app.use('/api/auth', appRouter);  // Frontend expects /api/auth/*
app.use('/api/user', userRouter);
app.use('/api/loan', loanRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contact', contactRouter);

// Backward compatibility routes
app.use('/auth', appRouter);
app.use('/user', userRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        availableRoutes: [
            'GET /',
            'GET /api/health',
            'POST /api/auth/signup',
            'POST /api/auth/login',
            'POST /api/contact/send-message',
            'GET /api/user/profile',
            'POST /api/loan/apply'
        ]
    });
});

console.log("SECRET_KEY:", process.env.SECRET_KEY ? "Set" : "Not set");

connectToDB()
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Could not connect to MongoDB", err));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});