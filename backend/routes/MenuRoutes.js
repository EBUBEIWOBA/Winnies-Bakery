const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MenuItem = require('../models/MenuItem');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Hybrid Storage: Cloudinary with local fallback
const createStorage = () => {
  // Use Cloudinary if configured, otherwise local storage
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'winnies-bakery/menu',
        format: async (req, file) => 'webp',
        public_id: (req, file) => {
          return 'menu-' + Date.now() + '-' + Math.round(Math.random() * 1E9);
        }
      }
    });
  } else {
    // Local storage fallback
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/menu');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
        cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
      }
    });
  }
};

const upload = multer({
  storage: createStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Helper function to get image URL
const getImageUrl = (req, filename) => {
  if (process.env.CLOUDINARY_CLOUD_NAME && filename) {
    // Extract public_id from Cloudinary response if needed
    return filename.startsWith('http') ? filename : cloudinary.url(filename);
  } else if (filename) {
    return `${req.protocol}://${req.get('host')}/uploads/menu/${filename}`;
  }
  return '';
};

// GET /api/menu - Get all menu items
router.get('/', async (req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ category: 1, name: 1 });
    
    const itemsWithImageUrls = menuItems.map(item => {
      const itemObj = item.toObject();
      itemObj.imageUrl = getImageUrl(req, itemObj.image);
      return itemObj;
    });

    res.json({
      success: true,
      data: itemsWithImageUrls,
      count: menuItems.length
    });
  } catch (err) {
    console.error('Error fetching menu items:', err.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/menu - Create new menu item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, isAvailable } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and price are required'
      });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = process.env.CLOUDINARY_CLOUD_NAME ? req.file.path : req.file.filename;
    }

    const newItem = new MenuItem({
      name,
      description: description || '',
      category,
      price: parseFloat(price),
      image: imageUrl,
      isAvailable: isAvailable !== 'false'
    });

    const savedItem = await newItem.save();
    const responseItem = savedItem.toObject();
    responseItem.imageUrl = getImageUrl(req, responseItem.image);

    res.status(201).json({
      success: true,
      data: responseItem,
      message: 'Menu item created successfully'
    });
  } catch (err) {
    console.error('Error creating menu item:', err);
    
    // Clean up uploaded file if there was an error
    if (req.file && !process.env.CLOUDINARY_CLOUD_NAME) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create menu item',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Delete from Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && item.image) {
      try {
        const publicId = item.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`winnies-bakery/menu/${publicId}`);
      } catch (cloudinaryErr) {
        console.error('Error deleting from Cloudinary:', cloudinaryErr);
      }
    } else if (item.image) {
      // Delete local file
      const imagePath = path.join(__dirname, '../uploads/menu', item.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Menu item deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting menu item:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/menu/:id/rate - Submit a rating
router.post('/:id/rate', async (req, res) => {
  const { id } = req.params;
  const { userRating } = req.body;

  try {
    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const totalRating = item.rating * item.ratingCount + userRating;
    const newCount = item.ratingCount + 1;
    item.rating = totalRating / newCount;
    item.ratingCount = newCount;

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully',
      rating: item.rating,
      ratingCount: item.ratingCount
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;