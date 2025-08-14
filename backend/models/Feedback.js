// models/Feedback.js
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Please provide customer name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  rating: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  feedbackType: {
    type: String,
    enum: {
      values: ['compliment', 'complaint', 'suggestion'],
      message: 'Feedback type must be either compliment, complaint, or suggestion'
    },
    default: 'suggestion'
  },
  message: {
    type: String,
    required: [true, 'Please provide feedback message'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  response: {
    type: String,
    trim: true,
    maxlength: [1000, 'Response cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'resolved', 'archived'],
      message: 'Status must be either pending, resolved, or archived'
    },
    default: 'pending'
  },
  visitDate: {
    type: Date,
    required: [true, 'Please provide visit date'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Visit date cannot be in the future'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text index for search
feedbackSchema.index({
  customerName: 'text',
  email: 'text',
  message: 'text',
  response: 'text'
});

// Add pre-save hook to validate data
feedbackSchema.pre('save', function(next) {
  if (this.response && this.status === 'pending') {
    this.status = 'resolved';
  }
  next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);