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

cursor = conn.cursor(pymysql.cursors.DictCursor)

# Get all exams
cursor.execute("SELECT id, exam_name FROM exams")
exams = cursor.fetchall()

count = 0
for exam in exams:
    # Add a new subject
    cursor.execute(
        "INSERT INTO subjects (exam_id, name) VALUES (%s, %s)",
        (exam['id'], f"General Aptitude for {exam['exam_name']}")
    )
    count += 1

conn.commit()
print(f"Successfully added {count} new subjects (one for each exam).")
conn.close()
