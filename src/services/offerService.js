const Offer = require('../models/Offer');
const logger = require('../utils/logger');

class OfferService {
  // Process Flipkart API response and extract offers
  static parseFlipkartResponse(flipkartResponse) {
    try {
      const offers = [];

      // Handle different possible response structures
      if (flipkartResponse.offers && Array.isArray(flipkartResponse.offers)) {
        // Standard structure
        offers.push(...flipkartResponse.offers);
      } else if (flipkartResponse.data && flipkartResponse.data.offers) {
        // Nested data structure
        offers.push(...flipkartResponse.data.offers);
      } else if (flipkartResponse.paymentOffers) {
        // Alternative structure
        offers.push(...flipkartResponse.paymentOffers);
      } else if (Array.isArray(flipkartResponse)) {
        // Direct array
        offers.push(...flipkartResponse);
      } else {
        logger.warn('Unknown Flipkart response structure');
        return [];
      }

      // Normalize offer data
      return offers.map(offer => this.normalizeOfferData(offer));
    } catch (error) {
      logger.error('Error parsing Flipkart response:', error.message);
      throw new Error('Invalid Flipkart API response format');
    }
  }

  // Normalize offer data to standard format
  static normalizeOfferData(rawOffer) {
    return {
      offerId: rawOffer.id || rawOffer.offerId || rawOffer.offer_id,
      title: rawOffer.title || rawOffer.name || rawOffer.offerTitle,
      description: rawOffer.description || rawOffer.desc || rawOffer.details,
      bankName: (rawOffer.bankName || rawOffer.bank || rawOffer.bank_name || '').toUpperCase(),
      discountType: this.normalizeDiscountType(rawOffer.discountType || rawOffer.type),
      discountValue: parseFloat(rawOffer.discountValue || rawOffer.discount || rawOffer.value || 0),
      minAmount: parseFloat(rawOffer.minAmount || rawOffer.minimum || rawOffer.min_amount || 0),
      maxDiscount: rawOffer.maxDiscount || rawOffer.maximum || rawOffer.max_discount || null,
      paymentInstruments: this.normalizePaymentInstruments(
        rawOffer.paymentInstruments || rawOffer.instruments || rawOffer.payment_methods || []
      ),
      validFrom: rawOffer.validFrom || rawOffer.startDate || null,
      validTill: rawOffer.validTill || rawOffer.endDate || rawOffer.expiryDate || null,
      isActive: rawOffer.isActive !== undefined ? rawOffer.isActive : rawOffer.active !== undefined ? rawOffer.active : true
    };
  }

  // Normalize discount type
  static normalizeDiscountType(type) {
    if (!type) return 'percentage';

    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('percent') || normalizedType.includes('%')) {
      return 'percentage';
    } else if (normalizedType.includes('flat') || normalizedType.includes('fixed')) {
      return 'flat';
    } else if (normalizedType.includes('cashback')) {
      return 'cashback';
    }
    return 'percentage';
  }

  // Normalize payment instruments
  static normalizePaymentInstruments(instruments) {
    if (!Array.isArray(instruments)) {
      return [];
    }

    return instruments.map(instrument => {
      const normalized = instrument.toString().toUpperCase();
      // Map common variations
      if (normalized.includes('CREDIT')) return 'CREDIT';
      if (normalized.includes('DEBIT')) return 'DEBIT';
      if (normalized.includes('EMI')) return 'EMI_OPTIONS';
      if (normalized.includes('NET') || normalized.includes('BANKING')) return 'NET_BANKING';
      if (normalized.includes('UPI')) return 'UPI';
      if (normalized.includes('WALLET')) return 'WALLET';
      return normalized;
    });
  }

  // Process and save offers from Flipkart response
  static async processOffers(flipkartResponse) {
    try {
      const parsedOffers = this.parseFlipkartResponse(flipkartResponse);

      if (parsedOffers.length === 0) {
        return { savedCount: 0, updatedCount: 0, totalProcessed: 0 };
      }

      // Validate offers before saving
      const validOffers = parsedOffers.filter(offer => this.validateOffer(offer));

      if (validOffers.length === 0) {
        throw new Error('No valid offers found in the response');
      }

      // Bulk save offers
      const result = await Offer.bulkSave(validOffers);

      logger.info(`Processed ${validOffers.length} offers: ${result.savedCount} new, ${result.updatedCount} updated`);

      return {
        ...result,
        totalProcessed: validOffers.length
      };
    } catch (error) {
      logger.error('Error processing offers:', error.message);
      throw error;
    }
  }

  // Validate offer data
  static validateOffer(offer) {
    if (!offer.offerId) {
      logger.warn('Offer missing ID:', offer);
      return false;
    }

    if (!offer.title) {
      logger.warn('Offer missing title:', offer.offerId);
      return false;
    }

    if (!offer.bankName) {
      logger.warn('Offer missing bank name:', offer.offerId);
      return false;
    }

    if (!offer.discountValue || offer.discountValue <= 0) {
      logger.warn('Offer missing or invalid discount value:', offer.offerId);
      return false;
    }

    return true;
  }

  // Get available offers for a bank
  static async getAvailableOffers(bankName, paymentInstrument = null) {
    try {
      const criteria = { bankName: bankName.toUpperCase() };

      if (paymentInstrument) {
        criteria.paymentInstrument = paymentInstrument.toUpperCase();
      }

      return await Offer.findByCriteria(criteria);
    } catch (error) {
      logger.error('Error getting available offers:', error.message);
      throw error;
    }
  }
}

module.exports = OfferService;
