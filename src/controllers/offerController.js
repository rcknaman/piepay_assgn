const OfferService = require('../services/offerService');
const DiscountService = require('../services/discountService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class OfferController {
  // POST /api/v1/offer - Process Flipkart offer API response
  static createOffers = asyncHandler(async (req, res) => {
    const { flipkartOfferApiResponse } = req.body;

    logger.info('Processing Flipkart offer API response');

    const result = await OfferService.processOffers(flipkartOfferApiResponse);

    res.status(201).json({
      status: 'success',
      message: 'Offers processed successfully',
      data: {
        savedCount: result.savedCount,
        updatedCount: result.updatedCount,
        totalProcessed: result.totalProcessed
      }
    });
  });

  // GET /api/v1/highest-discount - Calculate highest discount
  static getHighestDiscount = asyncHandler(async (req, res) => {
    const { amountToPay, bankName, paymentInstrument } = req.query;

    // Validate parameters
    const validationErrors = DiscountService.validateDiscountParams(
      parseFloat(amountToPay),
      bankName,
      paymentInstrument
    );

    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    logger.info(`Calculating highest discount for amount: ${amountToPay}, bank: ${bankName}, instrument: ${paymentInstrument}`);

    const discountResult = await DiscountService.calculateHighestDiscount(
      parseFloat(amountToPay),
      bankName,
      paymentInstrument
    );

    res.status(200).json({
      status: 'success',
      data: discountResult
    });
  });

  // GET /api/v1/offers/available - Get available offers for a bank
  static getAvailableOffers = asyncHandler(async (req, res) => {
    const { bankName, paymentInstrument, page = 1, limit = 50 } = req.query;

    logger.info(`Getting available offers for bank: ${bankName}`);

    const offers = await OfferService.getAvailableOffers(bankName, paymentInstrument);

    // Implement pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedOffers = offers.slice(startIndex, endIndex);

    res.status(200).json({
      status: 'success',
      results: paginatedOffers.length,
      totalOffers: offers.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasNext: endIndex < offers.length,
        hasPrev: startIndex > 0
      },
      data: {
        offers: paginatedOffers
      }
    });
  });

  // GET /api/v1/discount-summary - Get discount summary for all payment instruments
  static getDiscountSummary = asyncHandler(async (req, res) => {
    const { amountToPay, bankName } = req.query;

    if (!amountToPay || !bankName) {
      return res.status(400).json({
        status: 'error',
        message: 'amountToPay and bankName are required'
      });
    }

    logger.info(`Getting discount summary for amount: ${amountToPay}, bank: ${bankName}`);

    const summary = await DiscountService.getDiscountSummary(
      parseFloat(amountToPay),
      bankName
    );

    res.status(200).json({
      status: 'success',
      data: {
        amountToPay: parseFloat(amountToPay),
        bankName,
        paymentOptions: summary
      }
    });
  });

  // GET /api/v1/offers/stats - Get offer statistics
  static getOfferStats = asyncHandler(async (req, res) => {
    const Offer = require('../models/Offer');

    logger.info('Getting offer statistics');

    // Get basic stats
    const totalOffers = await Offer.count();

    // Get offers by bank (you would need to implement this query)
    const statsQuery = `
      SELECT 
        bank_name,
        COUNT(*) as offer_count,
        AVG(discount_value) as avg_discount,
        MAX(discount_value) as max_discount,
        MIN(min_amount) as min_threshold
      FROM offers 
      WHERE is_active = true 
      GROUP BY bank_name
      ORDER BY offer_count DESC
    `;

    const { executeQuery } = require('../config/database');
    const bankStats = await executeQuery(statsQuery);

    res.status(200).json({
      status: 'success',
      data: {
        totalOffers,
        bankStats: bankStats.map(stat => ({
          bankName: stat.bank_name,
          offerCount: stat.offer_count,
          averageDiscount: Math.round(stat.avg_discount * 100) / 100,
          maxDiscount: stat.max_discount,
          minThreshold: stat.min_threshold
        }))
      }
    });
  });

  // DELETE /api/v1/offers/:offerId - Delete an offer (admin functionality)
  static deleteOffer = asyncHandler(async (req, res) => {
    const { offerId } = req.params;

    logger.info(`Deleting offer: ${offerId}`);

    const { executeQuery } = require('../config/database');
    const result = await executeQuery(
      'UPDATE offers SET is_active = false WHERE offer_id = ?',
      [offerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Offer deleted successfully'
    });
  });

  // PUT /api/v1/offers/:offerId - Update an offer (admin functionality)
  static updateOffer = asyncHandler(async (req, res) => {
    const { offerId } = req.params;
    const updateData = req.body;

    logger.info(`Updating offer: ${offerId}`);

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'title', 'description', 'discount_value', 'min_amount', 
      'max_discount', 'valid_till', 'is_active'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }

    updateValues.push(offerId);

    const { executeQuery } = require('../config/database');
    const result = await executeQuery(
      `UPDATE offers SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE offer_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Offer updated successfully'
    });
  });
}

module.exports = OfferController;
