import React from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function InstructionPage() {
  return (
    <div className="instruction-page">
      <div className="instruction-container">
        <h1 className="instruction-title">🎮 How to Play Maze Learning Game</h1>
        
        <div className="instruction-section">
          <h2>🎯 Objective</h2>
          <p>Navigate through the maze, collect keys by answering questions, and reach the exit before time runs out!</p>
        </div>

        <div className="instruction-section">
          <h2>🏁 Getting Started</h2>
          <ol>
            <li>Sign up or sign in to your account</li>
            <li>Select your preferred topic (Python, JavaScript, React, HTML+CSS, or C++)</li>
            <li>Click "Start Game" to begin your maze adventure</li>
          </ol>
        </div>

        <div className="instruction-section">
          <h2>🕹️ Controls</h2>
          <ul>
            <li><strong>Arrow Keys</strong> - Move your character through the maze</li>
            <li><strong>Space Bar</strong> - Open locked gates when you have enough keys</li>
          </ul>
        </div>

        <div className="instruction-section">
          <h2>🔑 Collecting Keys</h2>
          <ul>
            <li>Move to a key position to trigger a question</li>
            <li>Answer the question correctly to collect the key</li>
            <li>Wrong answers will add time to your clock (+5 seconds)</li>
            <li>Correct answers reduce time (-5 seconds)</li>
          </ul>
        </div>

        <div className="instruction-section">
          <h2>🔒 Unlocking Gates</h2>
          <ul>
            <li>Gates require a certain number of keys to open</li>
            <li>When near a gate, press Space to open it</li>
            <li>Keys used for gates are consumed</li>
          </ul>
        </div>

        <div className="instruction-section">
          <h2>📝 Question Types</h2>
          <div className="question-types">
            <div className="q-type">
              <span className="q-icon">📝</span>
              <span className="q-name">QUIZ</span>
              <span className="q-reward">2 Keys</span>
            </div>
            <div className="q-type">
              <span className="q-icon">💻</span>
              <span className="q-name">CODING</span>
              <span className="q-reward">3 Keys</span>
            </div>
            <div className="q-type">
              <span className="q-icon">🎯</span>
              <span className="q-name">INTERACTIVE</span>
              <span className="q-reward">4 Keys</span>
            </div>
            <div className="q-type">
              <span className="q-icon">🐛</span>
              <span className="q-name">DEBUGGING</span>
              <span className="q-reward">5 Keys</span>
            </div>
          </div>
        </div>

        <div className="instruction-cta">
          <Link to="/signup" className="instruction-btn">Get Started</Link>
          <Link to="/signin" className="instruction-btn secondary">Sign In</Link>
        </div>
      </div>
    </div>
  )
}

export default InstructionPage
