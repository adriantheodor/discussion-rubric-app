import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function StudentsPage() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:4000/api/classes/${classId}/students`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(console.error);
  }, [classId]);

  return (
    <div>
      <h2>Students</h2>
      <ul>
        {students.map(s => (
          <li key={s.id}>
            <button onClick={() => navigate(`/classes/${classId}/assignments/ASSIGNMENT_ID/grade/${s.id}`)}>
              {s.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StudentsPage;
