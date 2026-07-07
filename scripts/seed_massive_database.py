import sys
import os
import json
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.db import SessionLocal
from app.models.exam_model import Exam
from app.models.subject_model import Subject
from app.models.chapter_model import Chapter
from app.utils.normalization import normalize_entity_name
from app.ai_question_generator.gemini import generate_content_with_retry

EXAM_LIST = [
    {"name": "UPSC Civil Services", "category": "Government", "image": "/assets/upsc.png"},
    {"name": "SSC CGL", "category": "Government", "image": "/assets/ssc.png"},
    {"name": "SSC CHSL", "category": "Government", "image": "/assets/ssc.png"},
    {"name": "SSC MTS", "category": "Government", "image": "/assets/ssc.png"},
    {"name": "SSC CPO", "category": "Government", "image": "/assets/ssc.png"},
    {"name": "SSC GD", "category": "Government", "image": "/assets/ssc.png"},
    {"name": "RRB NTPC", "category": "Railway", "image": "/assets/rrb.png"},
    {"name": "RRB Group D", "category": "Railway", "image": "/assets/rrb.png"},
    {"name": "RRB JE", "category": "Railway", "image": "/assets/rrb.png"},
    {"name": "IBPS PO", "category": "Banking", "image": "/assets/ibps.png"},
    {"name": "IBPS Clerk", "category": "Banking", "image": "/assets/ibps.png"},
    {"name": "SBI PO", "category": "Banking", "image": "/assets/sbi.png"},
    {"name": "SBI Clerk", "category": "Banking", "image": "/assets/sbi.png"},
    {"name": "RBI Assistant", "category": "Banking", "image": "/assets/rbi.png"},
    {"name": "CAT", "category": "Management", "image": "/assets/cat.png"},
    {"name": "MAT", "category": "Management", "image": "/assets/mat.png"},
    {"name": "CMAT", "category": "Management", "image": "/assets/cmat.png"},
    {"name": "XAT", "category": "Management", "image": "/assets/xat.png"},
    {"name": "SNAP", "category": "Management", "image": "/assets/snap.png"},
    {"name": "NMAT", "category": "Management", "image": "/assets/nmat.png"},
    {"name": "CUET UG", "category": "University", "image": "/assets/cuet.png"},
    {"name": "CUET PG", "category": "University", "image": "/assets/cuet.png"},
    {"name": "JEE Main", "category": "Engineering", "image": "/assets/jee.png"},
    {"name": "JEE Advanced", "category": "Engineering", "image": "/assets/jee.png"},
    {"name": "NEET UG", "category": "Medical", "image": "/assets/neet.png"},
    {"name": "GATE", "category": "Engineering", "image": "/assets/gate.png"},
    {"name": "NDA", "category": "Defence", "image": "/assets/nda.png"},
    {"name": "CDS", "category": "Defence", "image": "/assets/cds.png"},
    {"name": "AFCAT", "category": "Defence", "image": "/assets/afcat.png"},
    {"name": "UPPSC", "category": "State PSC", "image": "/assets/uppsc.png"},
    {"name": "BPSC", "category": "State PSC", "image": "/assets/bpsc.png"},
    {"name": "UP Police Constable", "category": "Police", "image": "/assets/police.png"},
    {"name": "Delhi Police SI", "category": "Police", "image": "/assets/police.png"},
    {"name": "CTET", "category": "Teaching", "image": "/assets/ctet.png"},
    {"name": "REET", "category": "Teaching", "image": "/assets/reet.png"},
    {"name": "UPTET", "category": "Teaching", "image": "/assets/uptet.png"},
    {"name": "RRB ALP", "category": "Railway", "image": "/assets/rrb.png"},
    {"name": "LIC AAO", "category": "Insurance", "image": "/assets/lic.png"},
    {"name": "NIACL AO", "category": "Insurance", "image": "/assets/niacl.png"},
    {"name": "UP Judiciary", "category": "Judiciary", "image": "/assets/judiciary.png"},
    {"name": "Delhi Judiciary", "category": "Judiciary", "image": "/assets/judiciary.png"},
]

PROMPT_TEMPLATE = """
You are an expert exam syllabus compiler. Provide the complete and official syllabus for the exam "{exam_name}".
Return ONLY a valid JSON object with the following structure. Do not include markdown code block backticks if possible, just the raw JSON:

{{
    "subjects": [
        {{
            "name": "Subject Name (e.g., Mathematics, General Awareness)",
            "chapters": [
                "Chapter 1 name",
                "Chapter 2 name"
            ]
        }}
    ]
}}

STRICT RULES:
1. Cover ALL main subjects asked in the exam.
2. For each subject, list ALL major chapters based on the latest official syllabus.
3. Ensure no placeholder names. Provide realistic, exact chapter names.
4. Output MUST be valid JSON.
"""

