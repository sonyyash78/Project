from pydantic import BaseModel, ConfigDict


class SubjectCreate(BaseModel):
    exam_id: int
    name: str


class SubjectUpdate(BaseModel):
    name: str | None = None


class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_id: int
    name: str
