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

# Delete the bad dummy questions
cursor.execute("DELETE FROM questions WHERE question LIKE 'What is the core concept %'")
deleted = cursor.rowcount
print(f"Deleted {deleted} fake questions.")

# Realistic questions data
realistic_questions = [
    # Physics - Units & Measurements (Chapter 1)
    (1, 1, "The dimensional formula of Planck's constant is:", "[M L^2 T^-1]", "[M L^2 T^-2]", "[M L T^-1]", "[M L^3 T^-1]", "a", "Planck's constant h = E / nu. E has dimensions [M L^2 T^-2] and frequency nu has [T^-1]. So h has [M L^2 T^-1]."),
    (1, 1, "Light year is a unit of:", "Time", "Distance", "Speed", "Intensity of light", "b", "A light year is the distance travelled by light in a vacuum in one Julian year."),
    (1, 1, "Which of the following is not a fundamental unit?", "Meter", "Kilogram", "Newton", "Second", "c", "Newton is a derived unit (kg.m/s^2)."),
    
    # Physics - Kinematics (Chapter 3)
    (1, 3, "A car starts from rest and accelerates uniformly at 2 m/s^2. What is its velocity after 5 seconds?", "5 m/s", "10 m/s", "15 m/s", "20 m/s", "b", "Using v = u + at, v = 0 + (2)(5) = 10 m/s."),
    (1, 3, "A ball is thrown vertically upwards with a velocity of 20 m/s. Taking g = 10 m/s^2, the maximum height reached is:", "10 m", "20 m", "30 m", "40 m", "b", "Using v^2 = u^2 - 2gh, 0 = 400 - 20h => h = 20 m."),
    
    # Chemistry - Atoms and Molecules (Chapter 9)
    (1, 9, "The number of moles of water in 36 grams of water is:", "1 mole", "2 moles", "3 moles", "4 moles", "b", "Molar mass of water is 18 g/mol. Moles = 36 / 18 = 2 moles."),
    (1, 9, "Which of the following has the maximum number of atoms?", "18 g of H2O", "18 g of O2", "18 g of CO2", "18 g of CH4", "d", "CH4 has the lowest molar mass (16 g/mol) and contains 5 atoms per molecule, yielding the highest total atoms."),

    # Math - Differential Calculus (Chapter 16)
    (1, 16, "The derivative of f(x) = x^3 - 2x + 1 is:", "3x^2 - 2", "3x^2", "x^2 - 2", "3x^2 - 2x", "a", "Using the power rule, d/dx(x^3) = 3x^2 and d/dx(-2x) = -2."),
    (1, 16, "If y = sin(2x), then dy/dx is:", "cos(2x)", "2cos(2x)", "-2cos(2x)", "-cos(2x)", "b", "Using the chain rule, dy/dx = cos(2x) * d/dx(2x) = 2cos(2x).")
]

sql = "INSERT INTO questions (exam_id, chapter_id, question, option_a, option_b, option_c, option_d, correct_answer, solution) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"

for q in realistic_questions:
    cursor.execute(sql, q)

conn.commit()
print(f"Inserted {len(realistic_questions)} realistic questions.")
conn.close()
