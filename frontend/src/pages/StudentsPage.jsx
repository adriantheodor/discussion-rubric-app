// frontend/src/pages/StudentsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API } from "../api";

export default function StudentsPage({ assignmentId: propAssignmentId }) {
  const params = useParams();
  const classId = params.classId || params.courseId;
  const assignmentId = propAssignmentId || params.assignmentId;
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!classId) return;
    fetch(`${API}/api/classes/${classId}/students`, { credentials: "include" })
      .then((r) => r.json())
      .then((s) => setStudents(s || []))
      .catch(console.error);
  }, [classId]);

  return (
    <div>
      <h3>Students</h3>
      <ul>
        {students.map((s) => {
          const studentId = s.id || s.userId || (s.profile && s.profile.id);
          const name = s.name || (s.profile && s.profile.name && s.profile.name.fullName) || studentId;
          return (
            <li key={studentId}>
              {name}{" "}
              {assignmentId ? (
                <Link to={`/classes/${classId}/assignments/${assignmentId}/grade/${studentId}`}>
                  Grade
                </Link>
              ) : (
                <span style={{ color: "#777" }}>Select an assignment</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
