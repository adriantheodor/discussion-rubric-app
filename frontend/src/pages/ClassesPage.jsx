import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function ClassesPage() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
  fetch("http://localhost:4000/classroom/courses", {
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      console.log("Frontend got:", data);
      // If backend sends an array, just set it directly
      setCourses(Array.isArray(data) ? data : data.courses || []);
    })
    .catch(err => console.error("Error fetching courses:", err));
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
