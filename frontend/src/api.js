export const API =
  import.meta.env.VITE_API || "https://discussion-rubric-app.onrender.com";

export async function getClasses() {
  const r = await fetch(`${API}/api/classes`, { credentials: "include" });
  return r.json();
}
export async function getStudents(courseId) {
  const r = await fetch(`${API}/api/classes/${courseId}/students`, {
    credentials: "include",
  });
  return r.json();
}
export async function getAssignments(courseId) {
  const r = await fetch(`${API}/api/classes/${courseId}/assignments`, {
    credentials: "include",
  });
  return r.json();
}
export async function submitGrade(payload) {
  // payload: { courseId, courseWorkId (optional), studentId, scores, date }
  const r = await fetch(`${API}/api/grade`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export async function logout() {
  const r = await fetch(`${API}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return r.json();
}


export async function getHistory(courseId, studentId) {
  const r = await fetch(
    `${API}/api/participation/history?courseId=${courseId}&studentId=${studentId}`,
    { credentials: "include" }
  );
  return r.json();
}
