// frontend/src/pages/GradePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudents, getHistory, submitGrade } from "../api";
import "./GradePage.css"; // ✅ import styles

function todayNY() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

export default function GradePage() {
  const { classId, studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [date, setDate] = useState(todayNY());
  const [scores, setScores] = useState({
    preparation: 0,
    engagement: 0,
    critical: 0,
  });
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState([]);
  const [cumulative, setCumulative] = useState(0);
  const [daysGraded, setDaysGraded] = useState(0);
  const [maxPointsSoFar, setMaxPointsSoFar] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!classId || !studentId) return;
    getStudents(classId)
      .then((list) => {
        const s = (list || []).find(
          (x) => x.userId === studentId || x.id === studentId
        );
        if (s) {
          setStudent({
            id: s.userId || s.id,
            name: s.profile?.name?.fullName || "Unnamed Student",
          });
        } else {
          setStudent({ id: studentId, name: "Unknown Student" });
        }
      })
      .catch((err) => {
        console.error("getStudents error", err);
        setStudent({ id: studentId, name: "Student" });
      });
  }, [classId, studentId]);

  const percent =
    maxPointsSoFar > 0 ? ((cumulative / maxPointsSoFar) * 100).toFixed(1) : "0";

  const loadHistory = async () => {
    if (!classId || !studentId) return;
    try {
      const res = await getHistory(classId, studentId);
      setHistory(Array.isArray(res?.entries) ? res.entries : res || []);
      setCumulative(typeof res?.cumulative === "number" ? res.cumulative : 0);
      setDaysGraded(res?.daysGraded || 0);
      setMaxPointsSoFar(res?.maxPointsSoFar || 0);
    } catch (err) {
      console.error("loadHistory error", err);
      setHistory([]);
      setCumulative(0);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [classId, studentId]);

  const total = useMemo(
    () =>
      (Number(scores.preparation) || 0) +
      (Number(scores.engagement) || 0) +
      (Number(scores.critical) || 0),
    [scores]
  );

  const setScore = (k, v) => setScores((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!classId || !studentId) return setStatus("Missing class or student");
    setStatus("Submitting...");
    try {
      const payload = { courseId: classId, studentId, scores, date };
      const r = await submitGrade(payload);
      if (r?.success) {
        setStatus("Saved ✓");
        await loadHistory();
      } else {
        setStatus("Error: " + (r?.error || "unknown"));
      }
    } catch (err) {
      console.error("submit error", err);
      setStatus("Network error");
    }
    setTimeout(() => setStatus(""), 1600);
  };

  if (!student) return <div>Loading student...</div>;

  return (
    <div className="grade-container">
      <button className="back-button" onClick={() => navigate(`/classes/${classId}`)}>
        ← Back to Class
      </button>

      <h3 className="student-name">{student?.name || "Student"}</h3>

      <label className="date-label">Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="date-input"
      />

      {[
        { key: "preparation", label: "PREPARATION" },
        { key: "engagement", label: "ENGAGEMENT" },
        { key: "critical", label: "CRITICAL THINKING" },
      ].map(({ key, label }) => (
        <div key={key} className="category">
          <div className="category-label">{label}</div>
          <div className="score-buttons">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(key, n)}
                className={`score-button ${scores[key] === n ? "selected" : ""}`}
                aria-pressed={scores[key] === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="submit-section">
        <button className="submit-button" onClick={handleSubmit}>
          Submit Grade ({total})
        </button>
        <div className="status">{status}</div>
      </div>

      <hr />
      <div className="history">
        <h4>Recent history</h4>
        <div>Cumulative: {cumulative}</div>
        <div>Days graded: {daysGraded}</div>
        <div>Max possible so far: {maxPointsSoFar}</div>
        <div>Percentage: {percent}%</div>
        <ul>
          {history.length === 0 ? (
            <li>No past scores</li>
          ) : (
            history.map((e) => (
              <li key={e._id ?? `${e.date}-${e.score}`}>
                {e.date} — {e.score}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
