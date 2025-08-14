// scripts/fixAttendanceDates.js 
const { Employee } = require('../models/Employee');
const moment = require('moment-timezone');

// Add the calculateHoursWorked function directly in this file
const calculateHoursWorked = (clockIn, clockOut, timezone = 'Africa/Lagos') => {
  if (!clockIn || !clockOut) return 0;
  
  try {
    // Validate time formats
    const timeFormat = 'HH:mm:ss';
    const isValidIn = moment(clockIn, timeFormat, true).isValid();
    const isValidOut = moment(clockOut, timeFormat, true).isValid();
    
    if (!isValidIn || !isValidOut) {
      throw new Error('Invalid time format');
    }

    // Create moment objects with timezone
    const start = moment.tz(clockIn, timeFormat, timezone);
    const end = moment.tz(clockOut, timeFormat, timezone);

    // Handle overnight shifts
    if (end.isBefore(start)) {
      end.add(1, 'day');
    }

    // Calculate difference in hours
    const hours = moment.duration(end.diff(start)).asHours();
    
    return parseFloat(hours.toFixed(2));
  } catch (e) {
    console.error('Error calculating hours:', e.message);
    return 0;
  }
};

const fixAttendanceDates = async () => {
  const employees = await Employee.find({ 'attendance': { $exists: true } });
  
  for (const employee of employees) {
    let needsUpdate = false;
    
    for (const record of employee.attendance) {
      // Ensure all dates are in YYYY-MM-DD format
      if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        const fixedDate = moment(record.date).tz('Africa/Lagos').format('YYYY-MM-DD');
        if (fixedDate !== 'Invalid date') {
          record.date = fixedDate;
          needsUpdate = true;
        }
      }
      
      // Ensure all times are in HH:mm:ss format
      if (record.clockIn && !/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(record.clockIn)) {
        const fixedTime = moment(record.clockIn, 'HH:mm:ss').format('HH:mm:ss');
        if (fixedTime !== 'Invalid date') {
          record.clockIn = fixedTime;
          needsUpdate = true;
        }
      }
      
      if (record.clockOut && !/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(record.clockOut)) {
        const fixedTime = moment(record.clockOut, 'HH:mm:ss').format('HH:mm:ss');
        if (fixedTime !== 'Invalid date') {
          record.clockOut = fixedTime;
          needsUpdate = true;
        }
      }
      
      // Add missing required fields
      if (!record.location) {
        record.location = 'Main Bakery';
        needsUpdate = true;
      }
      
      if (!record.status) {
        record.status = 'pending';
        needsUpdate = true;
      }
      
      // Recalculate hours worked if needed
      if (record.clockIn && record.clockOut && (!record.hoursWorked || record.hoursWorked < 0)) {
        const hours = calculateHoursWorked(record.clockIn, record.clockOut);
        record.hoursWorked = parseFloat(hours.toFixed(2));
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      try {
        await employee.save();
        console.log(`Updated attendance records for employee ${employee._id}`);
      } catch (err) {
        console.error(`Error updating employee ${employee._id}:`, err);
      }
    }
  }
};

fixAttendanceDates()
  .then(() => {
    console.log('Attendance date migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });