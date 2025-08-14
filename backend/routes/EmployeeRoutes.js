const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const employeeController = require('../controllers/employeeController');
const asyncHandler = require('../utils/asyncHandler');

// =============== Utility Middleware ===============

// Logging slow requests
router.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.log(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
        }
    });
    next();
});

const leavesLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests/minute
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: `Too many requests - try again in ${req.rateLimit.resetTime}`
        });
    }
});

// Rate limiters
const generalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later'
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Too many upload requests, please try again later',
    keyGenerator: (req) => {
        return req.originalUrl.includes('/photo') 
            ? `${req.ip}-photo` 
            : `${req.ip}-general`;
    }
});

router.use(generalLimiter);

// =============== Multer & Sharp Image Middleware ===============

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/employees');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (validTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'), false);
        }
    }
});

const unlinkAsync = fs.promises.unlink;

const processImage = asyncHandler(async (req, res, next) => {
    if (!req.file) return next();
    
    const filePath = req.file.path;
    const newFilename = req.file.filename.replace(/\.[^.]+$/, '') + '.webp';
    const newPath = path.join(path.dirname(filePath), newFilename);
    
    try {
        // Process image with Sharp
        await sharp(filePath)
            .resize(800, 800, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .webp({ quality: 85 })
            .toFile(newPath);

        // Remove original file
        await unlinkAsync(filePath);
        
        // Update req.file to reference the processed image
        req.file.filename = newFilename;
        req.file.path = newPath;
        
        next();
    } catch (err) {
        console.error('Image processing failed:', err);
        
        // Cleanup files on error
        try {
            if (fs.existsSync(filePath)) await unlinkAsync(filePath);
            if (fs.existsSync(newPath)) await unlinkAsync(newPath);
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
            
        }
        
        // Pass error to error handler
        const error = new Error('Image processing failed');
        error.status = 500;
        next(error);
    }
});

// =============== Route Definitions ===============

// Shift Management Routes
router.route('/shifts')
    .get(asyncHandler(employeeController.getAllShifts))
    .post(asyncHandler(employeeController.createShift));

router.route('/shifts/:shiftId')
    .get(asyncHandler(employeeController.getShiftById))
    .delete(asyncHandler(employeeController.deleteShift))
    .put(asyncHandler(employeeController.updateShift));

router.route('/shifts/employee/:employeeId')
    .get(asyncHandler(employeeController.getEmployeeShifts));

// Attendance routes
router.route('/:id/attendance')
    .post(asyncHandler(employeeController.recordAttendance));

router.route('/:employeeId/attendance/:attendanceId')
    .delete(asyncHandler(employeeController.deleteAttendanceRecord));

router.route('/attendance/all')
    .get(asyncHandler(employeeController.getAllAttendance));

// Leave Routes
router.post('/:id/leaves', asyncHandler(employeeController.requestLeave));
router.get('/leaves/all', leavesLimiter, asyncHandler(employeeController.getAllLeaves));
router.patch('/leaves/:id/status', asyncHandler(employeeController.updateLeaveStatus));

// =============== Main Employee Routes ===============

router.route('/')
    .get(asyncHandler(employeeController.getEmployees))
    .post(
        uploadLimiter,
        upload.single('photo'),
        processImage,
        asyncHandler(employeeController.createEmployee)
    );

router.route('/:id')
    .get(asyncHandler(employeeController.getEmployeeById))
    .put( upload.single('photo'), processImage,
        asyncHandler(employeeController.updateEmployee)
    )
    .delete(asyncHandler(employeeController.deleteEmployee));

router.post('/:id/photo',
    uploadLimiter,
    upload.single('photo'),
    processImage,
    asyncHandler(employeeController.uploadPhoto)
);

// Error handling middleware
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    } else if (err) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    }
    next();
});

router.use('/uploads/employees', express.static(uploadDir));


module.exports = router;