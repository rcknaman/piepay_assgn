const { executeQuery, getConnection } = require('../config/database');
const logger = require('../utils/logger');

class Offer {
  constructor(data) {
    this.offerId = data.offerId || data.offer_id;
    this.title = data.title;
    this.description = data.description;
    this.bankName = data.bankName || data.bank_name;
    this.discountType = data.discountType || data.discount_type;
    this.discountValue = data.discountValue || data.discount_value;
    this.minAmount = data.minAmount || data.min_amount || 0;
    this.maxDiscount = data.maxDiscount || data.max_discount;
    this.paymentInstruments = data.paymentInstruments || data.payment_instruments || [];
    this.validFrom = data.validFrom || data.valid_from;
    this.validTill = data.validTill || data.valid_till;
    this.isActive = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true);
  }

  // Save offer to database
  async save() {
    try {
      const query = `
        INSERT INTO offers (
          offer_id, title, description, bank_name, discount_type, 
          discount_value, min_amount, max_discount, payment_instruments, 
          valid_from, valid_till, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          discount_type = VALUES(discount_type),
          discount_value = VALUES(discount_value),
          min_amount = VALUES(min_amount),
          max_discount = VALUES(max_discount),
          payment_instruments = VALUES(payment_instruments),
          valid_from = VALUES(valid_from),
          valid_till = VALUES(valid_till),
          is_active = VALUES(is_active),
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [
        this.offerId,
        this.title,
        this.description,
        this.bankName,
        this.discountType,
        this.discountValue,
        this.minAmount,
        this.maxDiscount,
        JSON.stringify(this.paymentInstruments),
        this.validFrom,
        this.validTill,
        this.isActive
      ];

      const result = await executeQuery(query, params);
      logger.info(`Offer saved: ${this.offerId}`);
      return result;
    } catch (error) {
      logger.error(`Error saving offer ${this.offerId}:`, error.message);
      throw error;
    }
  }

  // Find offers by criteria
  static async findByCriteria(criteria = {}) {
    try {
      let query = `
        SELECT * FROM offers 
        WHERE is_active = true 
        AND (valid_till IS NULL OR valid_till > NOW())
      `;
      const params = [];
      
      if (criteria.bankName) {
        query += ' AND bank_name = ?';
        params.push(criteria.bankName);
      }

      if (criteria.minAmount) {
        query += ' AND min_amount <= ?';
        params.push(criteria.minAmount);
      }

      if (criteria.paymentInstrument) {
        query += ' AND JSON_CONTAINS(payment_instruments, ?)';
        params.push(JSON.stringify(criteria.paymentInstrument));
      }
      
      query += ' ORDER BY discount_value DESC';
      
      const results = await executeQuery(query, params);
      return results.map(row => ({
        ...row,
        paymentInstruments: row.payment_instruments || []
      }));
    } catch (error) {
      console.log(error);
      
      logger.error('Error finding offers:', error.message);
      throw error;
    }
  }

  // Get all offers with pagination
  static async getAll(page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const query = `
        SELECT * FROM offers 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;

      const results = await executeQuery(query, [limit, offset]);
      return results.map(row => ({
        ...row,
        paymentInstruments: JSON.parse(row.payment_instruments || '[]')
      }));
    } catch (error) {
      logger.error('Error getting all offers:', error.message);
      throw error;
    }
  }

  // Count total offers
  static async count() {
    try {
      const query = 'SELECT COUNT(*) as total FROM offers WHERE is_active = true';
      const result = await executeQuery(query);
      return result[0].total;
    } catch (error) {
      logger.error('Error counting offers:', error.message);
      throw error;
    }
  }

  // Bulk save offers
  static async bulkSave(offers) {
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      let savedCount = 0;
      let updatedCount = 0;

      for (const offerData of offers) {
        const offer = new Offer(offerData);

        // Check if offer exists
        const existingQuery = 'SELECT id FROM offers WHERE offer_id = ?';
        const [existing] = await connection.execute(existingQuery, [offer.offerId]);

        if (existing.length > 0) {
          updatedCount++;
        } else {
          savedCount++;
        }

        // Save or update offer
        const query = `
          INSERT INTO offers (
            offer_id, title, description, bank_name, discount_type, 
            discount_value, min_amount, max_discount, payment_instruments, 
            valid_from, valid_till, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            discount_type = VALUES(discount_type),
            discount_value = VALUES(discount_value),
            min_amount = VALUES(min_amount),
            max_discount = VALUES(max_discount),
            payment_instruments = VALUES(payment_instruments),
            valid_from = VALUES(valid_from),
            valid_till = VALUES(valid_till),
            is_active = VALUES(is_active),
            updated_at = CURRENT_TIMESTAMP
        `;

        const params = [
          offer.offerId,
          offer.title,
          offer.description,
          offer.bankName,
          offer.discountType,
          offer.discountValue,
          offer.minAmount,
          offer.maxDiscount,
          JSON.stringify(offer.paymentInstruments),
          offer.validFrom,
          offer.validTill,
          offer.isActive
        ];

        await connection.execute(query, params);
      }

      await connection.commit();
      logger.info(`Bulk save completed: ${savedCount} new, ${updatedCount} updated`);

      return { savedCount, updatedCount };
    } catch (error) {
      await connection.rollback();
      logger.error('Error in bulk save:', error.message);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Offer;
