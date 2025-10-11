#!/usr/bin/env python3
import os
import sys
import json
import math
import traceback
from typing import List, Dict, Any

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


def fetch_users(mongo_uri: str, student_id: str) -> (Dict[str, Any], List[Dict[str, Any]]):
    client = MongoClient(mongo_uri)
    db = client.get_default_database() if "/" in mongo_uri.split("?")[0].rsplit("/", 1)[-1] else client[os.environ.get("MONGO_DB_NAME", "test")] 
    users = list(db["users"].find({}, {
        "name": 1,
        "username": 1,
        "avatarUrl": 1,
        "department": 1,
        "graduationYear": 1,
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
    
    corpus = [build_feature_text(student)] + [build_feature_text(a) for a in alumni]
    
    # Filter out empty feature texts
    if all(len(c.strip()) == 0 for c in corpus):
        return []
    
    vectorizer = TfidfVectorizer(min_df=1)
    X = vectorizer.fit_transform(corpus)
    sims = cosine_similarity(X[0:1], X[1:]).flatten()
    
    # Pair each alum with score
    paired = [
        {
            "_id": alumni[i]["_id"],
            "name": alumni[i].get("name", ""),
            "username": alumni[i].get("username", ""),
            "avatarUrl": alumni[i].get("avatarUrl", ""),
            "department": alumni[i].get("department", ""),
            "graduationYear": alumni[i].get("graduationYear", ""),
            "industry": alumni[i].get("industry", ""),
            "skills": alumni[i].get("skills", []),
            "similarity": float(sims[i])
        }
        for i in range(len(alumni))
        if float(sims[i]) >= 0.3  # **THRESHOLD: Only include if similarity >= 0.3**
    ]
    
    paired.sort(key=lambda x: x["similarity"], reverse=True)
    return paired[:top_k]


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