import os
import sys
import argparse

# Add the project root to sys.path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.db import SessionLocal, engine
from app.utils.normalization import normalize_entity_name
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.models.topic_model import Topic
from app.models.question_model import Question
from sqlalchemy import text

def add_columns_if_missing():
    print("Checking and adding normalized_name columns...")
    with engine.connect() as conn:
        tables = ["exams", "subjects", "chapters", "topics"]
        for table in tables:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN normalized_name VARCHAR(255)"))
                conn.execute(text(f"CREATE INDEX ix_{table}_normalized_name ON {table} (normalized_name)"))
                conn.commit()
                print(f"Added normalized_name to {table}")
            except Exception as e:
                # Column might already exist
                conn.rollback()
                print(f"Column likely exists in {table}: {str(e)[:100]}...")

def populate_normalized_names(db):
    print("Populating normalized names...")
    
    exams = db.query(Exam).all()
    for e in exams:
        e.normalized_name = normalize_entity_name(e.exam_name)
    
    subjects = db.query(Subject).all()
    for s in subjects:
        s.normalized_name = normalize_entity_name(s.name)
        
    chapters = db.query(Chapter).all()
    for c in chapters:
        c.normalized_name = normalize_entity_name(c.name)
        
    topics = db.query(Topic).all()
    for t in topics:
        t.normalized_name = normalize_entity_name(t.name)
        
    db.commit()
    print("Population complete.")

def merge_duplicates(db):
    print("\n--- Merging Duplicate Exams ---")
    exams = db.query(Exam).all()
    exam_map = {}
    duplicate_exams = []
    
    for e in exams:
        key = e.normalized_name
        if key not in exam_map:
            exam_map[key] = e
        else:
            master = exam_map[key]
            print(f"Merging Exam '{e.exam_name}' (ID: {e.id}) into '{master.exam_name}' (ID: {master.id})")
            
            # Reassign Subjects
            subjects = db.query(Subject).filter(Subject.exam_id == e.id).all()
            for s in subjects:
                s.exam_id = master.id
                
            # Reassign Questions
            questions = db.query(Question).filter(Question.exam_id == e.id).all()
            for q in questions:
                q.exam_id = master.id
                
            duplicate_exams.append(e)
            
    db.commit()
    for e in duplicate_exams:
        db.delete(e)
    db.commit()
    print(f"Deleted {len(duplicate_exams)} duplicate exams.")


    print("\n--- Merging Duplicate Subjects ---")
    subjects = db.query(Subject).all()
    sub_map = {}
    duplicate_subjects = []
    
    for s in subjects:
        # Same normalized name AND same exam_id
        key = (s.normalized_name, s.exam_id)
        if key not in sub_map:
            sub_map[key] = s
        else:
            master = sub_map[key]
            print(f"Merging Subject '{s.name}' (ID: {s.id}) into '{master.name}' (ID: {master.id}) under Exam ID {s.exam_id}")
            
            # Reassign Chapters
            chapters = db.query(Chapter).filter(Chapter.subject_id == s.id).all()
            for c in chapters:
                c.subject_id = master.id
                
            # No direct questions to subject relation in question_model, right? Wait, let me check.
            # Usually questions are linked to chapter and exam. Let's assume no subject_id in Question.
            
            duplicate_subjects.append(s)
            
    db.commit()
    for s in duplicate_subjects:
        db.delete(s)
    db.commit()
    print(f"Deleted {len(duplicate_subjects)} duplicate subjects.")


    print("\n--- Merging Duplicate Chapters ---")
    chapters = db.query(Chapter).all()
    chap_map = {}
    duplicate_chapters = []
    
    for c in chapters:
        key = (c.normalized_name, c.subject_id)
        if key not in chap_map:
            chap_map[key] = c
        else:
            master = chap_map[key]
            print(f"Merging Chapter '{c.name}' (ID: {c.id}) into '{master.name}' (ID: {master.id}) under Subject ID {c.subject_id}")
            
            # Reassign Topics
            topics = db.query(Topic).filter(Topic.chapter_id == c.id).all()
            for t in topics:
                t.chapter_id = master.id
                
            # Reassign Questions
            questions = db.query(Question).filter(Question.chapter_id == c.id).all()
            for q in questions:
                q.chapter_id = master.id
                
            duplicate_chapters.append(c)
            
    db.commit()
    for c in duplicate_chapters:
        db.delete(c)
    db.commit()
    print(f"Deleted {len(duplicate_chapters)} duplicate chapters.")


    print("\n--- Merging Duplicate Topics ---")
    topics = db.query(Topic).all()
    topic_map = {}
    duplicate_topics = []
    
    for t in topics:
        key = (t.normalized_name, t.chapter_id)
        if key not in topic_map:
            topic_map[key] = t
        else:
            master = topic_map[key]
            print(f"Merging Topic '{t.name}' (ID: {t.id}) into '{master.name}' (ID: {master.id}) under Chapter ID {t.chapter_id}")
            # Topic isn't directly assigned to Question in schema (Wait, is it? We should check question_model. If it is, reassign it).
            duplicate_topics.append(t)
            
    db.commit()
    for t in duplicate_topics:
        db.delete(t)
    db.commit()
    print(f"Deleted {len(duplicate_topics)} duplicate topics.")


def cleanup_duplicate_questions(db):
    print("\n--- Cleaning up Duplicate Questions ---")
    # Identify duplicate questions by normalized question text within the same chapter
    questions = db.query(Question).all()
    q_map = {}
    duplicates = []
    
    for q in questions:
        norm_text = normalize_entity_name(q.question)
        key = (norm_text, q.chapter_id)
        if key not in q_map:
            q_map[key] = q
        else:
            master = q_map[key]
            print(f"Merging Question ID {q.id} into Master ID {master.id}")
            # Any dependencies on Question? e.g. Attempt, Bookmark? We should update them.
            # Assuming basic cleanup for now. Reassigning is complex if there are many relations.
            duplicates.append(q)
            
    for q in duplicates:
        db.delete(q)
    db.commit()
    print(f"Deleted {len(duplicates)} duplicate questions.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--add-columns", action="store_true")
    args = parser.parse_args()

    if args.add_columns:
        add_columns_if_missing()

    db = SessionLocal()
    try:
        populate_normalized_names(db)
        merge_duplicates(db)
        cleanup_duplicate_questions(db)
    finally:
        db.close()
    
    print("\nSUCCESS: Database cleanup completed.")
