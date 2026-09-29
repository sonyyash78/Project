import pymysql
import os
from dotenv import load_dotenv

load_dotenv('.env')

conn = pymysql.connect(
    host=os.getenv('MYSQLHOST', 'localhost'),
    user=os.getenv('MYSQLUSER', 'root'),
    password=os.getenv('MYSQLPASSWORD', 'root1234@'),
    database=os.getenv('MYSQLDATABASE', 'railway')
)
cursor = conn.cursor()

try:
    cursor.execute('ALTER TABLE exams ADD COLUMN price FLOAT DEFAULT 199.0')
    cursor.execute('ALTER TABLE exams ADD COLUMN discounted_price FLOAT DEFAULT 149.0')
except Exception as e:
    print("Exams table alter error (might exist):", e)

cursor.execute("""
CREATE TABLE IF NOT EXISTS user_exam_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exam_id INT NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME NOT NULL,
    payment_order_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_exam (user_id, exam_id)
)
""")

conn.commit()
print("Database schema updated successfully!")
conn.close()
