# 🥧 PiePay Backend Assignment

A production-grade backend service for e-commerce payment offers, implemented using **Express.js** and **MySQL**. This service ingests Flipkart-style offers, stores them in a relational DB, and exposes APIs to fetch and compute the best available discounts.

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/rcknaman/piepay_assgn.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` to include your MySQL credentials and any other configuration.

### 4. Run Database Migrations

```bash
mysql -u root -p -e "CREATE DATABASE piepay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p piepay < sql/create_tables.sql
```

### 5. Start the Server

- For development:

```bash
npm run dev
```

- For production:

```bash
npm start
```

### 6. API Access

- Server will run on `http://localhost:3000` by default.
- Use the included Postman collection or example payloads to test the endpoints.

---

## 📝 Assumptions

- Incoming offer data strictly follows the structure defined in the assignment.
- Offers are received under `flipkartOfferApiResponse.offers`.
- Timestamps are in ISO 8601 format and stored as UTC in the database.
- Only one offer can be applied per transaction for a specific payment method and bank.
- Authentication is omitted to focus on core functionality.
- API payloads must follow expected types strictly.

---

## 🏗️ Design Choices

### Framework/Stack

- **Express.js** for API development.
- **MySQL** for structured offer data with ACID compliance.

### Database Schema

- Single normalized `offers` table.
- Indexed fields: `bank_name`, `discount_type`, `is_active`, `valid_from`, `valid_till`.
- `ENUM` for `discount_type`.
- `JSON` column for `payment_instruments`.

### API and Validation

- All payloads validated (e.g., using Joi).
- Modular service layer for clean architecture and testability.

### Error Handling

- Centralized middleware for validation and application errors.
- Database connection pooling with transaction support.

---

## 🏎️ Scaling GET `/highest-discount` for 1,000 RPS

- **Node.js Clustering**: Use all CPU cores and horizontally scale.
- **Optimized Indexes**: Index all frequent filter fields.
- **Query Optimization**: Select only required columns, filter in SQL.
- **Read Replicas**: Use MySQL replicas for high-read traffic.
- **Caching**: Redis for common queries and invalidation logic.
- **Async Code**: Fully non-blocking database and service code.

---

## 🔧 If I Had More Time

- Implement authentication and role-based access control.
- Add integration and edge case test coverage.
- Use Redis for advanced caching.
- Dockerize the app.

---

## 🗃️ Database Schema (SQL)

```sql
-- PiePay Backend Database Schema
-- MySQL/MariaDB compatible

-- Create database (run separately if needed)
-- CREATE DATABASE IF NOT EXISTS piepay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE piepay;

-- Drop tables if they exist
DROP TABLE IF EXISTS api_usage;
DROP TABLE IF EXISTS offers;

-- Create offers table
CREATE TABLE offers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    offer_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    bank_name VARCHAR(100) NOT NULL,
    discount_type ENUM('percentage', 'flat', 'cashback') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    payment_instruments JSON,
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_till DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_bank_name (bank_name),
    INDEX idx_active (is_active),
    INDEX idx_valid_dates (valid_from, valid_till),
    INDEX idx_discount_value (discount_value),
    INDEX idx_min_amount (min_amount),
    INDEX idx_created_at (created_at),

    INDEX idx_bank_active (bank_name, is_active),
    INDEX idx_bank_discount (bank_name, discount_value DESC),
    INDEX idx_active_min_amount (is_active, min_amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create API usage table
CREATE TABLE api_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    response_status INT,
    response_time_ms INT,
    request_size INT,
    response_size INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_endpoint_method (endpoint, method),
    INDEX idx_created_at (created_at),
    INDEX idx_response_status (response_status),
    INDEX idx_ip_address (ip_address),

    INDEX idx_endpoint_status (endpoint, response_status),
    INDEX idx_date_endpoint (created_at, endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data
INSERT INTO offers (
    offer_id, title, description, bank_name, discount_type, 
    discount_value, min_amount, max_discount, payment_instruments,
    valid_from, valid_till, is_active
) VALUES 
(
    'AXIS_CC_10', 
    '10% off with AXIS Credit Card', 
    'Get 10% discount on purchases above ₹1000 using AXIS Bank Credit Card',
    'AXIS', 
    'percentage', 
    10.00, 
    1000.00, 
    500.00, 
    '["CREDIT"]',
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 30 DAY), 
    TRUE
),
(
    'HDFC_FLAT_200', 
    'Flat ₹200 off with HDFC', 
    'Get flat ₹200 discount on purchases above ₹2000 using HDFC Bank cards',
    'HDFC', 
    'flat', 
    200.00, 
    2000.00, 
    200.00, 
    '["CREDIT", "DEBIT"]',
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 45 DAY), 
    TRUE
),
(
    'ICICI_EMI_15', 
    '15% off with ICICI EMI', 
    'Get 15% discount on EMI transactions above ₹5000 using ICICI Bank',
    'ICICI', 
    'percentage', 
    15.00, 
    5000.00, 
    1000.00, 
    '["EMI_OPTIONS"]',
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 60 DAY), 
    TRUE
),
(
    'SBI_CASHBACK_5', 
    '5% Cashback with SBI', 
    'Get 5% cashback on all purchases using SBI cards',
    'SBI', 
    'cashback', 
    5.00, 
    500.00, 
    300.00, 
    '["CREDIT", "DEBIT", "NET_BANKING"]',
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 90 DAY), 
    TRUE
);

-- View for active offers
CREATE VIEW active_offers_view AS
SELECT 
    o.*,
    CASE 
        WHEN o.discount_type = 'percentage' THEN CONCAT(o.discount_value, '% off')
        WHEN o.discount_type = 'flat' THEN CONCAT('₹', o.discount_value, ' off')
        WHEN o.discount_type = 'cashback' THEN CONCAT(o.discount_value, '% cashback')
    END as discount_display,
    DATEDIFF(o.valid_till, NOW()) as days_remaining
FROM offers o
WHERE o.is_active = TRUE 
AND (o.valid_till IS NULL OR o.valid_till > NOW());

-- Stored procedure to clean logs
DELIMITER //
CREATE PROCEDURE CleanOldApiLogs(IN days_to_keep INT)
BEGIN
    DELETE FROM api_usage 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

    SELECT ROW_COUNT() as deleted_rows;
END //
DELIMITER ;

-- Verify setup
SHOW TABLES;
DESCRIBE offers;
DESCRIBE api_usage;
SELECT * FROM active_offers_view LIMIT 5;
```
