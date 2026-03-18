import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './components/LandingPage'
import SignUp from './components/SignUp'
import SignIn from './components/SignIn'
import AdminLogin from './components/AdminLogin'
import UserDashboard from './components/UserDashboard'
import AdminDashboard from './components/AdminDashboard'
import WelcomePage from './components/WelcomePage'
import MazeGame from './components/MazeGame'
import InstructionPage from './components/InstructionPage'

function App() {
  return (
    <div className="app">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/instructions" element={<InstructionPage />} />
          <Route path="/welcome" element={<ProtectedUserRoute><WelcomePage /></ProtectedUserRoute>} />
          <Route path="/game" element={<ProtectedUserRoute><MazeGame /></ProtectedUserRoute>} />
          <Route path="/user-dashboard" element={<ProtectedUserRoute><UserDashboard /></ProtectedUserRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

function ProtectedUserRoute({ children }) {
  const user = localStorage.getItem('user')
  if (!user) {
    return <Navigate to="/signin" />
  }
  return children
}

function ProtectedAdminRoute({ children }) {
  const isAdmin = localStorage.getItem('isAdmin')
  if (isAdmin !== 'true') {
    return <Navigate to="/admin" />
  }
  return children
}

export default App
