import sys
import os
import json
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.models.question_model import Question
from app.utils.normalization import normalize_entity_name

real_questions_pool = {
    "physics": [
        {
            "question": "A particle moves in a straight line with retardation proportional to its displacement. Its loss of kinetic energy for any displacement x is proportional to:",
            "options": ["x", "x^2", "ln(x)", "e^x"],
            "correct": "B",
            "solution": "Retardation a = -kx. v(dv/dx) = -kx => v dv = -kx dx. Integrating, (v^2 - u^2)/2 = -kx^2/2. Loss in KE = m(u^2 - v^2)/2 = mkx^2/2. So loss in KE is proportional to x^2."
        },
        {
            "question": "Two masses m1 and m2 are connected by a light string passing over a smooth pulley. If m1 > m2, the acceleration of the system is:",
            "options": ["(m1-m2)g / (m1+m2)", "(m1+m2)g / (m1-m2)", "m1g / m2", "m2g / m1"],
            "correct": "A",
            "solution": "Net pulling force is (m1-m2)g, total mass to be moved is (m1+m2). Acceleration a = F_net / m_total = (m1-m2)g / (m1+m2)."
        },
        {
            "question": "The half-life of a radioactive substance is 30 days. What is the time taken for 3/4th of its original mass to disintegrate?",
            "options": ["30 days", "45 days", "60 days", "90 days"],
            "correct": "C",
            "solution": "3/4th disintegrated means 1/4th remains. 1/4 = (1/2)^2, which means 2 half-lives. Time = 2 * 30 = 60 days."
        },
        {
            "question": "A uniform wire of resistance R is stretched uniformly so that its length becomes n times its original length. The new resistance is:",
            "options": ["nR", "R/n", "n^2 R", "R/n^2"],
            "correct": "C",
            "solution": "Volume remains constant. V = A*l = A'*nl => A' = A/n. R' = rho*(nl)/(A/n) = n^2 * rho*l/A = n^2 R."
        },
        {
            "question": "The escape velocity from the Earth is v. If the mass of the Earth is increased to 4 times and its radius is doubled, the escape velocity will become:",
            "options": ["v", "v/2", "v * sqrt(2)", "2v"],
            "correct": "C",
            "solution": "Escape velocity v = sqrt(2GM/R). v' = sqrt(2G(4M)/(2R)) = sqrt(2) * sqrt(2GM/R) = v * sqrt(2)."
        }
    ],
    "chemistry": [
        {
            "question": "Which of the following compounds has the highest boiling point?",
            "options": ["CH4", "NH3", "H2O", "HF"],
            "correct": "C",
            "solution": "H2O has the highest boiling point due to extensive intermolecular hydrogen bonding capable of forming four hydrogen bonds per molecule."
        },
        {
            "question": "The oxidation state of Cr in K2Cr2O7 is:",
            "options": ["+3", "+6", "+7", "+4"],
            "correct": "B",
            "solution": "Let oxidation state of Cr be x. 2(+1) + 2x + 7(-2) = 0 => 2 + 2x - 14 = 0 => 2x = 12 => x = +6."
        },
        {
            "question": "According to Bohr's theory, the angular momentum of an electron in the nth orbit is quantized as:",
            "options": ["nh/2π", "nh/π", "n^2h/2π", "n/h"],
            "correct": "A",
            "solution": "Bohr's postulate states that angular momentum mvr = nh/(2π), where n is an integer."
        },
        {
            "question": "Which of the following is an electrophile?",
            "options": ["NH3", "H2O", "AlCl3", "CH3OH"],
            "correct": "C",
            "solution": "AlCl3 is an electron-deficient species (Lewis acid) and thus acts as an electrophile. The others have lone pairs and act as nucleophiles."
        },
        {
            "question": "The geometry of SF6 molecule is:",
            "options": ["Tetrahedral", "Trigonal bipyramidal", "Octahedral", "Square planar"],
            "correct": "C",
            "solution": "Sulfur in SF6 undergoes sp3d2 hybridization, resulting in an octahedral geometry."
        }
    ],
    "mathematics": [
        {
            "question": "The derivative of sin(x^2) with respect to x is:",
            "options": ["cos(x^2)", "2x cos(x^2)", "-2x cos(x^2)", "sin(2x)"],
            "correct": "B",
            "solution": "Using the chain rule: d/dx [sin(x^2)] = cos(x^2) * d/dx [x^2] = 2x cos(x^2)."
        },
        {
            "question": "The value of integral from 0 to pi/2 of sin(x) dx is:",
            "options": ["0", "1", "-1", "2"],
            "correct": "B",
            "solution": "Integral of sin(x) is -cos(x). Evaluating from 0 to pi/2: -cos(pi/2) - (-cos(0)) = -0 + 1 = 1."
        },
        {
            "question": "If a matrix A is such that A^2 = I, then A is called:",
            "options": ["Idempotent matrix", "Involutory matrix", "Nilpotent matrix", "Orthogonal matrix"],
            "correct": "B",
            "solution": "A matrix A for which A^2 = I is called an involutory matrix."
        },
        {
            "question": "The sum of the infinite geometric series 1 + 1/2 + 1/4 + 1/8 + ... is:",
            "options": ["2", "1", "Infinity", "0.5"],
            "correct": "A",
            "solution": "Sum = a / (1 - r). Here a = 1, r = 1/2. Sum = 1 / (1 - 1/2) = 2."
        },
        {
            "question": "The roots of the quadratic equation x^2 - 5x + 6 = 0 are:",
            "options": ["2 and 3", "-2 and -3", "1 and 6", "-1 and -6"],
            "correct": "A",
            "solution": "x^2 - 5x + 6 = (x-2)(x-3) = 0. Therefore, roots are x=2 and x=3."
        }
    ],
    "biology": [
        {
            "question": "The powerhouse of the cell is:",
            "options": ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"],
            "correct": "C",
            "solution": "Mitochondria generate most of the cell's supply of ATP, used as a source of chemical energy."
        },
        {
            "question": "DNA replication occurs during which phase of the cell cycle?",
            "options": ["G1 phase", "S phase", "G2 phase", "M phase"],
            "correct": "B",
            "solution": "The synthesis (S) phase is the part of the cell cycle in which DNA is replicated."
        },
        {
            "question": "Which blood group is known as the universal donor?",
            "options": ["A", "B", "AB", "O"],
            "correct": "D",
            "solution": "Blood type O negative is the universal donor type because it has no A or B antigens."
        },
        {
            "question": "The basic structural and functional unit of the nervous system is:",
            "options": ["Nephron", "Neuron", "Glial cell", "Alveolus"],
            "correct": "B",
            "solution": "Neurons are the fundamental units of the brain and nervous system."
        },
        {
            "question": "Which plant hormone is primarily responsible for cell elongation?",
            "options": ["Cytokinin", "Gibberellin", "Auxin", "Ethylene"],
            "correct": "C",
            "solution": "Auxins promote stem elongation, inhibit growth of lateral buds, and promote root growth."
        }
    ],
    "general": [
        {
            "question": "If 5 machines take 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
            "options": ["5 minutes", "100 minutes", "1 minute", "20 minutes"],
            "correct": "A",
            "solution": "Each machine takes 5 minutes to make 1 widget. So 100 machines working simultaneously will also take 5 minutes to make 100 widgets."
        },
        {
            "question": "What is the next number in the series: 2, 6, 12, 20, 30, ...?",
            "options": ["40", "42", "44", "48"],
            "correct": "B",
            "solution": "The differences are 4, 6, 8, 10. The next difference is 12, so 30 + 12 = 42. (Also n^2 + n: 1^2+1=2, 2^2+2=6, ... 6^2+6=42)"
        },
        {
            "question": "Which of the following is a synonym for 'Ephemeral'?",
            "options": ["Permanent", "Fleeting", "Luminous", "Opaque"],
            "correct": "B",
            "solution": "Ephemeral means lasting for a very short time, which is synonymous with fleeting."
        },
        {
            "question": "Who was the first President of independent India?",
            "options": ["Jawaharlal Nehru", "Mahatma Gandhi", "Dr. Rajendra Prasad", "Sardar Patel"],
            "correct": "C",
            "solution": "Dr. Rajendra Prasad was the first President of India, serving from 1950 to 1962."
        },
        {
            "question": "If A is the brother of B; B is the sister of C; and C is the father of D, how D is related to A?",
            "options": ["Brother", "Sister", "Nephew or Niece", "Cannot be determined"],
            "correct": "D",
            "solution": "The gender of D is not specified. Therefore, D can be either the nephew or the niece of A."
        }
    ]
}

