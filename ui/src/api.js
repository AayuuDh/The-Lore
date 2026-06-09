// Small client for the Matching API backend (FastAPI).
// Override the base URL by creating ui/.env with: VITE_API_BASE_URL=http://localhost:8000
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${path}`);
  }
  return res.json();
}

// GET /skills -> [{ id, name, description, body }, ...]
export function getSkills() {
  return request("/skills");
}

// GET /skills/{id} -> { id, name, description, body }
export function getSkill(id) {
  return request(`/skills/${encodeURIComponent(id)}`);
}

// POST /match -> [{ skill, score }, ...] ranked best-first
export function matchSkills(query, topK = 30) {
  return request("/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });
}
