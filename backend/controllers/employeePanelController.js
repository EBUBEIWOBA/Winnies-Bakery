const crypto = require('crypto');
const { Employee } = require('../models/Employee');
const { calculateHoursWorked } = require('../utils/attendanceUtils');
const validator = require('validator');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/sendEmail');
const { getFullUrl } = require('../utils/helpers');


// Helper function to format consistent response
function getProfileResponseData(employee) {
  return {
    _id: employee._id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    position: employee.position,
    phone: employee.phone || '',
    address: employee.address || '',
    photoUrl: getFullUrl(employee.photo),
    status: employee.status,
    department: employee.department,
    hireDate: employee.hireDate,
    salary: employee.salary || 0
  };
}

const getVerificationEmailTemplate = (name, verificationUrl) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { 
            display: inline-block; 
            padding: 10px 20px; 
            background-color: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
        }
        .footer { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
            font-size: 12px; 
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Email Verification</h2>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for registering with Winnies Bakery. Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><small>${verificationUrl}</small></p>
            <p>This link will expire in 24 hours.</p>
        </div>
        <div class="footer">
            <p>If you didn't request this email, you can safely ignore it.</p>
            <p>&copy; ${new Date().getFullYear()} Winnies Bakery. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const sendVerificationEmail = async (employee) => {
  try {
    // Generate new token if none exists or expired
    if (!employee.emailVerificationToken || 
        new Date(employee.emailVerificationExpire) < new Date()) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      employee.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
      
      employee.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      
      await employee.save({ validateBeforeSave: false });
      
      const verificationUrl = `${process.env.FRONTEND_URL}/employee/auth/verify-email/${verificationToken}`;

      if (process.env.NODE_ENV !== 'test') {
        await sendEmail({
          email: employee.email,
          subject: 'Verify Your Email - Winnies Bakery',
          html: getVerificationEmailTemplate(employee.firstName, verificationUrl)
        });
        console.log(`Verification email sent to ${employee.email}`);
      }
    } else {
      // Use existing token if valid
      const verificationToken = employee.emailVerificationToken;
      const verificationUrl = `${process.env.FRONTEND_URL}/employee/auth/verify-email/${verificationToken}`;
      
      if (process.env.NODE_ENV !== 'test') {
        await sendEmail({
          email: employee.email,
          subject: 'Verify Your Email - Winnies Bakery',
          html: getVerificationEmailTemplate(employee.firstName, verificationUrl)
        });
        console.log(`Verification email sent to ${employee.email}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
};

// Verify email endpoint - returns HTML response
const verifyEmail = asyncHandler(async (req, res) => {
   const token = req.params.token?.toLowerCase();

  console.log('Verification token received:', token); // Log the token

  if (!token) {
    console.log('No token provided');
    return res.status(400).json({
      success: false,
      message: 'Verification token is required'
    });
  }

  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log('Hashed token:', hashedToken); // Log the hashed token

    const employee = await Employee.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!employee) {
      console.log('No employee found with this token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    employee.isEmailVerified = true;
    employee.emailVerificationToken = undefined;
    employee.emailVerificationExpire = undefined;
    employee.isActive = true;
    await employee.save();

    const authToken = employee.generateAuthToken();


    const responseData = {
      success: true,
      message: 'Email verified successfully',
      token: authToken,
      employee: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        isEmailVerified: employee.isEmailVerified
      }
    };

    console.log('Sending successful response:', responseData); // Log the response
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
});

// Resend verification email
const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const employee = await Employee.findOne({ email: email.toLowerCase() })
    .select('+isEmailVerified +emailVerificationToken +emailVerificationExpire');

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  if (employee.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email is already verified'
    });
  }

  try {
    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    employee.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    
    employee.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    await employee.save({ validateBeforeSave: false });
    
    const verificationUrl = `${process.env.FRONTEND_URL}/employee/auth/verify-email/${verificationToken}`;

    await sendEmail({
      email: employee.email,
      subject: 'Verify Your Email - Winnies Bakery',
      html: getVerificationEmailTemplate(employee.firstName, verificationUrl)
    });
    
    res.status(200).json({
      success: true,
      message: 'Verification email resent'
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

const employeeLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  try {
    // Find employee with password and status
    const employee = await Employee.findOne({ email: email.toLowerCase() })
      .select('+password +status +isEmailVerified +loginAttempts +lockUntil')
      .lean();

    if (!employee) {
      const employeeCount = await Employee.countDocuments();
      if (employeeCount === 0) {
        return res.status(401).json({
          success: false,
          message: 'No accounts exist. Please contact system administrator to create the first account.',
          isFirstTimeSetup: true
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }

    // Account lock check
    if (employee.lockUntil && employee.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((employee.lockUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: `Account locked. Try again in ${retryAfter} minutes`
      });
    }

    // Compare passwords - handle temporary passwords
    let isMatch = false;
    if (password === employee.password) {
      // Temporary password match (plain text comparison)
      isMatch = true;
    } else {
      // Regular bcrypt comparison
      isMatch = await bcrypt.compare(password, employee.password);
    }

    if (!isMatch) {
      // Increment login attempts
      await Employee.updateOne(
        { _id: employee._id },
        { $inc: { loginAttempts: 1 } }
      );

      // Lock account after 5 failed attempts
      if (employee.loginAttempts + 1 >= 5) {
        const lockTime = Date.now() + 30 * 60 * 1000; // 30 minutes lock
        await Employee.updateOne(
          { _id: employee._id },
          { $set: { lockUntil: lockTime }, $inc: { loginAttempts: 1 } }
        );
        return res.status(429).json({
          success: false,
          message: 'Too many failed attempts. Account locked for 30 minutes.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password',
        attemptsLeft: 4 - (employee.loginAttempts || 0)
      });
    }

    // Reset login attempts on successful login
    await Employee.updateOne(
      { _id: employee._id },
      { $set: { loginAttempts: 0, lockUntil: null } }
    );

    // Check email verification
    if (!employee.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox or spam folder.',
        email: employee.email,
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check account status
    if (employee.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${employee.status}. Please contact HR.`
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: employee._id, role: employee.role, email: employee.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    // Update employee record
    await Employee.findByIdAndUpdate(
      employee._id,
      {
        $push: {
          tokens: {
            token,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        },
        lastActive: new Date()
      }
    );

    res.status(200).json({
      success: true,
      token,
      employee: {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: employee.role,
        photo: employee.photo ? getFullUrl(employee.photo) : null
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ email: req.body.email });

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'There is no employee with that email address.'
    });
  }

  // Create reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  employee.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  employee.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  await employee.save({ validateBeforeSave: false });

  const resetURL = `${process.env.FRONTEND_URL}/employee/reset-password/${resetToken}`;

  try {
    await sendEmail({
      email: employee.email,
      subject: 'Your password reset token (valid for 10 min)',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetURL}" 
            style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
          <p>Or copy this link to your browser:</p>
          <p>${resetURL}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email!'
    });
  } catch (err) {
    employee.resetPasswordToken = undefined;
    employee.resetPasswordExpire = undefined;
    await employee.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message: 'There was an error sending the email. Try again later!'
    });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const employee = await Employee.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!employee) {
    return res.status(400).json({
      success: false,
      message: 'Token is invalid or has expired'
    });
  }

  // Set new password
  const salt = await bcrypt.genSalt(10);
  employee.password = await bcrypt.hash(req.body.password, salt);
  employee.resetPasswordToken = undefined;
  employee.resetPasswordExpire = undefined;

  // Invalidate all existing tokens
  employee.tokens = [];

  await employee.save();

  // Create new JWT token
  const token = jwt.sign(
    { id: employee._id, role: employee.role, email: employee.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );

  res.status(200).json({
    success: true,
    token,
    message: 'Password reset successfully!',
    employee: {
      id: employee._id,
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      role: employee.role
    }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const employeeId = req.user._id;

  try {
    const employee = await Employee.findById(employeeId).select('+password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Verify current password
    let isMatch = false;
    if (currentPassword === employee.password) {
      // Temporary password match
      isMatch = true;
    } else {
      // Regular bcrypt comparison
      isMatch = await bcrypt.compare(currentPassword, employee.password);
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long'
      });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    employee.password = await bcrypt.hash(newPassword, salt);
    await employee.save();

    // Invalidate all tokens except current one
    const currentToken = req.headers.authorization.split(' ')[1];
    employee.tokens = employee.tokens.filter(tokenObj => tokenObj.token === currentToken);
    await employee.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

const employeeLogout = asyncHandler(async (req, res) => {
  try {
    // Validate authorization header
    if (!req.headers.authorization) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing'
      });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employeeId = decoded.id;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    employee.tokens = employee.tokens.filter(t => t.token !== token);
    await employee.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);

    // Handle specific JWT errors
    let message = 'Failed to logout';
    if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token';
    } else if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    }

    res.status(500).json({
      success: false,
      message
    });
  }
});