def seed_real_data():
    db = SessionLocal()
    try:
        # First, delete all mock questions
        print("Deleting dummy mock questions...")
        db.query(Question).filter(Question.question.like("%Mock Question%")).delete(synchronize_session=False)
        db.commit()
        print("Dummy questions removed successfully.")

        exams = db.query(Exam).all()
        
        total_added = 0
        for exam in exams:
            print(f"\nSeeding REAL questions for Exam: {exam.exam_name}")
            chapters = db.query(Chapter).join(Subject).filter(Subject.exam_id == exam.id).all()
            
            for chapter in chapters:
                subject_name = chapter.subject.name.lower()
                
                # Determine category pool
                pool_key = "general"
                if "phys" in subject_name: pool_key = "physics"
                elif "chem" in subject_name: pool_key = "chemistry"
                elif "math" in subject_name or "quant" in subject_name: pool_key = "mathematics"
                elif "bio" in subject_name: pool_key = "biology"
                
                pool = real_questions_pool[pool_key]
                
                # Check how many real questions already exist
                existing_q_count = db.query(Question).filter(
                    Question.exam_id == exam.id, 
                    Question.chapter_id == chapter.id,
                    Question.question.notlike("%Mock Question%")
                ).count()
                
                questions_to_add = max(0, 20 - existing_q_count)
                
                if questions_to_add > 0:
                    new_questions = []
                    for i in range(questions_to_add):
                        q_data = pool[i % len(pool)]
                        new_q = Question(
                            exam_id=exam.id,
                            chapter_id=chapter.id,
                            question=q_data["question"],
                            question_type="mcq",
                            option_a=q_data["options"][0],
                            option_b=q_data["options"][1],
                            option_c=q_data["options"][2],
                            option_d=q_data["options"][3],
                            correct_answer=q_data["correct"],
                            solution=q_data["solution"],
                            difficulty="Medium",
                            marks=exam.positive_marks if exam.positive_marks else 4.0,
                            negative_marks=exam.negative_marks if exam.negative_marks else -1.0,
                            topic="Important Concepts",
                            language="en",
                            status="active"
                        )
                        new_questions.append(new_q)
                    
                    db.add_all(new_questions)
                    db.commit()
                    total_added += len(new_questions)
                    print(f"  -> Added {len(new_questions)} real questions to '{subject_name}'")

        print(f"\nAll done! Successfully seeded {total_added} actual questions.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_real_data()
