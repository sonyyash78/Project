import random

def build_generation_prompt(request, count: int, difficulty: str) -> str:
    seed = random.randint(1000, 9999999)
    return f"""You are an elite academic content creator specializing in top-tier competitive exams like IIT JEE Advanced, NEET, and Olympiads.
Generate {count} distinct {difficulty} level {request.question_type} questions for the following context:
Exam: {request.exam}
Subject: {request.subject}
Chapter: {request.chapter}
{f'Topic: {request.topic}' if request.topic else ''}
Language: {request.language}

CRITICAL RANDOMIZATION INSTRUCTIONS:
- RANDOM SEED: {seed}
- The questions MUST be entirely unique, diverse, and highly randomized.
- DO NOT generate the same standard textbook questions. 
- Create novel scenarios, different numerical values, and explore various sub-topics within the chapter.
- Ensure no two questions are structurally identical.

CRITICAL DIFFICULTY INSTRUCTIONS:
If the Exam is "JEE Advanced" or the difficulty is "Hard":
- The questions MUST be extremely rigorous, requiring multi-conceptual thinking.
- DO NOT generate straightforward formula-based questions.
- Include trick options, edge cases, and complex calculations.
- Questions should match the actual difficulty, depth, and cognitive load of the real {request.exam} exam.

FORMATTING INSTRUCTIONS:
- Use standard markdown.
- For Math/Physics/Chemistry formulas, you MUST use inline math $...$ or block math $$...$$. 

The output MUST be a valid JSON list of objects. Do not include markdown code blocks, just raw JSON.
Each object must have the exact following keys:
- "question": (string) the question text
- "option_a": (string) first option
- "option_b": (string) second option
- "option_c": (string) third option
- "option_d": (string) fourth option
- "correct_answer": (string) MUST be exactly "A", "B", "C", or "D"
- "solution": (string) detailed step-by-step explanation
- "difficulty": (string) exactly "{difficulty}"
- "topic": (string) the specific topic within the chapter

Ensure the questions are completely accurate and the JSON is strictly valid."""

