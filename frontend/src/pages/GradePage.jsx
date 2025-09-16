// frontend/src/pages/GradePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudents, getHistory, submitGrade } from "../api";

function todayNY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export default function GradePage() {
  const { classId, studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [date, setDate] = useState(todayNY());
  const [scores, setScores] = useState({ preparation: 0, engagement: 0, critical: 0 });
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState([]);        // array of past daily records
  const [cumulative, setCumulative] = useState(0);   // running total (number)
  const [daysGraded, setDaysGraded] = useState(0);
  const [maxPointsSoFar, setMaxPointsSoFar] = useState(0);
  const navigate = useNavigate();


  // load student info
  useEffect(() => {
    if (!classId || !studentId) return;
    getStudents(classId)
      .then((list) => {
        const s = (list || []).find((x) => x.userId === studentId || x.id === studentId);
        setStudent(s || { id: studentId, name: "Student" });
      })
      .catch((err) => {
        console.error("getStudents error", err);
        setStudent({ id: studentId, name: "Student" });
      });
  }, [classId, studentId]);

  const percent =
  maxPointsSoFar > 0
    ? ((cumulative / maxPointsSoFar) * 100).toFixed(1)
    : "0";


  // load history + cumulative
  const loadHistory = async () => {
    if (!classId || !studentId) return;
    try {
      const res = await getHistory(classId, studentId);
      // backend returns { entries, cumulative } per the spec — normalize defensively
      setHistory(Array.isArray(res?.entries) ? res.entries : (res || []));
      setCumulative(typeof res?.cumulative === "number" ? res.cumulative : 0);
      setDaysGraded(res?.daysGraded || 0);
      setMaxPointsSoFar(res?.maxPointsSoFar || 0); // ✅
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
    () => (Number(scores.preparation) || 0) + (Number(scores.engagement) || 0) + (Number(scores.critical) || 0),
    [scores]
  );

  const setScore = (k, v) => setScores((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!classId || !studentId) return setStatus("Missing class or student");
    setStatus("Submitting...");
    try {
      const payload = {
        courseId: classId,
        // courseWorkId: optional — backend will create/use Participation if missing
        studentId,
        scores,
        date,
      };
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
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 12 }}>
      <button
        onClick={() => navigate(`/classes/${classId}`)}
        style={{ marginBottom: "1rem", padding: "6px 12px", borderRadius: "6px" }}
    >← Back to Class</button>


      <h3>{student?.name || "Student"}</h3>

      <label style={{ display: "block", marginBottom: 6 }}>Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ display: "block", marginBottom: 12 }}
      />

      {[
        { key: "preparation", label: "PREPARATION" },
        { key: "engagement", label: "ENGAGEMENT" },
        { key: "critical", label: "CRITICAL THINKING" },
      ].map(({ key, label }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(key, n)}
                style={{
                  padding: "12px 14px",
                  fontSize: 18,
                  borderRadius: 8,
                  minWidth: 48,
                  background: scores[key] === n ? "#2563eb" : "#eee",
                  color: scores[key] === n ? "#fff" : "#000",
                }}
                aria-pressed={scores[key] === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <button onClick={handleSubmit} style={{ padding: "10px 16px", fontSize: 16 }}>
          SUBMIT GRADE ({total})
        </button>
        <div>{status}</div>
      </div>

      <hr />

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
  );
}
