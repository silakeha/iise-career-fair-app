import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import MapView from './pages/MapView';
import StudentDashboard from './pages/StudentDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import OrganizerDashboard from './pages/OrganizerDashboard';
import ResumeBook from './pages/ResumeBook';
import FloorPlanConfig from './pages/FloorPlanConfig';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MapView />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/recruiter" element={<RecruiterDashboard />} />
          <Route path="/organizer" element={<OrganizerDashboard />} />
          <Route path="/organizer/floor-plan" element={<FloorPlanConfig />} />
          <Route path="/resume-book" element={<ResumeBook />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;