const getDashboard = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const employee = await Employee.findById(employeeId)
      .select('schedule attendance leaves firstName lastName position')
      .populate({
        path: 'schedule.shifts',
        select: 'start end location', // FIXED: Use start/end instead of startDate/endDate
        options: { limit: 5 }
      })
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Handle missing schedule
    if (!employee.schedule) {
      employee.schedule = { shifts: [] };
    }

    // Get Lagos time
    const lagosNow = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
    const today = new Date(lagosNow).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' });
    const todayDate = new Date(lagosNow);
    todayDate.setHours(0, 0, 0, 0);

    // Validate and format today's shift
    let todaysShift = null;
    if (employee.schedule?.shifts) {
      for (const shift of employee.schedule.shifts) {
        try {
          const shiftStart = new Date(shift.start);
          if (isNaN(shiftStart)) continue;

          // Convert shift date to Lagos time
          const shiftDate = new Date(shiftStart.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
          const shiftDateStr = shiftDate.toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' });

          if (shiftDateStr === today) {
            const start = new Date(shiftStart);
            const end = new Date(shift.end);

            todaysShift = {
              location: shift.location,
              startTime: start.toLocaleTimeString('en-NG', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Africa/Lagos',
                hour12: false
              }),
              endTime: end.toLocaleTimeString('en-NG', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Africa/Lagos',
                hour12: false
              })
            };
            break;
          }
        } catch (error) {
          console.error(`Error processing shift ${shift._id}:`, error);
        }
      }
    }

    const upcomingShifts = (employee.schedule?.shifts || [])
      .filter(shift => {
        try {
          const shiftStart = new Date(shift.start);
          if (isNaN(shiftStart)) return false;

          // Convert to Lagos time for accurate comparison
          const shiftDate = new Date(shiftStart.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
          shiftDate.setHours(0, 0, 0, 0);

          return shiftDate >= todayDate;
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5)
      .map(shift => {
        try {
          const start = new Date(shift.start);
          const end = new Date(shift.end);

          // Validate dates
          if (isNaN(start) || isNaN(end)) {
            console.warn(`Invalid date in shift ${shift._id}`);
            return null;
          }

          return {
            ...shift,
            day: start.toLocaleDateString('en-US', {
              weekday: 'short',
              timeZone: 'Africa/Lagos'
            }),
            date: start.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: 'Africa/Lagos'
            }),
            startTime: start.toLocaleTimeString('en-NG', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Lagos',
              hour12: false
            }),
            endTime: end.toLocaleTimeString('en-NG', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Lagos',
              hour12: false
            })
          };
        } catch (error) {
          console.error(`Error formatting shift ${shift._id}:`, error);
          return null;
        }
      })
      .filter(Boolean); // Remove null entries

    const pendingLeaves = employee.leaves?.filter(leave =>
      leave.status === 'pending' && new Date(leave.endDate) >= new Date()
    ).length || 0;

    const currentMonth = new Date(lagosNow).getMonth();
    const monthlyHours = employee.attendance?.reduce((total, record) => {
      try {
        const recordDate = new Date(record.date);
        if (recordDate.getMonth() === currentMonth && record.clockOut) {
          return total + parseFloat(calculateHoursWorked(record.clockIn, record.clockOut));
        }
      } catch (e) {
        console.error('Error processing attendance record:', e);
      }
      return total;
    }, 0) || 0;

    const attendanceChart = Array.from({ length: 30 }, (_, i) => {
      const date = moment().tz('Africa/Lagos').subtract(29 - i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      const displayDate = date.format('MMM D'); // Format for display
      const displayDay = date.format('ddd');    // Day abbreviation

      const record = employee.attendance?.find(a =>
        moment(a.date).isSame(date, 'day') ||
        a.date === dateStr
      );

      let hours = 0;
      if (record?.clockIn && record?.clockOut) {
        hours = calculateHoursWorked(record.clockIn, record.clockOut);
        hours = parseFloat(hours.toFixed(2));
      }

      return {
        date: displayDate,    // e.g., "Aug 10"
        day: displayDay,      // e.g., "Mon"
        fullDate: dateStr,    // e.g., "2023-08-10"
        hours: hours || 0
      };
    });

    res.json({
      success: true,
      data: {
        todaysShift,
        upcomingShifts,
        pendingLeaves,
        monthlyHours: monthlyHours.toFixed(2),
        attendanceChart,
        recentActivities: generateRecentActivities(employee)
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const generateRecentActivities = (employee) => {
  const activities = [];
  const recentAttendance = employee.attendance
    ?.sort((a, b) => new Date(b.date) - new Date(a.date))
    ?.slice(0, 3);

  recentAttendance?.forEach(record => {
    activities.push({
      date: new Date(record.date).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }),
      message: `Clocked ${record.clockOut ? 'out' : 'in'} at ${record.clockOut || record.clockIn}`,
      type: 'attendance'
    });
  });

  const recentLeaves = employee.leaves
    ?.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    ?.slice(0, 3 - activities.length);

  recentLeaves?.forEach(leave => {
    activities.push({
      date: new Date(leave.startDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }),
      message: `${leave.status} ${leave.type} leave`,
      type: 'leave'
    });
  });

  return activities.length > 0 ? activities : [{
    date: new Date().toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }),
    message: 'No recent activities',
    type: 'info'
  }];
};

