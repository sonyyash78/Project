from pydantic import BaseModel, ConfigDict


class ExamCreate(BaseModel):
    exam_name: str
    category: str
    image: str = ""


class ExamUpdate(BaseModel):
    exam_name: str | None = None
    category: str | None = None
    image: str | None = None


class ExamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_name: str
    category: str
    image: str


class CategoryResponse(BaseModel):
    category: str
    exams: list[ExamResponse]
