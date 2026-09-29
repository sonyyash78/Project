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
cursor.execute('SELECT id, exam_id FROM subjects')
subjects = cursor.fetchall()

count = 0
for s in subjects:
    cursor.execute(f"SELECT id FROM chapters WHERE subject_id={s['id']}")
    chapters = cursor.fetchall()
    
    for c in chapters:
        # Add 10 dummy questions per chapter
        for i in range(1, 11):
            q_text = f"What is the core concept {i} of Chapter {c['id']} in Subject {s['id']}?"
            sql = "INSERT INTO questions (exam_id, chapter_id, question, option_a, option_b, option_c, option_d, correct_answer, solution) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
            vals = (s['exam_id'], c['id'], q_text, "Option A", "Option B", "Option C", "Option D", "a", "Detailed solution explanation.")
            cursor.execute(sql, vals)
            count += 1

conn.commit()
conn.close()
print(f'Successfully seeded {count} questions!')