const getProfile = asyncHandler(async (req, res) => {
  try {
    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const employeeId = req.user._id;
    const employee = await Employee.findById(employeeId)
      .select('-password -tokens -resetPasswordToken -resetPasswordExpire -__v')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Fixed default avatar path
    const photoUrl = employee.photo ? getFullUrl(employee.photo) : null;

    // Consistent response structure
    const responseData = {
      _id: employee._id,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email,
      position: employee.position,
      phone: employee.phone || '',
      address: employee.address || '',
      photoUrl,
      status: employee.status,
      department: employee.department,
      hireDate: employee.hireDate,
      salary: employee.salary || 0 // Add salary field
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const updateProfile = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;

    // Enhanced content-type checking
    if (!req.is('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type - must be multipart/form-data'
      });
    }

    const { phone, address } = req.body;
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Track changes with detailed logging
    let changesMade = false;
    const changeLog = [];

    if (phone !== undefined && phone !== employee.phone) {
      changeLog.push(`Phone changed from ${employee.phone} to ${phone}`);
      employee.phone = phone.trim();
      changesMade = true;
    }

    if (address !== undefined && address !== employee.address) {
      changeLog.push(`Address changed from ${employee.address} to ${address}`);
      employee.address = address.trim();
      changesMade = true;
    }

    if (req.file) {
      try {
        if (employee.photo) {
          const oldPhotoPath = path.join(__dirname, '../uploads', path.basename(employee.photo));
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
            changeLog.push(`Deleted old photo: ${employee.photo}`);
          }
        }
        employee.photo = req.file.filename;
        changeLog.push(`Uploaded new photo: ${req.file.filename}`);
        changesMade = true;
      } catch (error) {
        console.error('Error updating profile photo:', error);
        fs.unlinkSync(req.file.path);
        return res.status(500).json({
          success: false,
          message: 'Failed to update profile photo'
        });
      }
    }

    if (!changesMade) {
      console.log('No changes detected for employee:', employeeId);
      return res.status(200).json({
        success: true,
        message: 'No changes detected',
        data: getProfileResponseData(employee)
      });
    }

    // Save with additional validation
    await employee.save({ validateBeforeSave: true });
    console.log('Profile updated for employee:', employeeId, 'Changes:', changeLog);

    // Return fresh data from database to ensure consistency
    const updatedEmployee = await Employee.findById(employeeId)
      .select('-password -tokens -resetPasswordToken -resetPasswordExpire -__v')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: getProfileResponseData(updatedEmployee),
      changes: changeLog // For debugging
    });
  } catch (error) {
    console.error('Profile update error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

const recordAttendance = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { location, notes } = req.body;
    const action = req.originalUrl.includes('clock-in') ? 'clock-in' : 'clock-out';

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action type',
        code: 'INVALID_ACTION'
      });
    }

    // Use UTC dates for storage but local time for display
    const now = moment().tz('Africa/Lagos');
    const todayUTC = now.clone().utc().format('YYYY-MM-DD');
    const todayLocal = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm:ss');

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    // Initialize attendance array if it doesn't exist
    if (!employee.attendance) {
      employee.attendance = [];
    }

    // Find record using both UTC and local dates for backward compatibility
    let todayRecord = employee.attendance.find(record =>
      record.date === todayUTC || record.date === todayLocal
    );

    // Normalize date format to UTC for storage
    if (todayRecord && todayRecord.date === todayLocal) {
      todayRecord.date = todayUTC;
    }

    // Handle clock-in
    if (action === 'clock-in') {
      // Prevent clocking in more than once per day
      if (todayRecord && todayRecord.clockIn) {
        return res.status(400).json({
          success: false,
          message: 'You have already clocked in today',
          code: 'ALREADY_CLOCKED_IN',
          data: todayRecord
        });
      }

      // Minimum time between last clock-out and new clock-in (8 hours)
      const lastRecord = employee.attendance
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .find(record => record.clockOut);

      if (lastRecord) {
        const lastClockOut = moment.tz(`${lastRecord.date} ${lastRecord.clockOut}`, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos');
        const hoursSinceLastShift = now.diff(lastClockOut, 'hours', true);

        if (hoursSinceLastShift < 8) {
          return res.status(400).json({
            success: false,
            message: `You must wait at least 8 hours between shifts (${(8 - hoursSinceLastShift).toFixed(1)} hours remaining)`,
            code: 'MIN_SHIFT_INTERVAL'
          });
        }
      }

      // Validate location
      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Location is required for clock-in',
          code: 'LOCATION_REQUIRED'
        });
      }

      // Create new record with UTC date
      todayRecord = {
        date: todayUTC,
        clockIn: currentTime,
        clockOut: null,
        status: 'in-progress',
        location: location,
        notes: notes || '',
        hoursWorked: 0,
        lastUpdated: now.toDate()
      };

      // Check if late (after 9:15 AM)
      const lateThreshold = moment.tz('09:15:00', 'HH:mm:ss', 'Africa/Lagos');
      if (now.isAfter(lateThreshold)) {
        todayRecord.status = 'late';
      }

      employee.attendance.push(todayRecord);
    }
    // Handle clock-out
    else {
      if (!todayRecord) {
        return res.status(400).json({
          success: false,
          message: 'Clock in first before clocking out',
          code: 'NO_CLOCK_IN_RECORD'
        });
      }
      if (todayRecord.clockOut) {
        return res.status(400).json({
          success: false,
          message: 'Already clocked out today',
          code: 'ALREADY_CLOCKED_OUT'
        });
      }


      // Calculate clockInTime once and reuse it
      const clockInTime = moment.tz(`${todayRecord.date} ${todayRecord.clockIn}`, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos');

      // Minimum shift duration (30 minutes)
      const shiftDuration = now.diff(clockInTime, 'minutes');
      if (shiftDuration < 30) {
        return res.status(400).json({
          success: false,
          message: 'Minimum shift duration is 30 minutes',
          code: 'MIN_SHIFT_DURATION'
        });
      }

      todayRecord.clockOut = currentTime;
      todayRecord.lastUpdated = now.toDate();
      todayRecord.notes = notes || '';

      // Calculate hours worked with proper timezone handling
      const clockOutTime = moment.tz(`${todayUTC} ${currentTime}`, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos');

      let hoursWorked = clockOutTime.diff(clockInTime, 'hours', true);

      // Handle overnight shifts
      if (hoursWorked < 0) {
        hoursWorked += 24;
      }

      todayRecord.hoursWorked = parseFloat(hoursWorked.toFixed(2));

      // Determine final status
      if (hoursWorked >= 4) {
        todayRecord.status = todayRecord.status === 'late' ? 'late' : 'present';
      } else if (hoursWorked > 0) {
        todayRecord.status = 'half-day';
      } else {
        todayRecord.status = 'invalid';
      }
    }

    await employee.save();

    return res.json({
      success: true,
      message: `Successfully ${action.replace('-', ' ')}`,
      data: todayRecord
    });

  } catch (error) {
    console.error('Attendance error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      code: 'ATTENDANCE_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const getAttendance = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate, status } = req.query;

    // Validate date format if provided
    if (startDate && !moment(startDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format (YYYY-MM-DD required)',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    if (endDate && !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format (YYYY-MM-DD required)',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    const employee = await Employee.findById(employeeId)
      .select('attendance attendanceCorrections')
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    let attendance = employee.attendance || [];

    // Convert UTC dates to local time for filtering
    attendance = attendance.map(record => ({
      ...record,
      localDate: moment.utc(record.date).tz('Africa/Lagos').format('YYYY-MM-DD')
    }));

    // Filter by date range (using local dates)
    if (startDate && endDate) {
      attendance = attendance.filter(record =>
        record.localDate >= startDate && record.localDate <= endDate
      );
    }

    // Filter by status
    if (status) {
      attendance = attendance.filter(record =>
        record.status === status
      );
    }

    // Sort by date descending
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate stats based on filtered attendance
    const stats = calculateAttendanceStats(attendance);

    res.json({
      success: true,
      data: {
        records: attendance,
        stats,
        pendingCorrections: employee.attendanceCorrections?.filter(c => c.status === 'pending').length || 0
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      code: 'FETCH_ATTENDANCE_ERROR'
    });
  }
});

const calculateAttendanceStats = (attendance) => {
  // Initialize counters
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let totalHours = 0;
  let halfDays = 0;
  let correctionDays = 0;
  let inProgressDays = 0;

  // Current date for Nigeria timezone (UTC+1)
  const today = moment().tz('Africa/Lagos').format('YYYY-MM-DD');

  attendance.forEach(record => {
    // Count correction requests first
    if (record.correctionStatus === 'requested') {
      correctionDays++;
    }

    // Handle different statuses
    switch (record.status) {
      case 'present':
        presentDays++;
        break;
      case 'late':
        lateDays++;
        break;
      case 'absent':
        absentDays++;
        break;
      case 'half-day':
        halfDays++;
        break;
      case 'in-progress':
        inProgressDays++;
        break;
      default:
        // Handle pending records (only count as absent if it's a past date)
        if (record.localDate < today) {
          absentDays++;
        }
    }

    // Calculate hours worked for completed shifts
    if (record.clockIn && record.clockOut) {
      const start = moment.tz(`${record.date} ${record.clockIn}`, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos');
      const end = moment.tz(`${record.date} ${record.clockOut}`, 'YYYY-MM-DD HH:mm:ss', 'Africa/Lagos');

      let duration = moment.duration(end.diff(start));
      let hours = duration.asHours();

      if (hours < 0) hours += 24; // Handle overnight

      totalHours += hours;
    }
  });

  const totalDays = attendance.length;
  const attendedDays = presentDays + lateDays + halfDays;

  return {
    correctionDays,
    totalDays,
    presentDays,
    lateDays,
    absentDays,
    halfDays,
    inProgressDays,
    totalHours: parseFloat(totalHours.toFixed(2)),
    attendanceRate: totalDays > 0
      ? parseFloat((attendedDays / totalDays * 100).toFixed(2))
      : 0
  };
};

const requestCorrection = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { date, correctionType, correctTime, reason } = req.body;

    // Validate required fields
    if (!date || !correctionType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Date, correction type, and reason are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate date format
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format (YYYY-MM-DD required)',
        code: 'INVALID_DATE_FORMAT'
      });
    }

    // Validate time format with seconds for non-absence corrections
    if (correctionType !== 'absence' && !/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(correctTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format (HH:mm or HH:mm:ss)',
        code: 'INVALID_TIME_FORMAT'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND'
      });
    }

    const correctionDate = new Date(date);
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    if (correctionDate < sevenDaysAgo) {
      return res.status(400).json({
        success: false,
        message: 'Can only request corrections for dates within the last 7 days',
        code: 'CORRECTION_TOO_OLD'
      });
    }

    if (correctionDate > today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request corrections for future dates',
        code: 'FUTURE_CORRECTION'
      });
    }

    // Convert to same format as attendance records (UTC)
    const formattedDate = moment(date).utc().format('YYYY-MM-DD');

    // Find existing attendance record
    let attendanceRecord = employee.attendance.find(r =>
      r.date === formattedDate ||
      (r.localDate && r.localDate === date) // Check localDate if exists
    );

    if (!attendanceRecord && correctionType !== 'absence') {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found for this date',
        code: 'NO_ATTENDANCE_RECORD'
      });
    }

    if (!attendanceRecord) {
      // Create new record only for absence corrections
      attendanceRecord = {
        date: formattedDate,
        localDate: date,
        clockIn: null,
        clockOut: null,
        status: 'pending',
        location: 'Not recorded',
        notes: '',
        hoursWorked: 0,
        correctionStatus: 'requested',
        lastUpdated: new Date()
      };
      employee.attendance.push(attendanceRecord);
    } else {
      attendanceRecord.correctionStatus = 'requested';
      attendanceRecord.lastUpdated = new Date();
    }

    // Create correction request
    const correctionRequest = {
      date: formattedDate,
      localDate: date,
      type: correctionType,
      correctTime: correctionType !== 'absence' ? correctTime : null,
      reason: reason,
      status: 'pending',
      requestedAt: new Date()
    };

    // Initialize array if needed
    if (!employee.attendanceCorrections) {
      employee.attendanceCorrections = [];
    }
    employee.attendanceCorrections.push(correctionRequest);

    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Correction request submitted successfully',
      data: {
        ...correctionRequest,
        attendanceRecord
      }
    });
  } catch (error) {
    console.error('Correction request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process correction request',
      code: 'CORRECTION_REQUEST_ERROR'
    });
  }
});

