import React from 'react'
import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div className="landing">
      <h1 className="landing-title">Welcome to Online Maze Game for Learning</h1>
      <p className="landing-subtitle">
        Challenge your mind with exciting maze puzzles. 
        Learn, play, and compete with players worldwide!
      </p>
      <div className="landing-buttons">
        <Link to="/signup" className="landing-btn primary">Get Started</Link>
        <Link to="/signin" className="landing-btn secondary">Sign In</Link>
        <Link to="/instructions" className="landing-btn info">How to Play</Link>
      </div>
    </div>
  )
}

export default LandingPage
