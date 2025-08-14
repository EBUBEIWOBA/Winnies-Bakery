// In employeeController.js
const mongoose = require('mongoose');
const { Employee, Shift } = require('../models/Employee');
const fs = require('fs');
const path = require('path');
const validator = require('validator');
const { format, parseISO, differenceInDays } = require('date-fns');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const { getFullUrl } = require('../utils/helpers');
const { sendVerificationEmail } = require('./employeePanelController');

// Utility functions
const handleError = (error, res) => {
  console.error('Controller Error:', error);

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map(e => e.message)
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate key error',
      field: Object.keys(error.keyPattern)[0]
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};

const sanitizeEmployee = (employee) => {
  if (!employee) return null;

  const emp = employee.toObject ? employee.toObject() : employee;
  delete emp.password;
  delete emp.tokens;
  delete emp.loginAttempts;
  delete emp.lockUntil;
  delete emp.previousPasswords;
  delete emp.emailVerificationToken;
  delete emp.emailVerificationExpire;
  delete emp.resetPasswordToken;
  delete emp.resetPasswordExpire;
  return emp;
};

const parseAndFormatDate = (dateString) => {
  try {
    if (!dateString) return null;
    const parsed = parseISO(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    return null;
  }
};

function generateTempPassword() {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_.-+=';

  let password = '';
  // Ensure at least one of each type
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));

  // Fill remaining characters
  const allChars = uppercase + lowercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Main Controller Methods
