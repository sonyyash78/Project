import asyncio
import time
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.db import SessionLocal
from app.ai_question_generator.schemas import GenerateQuestionsRequest, SaveGeneratedQuestionsRequest, GeneratedQuestion
from app.ai_question_generator.prompts import build_generation_prompt
from app.ai_question_generator.gemini import generate_content_with_retry
from app.ai_question_generator.validator import validate_and_deduplicate
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.models.question_model import Question
from app.models.ai_model import AIGenerationLog
from app.ai_question_generator.key_manager import key_manager
from app.utils.config import AI_BATCH_SIZE, MAX_PARALLEL_WORKERS, AI_RETRY_COUNT

import logging
import traceback

logger = logging.getLogger("examside")

async def process_batch(batch_num, total_batches, difficulty, target_count, request, start_time, shared_state):
    logger.info(f"[Worker] Starting Batch {batch_num}/{total_batches} for difficulty: {difficulty} (Target: {target_count} Qs)")
    
    valid_batch = []
    remaining_count = target_count
    total_raw_generated = 0
    
    while remaining_count > 0:
        prompt = build_generation_prompt(request, remaining_count, difficulty)
        try:
            raw_batch = await generate_content_with_retry(prompt, max_retries=AI_RETRY_COUNT)
        except Exception as e:
            logger.error(f"[Worker] Batch {batch_num} failed completely after retries. Exception:\n{traceback.format_exc()}")
            if not valid_batch:
                shared_state["failed_batches"] += 1
            break # Exit while loop and save what we have
            
        if not raw_batch:
            break
            
        total_raw_generated += len(raw_batch)
        deduped = validate_and_deduplicate(raw_batch)
        valid_batch.extend(deduped)
        
        # Recalculate remaining
        remaining_count = target_count - len(valid_batch)
        
        if remaining_count > 0:
            logger.info(f"[Worker] Batch {batch_num}: Found duplicates. Generating {remaining_count} replacement questions...")

    shared_state["generated"] += len(valid_batch)
    
    # Save to database immediately in an isolated session to support parallel processing safely
    if len(valid_batch) > 0:
        db = SessionLocal()
        try:
            questions_objects = [GeneratedQuestion(**q) for q in valid_batch]
            save_request = SaveGeneratedQuestionsRequest(
                exam=request.exam,
                subject=request.subject,
                chapter=request.chapter,
                topic=request.topic,
                language=request.language,
                generation_time=time.time() - start_time,
                duplicates_removed=total_raw_generated - len(valid_batch),
                questions=questions_objects
            )
            
            # Using asyncio.to_thread because SQLAlchemy is synchronous
            save_result = await asyncio.to_thread(save_ai_questions_to_db, db, save_request)
            shared_state["saved"] += save_result["inserted"]
            shared_state["duplicates_removed"] += save_result["duplicates_skipped"]
            logger.info(f"[Worker] Batch {batch_num} Saved: {save_result['inserted']}")
        except Exception as e:
            logger.error(f"[Worker] Failed to save batch {batch_num} to database:\n{traceback.format_exc()}")
        finally:
            db.close()

    return valid_batch

async def generate_questions(request: GenerateQuestionsRequest, db: Session = None) -> list:
    logger.info("Entering multi-key parallel generate_questions function")
    diff_dict = request.difficulty_distribution.model_dump() if hasattr(request.difficulty_distribution, 'model_dump') else request.difficulty_distribution.dict()
    
    total_requested = sum(diff_dict.values())
    if total_requested == 0:
        return []
    
    batch_plan = []
    for difficulty, count in diff_dict.items():
        if count > 0:
            remaining = count
            while remaining > 0:
                batch_count = min(remaining, AI_BATCH_SIZE)
                batch_plan.append((difficulty, batch_count))
                remaining -= batch_count
                
    total_batches = len(batch_plan)
    start_time = time.time()
    
    shared_state = {
        "generated": 0,
        "saved": 0,
        "duplicates_removed": 0,
        "failed_batches": 0
    }
    
    semaphore = asyncio.Semaphore(MAX_PARALLEL_WORKERS)
    
    async def worker_with_semaphore(batch_num, total_batches, difficulty, count):
        async with semaphore:
            return await process_batch(batch_num, total_batches, difficulty, count, request, start_time, shared_state)
            
    tasks = []
    for i, (difficulty, count) in enumerate(batch_plan):
        tasks.append(worker_with_semaphore(i + 1, total_batches, difficulty, count))
        
    results = await asyncio.gather(*tasks)
    
    all_raw_questions = []
    for r in results:
        all_raw_questions.extend(r)
        
    elapsed_time = time.time() - start_time
    
    # Generate Final Report
    report = key_manager.get_report()
    
    print("\n" + "="*60)
    print("🚀 MULTI-KEY AI GENERATION FINAL REPORT 🚀")
    print("="*60)
    print(f"Total API Keys Loaded : {report['total_keys']}")
    print(f"Healthy Keys          : {report['healthy_keys']}")
    print(f"Disabled Keys         : {report['disabled_keys']}")
    print("-" * 60)
    for ks in report['keys_stats']:
        status = "🟢 HEALTHY" if ks['healthy'] else "🔴 DISABLED"
        print(f"Key {ks['index']} [{ks['masked']}] -> {status} | Usage: {ks['usage']} | Failures: {ks['failures']}")
    print("-" * 60)
    print(f"Total Batches Processed: {total_batches}")
    print(f"Failed Batches         : {shared_state['failed_batches']}")
    print(f"Questions Requested    : {total_requested}")
    print(f"Questions Generated    : {shared_state['generated']}")
    print(f"Duplicates Removed     : {shared_state['duplicates_removed']}")
    print(f"Questions Saved to DB  : {shared_state['saved']}")
    print(f"Execution Time         : {elapsed_time:.2f}s")
    if elapsed_time > 0:
        speed = shared_state['generated'] / elapsed_time
        print(f"Generation Speed       : {speed:.2f} Q/s")
    print("="*60 + "\n")
    
    return all_raw_questions

