const express = require('express');
const stockController = require('../controllers/stockController');
const router = express.Router();

router.post('/movement', stockController.recordMovement);
router.get('/low-stock', stockController.getLowStockItems);
router.get('/history/:id', stockController.getMovementHistory);

router
  .route('/')
  .get(stockController.getAllStockItems)
  .post(stockController.createStockItem);

router
  .route('/:id')
  .get( stockController.getStockItem)
  .patch( stockController.updateStockItem)
  .delete( stockController.deleteStockItem);

module.exports = router;