exports.getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', ...filters } = req.query;

    // Build query
    const query = {};

    // Text search
    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { position: { $regex: filters.search, $options: 'i' } }
      ];
      delete filters.search;
    }

    // Filter by status
    if (filters.status) {
      query.status = { $in: Array.isArray(filters.status) ? filters.status : filters.status.split(',') };
      delete filters.status;
    }

    // Filter by department
    if (filters.department) {
      query.department = { $in: Array.isArray(filters.department) ? filters.department : filters.department.split(',') };
      delete filters.department;
    }

    // Filter by role
    if (filters.role) {
      query.role = { $in: Array.isArray(filters.role) ? filters.role : filters.role.split(',') };
      delete filters.role;
    }

    // Date range filters
    if (filters.hiredAfter) {
      const hiredAfter = parseAndFormatDate(filters.hiredAfter);
      if (!hiredAfter) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hiredAfter date format'
        });
      }
      query.hireDate = { $gte: hiredAfter };
      delete filters.hiredAfter;
    }

    if (filters.hiredBefore) {
      const hiredBefore = parseAndFormatDate(filters.hiredBefore);
      if (!hiredBefore) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hiredBefore date format'
        });
      }
      query.hireDate = query.hireDate || {};
      query.hireDate.$lte = hiredBefore;
      delete filters.hiredBefore;
    }

    // Add remaining filters
    Object.keys(filters).forEach(key => {
      if (mongoose.Types.ObjectId.isValid(filters[key])) {
        query[key] = filters[key];
      } else if (filters[key] !== '') {
        query[key] = new RegExp(filters[key], 'i');
      }
    });

    // Execute query with pagination
    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sort,
      lean: true
    };

    // Using the paginate method from the model
    const result = await Employee.paginate(query, options);

    if (!result || !result.data || !Array.isArray(result.data)) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          pages: 0,
          currentPage: options.page,
          limit: options.limit
        }
      });
    }

    // Format dates in response
    const formattedResults = result.data.map(employee => {
      const emp = {
        ...sanitizeEmployee(employee),
        photo: employee.photo ? getFullUrl(employee.photo) : null
      };

      if (emp.hireDate) {
        emp.hireDate = format(emp.hireDate, 'yyyy-MM-dd');
      }
      if (emp.lastActive) {
        emp.lastActive = format(emp.lastActive, 'yyyy-MM-dd');
      }
      return emp;
    });

    res.json({
      success: true,
      data: formattedResults,
      pagination: {
        total: result.total,
        pages: result.pages,
        currentPage: result.page,
        limit: result.limit
      }
    });
  } catch (error) {
    console.error('Error in getEmployees:', error);
    handleError(error, res);
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const employee = await Employee.findById(req.params.id)
      .populate('schedule.shifts')
      .populate('leaves');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const formattedEmployee = {
      ...sanitizeEmployee(employee),
      hireDate: employee.hireDate ? format(employee.hireDate, 'yyyy-MM-dd') : null,
      lastActive: employee.lastActive ? format(employee.lastActive, 'yyyy-MM-dd') : null,
      photo: employee.photo ? getFullUrl(employee.photo) : null
    };

    res.json({
      success: true,
      data: formattedEmployee
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { ...employeeData } = req.body;

    // Set default values
    employeeData.status = employeeData.status || 'active';
    employeeData.isEmailVerified = employeeData.isEmailVerified || false;
    employeeData.role = employeeData.role || 'employee';

    // Validate all required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'department', 'position'];
    const missingFields = requiredFields.filter(field => !employeeData[field]);

    if (missingFields.length > 0) {
      if (req.file) {
        await unlinkAsync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validate email
    if (!validator.isEmail(employeeData.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    // Check for duplicate email
  const existingEmployee = await Employee.findOne({ 
    email: req.body.email.toLowerCase() 
  });
    
    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Generate temporary password if not provided
    let temporaryPassword = null;
    if (!employeeData.password) {
      temporaryPassword = generateTempPassword();
      employeeData.password = temporaryPassword;
    } else {
      // Validate password if provided
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
      if (!passwordRegex.test(employeeData.password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 8 characters long'
        });
      }
      temporaryPassword = employeeData.password;
    }

    // Set photo path if uploaded
    if (req.file) {
      employeeData.photo = req.file.filename;
    }

    // Create employee
    const employee = new Employee(employeeData);
    employeeData.isActive = true;
    await employee.save();

    // Send verification email
    try {
      await sendVerificationEmail(employee);
      console.log(`Verification email sent to ${employee.email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', {
        message: emailError.message,
        stack: emailError.stack
      });
    }
    res.status(201).json({
      success: true,
      data: {
        ...sanitizeEmployee(employee),
        photo: employee.photo ? getFullUrl(employee.photo) : null
      },
      temporaryPassword: temporaryPassword,
      warning: 'Account created but verification email failed'
    });

  } catch (error) {
    console.error('Create Employee Error:', {
      message: error.message,
      stack: error.stack,
      validationErrors: error.errors
    });
    if (req.file) {
      try {
        await unlinkAsync(req.file.path);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }
    }
    handleError(error, res);
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Delete old photo if it exists and not default
    if (employee.photo) {
      const oldPhotoPath = path.join(__dirname, '../uploads', employee.photo);
      try {
        await unlinkAsync(oldPhotoPath);
      } catch (err) {
        console.error('Error deleting old photo:', err);
      }
    }

    employee.photo = req.file.filename; // Store ONLY filename
    await employee.save();

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: getFullUrl(employee.photo)
    });
  } catch (error) {
    console.error('Photo upload error:', error);

    // Delete the uploaded file if error occurred
    if (req.file && req.file.path) {
      try {
        await unlinkAsync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    handleError(error, res);
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;


    // Validate updates
    if (updates.email && !validator.isEmail(updates.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    // Check for duplicate email
    if (updates.email) {
      const existingEmployee = await Employee.findOne({
        email: updates.email,
        _id: { $ne: id }
      });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another employee'
        });
      }
    }

    // Get current employee before update
    const currentEmployee = await Employee.findById(id);
    if (!currentEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Handle photo separately
    if (req.file) {
      // Delete old photo if exists
      if (currentEmployee.photo) {
        const oldPhotoPath = path.join(__dirname, '../uploads/employees', currentEmployee.photo);
        try {
          await unlinkAsync(oldPhotoPath);
        } catch (err) {
          console.error('Error deleting old photo:', err);
        }
      }
      updates.photo = req.file.filename;
    } else if (updates.photo === '') {
      // Handle explicit photo removal
      if (currentEmployee.photo) {
        const oldPhotoPath = path.join(__dirname, '../uploads/employees', currentEmployee.photo);
        try {
          await unlinkAsync(oldPhotoPath);
        } catch (err) {
          console.error('Error deleting old photo:', err);
        }
      }
      updates.photo = null;
    }

    // Update employee
    const employee = await Employee.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    // Format dates in response
    const updatedEmployee = {
      ...sanitizeEmployee(employee),
      hireDate: employee.hireDate ? format(employee.hireDate, 'yyyy-MM-dd') : null,
      lastActive: employee.lastActive ? format(employee.lastActive, 'yyyy-MM-dd') : null,
      photo: employee.photo ? getFullUrl(employee.photo) : null
    };

    res.json({
      success: true,
      data: updatedEmployee
    });
  } catch (error) {
    // Delete uploaded file if error occurred
    if (req.file) {
      try {
        await unlinkAsync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    handleError(error, res);
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete employee photo if exists
    if (employee.photo) {
      const filename = path.basename(employee.photo);
      const oldPhotoPath = path.join(__dirname, '../uploads/employees', filename);

      try {
        await unlinkAsync(oldPhotoPath);
      } catch (err) {
        console.error('Error deleting employee photo:', err);
      }
    }

    // Delete associated shifts
    await Shift.deleteMany({ employee: employee._id });

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Shift Management Methods
exports.getAllShifts = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status } = req.query;

    const query = {};

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    if (status) {
      query.status = { $in: status.split(',') };
    }

    const shifts = await Shift.find(query)
      .populate('employee', 'firstName lastName email photo')
      .sort({ startDate: 1, startTime: 1 });

    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.shiftId)
      .populate('employee', 'firstName lastName email photo');

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.createShift = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, startTime, endTime } = req.body;

    // Validate required fields
    if (!employeeId || !startDate || !endDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, start/end dates and times are required'
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Combine date and time to create proper datetime objects
    const startDateTime = new Date(`${startDate}T${startTime}:00.000Z`);
    const endDateTime = new Date(`${endDate}T${endTime}:00.000Z`);

    // Adjust for Lagos timezone (UTC+1)
    startDateTime.setHours(startDateTime.getHours() + 1);
    endDateTime.setHours(endDateTime.getHours() + 1);

    if (startDateTime > endDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format (HH:MM expected)'
      });
    }

    // Create shift
    const shift = new Shift({
      employee: employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      position: employee.position,
      start: startDateTime,  // Use combined datetime
      end: endDateTime,      // Use combined datetime
      location: req.body.location || 'Main Bakery',
      notes: req.body.notes,
      status: 'scheduled'
    });

    await shift.save();

    // Add shift reference to employee
    employee.schedule.shifts.push(shift._id);
    await employee.save();

    res.status(201).json({
      success: true,
      data: {
        ...shift.toObject(),
        start: shift.start.toISOString(),
        end: shift.end.toISOString()
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.updateShift = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const updates = req.body;

    // Validate time updates
    if (updates.startTime || updates.endTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (updates.startTime && !timeRegex.test(updates.startTime)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start time format (HH:MM expected)'
        });
      }

      if (updates.endTime && !timeRegex.test(updates.endTime)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end time format (HH:MM expected)'
        });
      }
    }

    // Validate date updates
    if (updates.startDate || updates.startTime || updates.endDate || updates.endTime) {
      const shift = await Shift.findById(shiftId);

      const startDate = updates.startDate || shift.start.toISOString().split('T')[0];
      const startTime = updates.startTime || shift.start.toTimeString().substring(0, 5);
      const endDate = updates.endDate || shift.end.toISOString().split('T')[0];
      const endTime = updates.endTime || shift.end.toTimeString().substring(0, 5);

      updates.start = new Date(`${startDate}T${startTime}:00.000Z`);
      updates.end = new Date(`${endDate}T${endTime}:00.000Z`);

      // Adjust for Lagos timezone
      updates.start.setHours(updates.start.getHours() + 1);
      updates.end.setHours(updates.end.getHours() + 1);
    }

    // Update shift
    const shift = await Shift.findByIdAndUpdate(shiftId, updates, {
      new: true,
      runValidators: true
    });

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...shift.toObject(),
        start: shift.start.toISOString(), // Ensure ISO format
        end: shift.end.toISOString()      // Ensure ISO format
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.shiftId);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Remove shift reference from employee
    await Employee.updateOne(
      { _id: shift.employee },
      { $pull: { 'schedule.shifts': shift._id } }
    );

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getEmployeeShifts = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, status } = req.query;

    const query = { employee: employeeId };

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    if (status) {
      query.status = { $in: status.split(',') };
    }

    const shifts = await Shift.find(query)
      .sort({ startDate: 1, startTime: 1 });

    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    handleError(error, res);
  }
};

// Attendance Management Methods
exports.updateAttendanceStatus = async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    const { status, managerNote } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const record = employee.attendance.find(r =>
      new Date(r.date).toISOString().split('T')[0] === date
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    record.status = status;
    if (managerNote) record.managerNote = managerNote;

    await employee.save();

    res.json({
      success: true,
      message: 'Attendance status updated',
      data: record
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.recordAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, clockIn, clockOut, notes } = req.body;

    // Validate required fields
    if (!id || !date) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and date are required'
      });
    }

    // Format date to YYYY-MM-DD
    const formattedDate = new Date(date).toISOString().split('T')[0];

    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check for existing record
    const existingRecord = employee.attendance.find(
      a => a.date === formattedDate
    );

    let attendanceRecord;

    if (existingRecord) {
      // Update existing record
      attendanceRecord = existingRecord;
      if (clockIn) attendanceRecord.clockIn = clockIn;
      if (clockOut) attendanceRecord.clockOut = clockOut;
      if (notes) attendanceRecord.notes = notes;
    } else {
      // Create new record
      attendanceRecord = {
        date: formattedDate,
        clockIn: clockIn || null,
        clockOut: clockOut || null,
        notes: notes || ''
      };
      employee.attendance.push(attendanceRecord);
    }

    // Determine status
    let status = 'absent';
    if (attendanceRecord.clockIn) {
      if (!attendanceRecord.clockOut) {
        status = 'in-progress';
      } else {
        const [hours, minutes] = attendanceRecord.clockIn.split(':').map(Number);
        if (hours > 9 || (hours === 9 && minutes > 15)) {
          status = 'late';
        } else {
          status = 'present';
        }
      }
    }
    attendanceRecord.status = status;

    await employee.save();

    res.status(existingRecord ? 200 : 201).json({
      success: true,
      data: {
        ...attendanceRecord.toObject(),
        date: formattedDate
      }
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status } = req.query;

    const pipeline = [];

    // 1. Initial matching (including date filter)
    const baseMatch = {};
    if (employeeId) baseMatch._id = mongoose.Types.ObjectId(employeeId);

    if (startDate || endDate) {
      baseMatch['attendance.date'] = {};
      if (startDate) baseMatch['attendance.date'].$gte = startDate;
      if (endDate) baseMatch['attendance.date'].$lte = endDate;
    }

    if (Object.keys(baseMatch).length > 0) {
      pipeline.push({ $match: baseMatch });
    }

    // 2. Unwind attendance array
    pipeline.push({ $unwind: '$attendance' });

    // 3. Project fields and convert date to string format (YYYY-MM-DD)
    pipeline.push({
      $project: {
        _id: 0,
        attendanceId: '$attendance._id',
        employeeId: '$_id',
        firstName: 1,
        lastName: 1,
        email: 1,
        department: 1,
        position: 1,
        date: '$attendance.date',
        clockIn: '$attendance.clockIn',
        clockOut: '$attendance.clockOut',
        status: '$attendance.status',
        notes: '$attendance.notes'
      }
    });

    // 4. Date filtering using string comparison
    if (startDate || endDate) {
      const dateMatch = {};
      if (startDate) dateMatch['attendance.date'] = { $gte: startDate };
      if (endDate) dateMatch['attendance.date'] = { ...dateMatch['attendance.date'], $lte: endDate };

      // Add this match BEFORE unwinding
      pipeline.push({ $match: dateMatch });
    }

    // 5. Status filtering
    if (status) {
      pipeline.push({ $match: { status } });
    }

    // 6. Final sorting
    pipeline.push({ $sort: { date: -1 } });

    const result = await Employee.aggregate(pipeline);

    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate format. Use YYYY-MM-DD'
      });
    }

    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid endDate format. Use YYYY-MM-DD'
      });
    }
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const { employeeId, attendanceId } = req.params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(employeeId) ||
      !mongoose.Types.ObjectId.isValid(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }

    // Use atomic update with $pull
    const result = await Employee.updateOne(
      { _id: employeeId },
      { $pull: { attendance: { _id: attendanceId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Leave Management Methods
exports.requestLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, startDate, endDate, notes } = req.body;

    // Validate required fields
    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date and end date are required'
      });
    }

    // Validate dates using parseISO
    const start = parseAndFormatDate(startDate);
    const end = parseAndFormatDate(endDate);

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Check for overlapping leave requests
    const overlappingLeave = await Employee.findOne({
      _id: id,
      'leaves': {
        $elemMatch: {
          $or: [
            { startDate: { $lte: end }, endDate: { $gte: start } },
            { status: 'approved' }
          ]
        }
      }
    });

    if (overlappingLeave) {
      return res.status(409).json({
        success: false,
        message: 'Overlapping leave request exists'
      });
    }

    // Calculate number of days using differenceInDays
    const days = differenceInDays(end, start) + 1;

    // Create leave request
    const leaveRequest = {
      employee: id,
      startDate: start,
      endDate: end,
      type,
      status: 'pending',
      notes: notes || '',
      days
    };

    // Add to employee's leaves array
    const employee = await Employee.findByIdAndUpdate(
      id,
      { $push: { leaves: leaveRequest } },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get the newly added leave request (last in array)
    const newLeave = employee.leaves[employee.leaves.length - 1];

    // Format dates in response
    const formattedLeave = {
      ...newLeave.toObject(),
      startDate: format(newLeave.startDate, 'yyyy-MM-dd'),
      endDate: format(newLeave.endDate, 'yyyy-MM-dd')
    };

    res.status(201).json({
      success: true,
      data: formattedLeave
    });
  } catch (error) {
    handleError(error, res);
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status, type } = req.query;

    // Build query
    const query = {};

    if (employeeId) {
      query._id = employeeId;
    }

    if (status) {
      query['leaves.status'] = status;
    }

    if (type) {
      query['leaves.type'] = type;
    }

    // Find employees with matching leaves
    const employees = await Employee.find(query)
      .select('firstName lastName email department position leaves')
      .lean();

    // Extract and format leaves
    const leaves = employees.reduce((acc, employee) => {
      employee.leaves.forEach(leave => {
        // Apply date filters
        if (startDate && new Date(leave.startDate) < new Date(startDate)) return;
        if (endDate && new Date(leave.endDate) > new Date(endDate)) return;

        acc.push({
          ...leave,
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeDepartment: employee.department,
          employeePosition: employee.position
        });
      });
      return acc;
    }, []);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': 30,
      'X-RateLimit-Remaining': req.rateLimit.remaining,
      'X-RateLimit-Reset': Math.ceil(req.rateLimit.resetTime.getTime() / 1000)
    });

    res.json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params; // Get leave ID from URL params
    const { status } = req.body;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Update leave status
    const result = await Employee.updateOne(
      { 'leaves._id': id },
      { $set: { 'leaves.$.status': status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or already has this status'
      });
    }

    res.json({
      success: true,
      message: 'Leave status updated successfully'
    });
  } catch (error) {
    console.error('Leave status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
