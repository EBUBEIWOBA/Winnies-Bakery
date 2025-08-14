const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['purchase', 'usage', 'wastage', 'expiry', 'adjustment', 'initial'], 
    required: true 
  },
  quantity: { type: Number, required: true, min: 0.01 },
  staff: { type: String, required: true },
  notes: String,
  date: { type: Date, default: Date.now }
}, { _id: false });

const stockSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Ingredient', 'Packaging', 'Ready Product', 'Beverage']
  },
  currentQuantity: { type: Number, required: true, min: 0 },
  unit: { 
    type: String, 
    required: true,
    enum: ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'bottle']
  },
  minThreshold: { type: Number, required: true, min: 0 },
  supplier: String,
  lastUpdated: { type: Date, default: Date.now },
  movements: [movementSchema],
  isLowStock: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save hook to check low stock status
stockSchema.pre('save', function(next) {
  this.isLowStock = this.currentQuantity < this.minThreshold;
  if (this.currentQuantity < 0) {
    this.currentQuantity = 0;
  }
  this.lastUpdated = new Date();
  next();
});

const StockItem = mongoose.models.StockItem || mongoose.model('StockItem', stockSchema);
module.exports = StockItem;