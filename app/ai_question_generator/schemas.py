from pydantic import BaseModel, Field
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

class DifficultyDistribution(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    Easy: int = Field(default=0, alias="easy")
    Medium: int = Field(default=0, alias="medium")
    Hard: int = Field(default=0, alias="hard")

class GenerateQuestionsRequest(BaseModel):
    exam: str
    subject: str
    chapter: str
    topic: Optional[str] = None
    question_count: int = Field(..., gt=0, le=1000)
    difficulty_distribution: DifficultyDistribution
    question_type: str = "mcq"
    language: str = "English"

class GeneratedQuestion(BaseModel):
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    solution: str
    difficulty: str
    topic: str

class SaveGeneratedQuestionsRequest(BaseModel):
    exam: str
    subject: str
    chapter: str
    topic: Optional[str] = None
    language: str = "English"
    generation_time: float
    duplicates_removed: int
    questions: List[GeneratedQuestion]
