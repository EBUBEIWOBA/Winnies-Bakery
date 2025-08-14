const StockItem = require('../models/stockModel');
const mongoose = require('mongoose');

// Helper function for error responses
const errorResponse = (res, statusCode, status, message) => {
  return res.status(statusCode).json({
    status,
    message
  });
};

const calculateLowStock = (current, threshold) => {
  return current <= threshold;
};

// createStockItem function
exports.createStockItem = async (req, res) => {
  try {
    const { name, category, currentQuantity, unit, minThreshold, supplier } = req.body;
    
    // Validate enum values
    const validCategories = ['Ingredient', 'Packaging', 'Ready Product', 'Beverage'];
    const validUnits = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'bottle'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid category. Valid options: ${validCategories.join(', ')}`
      });
    }
    
    if (!validUnits.includes(unit)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid unit. Valid options: ${validUnits.join(', ')}`
      });
    }
    
    const newItem = await StockItem.create({
      name,
      category,
      currentQuantity,
      unit,
      minThreshold,
      supplier,
      movements: [{
        type: 'purchase',
        quantity: currentQuantity,
        staff: 'system',
        notes: 'Initial stock'
      }],
      isLowStock: currentQuantity <= minThreshold
    });

    res.status(201).json(newItem);
  } catch (err) {
    let message = err.message;
    
    if (err.name === 'ValidationError') {
      message = Object.values(err.errors).map(e => e.message).join(', ');
    } else if (err.code === 11000) {
      message = `Item "${req.body.name}" already exists`;
    }
    
    res.status(400).json({
      status: 'fail',
      message
    });
  }
};

// Record stock movement 
exports.recordMovement = async (req, res) => {
  try {
    const { itemId, type, quantity, notes, staff } = req.body;
    
    const item = await StockItem.findById(itemId);
    if (!item) return res.status(404).json({ status: 'fail', message: 'Item not found' });

    // Validate movement type
    const validTypes = ['purchase', 'usage', 'wastage', 'expiry', 'adjustment'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid movement type' });
    }

    // Update quantity
    let newQuantity = item.currentQuantity;
    if (type === 'purchase') newQuantity += Number(quantity);
    else if (['usage', 'wastage', 'expiry'].includes(type)) {
      newQuantity -= Number(quantity);
      if (newQuantity < 0) return res.status(400).json({ 
        status: 'fail', 
        message: 'Insufficient stock' 
      });
    }
    else if (type === 'adjustment') newQuantity = Number(quantity);

    // Add movement
    item.movements.push({
      type,
      quantity: Number(quantity),
      staff: staff || 'system',
      notes,
      date: new Date()
    });

    // Update item
    item.currentQuantity = newQuantity;
    item.isLowStock = calculateLowStock(newQuantity, item.minThreshold);
    await item.save();

    res.status(200).json({
      status: 'success',
      data: item
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all stock items
exports.getAllStockItems = async (req, res) => {
  try {
    const items = await StockItem.find().lean();
    
    const enhancedItems = items.map(item => ({
      ...item,
      isLowStock: calculateLowStock(item.currentQuantity, item.minThreshold)
    }));

    res.status(200).json(enhancedItems); // Return array directly
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get low stock items 
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await StockItem.find({ isLowStock: true });
    res.status(200).json({
      status: 'success',
      data: items
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Update stock item 
exports.updateStockItem = async (req, res) => {
  try {
    const item = await StockItem.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastUpdated: Date.now(),
        isLowStock: calculateLowStock(req.body.currentQuantity, req.body.minThreshold)
      },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ status: 'fail', message: 'Item not found' });

    res.status(200).json({
      status: 'success',
      data: item
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a single stock item
exports.getStockItem = async (req, res) => {
  try {
    const item = await StockItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        status: 'fail',
        message: 'Item not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: item
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get item movement history
exports.getMovementHistory = async (req, res) => {
  try {
       const id = req.params.id;
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid item ID format'
      });
    }

    const item = await StockItem.findById(req.params.id)
      .select('name category unit minThreshold movements')
      .lean();

    if (!item) {
      return res.status(404).json({
        status: 'fail',
        message: 'Item not found'
      });
    }

    // Sort movements by date (newest first)
    const sortedMovements = item.movements.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    res.status(200).json({
      status: 'success',
      item: {
        _id: item._id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        minThreshold: item.minThreshold
      },
      movements: sortedMovements
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Delete stock item
exports.deleteStockItem = async (req, res) => {
  try {
    const item = await StockItem.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return errorResponse(res, 404, 'fail', 'Item not found');
    }

    res.status(200).json({
      status: 'success',
      message: 'Stock item deleted successfully',
      data: null
    });
  } catch (err) {
    errorResponse(res, 400, 'fail', err.message);
  }
};