// In Leave Controller
const requestLeave = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate, type, notes } = req.body;

    if (!startDate || !endDate || !type) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, and type are required'
      });
    }

    // Universal date parser (handles ISO and local time)
    const parseDate = (dateString) => {
      const date = new Date(dateString);
      if (isNaN(date)) throw new Error('Invalid date format');
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const today = parseDate(new Date());

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (start < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request leave for past dates'
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const hasOverlap = employee.leaves.some(leave => {
      if (leave.status === 'rejected') return false;

      const leaveStart = parseDate(leave.startDate);
      const leaveEnd = parseDate(leave.endDate);

      return (
        (start >= leaveStart && start <= leaveEnd) ||
        (end >= leaveStart && end <= leaveEnd) ||
        (start <= leaveStart && end >= leaveEnd)
      );
    });

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'Existing leave overlaps with this period'
      });
    }

    // Calculate inclusive days
    const timeDiff = end - start;
    const leaveDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    const newLeave = {
      startDate: start,
      endDate: end,
      type,
      notes: notes || '',
      status: 'pending',
      days: leaveDays,
      createdAt: new Date()
    };

    employee.leaves.push(newLeave);
    await employee.save();

    res.status(201).json({
      success: true,
      message: 'Leave request submitted',
      data: newLeave
    });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

