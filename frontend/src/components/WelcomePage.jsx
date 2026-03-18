import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import '../App.css'

function WelcomePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    { name: 'Python', icon: '🐍', color: '#3776ab' },
    { name: 'JavaScript', icon: '⚡', color: '#f7df1e' },
    { name: 'React', icon: '⚛️', color: '#61dafb' },
    { name: 'HTML+CSS', icon: '🎨', color: '#e34f26' },
    { name: 'C++', icon: '🔧', color: '#00599c' }
  ]

  useEffect(() => {
    const fetchUserAndCategory = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/signin')
        return
      }

      try {
        const userResponse = await api.get('/auth/profile')
        setUser(userResponse.data)

        const categoryResponse = await api.get('/game/my-category')
        if (categoryResponse.data.data.selectedCategory) {
          setSelectedCategory(categoryResponse.data.data.selectedCategory)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        if (err.response?.status === 401) {
          localStorage.removeItem('user')
          localStorage.removeItem('token')
          navigate('/signin')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndCategory()
  }, [navigate])

  const handleCategorySelect = (category) => {
    setSelectedCategory(category)
    setError('')
  }

  const handleStartGame = async () => {
    if (!selectedCategory) {
      setError('Please select a category to continue')
      return
    }

    setSaving(true)
    setError('')

    try {
      await api.post('/game/select-category', {
        category: selectedCategory
      })
      navigate('/game')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="welcome-page">
        <div className="welcome-loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-header">
          <h1 className="welcome-title">Welcome, {user?.user?.name || user?.name || 'Player'}!</h1>
          <p className="welcome-subtitle">Choose your learning path to unlock the maze</p>
        </div>

        <div className="category-section">
          <h2 className="category-title">Select Your Topic</h2>
          <p className="category-desc">Answer questions correctly to earn maze keys</p>
          
          <div className="category-grid">
            {categories.map((cat) => (
              <button
                key={cat.name}
                className={`category-card ${selectedCategory === cat.name ? 'selected' : ''}`}
                onClick={() => handleCategorySelect(cat.name)}
                style={{ '--cat-color': cat.color }}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          className="start-game-btn" 
          onClick={handleStartGame}
          disabled={!selectedCategory || saving}
        >
          {saving ? 'Starting...' : 'Start Game'}
        </button>
      </div>
    </div>
  )
}

export default WelcomePage
