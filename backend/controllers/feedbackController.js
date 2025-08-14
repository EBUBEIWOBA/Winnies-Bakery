const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const nodemailer = require('nodemailer');

// Email Transporter Configuration
const createTransporter = () => {
    try {
        if (
            !process.env.EMAIL_USERNAME ||
            !process.env.EMAIL_PASSWORD ||
            !process.env.EMAIL_FROM
        ) {
            throw new Error('Email configuration missing');
        }

        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    } catch (err) {
        console.error('Transporter creation failed:', err.message);
        return null;
    }
};

// Get all feedback with pagination and filtering
exports.getAllFeedback = catchAsync(async (req, res, next) => {
    const { status, feedbackType, search, sort, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (feedbackType) query.feedbackType = feedbackType;
    if (search) query.$text = { $search: search };

    const total = await Feedback.countDocuments(query);
    const feedback = await Feedback.find(query)
        .sort(sort || '-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.set({
        'X-Total-Count': total,
        'X-Page': page,
        'X-Limit': limit,
        'Access-Control-Expose-Headers': 'X-Total-Count, X-Page, X-Limit'
    });

    res.status(200).json({
        status: 'success',
        results: feedback.length,
        total,
        data: feedback
    });
});

// Get single feedback by ID
exports.getFeedback = catchAsync(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new AppError('Invalid ID format', 400));
    }
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
        return next(new AppError('No feedback found with that ID', 404));
    }
    res.status(200).json({
        status: 'success',
        data: feedback
    });
});

// Create new feedback
exports.createFeedback = catchAsync(async (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        return next(new AppError('Request body cannot be empty', 400));
    }

    const requiredFields = ['customerName', 'email', 'rating', 'message', 'visitDate'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
        return next(new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400));
    }

    const newFeedback = await Feedback.create({
        customerName: req.body.customerName,
        email: req.body.email,
        rating: req.body.rating,
        feedbackType: req.body.feedbackType || 'suggestion',
        message: req.body.message,
        visitDate: req.body.visitDate
    });

    res.status(201).json({
        status: 'success',
        data: newFeedback
    });
});

exports.updateFeedback = catchAsync(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new AppError('Invalid ID format', 400));
    }

    const { response, status } = req.body;

    if (!response && !status) {
        return next(new AppError('No update data provided', 400));
    }

    // Find and validate feedback exists
    const currentFeedback = await Feedback.findById(req.params.id);
    if (!currentFeedback) {
        return next(new AppError('No feedback found with that ID', 404));
    }

    // Update feedback
    const feedback = await Feedback.findByIdAndUpdate(
        req.params.id,
        { response, status },
        { new: true, runValidators: true }
    );

    if (!feedback) {
        return next(new AppError('Update failed - no feedback found', 404));
    }

    // Email handling with improved error management
    if (response && response !== currentFeedback.response) {
        try {
            const transporter = createTransporter();
            if (!transporter) {
                throw new Error('Email transporter not configured');
            }

            await transporter.verify(); // Verify connection first

            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: feedback.email,
                subject: 'Response to your feedback',
                text: `Dear ${feedback.customerName},\n\n${response}\n\nBest regards,\nWinnie's Bakery`,
                html: `<p>Dear ${feedback.customerName},</p>
         <p>${response}</p>
         <p>Best regards,<br>Winnie's Bakery</p>`
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);
        } catch (emailError) {
            console.error('Email failed:', {
                error: emailError.message,
                stack: emailError.stack,
                host: process.env.EMAIL_HOST
            });
            feedback.emailError = emailError.message;
        }
    }

    res.status(200).json({
        status: 'success',
        data: {
            feedback,
            emailStatus: feedback.emailError ? 'failed' : 'sent'
        }
    });
});

// Delete feedback
exports.deleteFeedback = catchAsync(async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next(new AppError('Invalid ID format', 400));
    }

    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
        return next(new AppError('No feedback found with that ID', 404));
    }
    res.status(204).json({
        status: 'success',
        data: null
    });
});

// Get feedback statistics
exports.getFeedbackStats = catchAsync(async (req, res, next) => {
    const stats = await Feedback.aggregate([
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        },
        { $sort: { _id: 1 } },
        {
            $group: {
                _id: null,
                totalFeedback: { $sum: '$count' },
                avgRating: { $avg: '$avgRating' },
                ratings: { $push: '$$ROOT' }
            }
        },
        { $project: { _id: 0 } }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats: stats[0] || { totalFeedback: 0, avgRating: 0, ratings: [] }
        }
    });
});