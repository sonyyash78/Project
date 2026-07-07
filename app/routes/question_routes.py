import csv
import io
import json
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.chapter_model import Chapter
from app.models.exam_model import Exam
from app.models.question_model import Question
from app.models.subject_model import Subject
from app.models.topic_model import Topic
from app.schemas.question_schema import (
    AnswerResult,
    AnswerSubmit,
    QuestionCreate,
    QuestionPracticeResponse,
    QuestionResponse,
    QuestionUpdate,
)
from app.services.question_service import (
    add_question,
    delete_question,
    get_practice_questions,
    get_question_by_id,
    get_questions_by_chapter,
    get_questions_by_exam,
    submit_answer,
    update_question,
)
from app.utils.dependencies import get_admin_user

router = APIRouter(prefix="/api/questions", tags=["Questions"])


QUESTION_TYPES = {"mcq", "msq", "true_false", "numerical", "short_answer"}
DIFFICULTIES = {"Easy", "Medium", "Hard"}
REQUIRED_COLUMNS = {"exam", "subject", "chapter", "question", "correct_answer"}


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


from app.utils.normalization import normalize_entity_name

def _get_or_create_exam(db: Session, exam_name: str) -> Exam:
    """Find exam by name or create it. Never duplicates."""
    name = exam_name.strip()
    norm_name = normalize_entity_name(name)
    exam = db.query(Exam).filter(Exam.normalized_name == norm_name).first()
    if not exam:
        exam = Exam(
            exam_name=name,
            normalized_name=norm_name,
            category="General",
            image="",
            positive_marks=4.0,
            negative_marks=-1.0,
        )
        db.add(exam)
        db.flush()
    return exam


def _get_or_create_subject(db: Session, subject_name: str, exam_id: int) -> Subject:
    """Find subject by name+exam or create it. Never duplicates."""
    name = subject_name.strip()
    norm_name = normalize_entity_name(name)
    subject = db.query(Subject).filter(
        Subject.normalized_name == norm_name,
        Subject.exam_id == exam_id,
    ).first()
    if not subject:
        subject = Subject(name=name, normalized_name=norm_name, exam_id=exam_id)
        db.add(subject)
        db.flush()
    return subject


def _get_or_create_chapter(db: Session, chapter_name: str, subject_id: int) -> Chapter:
    """Find chapter by name+subject or create it. Never duplicates."""
    name = chapter_name.strip()
    norm_name = normalize_entity_name(name)
    chapter = db.query(Chapter).filter(
        Chapter.normalized_name == norm_name,
        Chapter.subject_id == subject_id,
    ).first()
    if not chapter:
        chapter = Chapter(name=name, normalized_name=norm_name, subject_id=subject_id)
        db.add(chapter)
        db.flush()
    return chapter


def _get_or_create_topic(db: Session, topic_name: str, chapter_id: int) -> Optional[Topic]:
    """Find topic by name+chapter or create it. Returns None if topic_name is blank."""
    if not topic_name or not topic_name.strip():
        return None
    name = topic_name.strip()
    norm_name = normalize_entity_name(name)
    topic = db.query(Topic).filter(
        Topic.normalized_name == norm_name,
        Topic.chapter_id == chapter_id,
    ).first()
    if not topic:
        topic = Topic(name=name, normalized_name=norm_name, chapter_id=chapter_id)
        db.add(topic)
        db.flush()
    return topic


# ─── Standard CRUD ──────────────────────────────────────────────────────────


