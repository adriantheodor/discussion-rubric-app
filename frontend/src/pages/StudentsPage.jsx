// frontend/src/pages/StudentsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { API } from "../api";
import "./StudentsPage.css";

export default function StudentsPage() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/classes/${classId}/students`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStudents(data || []))
      .catch(console.error);
  }, [classId]);

  return (
    <div className="students-container">
      <button className="back-button" onClick={() => navigate("/classes")}>
        ← Back to Classes
      </button>

      <h2 className="page-title">Students</h2>
      <p className="class-id">Class ID: {classId}</p>

      {students.length === 0 ? (
        <p className="empty-message">No students found.</p>
      ) : (
        <ul className="students-list">
          {students.map((s) => (
            <li key={s.userId}>
              <Link
                to={`/classes/${classId}/grade/${s.userId}`}
                className="student-button"
              >
                {s.profile?.name?.fullName || "Unnamed Student"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
