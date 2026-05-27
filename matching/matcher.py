import math
from embeddings import embed, embed_batch
from skills_loader import load_skills
def skill_to_text(skill: dict) -> str:
    return " ".join([
        skill["name"],
        skill["problem"],
        skill["when_to_use"],
        " ".join(skill["tags"]),
        " ".join(skill["use_cases"]),
    ])

def cosine_similarity(a: list[float], b: list[float]) -> float:
    return (sum(x * y for x,y in zip(a,b)) /
     (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(x * x for x in b))))


def precompute_skill_vectors(skills: list) -> list:
    newSkills = []
    for skill in skills:
        skill['vector'] = (embed(skill_to_text(skill)))
        newSkills.append(skill)
        print(f'appended {skill}')
    return newSkills
        


def match(query: str, skills_with_vectors: list, top_k: int = 10) -> list:
    """Return the top_k skills most similar to `query`.

    embed the query (single call to embed)
    cosine_similarity(query_vec, each skill["vector"])
    sort by score descending, take top_k
    return list of (skill, score) tuples
    """
    result = []
    queryVec = embed(query)
    for skill in skills_with_vectors:
        score = cosine_similarity(skill['vector'], queryVec)
        result.append((skill, score))
    result.sort(key=lambda pair: pair[1], reverse=True)
    return result[:top_k]
    
    


if __name__ == "__main__":
    skills = load_skills()
    skillVectors = precompute_skill_vectors(skills)
    query = "i need a prompt to phrase my emails better to make it sound corporate"
    matched = match(query, skillVectors)
    print(f'this is the best match: {((matched[0])[0])['id']} with similarity {((matched[0])[1])}')