const getLeaves = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { status, year } = req.query;

    const employee = await Employee.findById(employeeId).select('leaves').lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let leaves = employee.leaves || [];

    if (status) {
      leaves = leaves.filter(leave => leave.status === status);
    }

    if (year) {
      leaves = leaves.filter(leave => {
        const startDate = new Date(leave.startDate);
        if (isNaN(startDate)) return false;
        const startYear = startDate.getUTCFullYear();
        return startYear === parseInt(year);
      });
    }

    // Sort by creation date descending
    leaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

const cancelLeaveRequest = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { id } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const leave = employee.leaves.id(id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leaves can be cancelled'
      });
    }

    const now = new Date();
    if (new Date(leave.startDate) < now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel leave that has already started'
      });
    }

    employee.leaves.pull(id);
    await employee.save();

    res.json({
      success: true,
      message: 'Leave request cancelled',
      data: { id }
    });

  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// In EmployeePanel Schedule Controller
const getSchedule = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { startDate, endDate } = req.query;

    // Build the base query
    const employee = await Employee.findById(employeeId)
      .populate({
        path: 'schedule.shifts',
        match: { status: { $ne: 'cancelled' } },
        select: 'start end location notes status'
      })
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let shifts = employee.schedule?.shifts || [];

    // Convert to Date objects and filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      shifts = shifts.filter(shift => {
        const shiftStart = new Date(shift.startDate);
        return shiftStart >= start && shiftStart <= end;
      });
    }

    // Format for frontend
    const formattedShifts = shifts.map(shift => {
      try {
        const start = new Date(shift.start);
        const end = new Date(shift.end);

        // Validate dates
        if (isNaN(start) || isNaN(end)) {
          console.warn(`Invalid date in shift ${shift._id}`);
          return null;
        }

        return {
          id: shift._id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          location: shift.location,
          notes: shift.notes,
          status: shift.status,
          date: start.toLocaleDateString('en-NG', {  // FIXED: use shift date
            timeZone: 'Africa/Lagos'
          }),
          startTime: start.toLocaleTimeString('en-NG', {  // FIXED: use shift start time
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Africa/Lagos'
          }),
          endTime: end.toLocaleTimeString('en-NG', {  // FIXED: use shift end time
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Africa/Lagos'
          })
        };
      } catch (error) {
        console.error(`Error formatting shift ${shift._id}:`, error);
        return null;
      }
    }).filter(Boolean) // Remove null entries
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      success: true,
      data: formattedShifts
    });
  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

