const API = import.meta.env.VITE_API || 'http://localhost:4000';

export async function me() {
  const r = await fetch(`${API}/api/me`, { credentials: 'include' });
  return r.ok ? r.json() : null;
}
export const loginUrl = `${API}/auth/login`;
export async function getClasses() {
  const r = await fetch(`${API}/api/classes`, { credentials: 'include' });
  return r.json();
}
export async function getStudents(classId) {
  const r = await fetch(`${API}/api/classes/${classId}/students`, { credentials: 'include' });
  return r.json();
}
export async function getAssignments(classId) {
  const r = await fetch(`${API}/api/classes/${classId}/assignments`, { credentials: 'include' });
  return r.json();
}
export async function submitGrade(payload) {
  const r = await fetch(`${API}/api/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('submit_failed');
  return r.json();
}
