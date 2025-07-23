const Offer = require('../models/Offer');
const logger = require('../utils/logger');

class DiscountService {
  // Calculate the highest applicable discount
  static async calculateHighestDiscount(amountToPay, bankName, paymentInstrument) {
    try {
      // Find applicable offers
      const offers = await this.findApplicableOffers(amountToPay, bankName, paymentInstrument);

      if (offers.length === 0) {
        return {
          highestDiscount: 0,
          applicableOffer: null,
          message: 'No applicable offers found'
        };
      }

      // Calculate discount for each offer
      const discountCalculations = offers.map(offer => ({
        offer,
        discountAmount: this.calculateDiscount(offer, amountToPay),
        finalAmount: amountToPay - this.calculateDiscount(offer, amountToPay)
      }));

      // Sort by discount amount (highest first)
      discountCalculations.sort((a, b) => b.discountAmount - a.discountAmount);

      const bestOffer = discountCalculations[0];

      return {
        highestDiscount: bestOffer.discountAmount,
        finalAmount: bestOffer.finalAmount,
        applicableOffer: {
          offerId: bestOffer.offer.offer_id,
          title: bestOffer.offer.title,
          bankName: bestOffer.offer.bank_name,
          discountType: bestOffer.offer.discount_type,
          discountValue: bestOffer.offer.discount_value,
          maxDiscount: bestOffer.offer.max_discount
        },
        alternativeOffers: discountCalculations.slice(1, 3).map(calc => ({
          offerId: calc.offer.offer_id,
          title: calc.offer.title,
          discountAmount: calc.discountAmount,
          finalAmount: calc.finalAmount
        })),
        message: `Best offer: ${bestOffer.offer.title}`
      };
    } catch (error) {
      logger.error('Error calculating highest discount:', error.message);
      throw error;
    }
  }

  // Find offers applicable to the given criteria
  static async findApplicableOffers(amountToPay, bankName, paymentInstrument) {
    try {
      const criteria = {
        bankName: bankName.toUpperCase(),
        paymentInstrument: paymentInstrument.toUpperCase(),
        minAmount: amountToPay
      };
      
      const offers = await Offer.findByCriteria(criteria);

      
      // Filter offers that meet minimum amount requirement
      return offers.filter(offer => {
        const meetsMinAmount = offer.min_amount <= amountToPay;
        const isValidInstrument = this.isValidPaymentInstrument(offer, paymentInstrument);
        const isNotExpired = this.isOfferValid(offer);

        return meetsMinAmount && isValidInstrument && isNotExpired;
      });
    } catch (error) {
      logger.error('Error finding applicable offers:', error.message);
      throw error;
    }
  }

  // Calculate discount amount for a specific offer
  static calculateDiscount(offer, amountToPay) {
    let discountAmount = 0;

    switch (offer.discount_type) {
      case 'percentage':
        discountAmount = (amountToPay * offer.discount_value) / 100;
        break;
      case 'flat':
        discountAmount = offer.discount_value;
        break;
      case 'cashback':
        // Cashback is treated as a flat discount for calculation purposes
        discountAmount = Math.min(offer.discount_value, amountToPay);
        break;
      default:
        logger.warn(`Unknown discount type: ${offer.discount_type}`);
        discountAmount = 0;
    }

    // Apply maximum discount cap if specified
    if (offer.max_discount && discountAmount > offer.max_discount) {
      discountAmount = offer.max_discount;
    }

    // Ensure discount doesn't exceed the amount to pay
    if (discountAmount > amountToPay) {
      discountAmount = amountToPay;
    }

    return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
  }

  // Check if payment instrument is valid for the offer
  static isValidPaymentInstrument(offer, paymentInstrument) {
    if (!offer.paymentInstruments || offer.paymentInstruments.length === 0) {
      return true; // No restrictions
    }

    const normalizedInstruments = offer.paymentInstruments.map(inst => 
      inst.toString().toUpperCase()
    );

    return normalizedInstruments.includes(paymentInstrument.toUpperCase());
  }

  // Check if offer is still valid (not expired)
  static isOfferValid(offer) {
    const now = new Date();

    if (offer.valid_from && new Date(offer.valid_from) > now) {
      return false; // Not yet started
    }

    if (offer.valid_till && new Date(offer.valid_till) < now) {
      return false; // Expired
    }

    return offer.is_active;
  }

  // Get discount summary for multiple payment options
  static async getDiscountSummary(amountToPay, bankName) {
    try {
      const paymentInstruments = ['CREDIT', 'DEBIT', 'EMI_OPTIONS', 'NET_BANKING'];
      const summary = {};

      for (const instrument of paymentInstruments) {
        try {
          const result = await this.calculateHighestDiscount(amountToPay, bankName, instrument);
          summary[instrument] = {
            discount: result.highestDiscount,
            finalAmount: result.finalAmount,
            offerTitle: result.applicableOffer?.title || 'No offers'
          };
        } catch (error) {
          logger.warn(`Error calculating discount for ${instrument}:`, error.message);
          summary[instrument] = {
            discount: 0,
            finalAmount: amountToPay,
            offerTitle: 'Error calculating'
          };
        }
      }

      return summary;
    } catch (error) {
      logger.error('Error generating discount summary:', error.message);
      throw error;
    }
  }

  // Validate discount calculation parameters
  static validateDiscountParams(amountToPay, bankName, paymentInstrument) {
    const errors = [];

    if (!amountToPay || amountToPay <= 0) {
      errors.push('Amount to pay must be greater than 0');
    }

    if (!bankName || bankName.trim() === '') {
      errors.push('Bank name is required');
    }

    if (!paymentInstrument || paymentInstrument.trim() === '') {
      errors.push('Payment instrument is required');
    }

    const validInstruments = ['CREDIT', 'DEBIT', 'EMI_OPTIONS', 'NET_BANKING', 'UPI', 'WALLET'];
    if (paymentInstrument && !validInstruments.includes(paymentInstrument.toUpperCase())) {
      errors.push(`Invalid payment instrument. Valid options: ${validInstruments.join(', ')}`);
    }

    return errors;
  }
}

module.exports = DiscountService;