const getUpcomingSchedule = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.user._id;
    const nowUTC = new Date();

    const employee = await Employee.findById(employeeId)
      .populate({
        path: 'schedule.shifts',
        match: {
          startDate: { $gte: nowUTC },
          status: { $ne: 'cancelled' }
        },
        select: 'start end location notes status'
      })
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    let shifts = employee.schedule?.shifts || [];

    // Format dates in Lagos timezone
    const formattedShifts = shifts.map(shift => {
      try {
        const start = new Date(shift.start);
        const end = new Date(shift.end);

        if (isNaN(start) || isNaN(end)) {
          console.warn(`Invalid date in shift ${shift._id}`);
          return null;
        }

        return {
          id: shift._id,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          location: shift.location,
          notes: shift.notes,
          status: shift.status,
          date: start.toLocaleDateString('en-NG', {
            timeZone: 'Africa/Lagos'
          }),
          startTime: start.toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Africa/Lagos'
          }),
          endTime: end.toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Africa/Lagos'
          })
        };
      } catch (error) {
        console.error(`Error formatting shift ${shift._id}:`, error);
        return null;
      }
    }).filter(Boolean) // Remove null entries
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.json({
      success: true,
      data: formattedShifts
    });
  } catch (error) {
    console.error('Upcoming schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

module.exports = {
  employeeLogin,
  employeeLogout,
  forgotPassword,
  changePassword,
  resetPassword,
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmail,
  getDashboard,
  getProfile,
  updateProfile,
  recordAttendance,
  getAttendance,
  requestCorrection,
  requestLeave,
  getLeaves,
  cancelLeaveRequest,
  getSchedule,
  getUpcomingSchedule
};