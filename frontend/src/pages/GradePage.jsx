// frontend/src/pages/GradePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../api";

export default function GradePage() {
  const { classId, assignmentId, studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [scores, setScores] = useState({ preparation: 0, engagement: 0, critical: 0 });
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!classId || !assignmentId || !studentId) return;

    // fetch student info
    fetch(`${API}/api/classes/${classId}/students`, { credentials: "include" })
      .then((r) => r.json())
      .then((list) => {
        const s = (list || []).find((x) => (x.id === studentId || x.userId === studentId));
        setStudent(s || { id: studentId, name: studentId });
      })
      .catch(console.error);

    // fetch assignment info
    fetch(`${API}/api/classes/${classId}/assignments`, { credentials: "include" })
      .then((r) => r.json())
      .then((list) => {
        const a = (list || []).find((x) => x.id === assignmentId);
        setAssignment(a || { id: assignmentId, title: "Assignment" });
      })
      .catch(console.error);
  }, [classId, assignmentId, studentId]);

  const setScore = (key, value) => setScores((s) => ({ ...s, [key]: value }));
  const total = scores.preparation + scores.engagement + scores.critical;

  const handleSubmit = async () => {
    setStatus("Submitting...");
    try {
      const res = await fetch(`${API}/api/grade`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: classId,
          courseWorkId: assignmentId,
          studentId,
          grade: total,
        }),
      });
      if (res.ok) {
        setStatus("Grade submitted ✓");
        setTimeout(() => navigate(-1), 700); // go back
      } else {
        const err = await res.json();
        setStatus("Error: " + (err.error || "unknown"));
      }
    } catch (err) {
      console.error(err);
      setStatus("Network error");
    }
  };

  if (!student || !assignment) return <div>Loading...</div>;

  const ButtonGrid = ({ categoryKey, label }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: "600", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setScore(categoryKey, n)}
            aria-pressed={scores[categoryKey] === n}
            style={{
              padding: "10px 14px",
              fontSize: 16,
              minWidth: 48,
              borderRadius: 8,
              border: scores[categoryKey] === n ? "2px solid #111" : "1px solid #ccc",
              background: scores[categoryKey] === n ? "#2563eb" : "#fff",
              color: scores[categoryKey] === n ? "#fff" : "#000",
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h2>Grade: {student?.name || studentId}</h2>
      <h4>{assignment?.title}</h4>

      <ButtonGrid categoryKey="preparation" label="PREPARATION" />
      <ButtonGrid categoryKey="engagement" label="ENGAGEMENT" />
      <ButtonGrid categoryKey="critical" label="CRITICAL THINKING" />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <button onClick={handleSubmit} style={{ padding: "10px 16px", fontSize: 16 }}>
          SUBMIT GRADE ({total})
        </button>
        <div>{status}</div>
      </div>
    </div>
  );
}
