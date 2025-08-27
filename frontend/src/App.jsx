import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ClassesPage from './pages/ClassesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import StudentsPage from './pages/StudentsPage';
import GradePage from './pages/GradePage';
import ClassDetailPage from "./pages/ClassDetailPage"; 


function App() {
  return (
    <main className="container mt-4">
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/classes/:classId/assignments" element={<AssignmentsPage />} />
        <Route path="/classes/:classId/assignments/:assignmentId" element={<AssignmentDetailPage />} />
        <Route
          path="/classes/:classId/assignments/:assignmentId/grade/:studentId"
          element={<GradePage />}
        />
      </Routes>
    </BrowserRouter>
    </main>
  );
}

export default App;
