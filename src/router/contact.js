const express = require('express');
const nodemailer = require('nodemailer');
const contactRouter = express.Router();

// Email configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
        }
    });
};

// Contact form submission
contactRouter.post('/send-message', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, subject, message } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Create email content
        const emailContent = `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
            <hr>
            <p><small>Sent from Loan Portal Contact Form</small></p>
        `;

        // Create transporter
        const transporter = createTransporter();

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@loanportal.com',
            to: 'irfanraz67@gmail.com', // Your specified email
            subject: `Contact Form: ${subject || 'New Message from ' + firstName}`,
            html: emailContent,
            replyTo: email
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // Send confirmation email to user
        const confirmationOptions = {
            from: process.env.EMAIL_USER || 'noreply@loanportal.com',
            to: email,
            subject: 'Thank you for contacting us - Loan Portal',
            html: `
                <h2>Thank you for your message!</h2>
                <p>Dear ${firstName},</p>
                <p>We have received your message and will get back to you within 24 hours.</p>
                <p><strong>Your message:</strong></p>
                <p>${message}</p>
                <br>
                <p>Best regards,<br>Loan Portal Team</p>
            `
        };

        await transporter.sendMail(confirmationOptions);

        res.json({
            success: true,
            message: 'Message sent successfully! We will get back to you within 24 hours.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
});

module.exports = { contactRouter };