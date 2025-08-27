import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClasses } from "../api";

function ClassesPage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
  getClasses().then(data => setCourses(Array.isArray(data) ? data : (data.courses || []))).catch(console.error);
}, []);

  return (
  <div>
    <h2>Your Classes</h2>
    {courses.length === 0 ? (
      <p>No classes found</p>
    ) : (
      <ul>
        {courses.map(course => (
          <li key={course.id}>
            <Link to={`/classes/${course.id}`}>
            <button>{course.name} ({course.section})</button>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);
}

export default ClassesPage;
