from typing import Optional
from pydantic import BaseModel, ConfigDict


class ExamCreate(BaseModel):
    exam_name: str
    category: str
    image: str = ""
    positive_marks: float = 4.0
    negative_marks: float = -1.0
    price: Optional[float] = 199.0
    discounted_price: Optional[float] = 149.0


class ExamUpdate(BaseModel):
    exam_name: str | None = None
    category: str | None = None
    image: str | None = None
    positive_marks: float | None = None
    negative_marks: float | None = None
    price: Optional[float] = None
    discounted_price: Optional[float] = None


class ExamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_name: str
    category: str
    image: str
    positive_marks: float
    negative_marks: float
    price: Optional[float] = 199.0
    discounted_price: Optional[float] = 149.0


class CategoryResponse(BaseModel):
    category: str
    exams: list[ExamResponse]
