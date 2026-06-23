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

// POST /draft-skill -> { session_id, skill }
// Turn 1 of the AI conversation: turn a plain-English description into a first
// draft. Keep the returned session_id to continue the conversation.
export function draftSkill(description) {
  return request("/draft-skill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
}

// POST /draft-skill/refine -> { session_id, skill }
// Later turns: pass back the session_id plus a change ("make it shorter") and
// the AI returns the updated skill, remembering everything said before.
export function refineSkill(sessionId, message) {
  return request("/draft-skill/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

// POST /skills -> the saved skill (with its final id)
// Persists an approved skill and makes it searchable. `skill` is just the
// { id, name, description, body } object -- no session_id needed.
export function saveSkill(skill) {
  return request("/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skill),
  });
}
