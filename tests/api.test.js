const request = require('supertest');
const app = require('../src/app');

describe('PiePay Backend API', () => {
  // Test health endpoint
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('PiePay Backend is running');
    });
  });

  // Test offer creation endpoint
  describe('POST /api/v1/offer', () => {
    const sampleOffer = {
      flipkartOfferApiResponse: {
        offers: [
          {
            id: 'TEST_OFFER_1',
            title: 'Test Offer',
            bankName: 'TEST_BANK',
            discountType: 'percentage',
            discountValue: 10,
            minAmount: 1000,
            paymentInstruments: ['CREDIT']
          }
        ]
      }
    };

    it('should create offers successfully', async () => {
      const res = await request(app)
        .post('/api/v1/offer')
        .send(sampleOffer)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('totalProcessed');
    });

    it('should reject invalid offer data', async () => {
      const invalidOffer = {
        flipkartOfferApiResponse: {
          offers: [
            {
              // Missing required fields
              title: 'Invalid Offer'
            }
          ]
        }
      };

      await request(app)
        .post('/api/v1/offer')
        .send(invalidOffer)
        .expect(400);
    });
  });

  // Test discount calculation endpoint
  describe('GET /api/v1/highest-discount', () => {
    it('should calculate discount successfully', async () => {
      const res = await request(app)
        .get('/api/v1/highest-discount')
        .query({
          amountToPay: 5000,
          bankName: 'AXIS',
          paymentInstrument: 'CREDIT'
        })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('highestDiscount');
    });

    it('should reject invalid parameters', async () => {
      await request(app)
        .get('/api/v1/highest-discount')
        .query({
          amountToPay: -100, // Invalid amount
          bankName: 'AXIS',
          paymentInstrument: 'CREDIT'
        })
        .expect(400);
    });
  });

  // Test rate limiting
  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // This test would need to be adjusted based on your rate limiting configuration
      // and might need to run in isolation or with a test-specific configuration

      const promises = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          request(app)
            .get('/health')
        );
      }

      const results = await Promise.allSettled(promises);
      const rateLimitedResults = results.filter(
        result => result.value && result.value.status === 429
      );

      // Should have some rate limited responses
      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });
  });
});

// Test utility functions
describe('Utility Functions', () => {
  const DiscountService = require('../src/services/discountService');

  describe('DiscountService', () => {
    it('should validate discount parameters correctly', () => {
      const errors = DiscountService.validateDiscountParams(
        1000,
        'AXIS',
        'CREDIT'
      );
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid parameters', () => {
      const errors = DiscountService.validateDiscountParams(
        -100,
        '',
        'INVALID'
      );
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
