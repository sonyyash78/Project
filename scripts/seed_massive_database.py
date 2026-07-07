import sys
import os
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

# Hardcoded syllabus sets to prevent Gemini API quota issues
SYLLABUS_SETS = {
    "SSC": [
        {"name": "General Intelligence & Reasoning", "chapters": ["Analogies", "Similarities & Differences", "Spatial Visualization", "Problem Solving", "Analysis", "Judgment", "Blood Relations", "Number Series", "Coding-Decoding"]},
        {"name": "General Awareness", "chapters": ["History of India", "Geography", "Indian Economy", "Indian Polity", "General Science", "Current Affairs"]},
        {"name": "Quantitative Aptitude", "chapters": ["Number Systems", "Percentages", "Ratio & Proportion", "Averages", "Simple & Compound Interest", "Profit & Loss", "Time & Work", "Time & Distance", "Mensuration", "Algebra", "Geometry", "Trigonometry"]},
        {"name": "English Language & Comprehension", "chapters": ["Vocabulary", "Grammar", "Sentence Structure", "Synonyms & Antonyms", "Reading Comprehension", "Cloze Test"]}
    ],
    "Banking": [
        {"name": "Quantitative Aptitude", "chapters": ["Data Interpretation", "Number Series", "Quadratic Equations", "Simplification", "Time & Work", "Time, Speed & Distance", "Simple & Compound Interest", "Profit & Loss"]},
        {"name": "Reasoning Ability", "chapters": ["Puzzles & Seating Arrangement", "Syllogism", "Inequalities", "Blood Relations", "Direction Sense", "Coding-Decoding", "Machine Input Output"]},
        {"name": "English Language", "chapters": ["Reading Comprehension", "Cloze Test", "Para Jumbles", "Error Spotting", "Fill in the Blanks", "Vocabulary"]},
        {"name": "General & Financial Awareness", "chapters": ["Current Affairs", "Banking Awareness", "Financial Awareness", "Static GK", "Economic Policies"]},
        {"name": "Computer Aptitude", "chapters": ["Internet & Networking", "Computer Hardware", "MS Office", "Keyboard Shortcuts", "Computer Security"]}
    ],
    "Railway": [
        {"name": "Mathematics", "chapters": ["Number System", "BODMAS", "Decimals & Fractions", "LCM & HCF", "Ratio & Proportion", "Percentages", "Mensuration", "Time & Work", "Time & Distance", "Simple & Compound Interest", "Algebra", "Geometry"]},
        {"name": "General Intelligence & Reasoning", "chapters": ["Analogies", "Alphabetical & Number Series", "Coding & Decoding", "Mathematical Operations", "Relationships", "Syllogism", "Venn Diagram", "Data Interpretation & Sufficiency", "Decision Making"]},
        {"name": "General Awareness", "chapters": ["Current Events", "Indian History", "Geography", "Indian Polity", "Indian Economy", "Environmental Issues", "Sports"]},
        {"name": "General Science", "chapters": ["Physics", "Chemistry", "Life Sciences", "Environmental Science"]}
    ],
    "Management": [
        {"name": "Quantitative Ability", "chapters": ["Arithmetic", "Algebra", "Geometry & Mensuration", "Number System", "Modern Math", "Data Sufficiency"]},
        {"name": "Logical Reasoning", "chapters": ["Seating Arrangement", "Blood Relations", "Syllogism", "Venn Diagrams", "Clocks & Calendars", "Logical Deductions"]},
        {"name": "Data Interpretation", "chapters": ["Tables", "Bar Graphs", "Line Charts", "Pie Charts", "Mixed Graphs"]},
        {"name": "Verbal Ability & Reading Comprehension", "chapters": ["Reading Comprehension", "Para Jumbles", "Sentence Correction", "Vocabulary", "Critical Reasoning"]}
    ],
    "Engineering": [
        {"name": "Physics", "chapters": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Waves & Oscillations"]},
        {"name": "Chemistry", "chapters": ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry", "Biomolecules", "Environmental Chemistry"]},
        {"name": "Mathematics", "chapters": ["Algebra", "Calculus", "Coordinate Geometry", "Trigonometry", "Vectors & 3D Geometry", "Probability & Statistics"]}
    ],
    "Medical": [
        {"name": "Physics", "chapters": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics"]},
        {"name": "Chemistry", "chapters": ["Physical Chemistry", "Organic Chemistry", "Inorganic Chemistry"]},
        {"name": "Botany", "chapters": ["Plant Physiology", "Genetics & Evolution", "Ecology & Environment", "Cell Structure & Function", "Plant Diversity"]},
        {"name": "Zoology", "chapters": ["Human Physiology", "Animal Kingdom", "Biotechnology", "Human Reproduction", "Evolution"]}
    ],
    "Defence": [
        {"name": "Mathematics", "chapters": ["Algebra", "Matrices & Determinants", "Trigonometry", "Analytical Geometry of 2D & 3D", "Differential Calculus", "Integral Calculus", "Vector Algebra", "Statistics & Probability"]},
        {"name": "General Ability Test (English)", "chapters": ["Grammar & Usage", "Vocabulary", "Comprehension & Cohesion in Extended Text"]},
        {"name": "General Knowledge", "chapters": ["Physics", "Chemistry", "General Science", "History & Freedom Movement", "Geography", "Current Events"]}
    ],
    "UPSC": [
        {"name": "General Studies Paper I", "chapters": ["History of India", "Indian & World Geography", "Indian Polity & Governance", "Economic & Social Development", "Environmental Ecology", "General Science"]},
        {"name": "CSAT (General Studies Paper II)", "chapters": ["Comprehension", "Interpersonal Skills", "Logical Reasoning", "Decision Making", "General Mental Ability", "Basic Numeracy", "Data Interpretation"]}
    ],
    "Teaching": [
        {"name": "Child Development & Pedagogy", "chapters": ["Concept of Development", "Piaget, Kohlberg & Vygotsky", "Concepts of Child-centered Education", "Gender as a Social Construct", "Inclusive Education", "Learning & Pedagogy"]},
        {"name": "Language I", "chapters": ["Language Comprehension", "Pedagogy of Language Development", "Grammar", "Vocabulary"]},
        {"name": "Language II", "chapters": ["Comprehension", "Pedagogy of Language Development", "Grammar"]},
        {"name": "Mathematics", "chapters": ["Number System", "Geometry", "Shapes & Spatial Understanding", "Measurement", "Data Handling", "Pedagogical Issues in Mathematics"]},
        {"name": "Environmental Studies", "chapters": ["Family & Friends", "Food", "Shelter", "Water", "Travel", "Pedagogical Issues in EVS"]}
    ],
    "Police": [
        {"name": "General Knowledge", "chapters": ["History", "Geography", "Indian Constitution", "Indian Economy", "Current Affairs", "Human Rights", "Internal Security"]},
        {"name": "General Hindi", "chapters": ["Vyakaran", "Vocabulary", "Reading Comprehension", "Famous Authors & Poets"]},
        {"name": "Numerical & Mental Ability", "chapters": ["Number System", "Percentages", "Ratio & Proportion", "Profit & Loss", "Time & Work", "Logical Diagrams", "Word & Alphabet Analogy", "Direction Sense"]},
        {"name": "Mental Aptitude & Reasoning", "chapters": ["Public Interest", "Law & Order", "Crime Control", "Rule of Law", "Coding-Decoding", "Blood Relations", "Venn Diagrams"]}
    ],
    "Judiciary": [
        {"name": "General Knowledge", "chapters": ["History of India", "Indian Culture", "Geography of India", "Indian Polity", "Current National Issues", "International Affairs"]},
        {"name": "Language", "chapters": ["Essay Writing", "Translation", "Precis Writing"]},
        {"name": "Civil Law", "chapters": ["Law of Contracts", "Indian Partnership Act", "Easements & Torts", "Transfer of Property Act", "Hindu Law", "Muslim Law", "Civil Procedure Code"]},
        {"name": "Criminal Law", "chapters": ["Indian Penal Code", "Criminal Procedure Code", "Indian Evidence Act"]}
    ],
    "Insurance": [
        {"name": "Quantitative Aptitude", "chapters": ["Data Interpretation", "Number Series", "Simplification", "Time & Work", "Profit & Loss", "Simple & Compound Interest"]},
        {"name": "Reasoning Ability", "chapters": ["Puzzles & Seating Arrangement", "Syllogism", "Inequalities", "Blood Relations", "Direction Sense"]},
        {"name": "English Language", "chapters": ["Reading Comprehension", "Cloze Test", "Error Spotting", "Fill in the Blanks", "Vocabulary"]},
        {"name": "General Awareness", "chapters": ["Current Affairs", "Financial Awareness", "Static GK"]},
        {"name": "Insurance & Financial Market Awareness", "chapters": ["History of Life Insurance", "History of General Insurance", "IRDAI", "Insurance Terms & Concepts", "Financial Market Instruments"]}
    ],
    "CUET": [
        {"name": "Language", "chapters": ["Reading Comprehension", "Verbal Ability", "Rearranging the Parts", "Choosing the Correct Word", "Synonyms & Antonyms", "Vocabulary"]},
        {"name": "Domain Specific Subjects", "chapters": ["Accountancy", "Biology", "Business Studies", "Chemistry", "Computer Science", "Economics", "Geography", "History", "Mathematics", "Physics", "Political Science"]},
        {"name": "General Test", "chapters": ["General Knowledge", "Current Affairs", "General Mental Ability", "Numerical Ability", "Quantitative Reasoning", "Logical & Analytical Reasoning"]}
    ]
}

def get_syllabus_for_exam(exam_name):
    # Match exam to a syllabus category
    name = exam_name.upper()
    if "SSC" in name: return SYLLABUS_SETS["SSC"]
    if "RRB" in name: return SYLLABUS_SETS["Railway"]
    if "IBPS" in name or "SBI" in name or "RBI" in name: return SYLLABUS_SETS["Banking"]
    if name in ["CAT", "MAT", "CMAT", "XAT", "SNAP", "NMAT"]: return SYLLABUS_SETS["Management"]
    if "JEE" in name or "GATE" in name: return SYLLABUS_SETS["Engineering"]
    if "NEET" in name: return SYLLABUS_SETS["Medical"]
    if "NDA" in name or "CDS" in name or "AFCAT" in name: return SYLLABUS_SETS["Defence"]
    if "UPSC" in name or "PSC" in name or "BPSC" in name: return SYLLABUS_SETS["UPSC"]
    if "TET" in name or "REET" in name: return SYLLABUS_SETS["Teaching"]
    if "POLICE" in name: return SYLLABUS_SETS["Police"]
    if "JUDICIARY" in name: return SYLLABUS_SETS["Judiciary"]
    if "LIC" in name or "NIACL" in name: return SYLLABUS_SETS["Insurance"]
    if "CUET" in name: return SYLLABUS_SETS["CUET"]
    
    # Default fallback
    return SYLLABUS_SETS["SSC"]

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
                
            existing_subject_count = db.query(Subject).filter(Subject.exam_id == exam.id).count()
            if existing_subject_count > 0:
                print(f"    -> Exam '{exam_name}' already has {existing_subject_count} subjects. Skipping.")
                skipped.append(f"{exam_name} (Already has subjects)")
                continue

            print(f"    -> Seeding hardcoded official syllabus for '{exam_name}'...")
            syllabus_subjects = get_syllabus_for_exam(exam_name)
                
            for subj_data in syllabus_subjects:
                subj_name = subj_data.get("name", "").strip()
                if not subj_name: continue
                
                norm_subj = normalize_entity_name(subj_name)
                
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
                    
                chapters_list = subj_data.get("chapters", [])
                new_chapters = []
                for ch_name in chapters_list:
                    ch_name = str(ch_name).strip()
                    if not ch_name: continue
                    
                    norm_ch = normalize_entity_name(ch_name)
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
