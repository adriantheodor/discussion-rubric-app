import { useState } from 'react';
import { useParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

function GradePage() {
  const { classId, assignmentId, studentId } = useParams();
  const [scores, setScores] = useState({ preparation: 0, engagement: 0, criticalThinking: 0 });

  const handleScore = (category, value) => {
    setScores(prev => ({ ...prev, [category]: value }));
  };

  const submitGrade = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId: classId, courseWorkId: assignmentId, studentId, scores })
      });
      const data = await res.json();
      if (data.ok) toast.success(`Grade submitted: ${data.assignedGrade}`);
      else toast.error('Failed to submit grade');
    } catch (e) {
      toast.error('Error submitting grade');
    }
  };

  const renderButtons = (category) => {
    return [1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        style={{ backgroundColor: scores[category] === n ? 'lightblue' : 'white' }}
        onClick={() => handleScore(category, n)}
      >
        {n}
      </button>
    ));
  };

  return (
    <div>
      <h2>Grade Student</h2>
      <div>
        <h3>Preparation</h3>
        {renderButtons('preparation')}
      </div>
      <div>
        <h3>Engagement</h3>
        {renderButtons('engagement')}
      </div>
      <div>
        <h3>Critical Thinking</h3>
        {renderButtons('criticalThinking')}
      </div>
      <button onClick={submitGrade}>Submit Grade</button>
      <Toaster position="top-right" />
    </div>
  );
}

export default GradePage;
