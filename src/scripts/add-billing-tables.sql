-- Billing and Payment Management Tables
-- Run this script to add billing functionality

-- Payment Plans table
CREATE TABLE IF NOT EXISTS payment_plan (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    features JSON,
    max_users INT DEFAULT NULL,
    max_storage_gb INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment Methods table (stores card information)
CREATE TABLE IF NOT EXISTS payment_method (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    card_holder_name VARCHAR(255) NOT NULL,
    card_last_four CHAR(4) NOT NULL,
    card_brand VARCHAR(50) NOT NULL,
    card_exp_month CHAR(2) NOT NULL,
    card_exp_year CHAR(4) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    billing_address JSON,
    stripe_payment_method_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Business Subscriptions table
CREATE TABLE IF NOT EXISTS business_subscription (
    id CHAR(36) PRIMARY KEY,
    business_id CHAR(36) NOT NULL,
    payment_plan_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36),
    status ENUM('active', 'cancelled', 'expired', 'trial', 'suspended') NOT NULL DEFAULT 'trial',
    trial_ends_at TIMESTAMP NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP NULL,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_plan_id) REFERENCES payment_plan(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE SET NULL,
    INDEX idx_business_id (business_id),
    INDEX idx_status (status),
    INDEX idx_current_period_end (current_period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment History table
CREATE TABLE IF NOT EXISTS payment_history (
    id CHAR(36) PRIMARY KEY,
    business_id CHAR(36) NOT NULL,
    subscription_id CHAR(36),
    payment_method_id CHAR(36),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'succeeded', 'failed', 'refunded') NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stripe_payment_intent_id VARCHAR(255),
    failure_reason TEXT,
    receipt_url VARCHAR(500),
    invoice_pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES business_subscription(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE SET NULL,
    INDEX idx_business_id (business_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default payment plans
INSERT INTO payment_plan (id, name, description, price, billing_cycle, features, max_users, max_storage_gb, display_order) VALUES
(UUID(), 'Free', 'Perfect for getting started', 0.00, 'monthly', JSON_ARRAY('Up to 5 users', '1GB storage', 'Basic support', 'Core features'), 5, 1, 1),
(UUID(), 'Starter', 'Great for small teams', 29.00, 'monthly', JSON_ARRAY('Up to 20 users', '10GB storage', 'Email support', 'All core features', 'Basic analytics'), 20, 10, 2),
(UUID(), 'Professional', 'Perfect for growing businesses', 99.00, 'monthly', JSON_ARRAY('Up to 100 users', '100GB storage', 'Priority support', 'Advanced features', 'Advanced analytics', 'API access'), 100, 100, 3),
(UUID(), 'Enterprise', 'For large organizations', 299.00, 'monthly', JSON_ARRAY('Unlimited users', 'Unlimited storage', '24/7 dedicated support', 'All features', 'Custom integrations', 'SLA guarantee'), NULL, NULL, 4),
(UUID(), 'Starter Annual', 'Save 20% with annual billing', 278.40, 'yearly', JSON_ARRAY('Up to 20 users', '10GB storage', 'Email support', 'All core features', 'Basic analytics'), 20, 10, 5),
(UUID(), 'Professional Annual', 'Save 20% with annual billing', 950.40, 'yearly', JSON_ARRAY('Up to 100 users', '100GB storage', 'Priority support', 'Advanced features', 'Advanced analytics', 'API access'), 100, 100, 6),
(UUID(), 'Enterprise Annual', 'Save 20% with annual billing', 2870.40, 'yearly', JSON_ARRAY('Unlimited users', 'Unlimited storage', '24/7 dedicated support', 'All features', 'Custom integrations', 'SLA guarantee'), NULL, NULL, 7);

-- Add business_id to user table if not exists (for subscription tracking)
-- ALTER TABLE business ADD COLUMN current_subscription_id CHAR(36) NULL;
-- ALTER TABLE business ADD FOREIGN KEY (current_subscription_id) REFERENCES business_subscription(id) ON DELETE SET NULL;

