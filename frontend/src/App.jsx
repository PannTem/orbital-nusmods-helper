import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Timetable from './pages/Timetable.jsx'
import Timer from './pages/Timer.jsx'
import StudyPlan from './pages/StudyPlan.jsx'
import ModuleAnalysis from './pages/ModuleAnalysis.jsx'
import SharedTimetable from './pages/SharedTimetable.jsx'
import Compare from './pages/Compare.jsx'
import CourseReg from './pages/CourseReg.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Friends from './pages/Friends.jsx'

export function getUserId() {
  const user = localStorage.getItem('user')
  if (!user) return null
  return JSON.parse(user).user_id
}

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('user')
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/shared/:token" element={<SharedTimetable />} />
      <Route path="*" element={
        <ProtectedRoute>
          <Navbar />
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/timer"     element={<Timer />} />
            <Route path="/studyplan" element={<StudyPlan />} />
            <Route path="/analysis"  element={<ModuleAnalysis />} />
            <Route path="/compare"   element={<Compare />} />
            <Route path="/coursereg" element={<CourseReg />} />
            <Route path="/profile"   element={<Profile />} />
            <Route path="/friends"   element={<Friends />} />
          </Routes>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
