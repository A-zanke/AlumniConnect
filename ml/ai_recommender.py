#!/usr/bin/env python3
import os
import sys
import json
import math
import traceback
from typing import List, Dict, Any
"""
Alumni recommender

Changes:
- Filter alumni by same/related department before computing cosine similarity
- Use adjustable similarity threshold via REC_SIMILARITY_THRESHOLD env (default 0.6)
- Return dynamic number of matches: when top_k <= 0, do not cap
- Include company field in outputs
"""

# Third-party
try:
    import numpy as np
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from pymongo import MongoClient
except Exception as e:
    pass


def _safe_str(x: Any) -> str:
    if x is None:
        return ""
    return str(x)


def build_feature_text(user: Dict[str, Any]) -> str:
    parts: List[str] = []
    parts.append(_safe_str(user.get("department", "")))
    parts.append(_safe_str(user.get("industry", "")))
    parts.append(_safe_str(user.get("graduationYear", "")))

    skills = user.get("skills") or []
    if isinstance(skills, list):
        parts.extend([_safe_str(s) for s in skills])

    interests = user.get("careerInterests") or []
    if isinstance(interests, list):
        parts.extend([_safe_str(i) for i in interests])

    return " ".join([p.strip().lower().replace(" ", "_") for p in parts if _safe_str(p).strip()])


# --- Department normalization and relatedness ---
def _normalize_dept(raw: Any) -> str:
    if raw is None:
        return ""
    s = str(raw).strip().lower()
    # unify punctuation/variants
    s = s.replace("&", "and").replace("/", " ").replace("-", " ").replace(".", " ")
    s = " ".join(s.split())  # collapse whitespace
    return s


_DEPT_GROUPS = {
    # Computer Science and related
    "cse": {
        "cse", "computer science", "cs", "it", "information technology",
        "ai", "ml", "aiml", "ai ml", "data science", "ai ds", "ai ds",
        "ai ds", "ai ds", "ai ds", "ai ds", "ai ds"
    },
    "ai ds": {"ai ds", "ai", "ml", "aiml", "data science", "cse", "cs", "information technology", "it"},
    # Electronics/Electrical/Telecom cluster
    "ece": {
        "ece", "electronics", "electronics and communication", "electronics and telecommunication",
        "entc", "e and tc", "eandtc", "e and c", "telecom", "telecommunication",
        "electrical", "eee", "electrical and electronics", "e and e"
    },
    # Mechanical cluster
    "mechanical": {"mechanical", "mech", "production", "industrial"},
    # Civil cluster
    "civil": {"civil"},
}


def _canonical_dept(raw: Any) -> str:
    s = _normalize_dept(raw)
    if not s:
        return ""
    for canon, synonyms in _DEPT_GROUPS.items():
        if s in synonyms:
            return canon
    # common short-hands
    if s in {"e tc", "e and tc", "e&tc", "etc"}:
        return "ece"
    if s in {"ai ds", "ai ml", "aiml"}:
        return "ai ds"
    if s in {"cs", "computer", "computer engineering"}:
        return "cse"
    return s


def _departments_related(student_dept: Any, alumni_dept: Any) -> bool:
    cs = _canonical_dept(student_dept)
    ca = _canonical_dept(alumni_dept)
    if not cs or not ca:
        # if either is missing, do not exclude on department alone
        return True
    return cs == ca


def fetch_users(mongo_uri: str, student_id: str) -> (Dict[str, Any], List[Dict[str, Any]]):
    client = MongoClient(mongo_uri)
    db = client.get_default_database() if "/" in mongo_uri.split("?")[0].rsplit("/", 1)[-1] else client[os.environ.get("MONGO_DB_NAME", "test")] 
    users = list(db["users"].find({}, {
        "name": 1,
        "username": 1,
        "avatarUrl": 1,
        "department": 1,
        "graduationYear": 1,
        "company": 1,
        "industry": 1,
        "skills": 1,
        "careerInterests": 1,
        "role": 1
    }))
    student = None
    alumni: List[Dict[str, Any]] = []
    for u in users:
        u["_id"] = str(u["_id"])
        role = (u.get("role") or "").lower()
        if u["_id"] == student_id:
            student = u
        if role == "alumni":
            alumni.append(u)
    return student, alumni


def compute_recommendations(student: Dict[str, Any], alumni: List[Dict[str, Any]], top_k: int = 10) -> List[Dict[str, Any]]:
    if not student or not alumni:
        return []

    # Department filter: only consider same/related departments
    eligible_alumni = [a for a in alumni if _departments_related(student.get("department"), a.get("department"))]
    if not eligible_alumni:
        return []

    corpus = [build_feature_text(student)] + [build_feature_text(a) for a in eligible_alumni]
    
    # Filter out empty feature texts
    if all(len(c.strip()) == 0 for c in corpus):
        return []
    
    vectorizer = TfidfVectorizer(min_df=1)
    X = vectorizer.fit_transform(corpus)
    sims = cosine_similarity(X[0:1], X[1:]).flatten()
    
    # Pair each alum with score
    # Adjustable threshold (default 0.6)
    try:
        threshold = float(os.environ.get("REC_SIMILARITY_THRESHOLD", "0.6"))
    except Exception:
        threshold = 0.6

    paired = [
        {
            "_id": eligible_alumni[i]["_id"],
            "name": eligible_alumni[i].get("name", ""),
            "username": eligible_alumni[i].get("username", ""),
            "avatarUrl": eligible_alumni[i].get("avatarUrl", ""),
            "department": eligible_alumni[i].get("department", ""),
            "graduationYear": eligible_alumni[i].get("graduationYear", ""),
            "company": eligible_alumni[i].get("company", ""),
            "industry": eligible_alumni[i].get("industry", ""),
            "skills": eligible_alumni[i].get("skills", []),
            "similarity": float(sims[i])
        }
        for i in range(len(eligible_alumni))
        if float(sims[i]) >= threshold  # include if similarity >= threshold
    ]
    
    paired.sort(key=lambda x: x["similarity"], reverse=True)
    return paired if (isinstance(top_k, int) and top_k <= 0) else paired[:top_k]


def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({"error": "usage: ai_recommender.py <mongo_uri> <student_id> [top_k]"}))
            return
        mongo_uri = sys.argv[1]
        student_id = sys.argv[2]
        top_k = int(sys.argv[3]) if len(sys.argv) > 3 else 10

        import numpy as np
        import pandas as pd
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        from pymongo import MongoClient

        student, alumni = fetch_users(mongo_uri, student_id)
        recs = compute_recommendations(student, alumni, top_k=top_k)
        print(json.dumps({"recommendations": recs}))
    except Exception as e:
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))


if __name__ == "__main__":
    main()