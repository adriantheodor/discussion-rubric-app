import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ClassDetailPage() {
  const { id } = useParams(); // grabs /class/:classId
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/students/${id}`, {
          credentials: "include", // send session cookie
        });

        if (!res.ok) throw new Error("Failed to fetch students");

        const data = await res.json();
        console.log("✅ Students API response:", data);

        setStudents(data.students || []);
      } catch (err) {
        console.error("❌ Error fetching students:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [id]);

  if (loading) return <p>Loading students...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>Students in Class</h1>
      {students.length === 0 ? (
        <p>No students found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {students.map((student) => (
            <li key={student.userId} style={{ margin: "10px 0" }}>
              <button
                onClick={() =>
                  navigate(`/class/${id}/student/${student.userId}`)
                }
                style={{
                  padding: "16px",
                  fontSize: "18px",
                  width: "100%",
                  textAlign: "left",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  backgroundColor: "#f9f9f9",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e6f7ff")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f9f9f9")
                }
              >
                {student.profile?.name?.fullName || "Unnamed Student"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