@router.post(
    "/",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new question",
    description="Create a question for an exam and optional chapter. Admin only.",
)
def create_question(
    question: QuestionCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return add_question(db, question)


@router.get("/exam/{exam_id}", response_model=list[QuestionResponse])
def list_questions_by_exam(
    exam_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return get_questions_by_exam(db, exam_id, skip, limit)


@router.get("/chapter/{chapter_id}", response_model=list[QuestionResponse])
def list_questions_by_chapter(
    chapter_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return get_questions_by_chapter(db, chapter_id, skip, limit)


@router.get(
    "/chapter/{chapter_id}/practice",
    response_model=list[QuestionPracticeResponse],
)
def practice_questions(
    chapter_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return get_practice_questions(db, chapter_id, limit)


@router.post("/submit-answer", response_model=AnswerResult)
def check_answer(payload: AnswerSubmit, db: Session = Depends(get_db)):
    return submit_answer(db, payload)


# ─── Admin: list all questions with full filters ─────────────────────────────


@router.get("/admin/all")
def admin_list_all_questions(
    exam_id: Optional[int] = Query(None),
    chapter_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    difficulty: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    """Admin endpoint to list all questions with full filter support."""
    query = db.query(Question)
    if exam_id:
        query = query.filter(Question.exam_id == exam_id)
    if chapter_id:
        query = query.filter(Question.chapter_id == chapter_id)
    if subject_id:
        chapter_ids = [
            c.id
            for c in db.query(Chapter.id).filter(Chapter.subject_id == subject_id).all()
        ]
        query = query.filter(Question.chapter_id.in_(chapter_ids))
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if search:
        query = query.filter(Question.question.ilike(f"%{search}%"))
    total = query.count()
    questions = query.order_by(Question.id.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "questions": [
            {
                "id": q.id,
                "exam_id": q.exam_id,
                "chapter_id": q.chapter_id,
                "question": (q.question[:100] + "...") if len(q.question) > 100 else q.question,
                "question_type": q.question_type,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer,
                "difficulty": q.difficulty,
                "marks": q.marks,
                "negative_marks": q.negative_marks,
                "status": q.status,
                "year": q.year,
                "topic": q.topic,
                "language": q.language,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in questions
        ],
    }


# ─── Standard get/update/delete ─────────────────────────────────────────────


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    return get_question_by_id(db, question_id)


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question_route(
    question_id: int,
    question_update: QuestionUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    return update_question(db, question_id, question_update)


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question_route(
    question_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    delete_question(db, question_id)
    return None


# ─── Bulk Upload / Import ───────────────────────────────────────────────────


async def _parse_upload_file(file: UploadFile) -> list[dict]:
    filename = file.filename.lower()
    if filename.endswith(".csv"):
        content = (await file.read()).decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        headers = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - headers
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(sorted(missing))}. "
                       f"Required: {', '.join(sorted(REQUIRED_COLUMNS))}",
            )
        return list(reader)

    elif filename.endswith(".json"):
        content = (await file.read()).decode("utf-8")
        try:
            data = json.loads(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON file format: {str(e)}"
            )

        raw_questions = []
        global_exam = None
        global_subject = None
        global_chapter = None

        if isinstance(data, dict):
            global_exam = data.get("exam") or data.get("exam_name")
            global_subject = data.get("subject")
            global_chapter = data.get("chapter")
            questions_list = data.get("questions")
            if not isinstance(questions_list, list):
                if "question" in data:
                    questions_list = [data]
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid JSON: expected a list of questions under key 'questions' or a list of question objects."
                    )
        elif isinstance(data, list):
            questions_list = data
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON: expected a list of questions or an object."
            )

        for idx, item in enumerate(questions_list, start=1):
            if not isinstance(item, dict):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid question item at index {idx}: expected an object."
                )

            # Map values
            exam = item.get("exam") or item.get("exam_name") or global_exam or ""
            subject = item.get("subject") or global_subject or ""
            chapter = item.get("chapter") or global_chapter or ""

            question_text = item.get("question") or ""
            correct_answer = item.get("correct_answer") or ""

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

            tags = item.get("tags")
            tags_str = ""
            if isinstance(tags, list):
                tags_str = ", ".join(str(t).strip() for t in tags)
            elif tags is not None:
                tags_str = str(tags).strip()

            raw_questions.append({
                "exam": str(exam),
                "subject": str(subject),
                "chapter": str(chapter),
                "topic": str(item.get("topic") or ""),
                "question": str(question_text),
                "question_type": str(item.get("question_type") or "mcq"),
                "option_a": str(option_a) if option_a is not None else "",
                "option_b": str(option_b) if option_b is not None else "",
                "option_c": str(option_c) if option_c is not None else "",
                "option_d": str(option_d) if option_d is not None else "",
                "correct_answer": str(correct_answer),
                "solution": solution_str,
                "difficulty": str(item.get("difficulty") or "Medium"),
                "marks": str(item.get("marks") if item.get("marks") is not None else ""),
                "negative_marks": str(item.get("negative_marks") or item.get("negative_mark") or ""),
                "time_seconds": str(item.get("time_seconds") or item.get("time") or ""),
                "language": str(item.get("language") or "en"),
                "year": str(item.get("year") or ""),
                "exam_session": str(item.get("exam_session") or ""),
                "source": str(item.get("source") or ""),
                "tags": tags_str,
                "status": str(item.get("status") or "active"),
            })

        return raw_questions
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .csv and .json files are accepted."
        )


@router.post("/bulk-upload-preview")
async def bulk_upload_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    """
    Parse and validate a CSV or JSON file, return a preview without inserting anything.
    Use this to validate your upload before the real import.
    """
    rows = await _parse_upload_file(file)

    valid_rows = []
    errors = []
    duplicates = []

    # Pre-load ALL existing question texts for duplicate detection using normalization
    existing_questions: set[str] = set(
        normalize_entity_name(q[0]) for q in db.query(Question.question).all() if q[0]
    )
    seen_in_file: set[str] = set()

    for i, row in enumerate(rows, start=2):
        row_errors = []
        is_duplicate = False

        exam_name = row.get("exam", "").strip()
        subject_name = row.get("subject", "").strip()
        chapter_name = row.get("chapter", "").strip()
        q_text = row.get("question", "").strip()

        if not exam_name:
            row_errors.append("exam name is empty")
        if not subject_name:
            row_errors.append("subject name is empty")
        if not chapter_name:
            row_errors.append("chapter name is empty")
        if not q_text:
            row_errors.append("question text is empty")
        if not str(row.get("correct_answer", "")).strip():
            row_errors.append("correct_answer is empty")

        q_type = str(row.get("question_type", "mcq")).strip().lower() or "mcq"
        if q_type not in QUESTION_TYPES:
            row_errors.append(
                f"invalid question_type '{q_type}' — valid: {', '.join(QUESTION_TYPES)}"
            )

        marks = _safe_float(row.get("marks"), 4.0)
        neg = _safe_float(row.get("negative_marks"), -1.0)
        if marks <= 0:
            row_errors.append("marks must be > 0")
        if neg > 0:
            row_errors.append("negative_marks must be ≤ 0")

        # Duplicate check
        if q_text:
            norm_q = normalize_entity_name(q_text)
            if norm_q in existing_questions or norm_q in seen_in_file:
                is_duplicate = True
            else:
                seen_in_file.add(norm_q)

        if row_errors:
            errors.append({
                "row": i,
                "errors": row_errors,
                "preview": q_text[:80],
            })
        elif is_duplicate:
            duplicates.append({
                "row": i,
                "preview": q_text[:80]
            })
        else:
            valid_rows.append({
                "row": i,
                "exam": exam_name,
                "subject": subject_name,
                "chapter": chapter_name,
                "topic": row.get("topic", "").strip(),
                "question": (q_text[:80] + "...") if len(q_text) > 80 else q_text,
                "question_type": q_type,
                "correct_answer": str(row.get("correct_answer", "")).strip().upper(),
                "difficulty": row.get("difficulty", "Medium").strip() or "Medium",
                "marks": marks,
                "negative_marks": neg,
            })

    return {
        "total_rows": len(valid_rows) + len(errors) + len(duplicates),
        "valid_count": len(valid_rows),
        "error_count": len(errors),
        "duplicate_count": len(duplicates),
        "preview": valid_rows[:10],
        "errors": errors[:30],
    }


@router.post("/bulk-upload")
async def bulk_upload_questions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    """
    Production CSV or JSON bulk upload.

    Accepted columns/keys:
        exam, subject, chapter, topic, question_type, question,
        option_a, option_b, option_c, option_d, correct_answer,
        solution, difficulty, marks, negative_marks, time_seconds,
        language, year, exam_session, source, tags, status

    - Automatically resolves or creates Exam / Subject / Chapter / Topic by name.
    - Never creates duplicates at any level.
    - Detects and skips duplicate question text.
    - Rolls back everything on critical failure.
    - Returns detailed report: inserted, skipped, failed.
    """
    rows = await _parse_upload_file(file)
    if not rows:
        raise HTTPException(status_code=400, detail="Upload file is empty — no rows/questions found.")
    if len(rows) > 5000:
        raise HTTPException(status_code=400, detail="Maximum 5000 questions per upload.")

    inserted = 0
    skipped_duplicate = 0
    failed = []

    # In-memory caches so we don't query the DB for every row
    exam_cache: dict[str, int] = {}
    subject_cache: dict[str, int] = {}
    chapter_cache: dict[str, int] = {}
    topic_cache: dict[str, Optional[int]] = {}

    # Pre-load ALL existing question texts for fast duplicate detection using normalization
    existing_questions: set[str] = set(
        normalize_entity_name(q[0]) for q in db.query(Question.question).all() if q[0]
    )

    try:
        for i, row in enumerate(rows, start=2):
            try:
                exam_name = row.get("exam", "").strip()
                subject_name = row.get("subject", "").strip()
                chapter_name = row.get("chapter", "").strip()
                topic_name = row.get("topic", "").strip()
                question_text = row.get("question", "").strip()

                # Validate required fields
                if not exam_name or not subject_name or not chapter_name or not question_text:
                    failed.append({
                        "row": i,
                        "reason": "Missing required field (exam / subject / chapter / question)",
                        "data": question_text[:60],
                    })
                    continue

                row_errors = []
                correct = str(row.get("correct_answer", "")).strip().upper()
                if not correct:
                    row_errors.append("correct_answer is empty")

                q_type = str(row.get("question_type", "mcq")).strip().lower() or "mcq"
                if q_type not in QUESTION_TYPES:
                    row_errors.append(f"invalid question_type '{q_type}'")

                marks = _safe_float(row.get("marks"), 4.0)
                neg_marks = _safe_float(row.get("negative_marks"), -1.0)
                if marks <= 0:
                    row_errors.append("marks must be > 0")
                if neg_marks > 0:
                    row_errors.append("negative_marks must be <= 0")

                time_val = _safe_int(row.get("time_seconds") or row.get("time"), 60)
                if time_val <= 0:
                    row_errors.append("time_seconds must be > 0")

                # Duplicate options check
                opts = [
                    row.get("option_a", ""),
                    row.get("option_b", ""),
                    row.get("option_c", ""),
                    row.get("option_d", ""),
                ]
                opts_cleaned = [o.strip() for o in opts if o and o.strip()]
                if len(opts_cleaned) != len(set(opts_cleaned)):
                    row_errors.append("duplicate options found")

                if row_errors:
                    failed.append({
                        "row": i,
                        "reason": ", ".join(row_errors),
                        "data": question_text[:60],
                    })
                    continue

                # Skip duplicate questions
                norm_q_text = normalize_entity_name(question_text)
                if norm_q_text in existing_questions:
                    skipped_duplicate += 1
                    continue

                # ── Resolve Exam ──────────────────────────────────────
                exam_key = normalize_entity_name(exam_name)
                if exam_key not in exam_cache:
                    exam = _get_or_create_exam(db, exam_name)
                    exam_cache[exam_key] = exam.id
                exam_id = exam_cache[exam_key]

                # ── Resolve Subject ───────────────────────────────────
                subject_key = f"{exam_id}_{normalize_entity_name(subject_name)}"
                if subject_key not in subject_cache:
                    subject = _get_or_create_subject(db, subject_name, exam_id)
                    subject_cache[subject_key] = subject.id
                subject_id = subject_cache[subject_key]

                # ── Resolve Chapter ───────────────────────────────────
                chapter_key = f"{subject_id}_{normalize_entity_name(chapter_name)}"
                if chapter_key not in chapter_cache:
                    chapter = _get_or_create_chapter(db, chapter_name, subject_id)
                    chapter_cache[chapter_key] = chapter.id
                chapter_id = chapter_cache[chapter_key]

                # ── Resolve Topic (optional) ──────────────────────────
                topic_id: Optional[int] = None
                if topic_name:
                    topic_key = f"{chapter_id}_{normalize_entity_name(topic_name)}"
                    if topic_key not in topic_cache:
                        t = _get_or_create_topic(db, topic_name, chapter_id)
                        topic_cache[topic_key] = t.id if t else None
                    topic_id = topic_cache.get(topic_key)

                # ── Parse fields ──────────────────────────────────────
                difficulty = str(row.get("difficulty", "Medium")).strip() or "Medium"
                if difficulty not in DIFFICULTIES:
                    difficulty = "Medium"

                year = _safe_int(row.get("year"), None)

                new_q = Question(
                    exam_id=exam_id,
                    chapter_id=chapter_id,
                    question=question_text,
                    question_type=q_type,
                    option_a=row.get("option_a", "").strip() or None,
                    option_b=row.get("option_b", "").strip() or None,
                    option_c=row.get("option_c", "").strip() or None,
                    option_d=row.get("option_d", "").strip() or None,
                    correct_answer=correct,
                    solution=row.get("solution", "").strip() or None,
                    year=year,
                    exam_session=row.get("exam_session", "").strip() or None,
                    difficulty=difficulty,
                    marks=marks,
                    negative_marks=neg_marks,
                    time=time_val,
                    topic=topic_name or None,
                    language=row.get("language", "en").strip() or "en",
                    source=row.get("source", "").strip() or None,
                    tags=row.get("tags", "").strip() or None,
                    status=row.get("status", "active").strip() or "active",
                )
                db.add(new_q)
                existing_questions.add(norm_q_text)
                inserted += 1

                # Flush in batches for memory efficiency
                if inserted % 100 == 0:
                    db.flush()

            except Exception as row_err:
                failed.append({
                    "row": i,
                    "reason": str(row_err)[:200],
                    "data": str(row.get("question", ""))[:60],
                })

        db.commit()

        return {
            "status": "success",
            "total_rows": len(rows),
            "inserted_questions": inserted,
            "skipped_duplicates": skipped_duplicate,
            "failed_count": len(failed),
            "failed_rows": failed[:50],
            "hierarchy_created": {
                "exams": len(exam_cache),
                "subjects": len(subject_cache),
                "chapters": len(chapter_cache),
                "topics": len(topic_cache),
            },
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed — all changes rolled back. Error: {str(e)[:300]}",
        )
