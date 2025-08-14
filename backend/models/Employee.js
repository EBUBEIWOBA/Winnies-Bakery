//in Employee Model
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Document Schema 
const documentSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now }
});

// Leave Schema
const leaveSchema = new Schema({
  startDate: { type: Date, required: true },
  endDate: {
    type: Date, required: true,
    validate: {
      validator: function (endDate) {
        return endDate >= this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  type: {
    type: String,
    enum: ['vacation', 'sick', 'personal', 'emergency'], required: true
  },
  status: {
    type: String, required: true,
    enum: ['pending', 'approved', 'rejected'], default: 'pending'
  },
  notes: String,
  days: {
    type: Number, default: function () {
      if (!this.startDate || !this.endDate) return 0;
      const diffTime = Math.abs(this.endDate - this.startDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function (_, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Attendance Schema
const attendanceSchema = new Schema({
  date: {
    type: String, // Store as YYYY-MM-DD
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid date format (YYYY-MM-DD)!`
    }
  },
  clockIn: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:mm or HH:mm:ss)!`
    }
  },
  clockOut: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:mm or HH:mm:ss)!`
    }
  },
  status: {
    type: String,
    enum: ['pending', 'present', 'late', 'absent', 'on leave', 'in-progress', 'half-day'],
    default: 'pending'
  },
  location: {
    type: String,
    required: true,
    default: 'Main Bakery'
  },
  notes: String,
  managerNote: String,
  hoursWorked: {
    type: Number,
    min: 0,
    max: 24
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  toJSON: { getters: true },
  toObject: { getters: true }
});


// Performance Schema
const performanceSchema = new Schema({
  date: { type: Date, default: Date.now },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer'
    }
  },
  sales: Number,
  feedback: String
});

// Shift Schema
const shiftSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  position: { type: String, required: true },
  start: { type: Date, required: true },
  end: {
    type: Date, required: true,
    validate: {
      validator: function (end) {
        return end >= this.start;
      },
      message: 'End datetime must be after start datetime'
    }
  },
  location: { type: String, default: 'Main Bakery' },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: String
}, { timestamps: true });

// Employee Schema 
const EmployeeSchema = new Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[a-zA-Z\s\-']+$/.test(v);
      },
      message: 'First name contains invalid characters'
    }
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[a-zA-Z\s\-']+$/.test(v);
      },
      message: 'Last name contains invalid characters'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: props => `${props.value} is not a valid email!`
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function (v) {
        return /^\+?[\d\s\-().]{7,20}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
    validate: {
      validator: function (v) {
        if (v.startsWith('$2a$')) return true; // Already hashed
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/.test(v);
      },
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long'
    }
  },
  previousPasswords: {
    type: [String],
    select: false,
    max: [5, 'Cannot store more than 5 previous passwords']
  },
  photo: {
    type: String,
    default: null,
    validate: {
      validator: function (v) {
        if (v === null || v === undefined || v === '') return true;
        return (
          v.startsWith('employees/') ||
          v.startsWith('uploads/employees/') ||
          v.startsWith('/uploads/employees/') ||
          validator.isURL(v, { protocols: ['http', 'https'], require_protocol: true }) ||
          /^[a-z0-9_\-.]+\.(jpg|jpeg|png|gif|webp)$/i.test(v)
        );
      },
      message: props => `${props.value} is not a valid photo path!`
    }
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'manager', 'employee', 'staff'],
      message: '{VALUE} is not a valid role'
    },
    default: 'employee'
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'on leave'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },
  department: {
    type: String,
    enum: {
      values: ['bakery', 'sales', 'management', 'delivery'],
      message: '{VALUE} is not a valid department'
    },
    required: [true, 'Department is required']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  salary: {
    type: Number,
    default: 0,
    min: [0, 'Salary cannot be negative'],
    set: v => Math.round(v * 100) / 100,
    get: v => v.toFixed(2)
  },
  hireDate: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function (v) {
        return v <= Date.now();
      },
      message: 'Hire date cannot be in the future'
    }
  },
  lastActive: {
    type: Date,
    validate: {
      validator: function (v) {
        return !v || v <= Date.now();
      },
      message: 'Last active date cannot be in the future'
    }
  },
  documents: [documentSchema],
  leaves: [leaveSchema],
  attendance: [attendanceSchema],
  performance: [performanceSchema],
  schedule: {
    shifts: [{
      type: Schema.Types.ObjectId,
      ref: 'Shift',
      validate: {
        validator: async function (v) {
          const shift = await mongoose.model('Shift').findById(v);
          return !!shift;
        },
        message: 'Shift does not exist'
      }
    }],
    preferredHours: {
      type: Number,
      min: [0, 'Preferred hours cannot be negative'],
      max: [40, 'Preferred hours cannot exceed 40']
    },
    availability: {
      monday: Boolean,
      tuesday: Boolean,
      wednesday: Boolean,
      thursday: Boolean,
      friday: Boolean,
      saturday: Boolean,
      sunday: Boolean
    }
  },
  tokens: [{
    token: {
      type: String,
      required: true
    },
    ipAddress: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '30d'
    }
  }],
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  passwordChangedAt: Date
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.tokens;
      delete ret.__v;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.previousPasswords;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpire;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpire;
      return ret;
    }
  }
});

// Virtuals
EmployeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Middleware
EmployeeSchema.pre('save', function (next) {
  if (this.isNew) {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'department', 'position'];
    const missingFields = requiredFields.filter(field => !this[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }
  next();
});

EmployeeSchema.pre('save', async function (next) {
  if (this.isModified('password') && !this.password.startsWith('$2a$')) {
    // Validate password format
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

    if (!passwordRegex.test(this.password)) {
      const err = new mongoose.Error.ValidationError(this);
      err.errors.password = new mongoose.Error.ValidatorError({
        message: 'Password must contain uppercase, lowercase, number, special character, and be at least 8 characters',
        path: 'password',
        value: this.password
      });
      return next(err);
    }

    // Hash the password
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      this.passwordChangedAt = Date.now();
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Methods
EmployeeSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
      isEmailVerified: this.isEmailVerified
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );

  this.tokens.push({
    token,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent
  });

  return token;
};

EmployeeSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

EmployeeSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  console.log('Generated verification token:', {
    plainToken: verificationToken,
    hashedToken: this.emailVerificationToken,
    expires: new Date(this.emailVerificationExpire)
  });

  return verificationToken;
};


EmployeeSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || typeof candidatePassword !== 'string' || candidatePassword.trim() === '') {
    throw new Error('Password cannot be empty');
  }

  try {
    // Direct comparison for temporary passwords
    if (!candidatePassword.startsWith('$2a$') && candidatePassword === this.password) {
      return true;
    }

    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error('Password comparison error:', err);
    return false;
  }
};

EmployeeSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Statics
EmployeeSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

EmployeeSchema.statics.paginate = async function (query = {}, options = {}) {
  // Default values
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const sort = options.sort || '-createdAt';

  // Process filters
  const filterQuery = { ...query };

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null && value !== '') {
        // Handle different filter types
        if (key === 'search') {
          filterQuery.$or = [
            { firstName: { $regex: value, $options: 'i' } },
            { lastName: { $regex: value, $options: 'i' } },
            { email: { $regex: value, $options: 'i' } },
            { position: { $regex: value, $options: 'i' } }
          ];
        }
        // Handle status filter
        else if (key === 'status') {
          filterQuery.status = { $in: Array.isArray(value) ? value : [value] };
        }
        // Handle date range filters
        else if (key.endsWith('After') || key.endsWith('Before')) {
          const dateField = key.replace(/(After|Before)$/, '');
          const operator = key.endsWith('After') ? '$gte' : '$lte';

          if (!isNaN(new Date(value).getTime())) {
            filterQuery[dateField] = filterQuery[dateField] || {};
            filterQuery[dateField][operator] = new Date(value);
          }
        }
        // Handle exact matches for IDs
        else if (key.endsWith('Id') && mongoose.Types.ObjectId.isValid(value)) {
          filterQuery[key] = value;
        }
        // Handle other fields
        else {
          filterQuery[key] = value;
        }
      }
    }
  }

  const skip = (page - 1) * limit;

  try {
    const [results, total] = await Promise.all([
      this.find(filterQuery)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),
      this.countDocuments(filterQuery)
    ]);

    return {
      success: true,
      data: results,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    console.error('Pagination error:', error);
    return {
      success: false,
      error: 'Failed to fetch paginated results',
      details: error.message
    };
  }
};

// Indexes
EmployeeSchema.index({ email: 1 }, { unique: true });
EmployeeSchema.index({ role: 1, status: 1 });
EmployeeSchema.index({ department: 1, status: 1 });
EmployeeSchema.index({ isEmailVerified: 1 });
EmployeeSchema.index({ 'tokens.token': 1 });
EmployeeSchema.index({ 'attendance.date': 1 });
EmployeeSchema.index({ 'leaves.startDate': 1, 'leaves.endDate': 1 });
EmployeeSchema.index({ 'performance.date': 1 });
EmployeeSchema.index({ 'schedule.shifts': 1 });

// Models
const Employee = mongoose.model('Employee', EmployeeSchema);
const Shift = mongoose.model('Shift', shiftSchema);
const Leave = mongoose.model('Leave', leaveSchema);

module.exports = { Employee, Shift, Leave };