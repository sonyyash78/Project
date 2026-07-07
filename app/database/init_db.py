"""Initialize MySQL database and tables. Run: python -m app.database.init_db"""

from app.database.db import MYSQL_DATABASE, ensure_database_exists


def main():
    print(f"Connecting to MySQL and setting up database '{MYSQL_DATABASE}'...")
    ensure_database_exists()
    print(f"Success! Database '{MYSQL_DATABASE}' is ready.")


if __name__ == "__main__":
    main()
def init_database(db):
    # Existing tables 1-37 logic remains completely unchanged above this line.
    
    cursor = db.cursor()
    
    # 1. SUBSCRIPTION PLANS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) NOT NULL UNIQUE,
        monthly_price DECIMAL(10, 2) NOT NULL,
        yearly_price DECIMAL(10, 2) NOT NULL,
        features_json JSON NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 2. ACTIVE SUBSCRIPTIONS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        billing_cycle VARCHAR(20) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        auto_renew TINYINT(1) DEFAULT 1,
        cancelled_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 3. PAYMENT RECORDS
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subscription_id INT NULL,
        razorpay_order_id VARCHAR(100) NOT NULL UNIQUE,
        razorpay_payment_id VARCHAR(100) NULL,
        razorpay_signature VARCHAR(255) NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(30) DEFAULT 'created',
        method VARCHAR(30) NULL,
        coupon_id INT NULL,
        wallet_amount_used DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 4. GST-READY INVOICES
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        payment_id INT NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0.00,
        gst_rate DECIMAL(5, 2) DEFAULT 18.00,
        gst_amount DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(30) DEFAULT 'unpaid',
        billing_name VARCHAR(100) NOT NULL,
        billing_email VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 5. COUPON CODES SYSTEM
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS coupon_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(30) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order DECIMAL(10, 2) DEFAULT 0.00,
        max_discount DECIMAL(10, 2) DEFAULT 0.00,
        max_uses INT DEFAULT 0,
        used_count INT DEFAULT 0,
        expiry_date DATETIME NULL,
        is_active TINYINT(1) DEFAULT 1,
        is_user_specific TINYINT(1) DEFAULT 0,
        user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 6. REFERRAL TRACKING
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referrer_id INT NOT NULL,
        referred_id INT NOT NULL UNIQUE,
        referral_code VARCHAR(20) NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        reward_amount DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 7. USER WALLET LEDGER
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wallet (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        total_credited DECIMAL(10, 2) DEFAULT 0.00,
        total_debited DECIMAL(10, 2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 8. WALLET TRANSACTIONS HISTORY
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wallet_id INT NOT NULL,
        user_id INT NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description VARCHAR(255) NULL,
        reference_type VARCHAR(50) NULL,
        reference_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_id) REFERENCES wallet(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 9. SAFE USER STRUCTURAL APPENDS
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE NULL;")
    except Exception:
        pass # Column already structurally present

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN referred_by INT NULL;")
    except Exception:
        pass # Column already structurally present

    db.commit()