def save_ai_questions_to_db(db: Session, data: SaveGeneratedQuestionsRequest) -> dict:
    from app.utils.normalization import normalize_entity_name
    initial_count = db.query(Question).count()
    
    try:
        # Auto create Exam
        exam_name = data.exam.strip()
        norm_exam = normalize_entity_name(exam_name)
        exam = db.query(Exam).filter(Exam.normalized_name == norm_exam).first()
        if not exam:
            exam = Exam(exam_name=exam_name, normalized_name=norm_exam, category="Generated", image="default.png")
            db.add(exam)
            db.flush()

        # Auto create Subject
        subject_name = data.subject.strip()
        norm_subject = normalize_entity_name(subject_name)
        subject = db.query(Subject).filter(
            Subject.normalized_name == norm_subject,
            Subject.exam_id == exam.id
        ).first()
        if not subject:
            subject = Subject(name=subject_name, normalized_name=norm_subject, exam_id=exam.id)
            db.add(subject)
            db.flush()

        # Auto create Chapter
        chapter_name = data.chapter.strip()
        norm_chapter = normalize_entity_name(chapter_name)
        chapter = db.query(Chapter).filter(
            Chapter.normalized_name == norm_chapter,
            Chapter.subject_id == subject.id
        ).first()
        if not chapter:
            chapter = Chapter(name=chapter_name, normalized_name=norm_chapter, subject_id=subject.id)
            db.add(chapter)
            db.flush()

        # Fetch existing questions in this chapter to compare normalized text
        existing_qs = db.query(Question.id, Question.question).filter(Question.chapter_id == chapter.id).all()
        existing_normalized = {normalize_entity_name(q.question): q.id for q in existing_qs}

        # Bulk Insert Questions
        new_questions = []
        for q_data in data.questions:
            norm_question_text = normalize_entity_name(q_data.question)
            exists_id = existing_normalized.get(norm_question_text)
            
            if not exists_id:
                new_q = Question(
                    exam_id=exam.id,
                    chapter_id=chapter.id,
                    question=q_data.question,
                    question_type="mcq",
                    option_a=q_data.option_a,
                    option_b=q_data.option_b,
                    option_c=q_data.option_c,
                    option_d=q_data.option_d,
                    correct_answer=q_data.correct_answer,
                    solution=q_data.solution,
                    difficulty=q_data.difficulty,
                    topic=q_data.topic or data.topic or "General",
                    language=data.language
                )
                new_questions.append(new_q)
                # Add to existing_normalized to prevent intra-batch duplicates
                existing_normalized[norm_question_text] = True

        if new_questions:
            db.bulk_save_objects(new_questions)
            db.flush()

        # Log History
        log = AIGenerationLog(
            exam=exam_name,
            subject=subject_name,
            chapter=chapter_name,
            topic=data.topic,
            language=data.language,
            question_count=len(new_questions),
            duplicates_removed=data.duplicates_removed + (len(data.questions) - len(new_questions)),
            generation_time=data.generation_time
        )
        db.add(log)
        db.commit()
        
        return {
            "inserted": len(new_questions),
            "duplicates_skipped": (len(data.questions) - len(new_questions))
        }
    except Exception as e:
        db.rollback()
        raise e

def get_generation_history(db: Session, limit: int = 50):
    return db.query(AIGenerationLog).order_by(AIGenerationLog.created_at.desc()).limit(limit).all()

def delete_generation_history(db: Session, log_id: int):
    log = db.query(AIGenerationLog).filter(AIGenerationLog.id == log_id).first()
    if log:
        db.delete(log)
        db.commit()

def get_generation_stats(db: Session):
    today = datetime.utcnow().date()
    total_q = db.query(func.sum(AIGenerationLog.question_count)).scalar() or 0
    today_q = db.query(func.sum(AIGenerationLog.question_count)).filter(
        func.date(AIGenerationLog.created_at) == today
    ).scalar() or 0
    total_dupes = db.query(func.sum(AIGenerationLog.duplicates_removed)).scalar() or 0
    avg_time = db.query(func.avg(AIGenerationLog.generation_time)).scalar() or 0.0

    return {
        "generated_total": int(total_q),
        "generated_today": int(today_q),
        "duplicates_removed": int(total_dupes),
        "average_generation_time": round(float(avg_time), 2)
    }
