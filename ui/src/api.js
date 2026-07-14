// Small client for the Matching API backend (FastAPI).
// Override the base URL by creating ui/.env with: VITE_API_BASE_URL=http://localhost:8000
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  if (!res.ok) {
    // Try to surface the backend's human-readable "detail" message; fall back
    // to a generic one. We attach the HTTP status so callers can branch on it
    // (e.g. 409 = username already taken).
    let detail = `Request failed (${res.status}): ${path}`;
    try {
      const body = await res.json();
      if (body && body.detail) detail = body.detail;
    } catch {
      // response had no JSON body; keep the generic message
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null; // no content (e.g. fire-and-forget events)
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

// POST /discover -> { reply, best: {…skill}|null, confidence }
// Conversational discovery: send the whole chat; an AI guide replies and names
// the best-fit skill (no misleading similarity numbers).
export function discoverSkill(messages) {
  return request("/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

// POST /draft-skill -> { session_id, type, message?, skill? }
// Turn 1 of the interview: send the user's opening description. The AI replies
// with either { type: "question", message } to keep interviewing, or
// { type: "draft", skill } once it has enough. Keep the session_id to continue.
export function draftSkill(description) {
  return request("/draft-skill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });
}

// POST /draft-skill/refine -> { session_id, type, message?, skill? }
// Later turns: pass back the session_id plus the user's answer (or a change like
// "make it shorter"). The AI returns the same envelope — another question or the
// drafted skill — remembering everything said before.
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
// `userId` is the signed-in author's stable id; the backend uses it to stamp
// the skill with the author's anonymous username and to enforce that the
// author has completed the required profile fields.
export function saveSkill(skill, userId) {
  return request("/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...skill, user_id: userId }),
  });
}

// POST /edit-skill -> { name, description, body, note }
// The skill editor's AI side-agent. Send the current skill and one plain-English
// instruction ("make the workflow tighter", "add a real example"); get back the
// full updated skill plus a short note describing what changed. Optionally pass
// prior { role, content } turns as `history` for a little conversational memory.
export function editSkill(skill, instruction, history) {
  return request("/edit-skill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill, instruction, history }),
  });
}

// POST /users -> { profile, is_new }
// Fetch-or-create the signed-in user's profile. On the very first call for a
// user the backend mints a unique anonymous username; is_new tells us to show
// first-time onboarding.
export function ensureProfile(userId) {
  return request("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
}

// GET /users/{userId} -> profile
export function getProfile(userId) {
  return request(`/users/${encodeURIComponent(userId)}`);
}

// GET /users/{userId}/skills -> [{ id, name, description }, ...]
// The skills this user has authored, for their "My Skills" list.
export function getMySkills(userId) {
  return request(`/users/${encodeURIComponent(userId)}/skills`);
}

// POST /events -> 204. Log one usage event (view | use | favorite | unfavorite).
// Fire-and-forget: swallow errors so metrics never break the UI.
export function recordEvent(skillId, type, userId) {
  return request("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill_id: skillId, type, user_id: userId }),
  }).catch(() => {});
}

// GET /skills/{id}/metrics -> { views, uses, favorites } (global counts only)
export function getSkillMetrics(skillId) {
  return request(`/skills/${encodeURIComponent(skillId)}/metrics`);
}

// PATCH /users/{userId} -> updated profile
// Send only the fields you want to change. Renaming to a taken username throws
// (the backend responds 409); the caller should surface that to the user.
export function updateProfile(userId, fields) {
  return request(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
}
