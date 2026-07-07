from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.chapter_model import Chapter
from app.models.exam_model import Exam
from app.models.question_model import Question
from app.models.subject_model import Subject
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/browse", tags=["Browse"])


@router.get("/exam-map")
def get_exam_map(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.category, Exam.exam_name).all()
    result = []

    for exam in exams:
        subjects = (
            db.query(Subject)
            .filter(Subject.exam_id == exam.id)
            .order_by(Subject.name)
            .all()
        )

        subject_data = []
        for subject in subjects:
            chapters = (
                db.query(Chapter)
                .filter(Chapter.subject_id == subject.id)
                .order_by(Chapter.name)
                .all()
            )

            chapter_data = []
            for chapter in chapters:
                question_count = (
                    db.query(Question)
                    .filter(Question.chapter_id == chapter.id)
                    .count()
                )
                chapter_data.append(
                    {
                        "id": chapter.id,
                        "name": chapter.name,
                        "question_count": question_count,
                    }
                )

            subject_data.append(
                {
                    "id": subject.id,
                    "name": subject.name,
                    "chapters": chapter_data,
                }
            )

        result.append(
            {
                "id": exam.id,
                "exam_name": exam.exam_name,
                "category": exam.category,
                "image": exam.image,
                "subjects": subject_data,
            }
        )

    return result


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return {
        "exam_count": db.query(Exam).count(),
        "subject_count": db.query(Subject).count(),
        "chapter_count": db.query(Chapter).count(),
        "question_count": db.query(Question).count(),
    }


@router.post("/seed")
def seed_database(
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    from app.seed.seed_data import seed_examside_data

    return seed_examside_data(db)


@router.get("/report")
def get_completeness_report(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.category, Exam.exam_name).all()
    result = []
    incomplete_chapters = []

    for exam in exams:
        subjects = (
            db.query(Subject)
            .filter(Subject.exam_id == exam.id)
            .order_by(Subject.name)
            .all()
        )

        subject_data = []
        for subject in subjects:
            chapters = (
                db.query(Chapter)
                .filter(Chapter.subject_id == subject.id)
                .order_by(Chapter.name)
                .all()
            )

            chapter_data = []
            for chapter in chapters:
                question_count = (
                    db.query(Question)
                    .filter(Question.chapter_id == chapter.id)
                    .count()
                )
                
                is_incomplete = question_count < 1
                status_text = "More Questions Needed" if is_incomplete else "Complete"
                
                chap_info = {
                    "id": chapter.id,
                    "name": chapter.name,
                    "question_count": question_count,
                    "is_incomplete": is_incomplete,
                    "status": status_text
                }
                chapter_data.append(chap_info)
                
                if is_incomplete:
                    incomplete_chapters.append({
                        "exam_name": exam.exam_name,
                        "subject_name": subject.name,
                        "chapter_name": chapter.name,
                        "question_count": question_count
                    })

            subject_data.append(
                {
                    "id": subject.id,
                    "name": subject.name,
                    "chapters": chapter_data,
                }
            )

        result.append(
            {
                "id": exam.id,
                "exam_name": exam.exam_name,
                "category": exam.category,
                "image": exam.image,
                "subjects": subject_data,
            }
        )

    return {
        "exam_map": result,
        "incomplete_chapters": incomplete_chapters,
        "total_incomplete": len(incomplete_chapters)
    }

