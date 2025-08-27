import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ClassesPage from './pages/ClassesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import StudentsPage from './pages/StudentsPage';
import GradePage from './pages/GradesPage';
import ClassDetailPage from "./pages/ClassDetailPage"; 
import StudentGradePage from './pages/StudentGradePage';

function App() {
  return (
    <main className="container mt-4">
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:classId/assignments" element={<AssignmentsPage />} />
        <Route path="/classes/:classId/students" element={<StudentsPage />} />
        <Route path="/classes/:classId/assignments/:assignmentId/grade/:studentId" element={<GradePage />} />
        <Route path="/classes/:id" element={<ClassDetailPage />} />
        <Route path="/class/:classId/student/:studentId" element={<StudentGradePage />} />
      </Routes>
    </BrowserRouter>
    </main>
  );
}

export default App;
