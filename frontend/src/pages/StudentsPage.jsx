// frontend/src/pages/StudentsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API } from "../api";

export default function StudentsPage() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/classes/${classId}/students`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStudents(data || []))
      .catch(console.error);
  }, [classId]);

  return (
    <div>
      <h2>Students in Class {classId}</h2>
      <ul>
        {students.map((s) => {
          const studentId = s.id || s.userId;
          const studentName =
            s.name || s.profile?.name?.fullName || "Unnamed Student";
          return (
            <li key={studentId}>
              <Link to={`/classes/${classId}/grade/${studentId}`}>
                {studentName}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
