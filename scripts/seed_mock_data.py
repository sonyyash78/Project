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

def seed_data():
    db = SessionLocal()
    try:
        print("Starting mock data generation...")

        # 1. Create standard exams if none exist
        exams = db.query(Exam).all()
        if not exams:
            print("No exams found. Creating default exams...")
            exam1 = Exam(exam_name="JEE Main", normalized_name="jee main", category="Engineering", image="https://example.com/jee.png")
            exam2 = Exam(exam_name="NEET", normalized_name="neet", category="Medical", image="https://example.com/neet.png")
            db.add_all([exam1, exam2])
            db.commit()
            exams = db.query(Exam).all()
        
        for exam in exams:
            print(f"\nProcessing Exam: {exam.exam_name}")
            
            # 2. Create standard subjects for the exam if none exist
            subjects = db.query(Subject).filter(Subject.exam_id == exam.id).all()
            if not subjects:
                print(f"  No subjects found for {exam.exam_name}. Creating defaults...")
                subj_names = ["Physics", "Chemistry"]
                if "JEE" in exam.exam_name.upper():
                    subj_names.append("Mathematics")
                elif "NEET" in exam.exam_name.upper():
                    subj_names.append("Biology")
                else:
                    subj_names.append("General Studies")
                
                for s_name in subj_names:
                    subj = Subject(exam_id=exam.id, name=s_name, normalized_name=s_name.lower())
                    db.add(subj)
                db.commit()
                subjects = db.query(Subject).filter(Subject.exam_id == exam.id).all()

            for subject in subjects:
                print(f"  - Subject: {subject.name}")
                
                # 3. Create a default chapter if none exists
                chapters = db.query(Chapter).filter(Chapter.subject_id == subject.id).all()
                if not chapters:
                    print(f"    No chapters found for {subject.name}. Creating 'Mock Chapter'...")
                    chap = Chapter(subject_id=subject.id, name=f"{subject.name} - Mock Chapter", normalized_name=f"{subject.name.lower()} mock")
                    db.add(chap)
                    db.commit()
                    chapters = db.query(Chapter).filter(Chapter.subject_id == subject.id).all()

                # 4. Generate 20 questions for each chapter
                for chapter in chapters:
                    # Check how many questions already exist for this exam + chapter
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
                                question=f"Mock Question {q_num} for {subject.name} ({exam.exam_name}). What is the correct answer?",
                                question_type="mcq",
                                option_a=f"Option A for Q{q_num}",
                                option_b=f"Option B for Q{q_num}",
                                option_c=f"Option C for Q{q_num}",
                                option_d=f"Option D for Q{q_num}",
                                correct_answer="A",
                                solution=f"The correct answer is Option A because this is a mock question generated automatically.",
                                difficulty="Medium",
                                marks=4.0,
                                negative_marks=-1.0,
                                topic="Mock Topic",
                                language="en",
                                status="active"
                            )
                            new_questions.append(new_q)
                        
                        db.add_all(new_questions)
                        db.commit()
                        print(f"    Successfully added {questions_to_add} questions!")
                    else:
                        print(f"    Already has {existing_q_count} questions (>= 20) in chapter {chapter.name}. Skipping.")

        print("\nAll done! Database is successfully populated with 20 questions per subject.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
