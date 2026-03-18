import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import '../App.css'

function MazeGame() {
  const navigate = useNavigate()
  const [gameState, setGameState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQuestion, setShowQuestion] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [answering, setAnswering] = useState(false)
  const [gameWon, setGameWon] = useState(false)
  const [message, setMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [nearbyLock, setNearbyLock] = useState(null)
  const [pendingKeyInfo, setPendingKeyInfo] = useState(null)
  const [questionsSolved, setQuestionsSolved] = useState(0)
  const [questionsFailed, setQuestionsFailed] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [gameResult, setGameResult] = useState(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const categoryToTopic = {
    'Python': 'python',
    'JavaScript': 'javascript',
    'React': 'react',
    'HTML+CSS': 'html_css',
    'C++': 'cpp'
  }

  const startNewGame = useCallback(async () => {
    setLoading(true)
    setError('')
    setGameWon(false)
    setMessage('')
    setNearbyLock(null)

    try {
      const categoryResponse = await api.get('/game/my-category')
      const category = categoryResponse.data.data.selectedCategory || 'Python'
      const topic = categoryToTopic[category] || 'python'

      const response = await api.post('/maze/start', {
        difficulty: 'medium',
        category
      })

      setGameState({
        ...response.data.data,
        topic: topic
      })
      startTimeRef.current = Date.now()
      setTimeLeft(0)
      setMessage('Use arrow keys to move. Collect keys and reach the exit!')
      
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTimeLeft(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (err) {
      console.error('Start game error:', err)
      setError(err.response?.data?.message || 'Failed to start game')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/signin')
      return
    }
    startNewGame()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [navigate, startNewGame])

  const checkNearbyLock = useCallback((maze, playerPos) => {
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 }
    ]

    for (const dir of directions) {
      const newX = playerPos.x + dir.x
      const newY = playerPos.y + dir.y
      if (maze[newY] && maze[newY][newX]) {
        const cell = maze[newY][newX]
        if (cell.type === 'lock' && !cell.unlocked) {
          return {
            position: { x: newX, y: newY },
            requiredKeys: cell.requiredKeys
          }
        }
      }
    }
    return null
  }, [])

  const openGate = useCallback(async () => {
    if (!gameState || !nearbyLock) return
    if (gameState.player.keysCollected < nearbyLock.requiredKeys) {
      setMessage(`Need ${nearbyLock.requiredKeys} key(s) to open. You have ${gameState.player.keysCollected}`)
      return
    }

    try {
      const response = await api.post('/maze/open-gate', {
        gatePosition: nearbyLock.position,
        currentKeys: gameState.player.keysCollected
      })

      if (response.data.success) {
        const updatedMaze = [...gameState.maze]
        const lockCell = updatedMaze[nearbyLock.position.y][nearbyLock.position.x]
        updatedMaze[nearbyLock.position.y][nearbyLock.position.x] = {
          ...lockCell,
          type: 'path',
          unlocked: true
        }

        setGameState({
          ...gameState,
          maze: updatedMaze,
          player: {
            ...gameState.player,
            keysCollected: response.data.data.remainingKeys
          }
        })
        setMessage(response.data.message)
        setNearbyLock(null)
      }
    } catch (err) {
      console.error('Open gate error:', err)
    }
  }, [gameState, nearbyLock])

  const movePlayer = useCallback(async (direction) => {
    if (!gameState || gameWon) return

    try {
      const response = await api.post('/maze/move', {
        direction,
        currentMaze: gameState.maze,
        playerState: {
          position: gameState.player.position,
          keysCollected: gameState.player.keysCollected,
          keysInventory: gameState.player.keysInventory,
          moves: gameState.player.moves
        }
      })

      const newData = response.data.data
      const updatedMaze = gameState.maze.map(row => [...row])
      const prevCell = updatedMaze[gameState.player.position.y][gameState.player.position.x]
      
      if (prevCell?.type === 'key') {
        updatedMaze[gameState.player.position.y][gameState.player.position.x] = {
          ...prevCell,
          type: 'path',
          keyCollected: true
        }
      }

      if (newData.lockUnlocked) {
        const lockCell = updatedMaze[newData.position.y][newData.position.x]
        if (lockCell?.type === 'lock') {
          updatedMaze[newData.position.y][newData.position.x] = {
            ...lockCell,
            type: 'path',
            unlocked: true
          }
        }
      }

      const newPosition = newData.position
      const nearby = checkNearbyLock(updatedMaze, newPosition)
      setNearbyLock(nearby)

      setGameState({
        ...gameState,
        maze: updatedMaze,
        player: {
          position: newPosition,
          keysCollected: newData.keysCollected,
          keysInventory: newData.keysInventory,
          moves: newData.moves
        }
      })

      setMessage(response.data.message)

      if (newData.needsQuestion && newData.keyInfo) {
        setPendingKeyInfo(newData.keyInfo)
        fetchQuestion()
      } else if (newData.keyCollected) {
        fetchQuestion()
      }

      if (newData.gameWon) {
        setGameWon(true)
        if (timerRef.current) clearInterval(timerRef.current)
        
        const result = {
          topic: gameState.gameConfig.category,
          topicKey: gameState.topic,
          difficulty: gameState.gameConfig.difficulty,
          keysCollected: newData.keysCollected,
          keysUsed: gameState.keys ? gameState.keys.length - newData.keysCollected : 0,
          questionsSolved,
          questionsFailed,
          totalQuestions,
          moves: newData.moves,
          timeSpent: timeLeft,
          completed: true
        }
        
        setGameResult(result)
        saveGameResult(result)
        setMessage(`🎉 Victory! Time: ${timeLeft} seconds`)
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message)
      }
    }
  }, [gameState, gameWon, checkNearbyLock, timeLeft, questionsSolved, questionsFailed, totalQuestions])

  const fetchQuestion = async () => {
    try {
      const topic = gameState?.topic || 'python'
      const response = await api.get(`/questions/random/${topic}`)
      setCurrentQuestion(response.data.data)
      setShowQuestion(true)
    } catch (err) {
      console.error('Get question error:', err)
      setMessage('No questions available. Key collected!')
    }
  }

  const submitAnswer = async (answerIndex) => {
    if (!currentQuestion || answering) return

    setAnswering(true)
    try {
      const topic = gameState?.topic || 'python'
      const payload = {
        topic,
        questionId: currentQuestion._id,
        answer: answerIndex
      }

      if (currentQuestion.type === 'DEBUGGING') {
        payload.lineNumber = answerIndex.lineNumber
        payload.errorType = answerIndex.errorType
      }

      const response = await api.post('/questions/validate', payload)

      const result = response.data.data
      setMessage(result.message)

      if (result.isCorrect && pendingKeyInfo) {
        setQuestionsSolved(prev => prev + 1)
        const updatedMaze = [...gameState.maze]
        const keyPos = pendingKeyInfo.position
        if (updatedMaze[keyPos.y] && updatedMaze[keyPos.y][keyPos.x]) {
          updatedMaze[keyPos.y][keyPos.x] = {
            ...updatedMaze[keyPos.y][keyPos.x],
            type: 'path',
            keyCollected: true
          }
        }
        setGameState(prev => ({
          ...prev,
          maze: updatedMaze,
          player: {
            ...prev.player,
            position: keyPos,
            keysCollected: prev.player.keysCollected + result.rewardKeys,
            keysInventory: [...prev.player.keysInventory, { keyId: pendingKeyInfo.keyId, keyValue: pendingKeyInfo.keyValue }]
          }
        }))
        setPendingKeyInfo(null)
      } else if (result.isCorrect) {
        setQuestionsSolved(prev => prev + 1)
        setGameState(prev => ({
          ...prev,
          player: {
            ...prev.player,
            keysCollected: prev.player.keysCollected + result.rewardKeys,
            keysInventory: [...prev.player.keysInventory, { keyId: `bonus_${Date.now()}`, keyValue: result.rewardKeys }]
          }
        }))
      } else {
        setQuestionsFailed(prev => prev + 1)
      }
    } catch (err) {
      console.error('Submit answer error:', err)
    } finally {
      setAnswering(false)
      setShowQuestion(false)
      setCurrentQuestion(null)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showQuestion) return

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (nearbyLock) {
          openGate()
        }
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          movePlayer('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          movePlayer('down')
          break
        case 'ArrowLeft':
          e.preventDefault()
          movePlayer('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          movePlayer('right')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [movePlayer, showQuestion, nearbyLock, openGate])

  const handleLogout = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    navigate('/signin')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const saveGameResult = async (result) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      await api.post('/maze/save-result', {
        userId: user?.id,
        ...result
      })
    } catch (err) {
      console.error('Error saving game result:', err)
    }
  }

  const downloadResult = () => {
    if (!gameResult) return
    
    const user = JSON.parse(localStorage.getItem('user'))
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = 600
    canvas.height = 500
    
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
    gradient.addColorStop(0, '#1a1a2e')
    gradient.addColorStop(1, '#16213e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('🎉 MAZE GAME RESULTS 🎉', canvas.width / 2, 50)
    
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(50, 70)
    ctx.lineTo(550, 70)
    ctx.stroke()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'left'
    
    const score = (gameResult.keysCollected * 10) + (gameResult.questionsSolved * 5) + Math.max(0, 100 - gameResult.timeSpent)
    const lines = [
      { label: 'Player:', value: user?.name || 'Player' },
      { label: 'Email:', value: user?.email || 'N/A' },
      { label: '', value: '' },
      { label: 'Topic:', value: gameResult.topic },
      { label: 'Difficulty:', value: gameResult.difficulty },
      { label: '', value: '' },
      { label: '⏱️ Time Spent:', value: formatTime(gameResult.timeSpent) },
      { label: '🔑 Keys Collected:', value: gameResult.keysCollected.toString() },
      { label: '🚪 Keys Used:', value: gameResult.keysUsed.toString() },
      { label: '✅ Questions Solved:', value: gameResult.questionsSolved.toString() },
      { label: '❌ Questions Failed:', value: gameResult.questionsFailed.toString() },
      { label: '👣 Total Moves:', value: gameResult.moves.toString() },
      { label: '', value: '' },
      { label: '🎯 SCORE:', value: score.toString() }
    ]
    
    let y = 120
    lines.forEach(line => {
      if (line.label === '' && line.value === '') {
        y += 15
        return
      }
      ctx.fillStyle = '#888888'
      ctx.font = '18px Arial'
      ctx.fillText(line.label, 80, y)
      
      if (line.label === '🎯 SCORE:') {
        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 24px Arial'
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.font = '18px Arial'
      }
      ctx.fillText(line.value, 280, y)
      y += 28
    })
    
    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Played on: ${new Date().toLocaleDateString()}`, canvas.width / 2, canvas.height - 30)
    
    const link = document.createElement('a')
    link.download = `maze-result-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const playAgain = () => {
    setGameWon(false)
    setGameResult(null)
    setQuestionsSolved(0)
    setQuestionsFailed(0)
    setTotalQuestions(0)
    startNewGame()
  }

  const renderCell = (cell, x, y) => {
    const isPlayer = gameState?.player?.position?.x === x && gameState?.player?.position?.y === y
    
    let cellClass = 'maze-cell '
    
    if (isPlayer) {
      cellClass += 'player'
    } else {
      switch (cell?.type) {
        case 'wall':
          cellClass += 'wall'
          break
        case 'path':
        case 'start':
          cellClass += 'path'
          break
        case 'key':
          cellClass += 'key'
          break
        case 'lock':
          cellClass += 'lock'
          break
        case 'exit':
          cellClass += 'exit'
          break
        default:
          cellClass += 'path'
      }
    }

    return (
      <div key={`${x}-${y}`} className={cellClass}>
        {isPlayer && <img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMTYzcnN1MGVrN284aGo5NjYxNm11Ym1jNWdkZGtzNmt4cXNhN3YzbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1NltK80nK7Y5KTpuqB/giphy.gif" alt="player" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='block'}} />}
        {isPlayer && <span className="player-emoji" style={{display: 'none'}}>🧙</span>}
        {!isPlayer && cell?.type === 'key' && <span className="key-icon">🔑</span>}
        {!isPlayer && cell?.type === 'lock' && !cell?.unlocked && <span className="lock-icon">🔒</span>}
        {!isPlayer && cell?.type === 'lock' && cell?.unlocked && <span className="lock-open-icon">🔓</span>}
        {!isPlayer && cell?.type === 'exit' && <span className="exit-icon">🚪</span>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="game-container">
        <div className="game-loading">Loading Maze...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="game-container">
        <div className="game-error">{error}</div>
        <button onClick={startNewGame} className="game-btn">Try Again</button>
      </div>
    )
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <div className="game-title">Maze Adventure</div>
      </div>

      <div className="game-content">
        <div className="game-sidebar">
          <div className="game-stats">
            <h3>Game Stats</h3>
            <div className="stat-item">
              <span className="stat-label">Category:</span>
              <span className="stat-value">{gameState?.gameConfig?.category}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Difficulty:</span>
              <span className="stat-value">{gameState?.gameConfig?.difficulty}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Time:</span>
              <span className="stat-value timer">{formatTime(timeLeft)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Keys:</span>
              <span className="stat-value keys-count">🔑 {gameState?.player?.keysCollected || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Moves:</span>
              <span className="stat-value">{gameState?.player?.moves || 0}</span>
            </div>
          </div>

          {nearbyLock && (
            <div className="gate-info">
              <p>🔒 Gate nearby! Need {nearbyLock.requiredKeys} key(s)</p>
              <p className="gate-hint">Press SPACE to open</p>
            </div>
          )}

          <div className="game-message">
            {message}
          </div>

          <button onClick={startNewGame} className="game-btn">New Game</button>
          
          <div className="game-controls desktop-only">
            <p>Arrow keys to move</p>
            <p>Space to open gate</p>
          </div>
        </div>

        <div className="maze-container">
          <div 
            className="maze-grid"
            style={{ 
              gridTemplateColumns: `repeat(${gameState?.maze?.[0]?.length || 10}, 1fr)` 
            }}
          >
            {gameState?.maze?.map((row, y) =>
              row.map((cell, x) => renderCell(cell, x, y))
            )}
          </div>
        </div>

        <div className="mobile-controls mobile-only game-mobile-controls">
          <div className="control-row">
            <button className="control-btn" onClick={() => movePlayer('up')}>⬆️</button>
          </div>
          <div className="control-row">
            <button className="control-btn" onClick={() => movePlayer('left')}>⬅️</button>
            <button className="control-btn" onClick={() => movePlayer('down')}>⬇️</button>
            <button className="control-btn" onClick={() => movePlayer('right')}>➡️</button>
          </div>
          {nearbyLock && (
            <button className="control-btn gate-btn" onClick={openGate}>🔓 Open Gate</button>
          )}
        </div>
      </div>

      {showQuestion && currentQuestion && (
        <div className="question-overlay">
          <div className="question-modal">
            <div className="question-header">
              <span className="question-type">{currentQuestion.type}</span>
              <span className="question-reward">🔑 {currentQuestion.rewardKeys} keys</span>
            </div>
            <h3 className="question-title">Solve to Earn Keys!</h3>
            
            {currentQuestion.codeSnippet && (
              <pre className="code-snippet">{currentQuestion.codeSnippet}</pre>
            )}
            
            <p className="question-text">{currentQuestion.questionText || currentQuestion.question}</p>
            
            {currentQuestion.type === 'QUIZ' && currentQuestion.options && (
              <div className="question-options">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    className="question-option"
                    onClick={() => submitAnswer(index)}
                    disabled={answering}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            
            {(currentQuestion.type === 'CODING' || currentQuestion.type === 'INTERACTIVE_SCENARIO') && (
              <div className="question-input">
                <input
                  type="text"
                  placeholder="Type your answer..."
                  id="answer-input"
                  autoFocus
                />
                <button 
                  className="submit-answer-btn"
                  onClick={() => {
                    const input = document.getElementById('answer-input')
                    submitAnswer(input.value)
                  }}
                  disabled={answering}
                >
                  Submit
                </button>
              </div>
            )}
            
            {currentQuestion.type === 'DEBUGGING' && (
              <div className="debugging-options">
                <p className="debug-hint">Select the error line and type:</p>
                <select id="error-line" className="debug-select">
                  <option value="1">Line 1</option>
                  <option value="2">Line 2</option>
                  <option value="3">Line 3</option>
                </select>
                <select id="error-type" className="debug-select">
                  <option value="syntax">Syntax Error</option>
                  <option value="logical">Logical Error</option>
                  <option value="runtime">Runtime Error</option>
                </select>
                <button 
                  className="submit-answer-btn"
                  onClick={() => {
                    const line = document.getElementById('error-line').value
                    const type = document.getElementById('error-type').value
                    submitAnswer({ lineNumber: parseInt(line), errorType: type })
                  }}
                  disabled={answering}
                >
                  Submit
                </button>
              </div>
            )}
            
            {currentQuestion.isSharpShooter && (
              <div className="sharp-shooter-timer">
                ⏱️ Hurry! {currentQuestion.timeLimit}s remaining!
              </div>
            )}
          </div>
        </div>
      )}

      {gameWon && (
        <div className="question-overlay">
          <div className="question-modal victory-modal">
            <h2 className="victory-title">🎉 Congratulations! 🎉</h2>
            <p className="victory-text">{JSON.parse(localStorage.getItem('user'))?.name || 'Player'}, You escaped the maze!</p>
            <div className="victory-details">
              <div className="detail-row">
                <span className="detail-label">Topic:</span>
                <span className="detail-value">{gameResult?.topic}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Difficulty:</span>
                <span className="detail-value">{gameResult?.difficulty}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">⏱️ Time:</span>
                <span className="detail-value">{formatTime(gameResult?.timeSpent || timeLeft)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🔑 Keys Collected:</span>
                <span className="detail-value">{gameResult?.keysCollected}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🚪 Keys Used:</span>
                <span className="detail-value">{gameResult?.keysUsed}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">✅ Questions Solved:</span>
                <span className="detail-value">{gameResult?.questionsSolved}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">❌ Questions Failed:</span>
                <span className="detail-value">{gameResult?.questionsFailed}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">👣 Total Moves:</span>
                <span className="detail-value">{gameResult?.moves}</span>
              </div>
              <div className="detail-row highlight">
                <span className="detail-label">🎯 Score:</span>
                <span className="detail-value">{(gameResult?.keysCollected * 10) + (gameResult?.questionsSolved * 5) + Math.max(0, 100 - (gameResult?.timeSpent || 0))}</span>
              </div>
            </div>
            <div className="victory-buttons">
              <button onClick={downloadResult} className="game-btn download-btn">📥 Download Result</button>
              <button onClick={playAgain} className="game-btn">Play Again</button>
              <button onClick={() => navigate('/welcome')} className="game-btn secondary">Back to Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MazeGame
