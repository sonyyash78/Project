from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ExamSettingUpsert(BaseModel):
    exam_id: int
    duration_minutes: int = Field(60, ge=1, le=600)
    positive_marks: float = 4.0
    negative_marks: float = -1.0
    passing_marks: float = 0.0
    difficulty: str = "mixed"
    language: str = "en"
    calculator_allowed: bool = False
    fullscreen_required: bool = False
    shuffle_questions: bool = True
    shuffle_options: bool = False
    question_limit: int = Field(30, ge=1, le=500)
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    live_mode_enabled: bool = False
    instructions: str | None = None


class ExamSettingResponse(ExamSettingUpsert):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AttemptStartRequest(BaseModel):
    mode: str
    exam_id: int | None = None
    subject_id: int | None = None
    chapter_id: int | None = None
    difficulty: str | None = None
    question_count: int = Field(20, ge=1, le=200)
    time_limit_minutes: int | None = Field(None, ge=1, le=600)
    year: int | None = None
    question_types: list[str] | None = None
    shuffle_questions: bool = True
    shuffle_options: bool = False
    resume_attempt_id: int | None = None


class AttemptAnswerSaveRequest(BaseModel):
    question_id: int
    selected_answer: str | None = None
    visited: bool = True
    is_marked_for_review: bool = False
    is_bookmarked: bool = False
    hidden_options: list[str] | None = None
    eliminated_options: list[str] | None = None
    time_spent_seconds: int = Field(0, ge=0, le=7200)


class AttemptSubmitRequest(BaseModel):
    elapsed_seconds: int = Field(0, ge=0)
    remaining_seconds: int = Field(0, ge=0)


class QuestionNoteUpsert(BaseModel):
    question_id: int
    attempt_id: int | None = None
    note: str = Field(..., min_length=1, max_length=5000)

