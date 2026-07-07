import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.database.db import SessionLocal
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.routes.question_routes import _get_or_create_exam, _get_or_create_subject, _get_or_create_chapter

def verify():
    print("--- Verifying Normalization ---")
    db = SessionLocal()
    
    try:
        # Test 1: Exams with different casings/spacing
        names = ["JEE Main", "jee main", "JEE MAIN", " Jee Main ", "JEE  MAIN"]
        exam_ids = set()
        
        for n in names:
            e = _get_or_create_exam(db, n)
            exam_ids.add(e.id)
            print(f"Input: '{n}' -> Resolved Exam ID: {e.id} (Name: '{e.exam_name}', Normalized: '{e.normalized_name}')")
            
        assert len(exam_ids) == 1, "Failed: Multiple Exam IDs created for the same normalized name."
        print("✓ Exams resolved correctly.")
        
        # Test 2: Subjects
        sub_names = ["Physics", "physics", "PHYSICS", " Physics "]
        sub_ids = set()
        exam_id = list(exam_ids)[0]
        
        for n in sub_names:
            s = _get_or_create_subject(db, n, exam_id)
            sub_ids.add(s.id)
            print(f"Input: '{n}' -> Resolved Subject ID: {s.id} (Name: '{s.name}')")
            
        assert len(sub_ids) == 1, "Failed: Multiple Subject IDs created for the same normalized name."
        print("✓ Subjects resolved correctly.")
        
        # Test 3: Chapters
        chap_names = ["Units & Dimensions", "units & dimensions", "Units and Dimensions", '"Units & Dimensions"', ' Units & Dimensions ']
        chap_ids = set()
        sub_id = list(sub_ids)[0]
        
        for n in chap_names:
            c = _get_or_create_chapter(db, n, sub_id)
            chap_ids.add(c.id)
            print(f"Input: '{n}' -> Resolved Chapter ID: {c.id} (Name: '{c.name}', Normalized: '{c.normalized_name}')")
            
        assert len(chap_ids) == 1, "Failed: Multiple Chapter IDs created for the same normalized name."
        print("✓ Chapters resolved correctly.")
        
        print("\nALL TESTS PASSED SUCCESSFULLY! No duplicates created.")
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    verify()
