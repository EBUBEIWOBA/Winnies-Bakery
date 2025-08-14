//In Dashboard Controller
const asyncHandler = require('express-async-handler');
const { Employee } = require('../models/Employee'); // Fixed import
const Feedback = require('../models/Feedback');
const MenuItem = require('../models/MenuItem');
const StockItem = require('../models/StockModel');

const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const [totalEmployees, totalFeedbacks, totalMenuItems, stockItems] = await Promise.all([
      Employee.countDocuments(),
      Feedback.countDocuments(),
      MenuItem.countDocuments(),
      StockItem.find().select('name currentQuantity minThreshold unit') // Add unit here
    ]);

    // FIX: Count distinct stock items instead of summing quantities
    const totalStockItems = stockItems.length; 
    const lowStockItems = stockItems.filter(item => item.currentQuantity < item.minThreshold);

    res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        totalFeedbacks,
        totalMenuItems,
        totalStockItems, // Changed from totalStock
        lowStockItems: lowStockItems.length,
        stockItems: stockItems.map(item => ({
          name: item.name,
          quantity: item.currentQuantity,
          unit: item.unit, // Added unit
          threshold: item.minThreshold,
          status: item.currentQuantity < item.minThreshold ? 'low' : 'ok'
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
});

module.exports = { getDashboardStats };