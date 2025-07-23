# PiePay Backend - Flipkart Offer Processing API

A high-performance Express.js backend service for processing Flipkart offers and calculating optimal discounts. Built with MySQL, designed to scale to 1000+ RPS.

## 🚀 Features

- **Offer Processing**: Parse and store Flipkart API responses with multiple offer formats
- **Discount Calculation**: Advanced algorithm to find the highest applicable discount
- **Multi-Bank Support**: AXIS, HDFC, ICICI, SBI, and other major banks
- **Payment Flexibility**: Credit Cards, Debit Cards, EMI, Net Banking, UPI
- **High Performance**: Optimized for 1000+ requests per second
- **Rate Limiting**: Multiple tiers of protection against abuse
- **Comprehensive Validation**: Input sanitization and validation
- **Monitoring Ready**: Health checks, logging, and metrics

## 📋 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/offer` | Process Flipkart offer API response |
| GET | `/api/v1/highest-discount` | Calculate highest applicable discount |
| GET | `/api/v1/offers/available` | Get available offers for a bank |
| GET | `/api/v1/discount-summary` | Get discount options for all payment methods |

### Monitoring Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Detailed system health |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/health/live` | Kubernetes liveness probe |

## 🛠 Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Validation**: Joi
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## 🚦 Quick Start

### Prerequisites

- Node.js 16.0 or higher
- MySQL 8.0 or higher
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd piepay-backend
npm install
```

2. **Database Setup**
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE piepay;"

# Run table creation
mysql -u root -p piepay < sql/create_tables.sql
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📖 API Usage Examples

### Process Offers

```bash
curl -X POST http://localhost:3000/api/v1/offer \
  -H "Content-Type: application/json" \
  -d '{
    "flipkartOfferApiResponse": {
      "offers": [
        {
          "id": "AXIS_CC_10",
          "title": "10% off with AXIS Credit Card",
          "bankName": "AXIS",
          "discountType": "percentage",
          "discountValue": 10,
          "minAmount": 1000,
          "paymentInstruments": ["CREDIT"]
        }
      ]
    }
  }'
```

### Calculate Highest Discount

```bash
curl "http://localhost:3000/api/v1/highest-discount?amountToPay=5000&bankName=AXIS&paymentInstrument=CREDIT"
```

### Get Available Offers

```bash
curl "http://localhost:3000/api/v1/offers/available?bankName=HDFC&paymentInstrument=CREDIT"
```

## 🏗 Project Structure

```
piepay-backend/
├── src/
│   ├── app.js                 # Main application file
│   ├── config/
│   │   └── database.js        # Database configuration
│   ├── controllers/
│   │   └── offerController.js # API controllers
│   ├── middleware/
│   │   ├── errorHandler.js    # Error handling
│   │   ├── rateLimiter.js     # Rate limiting
│   │   └── validation.js      # Input validation
│   ├── models/
│   │   └── Offer.js          # Database models
│   ├── routes/
│   │   ├── offerRoutes.js    # API routes
│   │   └── healthRoutes.js   # Health check routes
│   ├── services/
│   │   ├── offerService.js   # Business logic
│   │   └── discountService.js # Discount calculations
│   └── utils/
│       └── logger.js         # Logging utility
├── sql/
│   └── create_tables.sql     # Database schema
├── tests/                    # Test files
├── logs/                     # Log files
├── package.json
├── .env.example
└── README.md
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | `` |
| `DB_NAME` | Database name | `piepay` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `LOG_LEVEL` | Logging level | `info` |

### Rate Limiting

- General API: 100 requests/15 minutes per IP
- Offer creation: 20 requests/15 minutes per IP
- Discount calculation: 60 requests/minute per IP

## 🚀 Performance & Scaling

### Current Optimizations

- **Connection Pooling**: Database connection pool with 10 connections
- **Indexing**: Optimized database indexes for common queries
- **Rate Limiting**: Multi-tier rate limiting to prevent abuse
- **Input Validation**: Early validation to reduce processing overhead
- **Error Handling**: Comprehensive error handling to prevent crashes

### Scaling to 1000+ RPS

For production deployment at scale:

1. **Horizontal Scaling**
   - Deploy multiple instances behind a load balancer
   - Use PM2 or similar for process management

2. **Database Optimization**
   - Implement read replicas for GET requests
   - Add Redis caching for frequently accessed offers
   - Optimize queries with proper indexing

3. **Infrastructure**
   - Use CDN for static content
   - Implement health checks for auto-scaling
   - Monitor with APM tools (New Relic, DataDog)

## 📊 Database Schema

### Offers Table

```sql
CREATE TABLE offers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    offer_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    discount_type ENUM('percentage', 'flat', 'cashback'),
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    payment_instruments JSON,
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_till DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 API Response Format

### Success Response
```json
{
  "status": "success",
  "data": {
    "highestDiscount": 500,
    "finalAmount": 4500,
    "applicableOffer": {
      "offerId": "AXIS_CC_10",
      "title": "10% off with AXIS Credit Card",
      "bankName": "AXIS"
    }
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": ["Amount to pay must be greater than 0"]
}
```

## 🔐 Security Features

- **Input Sanitization**: XSS protection and input cleaning
- **Rate Limiting**: Multiple tiers of request limiting
- **CORS Protection**: Configurable cross-origin policies
- **Helmet Security**: Security headers automatically applied
- **Validation**: Comprehensive input validation with Joi

## 🚨 Error Handling

The API implements comprehensive error handling:

- **Validation Errors**: 400 with detailed field errors
- **Not Found**: 404 for missing resources
- **Rate Limiting**: 429 with retry information
- **Server Errors**: 500 with minimal exposure in production

## 📈 Monitoring & Logging

- **Winston Logging**: Structured logging with file rotation
- **Health Checks**: Multiple health check endpoints
- **Request Logging**: Morgan HTTP request logging
- **Error Tracking**: Comprehensive error logging and tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For support and questions:

- Create an issue in the repository
- Check the health endpoints for system status
- Review logs in the `logs/` directory

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
  - Offer processing and storage
  - Discount calculation engine
  - Multi-bank and payment instrument support
  - Rate limiting and security features
