import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function StudentGradePage() {
  const { classId, studentId } = useParams();
  const navigate = useNavigate();

  const rubricCategories = ["Preparation", "Engagement", "Critical Thinking"];
  const [scores, setScores] = useState({
    Preparation: null,
    Engagement: null,
    "Critical Thinking": null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const handleScoreSelect = (category, value) => {
    setScores((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    const totalPoints = Object.values(scores).reduce(
      (acc, val) => acc + (val || 0),
      0
    );

    if (totalPoints === 0) {
      setConfirmation("❌ Please select scores for all categories before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("http://localhost:4000/api/grades/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: classId,            // ✅ use classId param
          courseWorkId: "mock-work-123", // ✅ mock ID for testing
          studentId: studentId,
          grade: totalPoints,
        }),
      });

      // Safely handle non-JSON responses
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server returned non-JSON: ${response.statusText}`);
      }

      if (data.success) {
        setConfirmation(`✅ Grade submitted: ${totalPoints}`);
      } else {
        setConfirmation("❌ Failed to submit grade");
      }
    } catch (err) {
      console.error(err);
      setConfirmation("❌ Error while submitting grade");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mt-4">
      <h1 className="rubric-title">Grade Student</h1>
      <p>Student ID: {studentId}</p>

      {rubricCategories.map((category) => (
        <div key={category} style={{ marginBottom: "20px" }}>
          <h3 className="criterion-name">{category.toUpperCase()}</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => handleScoreSelect(category, num)}
                style={{
                  padding: "20px",
                  fontSize: "18px",
                  borderRadius: "8px",
                  border: scores[category] === num ? "3px solid #007bff" : "1px solid #ccc",
                  backgroundColor: scores[category] === num ? "#e6f0ff" : "#fff",
                  cursor: "pointer",
                  flex: "1",
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="submit-btn"
      >
        {submitting ? "Submitting..." : "SUBMIT GRADE"}
      </button>

      {confirmation && (
        <p
          style={{
            marginTop: "15px",
            fontWeight: "bold",
            color: confirmation.includes("✅") ? "green" : "red",
          }}
        >
          {confirmation}
        </p>
      )}

      <button
        onClick={() => navigate(-1)}
        style={{
          marginTop: "20px",
          padding: "10px 15px",
          fontSize: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          backgroundColor: "#f5f5f5",
          cursor: "pointer",
        }}
      >
        ⬅ Back to Class
      </button>
    </div>
  );
}
