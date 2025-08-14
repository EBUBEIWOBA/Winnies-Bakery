const jwt = require('jsonwebtoken');
const { Employee } = require('../models/Employee');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header, cookie or query (dev only)
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.adminToken) {
    token = req.cookies.adminToken;
  } else if (process.env.NODE_ENV === 'development' && req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Not authorized, no token provided'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from DB
    const user = await Employee.findById(decoded.id).select('-password');

    // FIX: Check if password changed after token issued
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Password changed, please reauthenticate'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Your account is not active'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_FAILED',
      message: 'Not authorized, token failed'
    });
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: `User role ${req.user.role} is not authorized`
      });
    }
    next();
  };
};

const authenticateEmployee = asyncHandler(async (req, res, next) => {
  let token = req.headers.authorization?.split(' ')[1] || req.cookies?.employeeToken ||
    req.query?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const employee = await Employee.findById(decoded.id).select('-password');

    if (!employee || employee.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Employee not found or inactive'
      });
    }

    if (!employee.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox or spam folder.'
      });
    }

    req.user = employee;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

module.exports = {
  authenticate,
  authorize,
  authenticateEmployee

};