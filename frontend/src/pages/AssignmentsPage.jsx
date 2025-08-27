import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function AssignmentsPage() {
  const { classId } = useParams();
  const [assignments, setAssignments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:4000/api/classes/${classId}/assignments`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAssignments(data))
      .catch(console.error);
  }, [classId]);

  return (
    <div>
      <h2>Assignments</h2>
      <ul>
        {assignments.map(a => (
          <li key={a.id}>
            <button onClick={() => navigate(`/classes/${classId}/students`)}>
              {a.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AssignmentsPage;
