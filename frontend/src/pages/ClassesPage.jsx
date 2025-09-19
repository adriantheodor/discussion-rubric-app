// frontend/src/pages/ClassesPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getClasses, logout } from "../api";
import "./ClassesPage.css";

function ClassesPage() {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getClasses()
      .then((data) =>
        setCourses(Array.isArray(data) ? data : data.courses || [])
      )
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/"); // go back to login page
  };

  return (
    <div className="classes-container">
      <div className="header-row">
        <h2 className="page-title">Your Classes</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {courses.length === 0 ? (
        <p className="empty-message">No classes found</p>
      ) : (
        <ul className="classes-list">
          {courses.map((course) => (
            <li key={course.id}>
              <Link to={`/classes/${course.id}`} className="class-button">
                {course.name} {course.section ? `(${course.section})` : ""}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClassesPage;
