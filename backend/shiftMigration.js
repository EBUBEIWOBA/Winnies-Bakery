require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('../models/Employee');

const migrateShifts = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected for migration');

    // Get all shifts
    const shifts = await Shift.find({});
    console.log(`Found ${shifts.length} shifts to process`);

    let updatedCount = 0;
    
        for (const shift of shifts) {
      if (!shift.start && shift.startDate) {
        console.log(`Migrating shift ${shift._id}`);
        
        if (!shift.startDate || !shift.startTime || !shift.endDate || !shift.endTime) {
          console.warn(`Skipping shift ${shift._id} due to missing fields`);
          continue;
        }
        
        // Extract date parts
        const startDateStr = shift.startDate.toISOString().split('T')[0];
        const endDateStr = shift.endDate.toISOString().split('T')[0];
        
        // Create UTC datetimes
        shift.start = new Date(`${startDateStr}T${shift.startTime}:00.000Z`);
        shift.end = new Date(`${endDateStr}T${shift.endTime}:00.000Z`);
        
        // Add UTC+1 offset for Lagos time
        shift.start.setHours(shift.start.getHours() + 1);
        shift.end.setHours(shift.end.getHours() + 1);
        
        // Remove old fields
        shift.startDate = undefined;
        shift.endDate = undefined;
        shift.startTime = undefined;
        shift.endTime = undefined;
        
        await shift.save();
        updatedCount++;
      }
    }

    console.log(`Migration complete! Updated ${updatedCount} shifts`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateShifts();