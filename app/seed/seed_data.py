import logging
from typing import Dict, Tuple

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.db import SessionLocal, ensure_database_exists
from app.models.chapter_model import Chapter
from app.models.exam_model import Exam
from app.models.question_model import Question
from app.models.subject_model import Subject
from app.seed.exam_data import EXAM_DATA
from app.seed.question_data import SAMPLE_QUESTIONS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


def get_or_create_exam(
    db: Session,
    name: str,
    category: str,
    image: str,
    summary: Dict[str, int],
) -> Exam:
    exam = (
        db.query(Exam)
        .filter(Exam.exam_name == name, Exam.category == category)
        .first()
    )
    if exam:
        summary["exams_reused"] += 1
        summary["existing_records_reused"] += 1
        return exam

    exam = Exam(exam_name=name, category=category, image=image)
    db.add(exam)
    db.flush()
    summary["exams_inserted"] += 1
    return exam


def get_or_create_subject(
    db: Session,
    exam_id: int,
    subject_name: str,
    summary: Dict[str, int],
) -> Subject:
    subject = (
        db.query(Subject)
        .filter(Subject.exam_id == exam_id, Subject.name == subject_name)
        .first()
    )
    if subject:
        summary["subjects_reused"] += 1
        summary["existing_records_reused"] += 1
        return subject

    subject = Subject(exam_id=exam_id, name=subject_name)
    db.add(subject)
    db.flush()
    summary["subjects_inserted"] += 1
    return subject


def get_or_create_chapter(
    db: Session,
    subject_id: int,
    chapter_name: str,
    summary: Dict[str, int],
) -> Chapter:
    chapter = (
        db.query(Chapter)
        .filter(Chapter.subject_id == subject_id, Chapter.name == chapter_name)
        .first()
    )
    if chapter:
        summary["chapters_reused"] += 1
        summary["existing_records_reused"] += 1
        return chapter

    chapter = Chapter(subject_id=subject_id, name=chapter_name)
    db.add(chapter)
    db.flush()
    summary["chapters_inserted"] += 1
    return chapter


def get_or_create_question(
    db: Session,
    exam_id: int,
    chapter_id: int | None,
    question_text: str,
    question_payload: dict[str, object],
    summary: Dict[str, int],
) -> Question:
    query = db.query(Question).filter(
        Question.exam_id == exam_id,
        Question.question == question_text,
    )
    if chapter_id is None:
        query = query.filter(Question.chapter_id.is_(None))
    else:
        query = query.filter(Question.chapter_id == chapter_id)

    existing_question = query.first()
    if existing_question:
        summary["questions_reused"] += 1
        summary["existing_records_reused"] += 1
        return existing_question

    question = Question(
        exam_id=exam_id,
        chapter_id=chapter_id,
        question=question_text,
        question_type=question_payload.get("question_type", "mcq"),
        option_a=question_payload.get("option_a"),
        option_b=question_payload.get("option_b"),
        option_c=question_payload.get("option_c"),
        option_d=question_payload.get("option_d"),
        correct_answer=question_payload.get("correct_answer"),
        solution=question_payload.get("solution"),
        year=question_payload.get("year"),
        exam_session=question_payload.get("exam_session"),
    )
    db.add(question)
    db.flush()
    summary["questions_inserted"] += 1
    return question


def seed_examside_data(db: Session) -> dict[str, int | str]:
    summary: Dict[str, int] = {
        "exams_inserted": 0,
        "subjects_inserted": 0,
        "chapters_inserted": 0,
        "questions_inserted": 0,
        "exams_reused": 0,
        "subjects_reused": 0,
        "chapters_reused": 0,
        "questions_reused": 0,
        "existing_records_reused": 0,
    }

    exam_lookup: Dict[str, Exam] = {}
    subject_lookup: Dict[Tuple[str, str], Subject] = {}
    chapter_lookup: Dict[Tuple[str, str, str], Chapter] = {}

    logger.info(
        "Starting seed run with %d exam categories and %d sample questions.",
        len(EXAM_DATA),
        len(SAMPLE_QUESTIONS),
    )

    try:
        with db.begin():
            for category_block in EXAM_DATA:
                category = category_block["category"]
                for exam_info in category_block["exams"]:
                    exam = get_or_create_exam(
                        db=db,
                        name=exam_info["name"],
                        category=category,
                        image=exam_info["image"],
                        summary=summary,
                    )
                    exam_lookup[exam.exam_name] = exam

                    for subject_name, chapters in exam_info["subjects"].items():
                        subject = get_or_create_subject(
                            db=db,
                            exam_id=exam.id,
                            subject_name=subject_name,
                            summary=summary,
                        )
                        subject_lookup[(exam.exam_name, subject_name)] = subject

                        for chapter_name in chapters:
                            chapter = get_or_create_chapter(
                                db=db,
                                subject_id=subject.id,
                                chapter_name=chapter_name,
                                summary=summary,
                            )
                            chapter_lookup[(exam.exam_name, subject_name, chapter_name)] = chapter

            for sample in SAMPLE_QUESTIONS:
                exam_name = sample["exam_name"]
                subject_name = sample["subject"]
                chapter_name = sample["chapter"]

                exam = exam_lookup.get(exam_name)
                subject = subject_lookup.get((exam_name, subject_name))
                chapter = chapter_lookup.get((exam_name, subject_name, chapter_name))

                if exam is None:
                    logger.warning(
                        "Skipping question because exam lookup failed: %s / %s / %s",
                        exam_name,
                        subject_name,
                        chapter_name,
                    )
                    continue

                if subject is None:
                    logger.warning(
                        "Creating missing subject for existing exam: %s / %s",
                        exam_name,
                        subject_name,
                    )
                    subject = get_or_create_subject(
                        db=db,
                        exam_id=exam.id,
                        subject_name=subject_name,
                        summary=summary,
                    )
                    subject_lookup[(exam_name, subject_name)] = subject

                if chapter is None:
                    logger.warning(
                        "Creating missing chapter for existing subject: %s / %s / %s",
                        exam_name,
                        subject_name,
                        chapter_name,
                    )
                    chapter = get_or_create_chapter(
                        db=db,
                        subject_id=subject.id,
                        chapter_name=chapter_name,
                        summary=summary,
                    )
                    chapter_lookup[(exam_name, subject_name, chapter_name)] = chapter

                get_or_create_question(
                    db=db,
                    exam_id=exam.id,
                    chapter_id=chapter.id,
                    question_text=sample["question"],
                    question_payload=sample,
                    summary=summary,
                )

        total_exams = db.query(Exam).count()
        total_subjects = db.query(Subject).count()
        total_chapters = db.query(Chapter).count()
        total_questions = db.query(Question).count()

    except SQLAlchemyError:
        logger.exception("Database seeding failed; transaction rolled back.")
        raise

    result = {
        "message": "ExamSIDE data seeded successfully",
        "inserted_exams": summary["exams_inserted"],
        "inserted_subjects": summary["subjects_inserted"],
        "inserted_chapters": summary["chapters_inserted"],
        "inserted_questions": summary["questions_inserted"],
        "skipped_existing_records": summary["existing_records_reused"],
        "reused_exams": summary["exams_reused"],
        "reused_subjects": summary["subjects_reused"],
        "reused_chapters": summary["chapters_reused"],
        "reused_questions": summary["questions_reused"],
        "total_exams": total_exams,
        "total_subjects": total_subjects,
        "total_chapters": total_chapters,
        "total_questions": total_questions,
    }

    logger.info(
        "Seeding complete: %d exams, %d subjects, %d chapters, %d questions.",
        result["total_exams"],
        result["total_subjects"],
        result["total_chapters"],
        result["total_questions"],
    )
    return result


def main() -> None:
    ensure_database_exists()
    session = SessionLocal()
    try:
        summary = seed_examside_data(session)
        print("Seeding summary:")
        for key, value in summary.items():
            print(f"{key}: {value}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
