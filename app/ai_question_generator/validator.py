from typing import List, Dict

def validate_and_deduplicate(raw_questions: List[Dict], existing_questions: List[Dict] = None) -> List[Dict]:
    valid_questions = []
    seen_texts = set()
    
    if existing_questions:
        for q in existing_questions:
            seen_texts.add(q.get("question", "").strip().lower())
            
    for item in raw_questions:
        try:
            question = item.get("question", "").strip()
            opt_a = item.get("option_a", "").strip()
            opt_b = item.get("option_b", "").strip()
            opt_c = item.get("option_c", "").strip()
            opt_d = item.get("option_d", "").strip()
            ans = item.get("correct_answer", "").strip().upper()
            sol = item.get("solution", "").strip()
            
            # Not empty check
            if not question or not sol:
                continue
                
            # Exactly 4 options check
            if not all([opt_a, opt_b, opt_c, opt_d]):
                continue
                
            # Exactly 1 valid answer check
            if ans not in ["A", "B", "C", "D"]:
                continue
                
            # Deduplicate check
            q_lower = question.lower()
            if q_lower in seen_texts:
                continue
                
            seen_texts.add(q_lower)
            
            valid_questions.append({
                "question": question,
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "correct_answer": ans,
                "solution": sol,
                "difficulty": item.get("difficulty", "Medium").capitalize(),
                "topic": item.get("topic", "General").strip()
            })
        except Exception:
            continue
            
    return valid_questions