async def fetch_syllabus(exam_name):
    prompt = PROMPT_TEMPLATE.format(exam_name=exam_name)
    try:
        # Request content from the AI Generator (returns a parsed list or dict)
        response_data = await generate_content_with_retry(prompt, max_retries=3)
        # response_data might be a dict if our gemini.py extracts it properly
        if isinstance(response_data, list):
            return {"subjects": response_data}
        return response_data
    except Exception as e:
        print(f"    [Error] Failed to fetch syllabus for {exam_name}: {e}")
        return None

async def seed_hierarchy():
    db = SessionLocal()
    try:
        total_exams = 0
        total_subjects = 0
        total_chapters = 0
        skipped = []

        print("=====================================================")
        print("🚀 MASSIVE DATABASE SYLLABUS SEEDING INITIATED 🚀")
        print("=====================================================")
        
        for item in EXAM_LIST:
            exam_name = item["name"]
            norm_name = normalize_entity_name(exam_name)
            
            # Check if Exam already has subjects/chapters
            exam = db.query(Exam).filter(Exam.normalized_name == norm_name).first()
            if not exam:
                print(f"\n[NEW EXAM] Creating {exam_name}...")
                exam = Exam(
                    exam_name=exam_name,
                    normalized_name=norm_name,
                    category=item["category"],
                    image=item["image"],
                    positive_marks=4.0,
                    negative_marks=-1.0
                )
                db.add(exam)
                db.commit()
                db.refresh(exam)
                total_exams += 1
            else:
                print(f"\n[EXISTS] Processing existing Exam: {exam_name}")
                
            # Check if subjects already exist for this exam to prevent duplicate API calls
            existing_subject_count = db.query(Subject).filter(Subject.exam_id == exam.id).count()
            if existing_subject_count > 0:
                print(f"    -> Exam '{exam_name}' already has {existing_subject_count} subjects. Skipping AI syllabus fetch.")
                skipped.append(f"{exam_name} (Already has subjects)")
                continue

            print(f"    -> Fetching official syllabus for '{exam_name}' via AI...")
            syllabus_data = await fetch_syllabus(exam_name)
            
            if not syllabus_data or "subjects" not in syllabus_data:
                print(f"    [Failed] Could not parse syllabus for {exam_name}.")
                skipped.append(f"{exam_name} (AI Fetch Failed)")
                continue
                
            for subj_data in syllabus_data["subjects"]:
                subj_name = subj_data.get("name", "").strip()
                if not subj_name: continue
                
                norm_subj = normalize_entity_name(subj_name)
                
                # Check Subject
                subject = db.query(Subject).filter(
                    Subject.exam_id == exam.id, 
                    Subject.normalized_name == norm_subj
                ).first()
                
                if not subject:
                    subject = Subject(exam_id=exam.id, name=subj_name, normalized_name=norm_subj)
                    db.add(subject)
                    db.commit()
                    db.refresh(subject)
                    total_subjects += 1
                    
                # Add Chapters
                chapters_list = subj_data.get("chapters", [])
                new_chapters = []
                for ch_name in chapters_list:
                    ch_name = str(ch_name).strip()
                    if not ch_name: continue
                    
                    norm_ch = normalize_entity_name(ch_name)
                    # Check Chapter
                    exists = db.query(Chapter).filter(
                        Chapter.subject_id == subject.id,
                        Chapter.normalized_name == norm_ch
                    ).first()
                    
                    if not exists:
                        new_chapters.append(Chapter(subject_id=subject.id, name=ch_name, normalized_name=norm_ch))
                        total_chapters += 1
                        
                if new_chapters:
                    db.add_all(new_chapters)
                    db.commit()
                    print(f"    -> Inserted subject '{subj_name}' with {len(new_chapters)} chapters.")
                    
        print("\n=====================================================")
        print("📊 FINAL SEEDING REPORT 📊")
        print("=====================================================")
        print(f"Total Exams Added    : {total_exams}")
        print(f"Total Subjects Added : {total_subjects}")
        print(f"Total Chapters Added : {total_chapters}")
        print(f"Total Questions Added: 0 (Questions are marked 'Coming Soon' in UI)")
        if skipped:
            print(f"Skipped Items:")
            for s in skipped:
                print(f" - {s}")
        print("=====================================================")

    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_hierarchy())
