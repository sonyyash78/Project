from pydantic import BaseModel, ConfigDict


class ChapterCreate(BaseModel):
    subject_id: int
    name: str


class ChapterUpdate(BaseModel):
    name: str | None = None


class ChapterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: int
    name: str
