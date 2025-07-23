const express = require('express');
const OfferController = require('../controllers/offerController');
const { 
  validateCreateOffer, 
  validateCalculateDiscount, 
  validateGetOffers,
  validateOfferId,
  sanitizeInput,
  validateContentType 
} = require('../middleware/validation');
const { 
  strictRateLimiter, 
  discountRateLimiter 
} = require('../middleware/rateLimiter');

const router = express.Router();

// Apply input sanitization to all routes
router.use(sanitizeInput);

// POST /api/v1/offer - Process Flipkart offer API response
router.post('/offer', 
  strictRateLimiter,
  validateContentType,
  validateCreateOffer,
  OfferController.createOffers
);

// GET /api/v1/highest-discount - Calculate highest discount
router.get('/highest-discount',
  discountRateLimiter,
  validateCalculateDiscount,
  OfferController.getHighestDiscount
);

// GET /api/v1/offers/available - Get available offers for a bank
router.get('/offers/available',
  validateGetOffers,
  OfferController.getAvailableOffers
);

// GET /api/v1/discount-summary - Get discount summary for all payment instruments
router.get('/discount-summary',
  discountRateLimiter,
  OfferController.getDiscountSummary
);

// GET /api/v1/offers/stats - Get offer statistics
router.get('/offers/stats',
  OfferController.getOfferStats
);

// Admin routes (would typically require authentication in production)
// DELETE /api/v1/offers/:offerId - Delete an offer
router.delete('/offers/:offerId',
  validateOfferId,
  OfferController.deleteOffer
);

// PUT /api/v1/offers/:offerId - Update an offer
router.put('/offers/:offerId',
  validateContentType,
  validateOfferId,
  OfferController.updateOffer
);

module.exports = router;
