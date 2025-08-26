require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const sendEmail = require('./utils/sendEmail');
const cookieParser = require('cookie-parser');

const app = express();

process.env.TZ = 'Africa/Lagos';
console.log('Server timezone set to:', process.env.TZ);

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
        'https://winnies-bakery.vercel.app'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-dev-employee-id',
    'Cache-Control'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
  exposedHeaders: ['Authorization', 'Content-Type', 'Content-Length']
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  next();
});

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(morgan('dev'));
app.use(compression());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Serve employee images 
app.use('/uploads/employees', express.static(path.join(__dirname, 'uploads', 'employees')));
// Serve menu images 
app.use('/uploads/menu', express.static(path.join(__dirname, 'uploads', 'menu')));

// Create upload directories 
const createUploadDirs = () => {
  const baseDir = path.join(__dirname, 'uploads');
  const dirs = [
    path.join(baseDir, 'employees'),
    path.join(baseDir, 'menu')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
};

// Database Connection
const connectDB = async () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 20,
    minPoolSize: 5,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true
  };

  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, options);
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      retries--;
      console.error(`❌ MongoDB connection failed (retries left: ${retries}):`, err);

      if (retries === 0) {
        console.error('❌ MongoDB connection error after retries');
        process.exit(1);
      }

      // Wait 5 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Load Routes
const loadRoutes = () => {
  try {
    return {
      adminAuthRoutes: require('./routes/adminAuthRoutes'),
      dashboardRoutes: require('./routes/dashboardRoutes'),
      menuRoutes: require('./routes/MenuRoutes'),
      stockRoutes: require('./routes/stockRoutes'),
      employeePanelRoutes: require('./routes/EmployeePanelRoutes'),
      employeeRoutes: require('./routes/EmployeeRoutes'),
      feedbackRoutes: require('./routes/FeedbackRoutes')
    };
  } catch (err) {
    console.error('❌ Failed to load routes:', err);
    process.exit(1);
  }
};

// Initialize Routes
const routes = loadRoutes();
app.use('/api/admin/auth', routes.adminAuthRoutes);
app.use('/api/dashboard', routes.dashboardRoutes);
app.use('/api/menu', routes.menuRoutes);
app.use('/api/stock', routes.stockRoutes);
app.use('/api/employee', routes.employeePanelRoutes);
app.use('/api/employees', routes.employeeRoutes);
app.use('/api/feedback', routes.feedbackRoutes);

// Health Endpoints
app.get('/api/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/test-email', async (req, res) => {
  try {
    await sendEmail({
      email: 'test@example.com',
      subject: 'Test Email',
      message: `This is a test email from Winnies Bakery <h1>SMTP Working Properly</h1>
             <p>Server Time: ${new Date().toISOString()}</p>`
    });
    res.send('Email sent successfully');
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).send('Email failed to send: ' + error.message);
  }
});

app.get('/api/db-test', async (req, res) => {
  try {
    const count = await mongoose.connection.db.collection('employees').countDocuments();
    res.json({
      success: true,
      count,
      message: `Database connection healthy (${count} employees found)`
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Error Handling Middleware
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate key error'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Server Startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    createUploadDirs();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Employee images served from: ${path.join(__dirname, 'uploads', 'employees')}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();