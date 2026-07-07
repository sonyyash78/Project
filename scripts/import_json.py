import os
import sys
import json
import argparse
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.db import SessionLocal, ensure_database_exists
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.models.topic_model import Topic
from app.models.question_model import Question
from app.utils.normalization import normalize_entity_name

# Import helper functions from route logic to resolve models uniformly
from app.routes.question_routes import (
    _get_or_create_exam,
    _get_or_create_subject,
    _get_or_create_chapter,
    _get_or_create_topic,
    QUESTION_TYPES,
    DIFFICULTIES
)

def _safe_float(val, default):
    try:
        return float(val) if val and str(val).strip() else default
    except (ValueError, TypeError):
        return default

def _safe_int(val, default=None):
    try:
        return int(val) if val and str(val).strip() else default
    except (ValueError, TypeError):
        return default

def parse_and_insert_json(json_path: str, db: Session):
    if not os.path.exists(json_path):
        print(f"Error: JSON file '{json_path}' does not exist.")
        sys.exit(1)
        
    print(f"Reading JSON file: {json_path}...")
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading or parsing JSON file: {e}")
        sys.exit(1)
        
    global_exam = None
    global_subject = None
    global_chapter = None
    questions_list = []
    
    if isinstance(data, dict):
        global_exam = data.get("exam") or data.get("exam_name")
        global_subject = data.get("subject")
        global_chapter = data.get("chapter")
        questions_list = data.get("questions")
        if not isinstance(questions_list, list):
            if "question" in data:
                questions_list = [data]
            else:
                print("Error: JSON must contain a list of questions under key 'questions' or represent an array of question objects.")
                sys.exit(1)
    elif isinstance(data, list):
        questions_list = data
    else:
        print("Error: JSON must be an object or an array.")
        sys.exit(1)
        
    print(f"Found {len(questions_list)} question objects in JSON. Resolving database relationships and inserting...")
    
    inserted = 0
    skipped_duplicate = 0
    failed = 0
    
    exam_cache = {}
    subject_cache = {}
    chapter_cache = {}
    topic_cache = {}
    
    # Preload existing question text hashes
    existing_questions = set(
        normalize_entity_name(q[0]) for q in db.query(Question.question).all() if q[0]
    )
    
    for idx, item in enumerate(questions_list, start=1):
        try:
            exam_name = item.get("exam") or item.get("exam_name") or global_exam or ""
            subject_name = item.get("subject") or global_subject or ""
            chapter_name = item.get("chapter") or global_chapter or ""
            topic_name = item.get("topic") or ""
            question_text = item.get("question") or ""
            correct_answer = item.get("correct_answer") or ""
            
            exam_name = str(exam_name).strip()
            subject_name = str(subject_name).strip()
            chapter_name = str(chapter_name).strip()
            question_text = str(question_text).strip()
            correct_answer = str(correct_answer).strip().upper()
            
            if not exam_name or not subject_name or not chapter_name or not question_text:
                print(f"Index {idx} skipped: Missing required field (exam / subject / chapter / question)")
                failed += 1
                continue
                
            if not correct_answer:
                print(f"Index {idx} skipped: correct_answer is empty")
                failed += 1
                continue
                
            q_type = str(item.get("question_type") or "mcq").strip().lower()
            if q_type not in QUESTION_TYPES:
                q_type = "mcq"
                
            # Skip duplicates
            norm_q = normalize_entity_name(question_text)
            if norm_q in existing_questions:
                print(f"Index {idx} skipped: Duplicate question found (already exists in database or seen earlier in file).")
                skipped_duplicate += 1
                continue
                
            # Options
            option_a = item.get("option_a")
            option_b = item.get("option_b")
            option_c = item.get("option_c")
            option_d = item.get("option_d")
            
            options_dict = item.get("options")
            if isinstance(options_dict, dict):
                option_a = option_a or options_dict.get("A") or options_dict.get("a")
                option_b = option_b or options_dict.get("B") or options_dict.get("b")
                option_c = option_c or options_dict.get("C") or options_dict.get("c")
                option_d = option_d or options_dict.get("D") or options_dict.get("d")
                
            option_a = str(option_a).strip() if option_a is not None else ""
            option_b = str(option_b).strip() if option_b is not None else ""
            option_c = str(option_c).strip() if option_c is not None else ""
            option_d = str(option_d).strip() if option_d is not None else ""
            
            # Solution
            solution_raw = item.get("solution")
            solution_str = ""
            if isinstance(solution_raw, dict):
                concept = solution_raw.get("concept", "").strip()
                steps = solution_raw.get("steps")
                quick_trick = solution_raw.get("quick_trick", "").strip()
                common_mistake = solution_raw.get("common_mistake", "").strip()
                
                parts = []
                if concept:
                    parts.append(f"### Concept\n{concept}")
                if steps:
                    if isinstance(steps, list):
                        steps_md = "\n".join(f"{i}. {str(s).strip()}" for i, s in enumerate(steps, 1))
                        parts.append(f"### Steps\n{steps_md}")
                    else:
                        parts.append(f"### Steps\n{str(steps).strip()}")
                if quick_trick:
                    parts.append(f"### Quick Trick\n{quick_trick}")
                if common_mistake:
                    parts.append(f"### Common Mistakes\n{common_mistake}")
                solution_str = "\n\n".join(parts)
            elif solution_raw is not None:
                solution_str = str(solution_raw).strip()
                
            # Resolve models
            exam_key = normalize_entity_name(exam_name)
            if exam_key not in exam_cache:
                exam = _get_or_create_exam(db, exam_name)
                exam_cache[exam_key] = exam.id
            exam_id = exam_cache[exam_key]
            
            subject_key = f"{exam_id}_{normalize_entity_name(subject_name)}"
            if subject_key not in subject_cache:
                subject = _get_or_create_subject(db, subject_name, exam_id)
                subject_cache[subject_key] = subject.id
            subject_id = subject_cache[subject_key]
            
            chapter_key = f"{subject_id}_{normalize_entity_name(chapter_name)}"
            if chapter_key not in chapter_cache:
                chapter = _get_or_create_chapter(db, chapter_name, subject_id)
                chapter_cache[chapter_key] = chapter.id
            chapter_id = chapter_cache[chapter_key]
            
            topic_id = None
            if topic_name:
                topic_key = f"{chapter_id}_{normalize_entity_name(topic_name)}"
                if topic_key not in topic_cache:
                    t = _get_or_create_topic(db, topic_name, chapter_id)
                    topic_cache[topic_key] = t.id if t else None
                topic_id = topic_cache.get(topic_key)
                
            difficulty = str(item.get("difficulty") or "Medium").strip().capitalize()
            if difficulty not in DIFFICULTIES:
                difficulty = "Medium"
                
            marks = _safe_float(item.get("marks"), 4.0)
            neg_marks = _safe_float(item.get("negative_marks") or item.get("negative_mark"), -1.0)
            time_val = _safe_int(item.get("time_seconds") or item.get("time"), 60)
            
            tags = item.get("tags")
            tags_str = ""
            if isinstance(tags, list):
                tags_str = ", ".join(str(t).strip() for t in tags)
            elif tags is not None:
                tags_str = str(tags).strip()
                
            new_q = Question(
                exam_id=exam_id,
                chapter_id=chapter_id,
                question=question_text,
                question_type=q_type,
                option_a=option_a or None,
                option_b=option_b or None,
                option_c=option_c or None,
                option_d=option_d or None,
                correct_answer=correct_answer,
                solution=solution_str or None,
                year=_safe_int(item.get("year")),
                exam_session=str(item.get("exam_session") or "").strip() or None,
                difficulty=difficulty,
                marks=marks,
                negative_marks=neg_marks,
                time=time_val,
                topic=topic_name or None,
                language=str(item.get("language") or "en"),
                source=str(item.get("source") or "").strip() or None,
                tags=tags_str or None,
                status=str(item.get("status") or "active"),
            )
            
            db.add(new_q)
            existing_questions.add(norm_q)
            inserted += 1
            
        except Exception as err:
            print(f"Error inserting question index {idx}: {err}")
            failed += 1
            
    db.commit()
    print("\n--- IMPORT SUMMARY ---")
    print(f"Total processed     : {len(questions_list)}")
    print(f"Inserted successfully: {inserted}")
    print(f"Skipped duplicates  : {skipped_duplicate}")
    print(f"Failed to insert     : {failed}")
    print("----------------------")

def main():
    parser = argparse.ArgumentParser(description="Import questions from a JSON file directly into the database.")
    parser.add_argument(
        "file",
        nargs="?",
        default="questions.json",
        help="Path to the JSON file (default: questions.json)"
    )
    args = parser.parse_args()
    
    ensure_database_exists()
    db = SessionLocal()
    try:
        parse_and_insert_json(args.file, db)
    finally:
        db.close()

if __name__ == "__main__":
    main()
