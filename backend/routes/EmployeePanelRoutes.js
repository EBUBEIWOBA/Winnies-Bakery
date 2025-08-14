//routes/EmployeePanelRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {
  employeeLogin,
  forgotPassword,
  changePassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  employeeLogout,
  getDashboard,
  getProfile,
  updateProfile,
  recordAttendance,
  getAttendance,
  requestCorrection,
  requestLeave,
  getLeaves,
  cancelLeaveRequest ,
  getSchedule,
  getUpcomingSchedule } = require('../controllers/employeePanelController');
const asyncHandler = require('../utils/asyncHandler');
const { authenticateEmployee } = require('../middleware/auth');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/employees');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);
  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Add cache-control middleware to ALL panel routes
router.use('/panel/*', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Authentication routes
router.post('/auth/login', asyncHandler(employeeLogin));
router.post('/auth/forgot-password', asyncHandler(forgotPassword));
router.patch('/auth/reset-password/:token', asyncHandler(resetPassword));
router.get('/auth/verify-email/:token', asyncHandler(verifyEmail));
router.post('/auth/resend-verification', asyncHandler(resendVerificationEmail));
router.post('/auth/logout', asyncHandler(employeeLogout));
router.put('/auth/password', authenticateEmployee, changePassword);

// Protected routes
router.get('/panel/dashboard', authenticateEmployee, asyncHandler(getDashboard));

// Profile routes
router.options('/panel/profile', (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();   });
router.get('/panel/profile', authenticateEmployee, asyncHandler(getProfile));
router.put('/panel/profile', authenticateEmployee, upload.single('photo'), asyncHandler(updateProfile));

// Attendance routes
router.get('/panel/attendance', authenticateEmployee, asyncHandler(getAttendance))
router.post('/panel/attendance/clock-in', authenticateEmployee, asyncHandler(recordAttendance));
router.post('/panel/attendance/clock-out', authenticateEmployee, asyncHandler(recordAttendance));
router.post('/panel/attendance/correction', authenticateEmployee, asyncHandler(requestCorrection));

// Leave routes
router.options('/panel/leaves', (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});
router.route('/panel/leaves')
  .get(authenticateEmployee, asyncHandler(getLeaves))
  .post(authenticateEmployee, asyncHandler(requestLeave));

router.route('/panel/leaves/:id')
  .delete(authenticateEmployee, asyncHandler(cancelLeaveRequest ));

// Schedule routes
router.get('/panel/schedules', authenticateEmployee, asyncHandler(getSchedule));
router.get('/panel/schedules/upcoming', authenticateEmployee, asyncHandler(getUpcomingSchedule));

module.exports = router;