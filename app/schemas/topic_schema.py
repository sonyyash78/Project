from pydantic import BaseModel, ConfigDict

class TopicBase(BaseModel):
    name: str

class TopicCreate(TopicBase):
    chapter_id: int

class TopicResponse(TopicBase):
    id: int
    chapter_id: int
    normalized_name: str | None = None

    model_config = ConfigDict(from_attributes=True)
