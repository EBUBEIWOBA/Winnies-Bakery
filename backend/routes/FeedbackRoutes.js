const express = require('express');
const feedbackController = require('../controllers/feedbackController');

const router = express.Router();

// Public routes

router.get('/stats', feedbackController.getFeedbackStats);

router.post('/', feedbackController.createFeedback);

router
  .route('/')
  .get(feedbackController.getAllFeedback);

router
  .route('/:id')
  .get(feedbackController.getFeedback)
  .patch(feedbackController.updateFeedback)
  .delete(feedbackController.deleteFeedback);

module.exports = router;