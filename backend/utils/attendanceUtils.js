const moment = require('moment-timezone');

/**
 * Calculate hours worked with proper validation and timezone handling
 * @param {string} clockIn - Clock-in time in 'HH:mm' or 'HH:mm:ss' format
 * @param {string} clockOut - Clock-out time in 'HH:mm' or 'HH:mm:ss' format
 * @param {string} [timezone='Africa/Lagos'] - Timezone for calculation
 * @returns {number} Hours worked (rounded to 2 decimal places)
 */
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

/**
 * Filter attendance records by date range with timezone awareness
 * @param {Array} records - Array of attendance records
 * @param {string} startDate - Start date in 'YYYY-MM-DD' format
 * @param {string} endDate - End date in 'YYYY-MM-DD' format
 * @param {string} [timezone='Africa/Lagos'] - Timezone for date comparison
 * @returns {Array} Filtered records
 */
const filterByDateRange = (records, startDate, endDate, timezone = 'Africa/Lagos') => {
  try {
    // Validate date formats
    const dateFormat = 'YYYY-MM-DD';
    const isValidStart = moment(startDate, dateFormat, true).isValid();
    const isValidEnd = moment(endDate, dateFormat, true).isValid();
    
    if (!isValidStart || !isValidEnd) {
      throw new Error('Invalid date format');
    }

    // Create moment objects with timezone
    const start = moment.tz(startDate, dateFormat, timezone).startOf('day');
    const end = moment.tz(endDate, dateFormat, timezone).endOf('day');

    return records.filter(record => {
      try {
        const recordDate = moment.tz(record.date, dateFormat, timezone);
        return recordDate.isBetween(start, end, null, '[]'); // Inclusive
      } catch (e) {
        console.error('Error processing record date:', record.date, e.message);
        return false;
      }
    });
  } catch (e) {
    console.error('Error filtering by date range:', e.message);
    return [];
  }
};

/**
 * Get current date in specified timezone
 * @param {string} [timezone='Africa/Lagos'] - Timezone for date
 * @returns {string} Date in 'YYYY-MM-DD' format
 */
const getCurrentDate = (timezone = 'Africa/Lagos') => {
  return moment().tz(timezone).format('YYYY-MM-DD');
};

/**
 * Format time for display with timezone
 * @param {string} time - Time in 'HH:mm' or 'HH:mm:ss' format
 * @param {string} [timezone='Africa/Lagos'] - Timezone for display
 * @returns {string} Formatted time (e.g., '9:30 AM')
 */
const formatTimeDisplay = (time, timezone = 'Africa/Lagos') => {
  if (!time) return '--:--';
  try {
    return moment.tz(time, 'HH:mm:ss', timezone).format('h:mm A');
  } catch (e) {
    console.error('Error formatting time:', time, e.message);
    return '--:--';
  }
};

/**
 * Validate attendance record structure and values
 * @param {Object} record - Attendance record to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
const validateAttendanceRecord = (record) => {
  const errors = [];
  
  // Validate date
  if (!record.date || !moment(record.date, 'YYYY-MM-DD', true).isValid()) {
    errors.push('Invalid date format (expected YYYY-MM-DD)');
  }

  // Validate clock-in time
  if (record.clockIn && !/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(record.clockIn)) {
    errors.push('Invalid clock-in time format (expected HH:mm or HH:mm:ss)');
  }

  // Validate clock-out time
  if (record.clockOut && !/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(record.clockOut)) {
    errors.push('Invalid clock-out time format (expected HH:mm or HH:mm:ss)');
  }

  // Validate hours worked
  if (record.hoursWorked && (isNaN(record.hoursWorked) || record.hoursWorked < 0 || record.hoursWorked > 24)) {
    errors.push('Invalid hours worked (must be between 0-24)');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : null
  };
};

/**
 * Determine attendance status based on clock-in/out times
 * @param {string} clockIn - Clock-in time
 * @param {string} clockOut - Clock-out time
 * @param {string} [lateThreshold='09:15:00'] - Time considered late
 * @param {number} [minHoursForFullDay=4] - Minimum hours for full day
 * @returns {string} Status ('present', 'late', 'half-day', etc.)
 */
const determineAttendanceStatus = (
  clockIn, 
  clockOut, 
  lateThreshold = '09:15:00',
  minHoursForFullDay = 4
) => {
  if (!clockIn) return 'absent';
  if (!clockOut) return 'in-progress';

  try {
    const hoursWorked = calculateHoursWorked(clockIn, clockOut);
    const isLate = moment(clockIn, 'HH:mm:ss').isAfter(moment(lateThreshold, 'HH:mm:ss'));
    
    if (hoursWorked >= minHoursForFullDay) {
      return isLate ? 'late' : 'present';
    }
    return 'half-day';
  } catch (e) {
    console.error('Error determining status:', e.message);
    return 'pending';
  }
};

module.exports = {
  calculateHoursWorked,
  filterByDateRange,
  getCurrentDate,
  formatTimeDisplay,
  validateAttendanceRecord,
  determineAttendanceStatus
};