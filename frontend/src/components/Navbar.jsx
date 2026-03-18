import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

function Navbar() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const adminToken = localStorage.getItem('adminToken')
    setIsLoggedIn(!!token || !!adminToken)
    setIsAdmin(!!adminToken)
  }, [])

  const handleLogout = () => {
    const adminToken = localStorage.getItem('adminToken')
    
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('isAdmin')
    
    setIsLoggedIn(false)
    setIsAdmin(false)
    navigate('/signin')
  }

  return (
    <nav className="navbar">
      <Link to={isLoggedIn && !isAdmin ? "/welcome" : isAdmin ? "/admin-dashboard" : "/"} className="navbar-logo">Maze Learning</Link>
      <div className="navbar-links">
        {isLoggedIn ? (
          <>
            {isAdmin ? (
              <Link to="/admin-dashboard" className="nav-link">Dashboard</Link>
            ) : (
              <Link to="/welcome" className="nav-link">Home</Link>
            )}
            <Link to={isAdmin ? "/" : "/admin"} className="nav-link">{isAdmin ? 'User Login' : 'Admin Login'}</Link>
            <button onClick={handleLogout} className="nav-link logout-link">Logout</button>
          </>
        ) : (
          <>
            <Link to="/admin" className="nav-link">Admin Login</Link>
            <Link to="/signin" className="nav-link">Sign In</Link>
            <Link to="/signup" className="nav-link cta">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
