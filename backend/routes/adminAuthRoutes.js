const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { 
  adminLogin,
  adminLogout,
  updateAdminPassword,
  forgotPassword,
  resetPassword,
  adminRegister,
  verifyAdminToken,
  updateAdminProfile,
  adminSettings,
  getAdmins 
} = require('../controllers/adminAuthController');
const { authenticate, authorize } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/employees');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const rateLimit = require('express-rate-limit');

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many password change attempts, please try again later'
});

// Authentication routes
router.post('/login', adminLogin);
router.post('/logout', authenticate, authorize('admin'), adminLogout);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.post('/register', adminRegister);
router.put('/updateProfile', authenticate, authorize('admin'), upload.single('avatar'), updateAdminProfile);
router.get('/verify', authenticate, authorize('admin'), verifyAdminToken);
router.put('/password', passwordChangeLimiter, authenticate, authorize('admin'), updateAdminPassword);
router.put('/settings', authenticate, authorize('admin'), adminSettings);
router.get('/admins', authenticate, authorize('admin'), getAdmins);

module.exports = router;