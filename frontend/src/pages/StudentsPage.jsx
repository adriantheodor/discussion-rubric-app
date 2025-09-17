// frontend/src/pages/StudentsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { API } from "../api";

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
    <div>
      <button
        className="btn btn-link mb-3"
        onClick={() => navigate("/classes")}
      >
        ← Back to List of Classes
      </button>
      <h2>Students in Class {classId}</h2>
      <div className="list-group">
    {students.map((s) => (
      <Link
        key={s.userId}
        to={`/classes/${classId}/grade/${s.userId}`}
        className="list-group-item list-group-item-action p-3 fs-5"
      >
        {s.profile?.name?.fullName}
      </Link>
    ))}
  </div>
    </div>
  );
}
