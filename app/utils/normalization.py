import re
import unicodedata

def normalize_entity_name(name: str) -> str:
    if not name:
        return ""
    
    # 1. Convert to lowercase
    normalized = name.lower()
    
    # 2. Normalize unicode (e.g., accents)
    normalized = unicodedata.normalize("NFKD", normalized)
    # Removed ASCII encoding to preserve non-ASCII characters (Hindi, etc)
    
    # 3. Replace ampersands with "and"
    normalized = normalized.replace("&", " and ")
    
    # 4. Remove all quotes (single and double)
    normalized = normalized.replace('"', '').replace("'", "")
    
    # 5. Handle common aliases and plurals (e.g. jee mains -> jee main)
    # Using regex to replace whole word 'mains' after 'jee'
    normalized = re.sub(r'\bjee mains\b', 'jee main', normalized)
    
    # 6. Replace all non-alphanumeric characters with space (except basic punctuation) (keep only alphanumeric and spaces)
    # We allow hyphens and slashes but replace them with spaces for uniform comparison
    normalized = re.sub(r'[^\w\s]', ' ', normalized)
    
    # 6. Collapse multiple spaces into one and trim
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized
