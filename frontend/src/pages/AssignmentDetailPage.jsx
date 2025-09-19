// frontend/src/pages/AssignmentDetailPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API } from "../api";

export default function AssignmentDetailPage() {
  const { classId, assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!classId || !assignmentId) return;

    // fetch assignment metadata (if API provides an endpoint for a single assignment)
    fetch(`${API}/api/classes/${classId}/assignments`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((list) => {
        const found = (list || []).find((a) => a.id === assignmentId);
        setAssignment(
          found || { id: assignmentId, title: "Unknown assignment" }
        );
      })
      .catch(console.error);

    // fetch students for the class
    fetch(`${API}/api/classes/${classId}/students`, { credentials: "include" })
      .then((r) => r.json())
      .then((s) => setStudents(s || []))
      .catch(console.error);
  }, [classId, assignmentId]);

  return (
    <div>
      <h2>{assignment ? assignment.title : "Loading assignment..."}</h2>

      <h3>Students</h3>
      <ul>
        {students.map((s) => {
          // note: your student id field might be s.id or s.userId; adjust if needed
          const studentId = s.id || s.userId || (s.profile && s.profile.id);
          const studentName =
            s.name ||
            (s.profile && s.profile.name && s.profile.name.fullName) ||
            s.email ||
            studentId;
          return (
            <li key={studentId}>
              {studentName}{" "}
              <Link
                to={`/classes/${classId}/assignments/${assignmentId}/grade/${studentId}`}
              >
                Grade
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
