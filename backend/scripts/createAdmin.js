require('dotenv').config();
const mongoose = require('mongoose');
const { Employee } = require('../models/Employee');
// const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI, {
    });

    // Admin credentials
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@winnies.com',
      password: 'Admin@1234567',
      role: 'admin',
      department: 'management',
      phone: '+2349047911723',
      position: 'System Administrator',
      status: 'active',
      isEmailVerified: true,
      address: '123 Admin Street'
    };

    // Check if admin exists
    let admin = await Employee.findOne({ email: adminData.email, role: 'admin' });

    
    if (admin) {
      console.log('ℹ️ Admin user already exists');
      // Update password if needed
      admin.markModified('password'); // Force pre-save hook to run
      admin.password = adminData.password;
      await admin.save();
      console.log('✅ Admin user updated');
    } else {
      // Let Mongoose handle the hashing via pre-save hook
      admin = await Employee.create(adminData);
      console.log('✅ Admin user created successfully');
    }

    console.log('\nAdmin credentials:');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
};

createAdmin();