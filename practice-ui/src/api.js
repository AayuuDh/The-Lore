// The ONLY file that knows the backend exists. Everything else calls these
// functions and never sees a URL or fetch().
//
// The backend runs on :8000 (uvicorn). This app runs on :5180 (vite).
// Two different ports = two different "origins", which is why main.py needed
// CORSMiddleware with allow_origins=["*"] — that's the server's permission
// slip letting this code call it from the browser.

const BASE = "http://localhost:8000";

// POST /match  ->  [ { skill, score }, ... ]
export async function searchSkills(query) {
  const response = await fetch(`${BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: 10 }),
  });
  if (!response.ok) throw new Error(`search failed: ${response.status}`);
  return await response.json();
}

// GET /skills  ->  [ skill, ... ]   (used to show a default list)
export async function getAllSkills() {
  const response = await fetch(`${BASE}/skills`);
  if (!response.ok) throw new Error(`load failed: ${response.status}`);
  return await response.json();
}

// GET /skills/{id}  ->  one skill object
export async function getSkill(id) {
  const response = await fetch(`${BASE}/skills/${id}`);
  if (!response.ok) throw new Error(`skill not found: ${response.status}`);
  return await response.json();
}
