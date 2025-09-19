// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ClassesPage from "./pages/ClassesPage";
import StudentsPage from "./pages/StudentsPage";
import GradePage from "./pages/GradePage";

function App() {
  return (
    <main className="container mt-4">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/:classId" element={<StudentsPage />} />
          <Route
            path="/classes/:classId/grade/:studentId"
            element={<GradePage />}
          />
        </Routes>
      </BrowserRouter>
    </main>
  );
}

export default App;
