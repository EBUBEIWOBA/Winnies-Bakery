// Admin Auth Controller
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Employee } = require('../models/Employee');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const { getFullUrl } = require('../utils/helpers');

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('🔑 [ADMIN LOGIN] Request received:', { email });

  try {
    // 1. Validate input
    if (!email || !password) {
      console.warn('⚠️ [ADMIN LOGIN] Validation failed: Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Both email and password are required'
      });
    }

    console.log('🔍 [ADMIN LOGIN] Searching for admin with email:', email);

    // 2. Find admin user with case-insensitive email (fixed regex)
    const escapedEmail = escapeRegExp(email);
    const admin = await Employee.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') },
      role: 'admin'
    }).select('+password +status +loginAttempts +lockUntil +isEmailVerified');

    if (!admin) {
      console.warn('❌ [ADMIN LOGIN] Admin not found for email:', email);
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_ERROR',
        message: 'Invalid credentials'
      });
    }

    console.log('✅ [ADMIN LOGIN] Admin found:', { id: admin._id, email: admin.email });

    // 3. Check if account is locked
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((admin.lockUntil - Date.now()) / (60 * 1000));
      console.warn(`🔒 [ADMIN LOGIN] Account locked for ${minutesLeft} minute(s)`, { id: admin._id });
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: `Account temporarily locked. Try again in ${minutesLeft} minute(s)`
      });
    }

    // 4. Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.warn('❌ [ADMIN LOGIN] Incorrect password attempt for:', { id: admin._id, email: admin.email });

      // Increment failed login attempts
      admin.loginAttempts += 1;

      // Lock account after 5 failed attempts for 30 minutes
      if (admin.loginAttempts >= 5) {
        admin.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
        console.warn(`🔒 [ADMIN LOGIN] Account locked due to too many failed attempts`, { id: admin._id });
        admin.loginAttempts = 0;
      }

      await admin.save();

      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_ERROR',
        message: 'Invalid credentials',
        attemptsLeft: 5 - admin.loginAttempts
      });
    }

    // 5. Reset login attempts on successful login
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    console.log('✅ [ADMIN LOGIN] Login successful, generating JWT...', { id: admin._id });

    // 6. Create JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        email: admin.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '30d'
      }
    );

    // 7. Set secure HTTP-only cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    console.log('🎫 [ADMIN LOGIN] JWT cookie set, sending response to client');

    // 8. Send response
    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
        photo: admin.photo ? getFullUrl(admin.photo) : null, // Fixed here
        lastLogin: admin.lastLogin
      }
    });

    console.log('✅ [ADMIN LOGIN] Login process completed successfully for:', email);

  } catch (error) {
    console.error('🔥 [ADMIN LOGIN] Unexpected error during login:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'An unexpected error occurred during login'
    });
  }
});

const adminLogout = asyncHandler(async (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.cookie('adminToken', '', {
      httpOnly: true,
      expires: new Date(0),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'LOGOUT_FAILED',
      message: 'Logout failed'
    });
  }
});

const updateAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate input
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'All password fields are required',
      code: 'PWD_001'
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'New password and confirmation do not match',
      code: 'PWD_002'
    });
  }

  try {
    const admin = await Employee.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_ERROR',
        message: 'Current password is incorrect',
        code: 'PWD_003'
      });
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must contain at least: one uppercase letter, one lowercase letter, one number, one special character (@$!%*?&), and be at least 8 characters long',
        code: 'PWD_004'
      });
    }

    // Update password with proper hashing
    admin.password = newPassword;
    admin.passwordChangedAt = Date.now(); // Invalidate existing tokens
    await admin.save(); // Pre-save hook will hash the password

    // Generate new token
    const newToken = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Update cookie with new token
    res.cookie('adminToken', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(200).json({
      success: true,
      token: newToken,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: firstError.message,
        code: 'PWD_005'
      });
    }

    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Password update failed',
      code: 'PWD_500'
    });
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Email is required',
      code: 'FP_001'
    });
  }

  try {
    const admin = await Employee.findOne({ email: email.toLowerCase(), role: 'admin' });

    if (!admin) {
      // Don't reveal if email doesn't exist for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = admin.createPasswordResetToken();
    await admin.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/admin/reset-password/${resetToken}`;

    // Email message
    const message = `You requested a password reset. Please click the following link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`;

    try {
      await sendEmail({
        email: admin.email,
        subject: 'Your password reset token (valid for 10 min)',
        message
      });

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent'
      });
    } catch (err) {
      // Reset token if email fails
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'EMAIL_ERROR',
        message: 'There was an error sending the email. Try again later.',
        code: 'FP_500'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Password reset failed. Please try again.',
      code: 'FP_502'
    });
  }
});

// Reset Password
const resetPassword = asyncHandler(async (req, res) => {
  try {
    // Get hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const admin = await Employee.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token is invalid or has expired',
        code: 'RP_001'
      });
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must contain at least: one uppercase letter, one lowercase letter, one number, one special character (@$!%*?&), and be at least 8 characters long',
        code: 'RP_002'
      });
    }

    // Set new password
    admin.password = req.body.password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    admin.passwordChangedAt = Date.now(); // Invalidate existing tokens
    await admin.save();

    // Generate new token for auto-login
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Set cookie with new token
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Return response without sensitive data
    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.tokens;

    res.status(200).json({
      success: true,
      token,
      admin: adminData,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Password reset failed. Please try again.',
      code: 'RP_500'
    });
  }
});

const verifyAdminToken = asyncHandler(async (req, res) => {
  try {
    const token = req.cookies.adminToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Employee.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check if password changed after token was issued
    if (admin.passwordChangedAt && decoded.iat * 1000 < admin.passwordChangedAt.getTime()) {
      return res.status(401).json({
        success: false,
        message: 'Password changed, please reauthenticate'
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
    photo: admin.photo ? getFullUrl(admin.photo) : null }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

const adminRegister = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, position, department, password } = req.body;

  // Validate input
  if (!firstName || !lastName || !email || !phone || !position || !department || !password) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'All fields are required',
      code: 'REG_001'
    });
  }

  try {
    // Check if email already exists (case insensitive)
    const existingAdmin = await Employee.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: 'Email already in use',
        code: 'REG_003'
      });
    }

    // Check current number of admin accounts
    const adminCount = await Employee.countDocuments({ role: 'admin' });
    const MAX_ADMINS = 3;

    if (adminCount >= MAX_ADMINS) {
      return res.status(403).json({
        success: false,
        error: 'ADMIN_LIMIT_REACHED',
        message: `Maximum number of admin accounts (${MAX_ADMINS}) already created`,
        code: 'REG_006'
      });
    }

    // Create new admin
    const admin = new Employee({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      position,
      department,
      password,
      role: 'admin',
      isEmailVerified: true,
      status: 'active',
      hireDate: new Date(),
      photo: null 

    });

    // Save admin (password will be hashed by pre-save hook)
    await admin.save();

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Return response without sensitive data
    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.tokens;

    res.status(201).json({
      success: true,
      token,
      admin: {
        ...adminData,
        photo: getFullUrl(adminData.photo)
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: firstError.message,
        code: 'REG_004'
      });
    }

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: 'Email already in use',
        code: 'REG_003'
      });
    }

    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Registration failed. Please try again.',
      code: 'REG_500'
    });
  }
});

const updateAdminProfile = asyncHandler(async (req, res) => {
  try {
    const { firstName, lastName, phone, address, removeAvatar } = req.body;
    let avatarPath = null;

    // Handle file upload if present
    if (req.file) {
      // Use the filename generated by Multer
      avatarPath = req.file.filename;
    }

    // Prepare update object
    const updateData = {
      firstName,
      lastName,
      phone: phone || null, // Handle empty phone
      address
    };

    // Handle avatar
    if (avatarPath) {
      updateData.photo = avatarPath;
    } else if (removeAvatar === 'true') {
      updateData.photo = null;
    }

    // Update admin profile
    const admin = await Employee.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password -tokens -loginAttempts -lockUntil');

    if (!admin) {
      throw new Error('Admin not found');
    }

    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        address: admin.address,
        role: admin.role,
        photo: getFullUrl(admin.photo)
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);

    // Clean up uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(400).json({
      success: false,
      error: 'PROFILE_UPDATE_FAILED',
      message: error.message || 'Failed to update profile',
      ...(error.name === 'ValidationError' && {
        validationErrors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      })
    });
  }
});

const adminSettings = asyncHandler(async (req, res) => {
  try {
    const { notifications, emailAlerts } = req.body;

    const admin = await Employee.findByIdAndUpdate(
      req.user._id,
      { settings: { notifications, emailAlerts } },
      { new: true }
    ).select('-password -tokens');

    res.status(200).json({
      success: true,
      settings: admin.settings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'SETTINGS_UPDATE_FAILED',
      message: error.message
    });
  }
});

const getAdmins = asyncHandler(async (req, res) => {
  try {
    const admins = await Employee.find({ role: 'admin' })
      .select('-password -tokens -loginAttempts -lockUntil -previousPasswords');

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch admins'
    });
  }
});

module.exports = {
  adminLogin,
  adminLogout,
  forgotPassword,
  resetPassword,
  verifyAdminToken,
  adminRegister,
  updateAdminProfile,
  adminSettings,
  updateAdminPassword,
  getAdmins
};