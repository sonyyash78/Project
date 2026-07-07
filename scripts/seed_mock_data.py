import sys
import os
from dotenv import load_dotenv

# Load environment variables (to get MySQL connection)
load_dotenv()

# Add the parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.models.question_model import Question
from app.utils.normalization import normalize_entity_name

def seed_data():
    db = SessionLocal()
    try:
        print("Starting comprehensive mock data generation...")

        # 1. Define standard exams to ensure they exist
        target_exams = [
            {"exam_name": "JEE Main", "category": "Engineering", "image": "https://example.com/jee.png"},
            {"exam_name": "JEE Advanced", "category": "Engineering", "image": "https://example.com/jeea.png"},
            {"exam_name": "NEET", "category": "Medical", "image": "https://example.com/neet.png"},
            {"exam_name": "GATE", "category": "Engineering", "image": "https://example.com/gate.png"},
            {"exam_name": "CAT", "category": "Management", "image": "https://example.com/cat.png"},
            {"exam_name": "UPSC Civil Services", "category": "Government", "image": "https://example.com/upsc.png"},
            {"exam_name": "SSC CGL Tier I", "category": "Government", "image": "https://example.com/ssc.png"},
            {"exam_name": "NDA", "category": "Defence", "image": "https://example.com/nda.png"},
            {"exam_name": "CLAT", "category": "Law", "image": "https://example.com/clat.png"},
        ]

        print("Ensuring all target exams exist...")
        for t_exam in target_exams:
            norm_name = normalize_entity_name(t_exam["exam_name"])
            existing = db.query(Exam).filter(Exam.normalized_name == norm_name).first()
            if not existing:
                print(f"Creating missing exam: {t_exam['exam_name']}")
                new_exam = Exam(
                    exam_name=t_exam["exam_name"], 
                    normalized_name=norm_name, 
                    category=t_exam["category"], 
                    image=t_exam["image"]
                )
                db.add(new_exam)
        
        db.commit()
        exams = db.query(Exam).all()
        
        for exam in exams:
            print(f"\nProcessing Exam: {exam.exam_name}")
            
            # 2. Create standard subjects for the exam if none exist
            subjects = db.query(Subject).filter(Subject.exam_id == exam.id).all()
            if not subjects:
                print(f"  No subjects found for {exam.exam_name}. Creating defaults...")
                subj_names = []
                if "JEE" in exam.exam_name.upper() or "GATE" in exam.exam_name.upper():
                    subj_names = ["Physics", "Chemistry", "Mathematics"]
                elif "NEET" in exam.exam_name.upper():
                    subj_names = ["Physics", "Chemistry", "Biology"]
                elif "CAT" in exam.exam_name.upper():
                    subj_names = ["Quantitative Ability", "Logical Reasoning", "Verbal Ability"]
                elif "CLAT" in exam.exam_name.upper():
                    subj_names = ["English", "Legal Reasoning", "Logical Reasoning", "Quantitative Techniques"]
                else:
                    subj_names = ["General Awareness", "Quantitative Aptitude", "Reasoning", "English Language"]
                
                for s_name in subj_names:
                    subj = Subject(exam_id=exam.id, name=s_name, normalized_name=normalize_entity_name(s_name))
                    db.add(subj)
                db.commit()
                subjects = db.query(Subject).filter(Subject.exam_id == exam.id).all()

            for subject in subjects:
                print(f"  - Subject: {subject.name}")
                
                # 3. Create a default chapter if none exists
                chapters = db.query(Chapter).filter(Chapter.subject_id == subject.id).all()
                if not chapters:
                    print(f"    No chapters found for {subject.name}. Creating 'Mock Chapter'...")
                    chap = Chapter(subject_id=subject.id, name=f"{subject.name} - Basics", normalized_name=normalize_entity_name(f"{subject.name} Basics"))
                    db.add(chap)
                    db.commit()
                    chapters = db.query(Chapter).filter(Chapter.subject_id == subject.id).all()

                # 4. Generate 20 questions for each chapter
                for chapter in chapters:
                    existing_q_count = db.query(Question).filter(
                        Question.exam_id == exam.id, 
                        Question.chapter_id == chapter.id
                    ).count()
                    
                    questions_to_add = max(0, 20 - existing_q_count)
                    
                    if questions_to_add > 0:
                        print(f"    Adding {questions_to_add} questions for chapter: {chapter.name}...")
                        new_questions = []
                        for i in range(1, questions_to_add + 1):
                            q_num = existing_q_count + i
                            new_q = Question(
                                exam_id=exam.id,
                                chapter_id=chapter.id,
                                question=f"Mock Question {q_num} for {subject.name} ({exam.exam_name}). What is the core principle of this topic?",
                                question_type="mcq",
                                option_a=f"Option A - Standard valid point",
                                option_b=f"Option B - Common misconception",
                                option_c=f"Option C - Partially correct",
                                option_d=f"Option D - Completely incorrect",
                                correct_answer="A",
                                solution=f"The correct answer is Option A. This is an auto-generated mock question for {exam.exam_name}.",
                                difficulty="Medium",
                                marks=exam.positive_marks if exam.positive_marks else 4.0,
                                negative_marks=exam.negative_marks if exam.negative_marks else -1.0,
                                topic="Fundamental Concepts",
                                language="en",
                                status="active"
                            )
                            new_questions.append(new_q)
                        
                        db.add_all(new_questions)
                        db.commit()
                        print(f"    Successfully added {questions_to_add} questions!")
                    else:
                        print(f"    Already has {existing_q_count} questions (>= 20) in chapter {chapter.name}. Skipping.")

        print("\nAll done! Database is successfully populated with 20 questions per subject for all exams.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

