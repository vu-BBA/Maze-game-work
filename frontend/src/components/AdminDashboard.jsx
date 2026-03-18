import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi as api } from '../api/axios'
import './AdminDashboard.css'

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('questions')
  const [stats, setStats] = useState({
    totalQuestions: 0,
    questionCounts: {},
    totalUsers: 0,
    totalSessions: 0,
    completedSessions: 0,
    totalGamesPlayed: 0,
    completedGames: 0,
    activePlayers: 0,
    averageTime: '0m'
  })
  const [seeding, setSeeding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('isAdmin')
    navigate('/admin')
  }

  const handleSeedQuestions = async () => {
    if (!window.confirm('This will add sample questions to the database. Continue?')) return
    
    setSeeding(true)
    try {
      const response = await api.post('/questions/seed')
      const { total, byTopic } = response.data.data
      const topicDetails = Object.entries(byTopic).map(([t, c]) => `${t}: ${c}`).join(', ')
      alert(`Successfully seeded ${total} questions!\n${topicDetails}`)
      fetchStats()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to seed questions')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="admin-logout">Logout</button>
      </div>

      <div className="admin-nav">
        <button 
          className={`nav-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Question Management
        </button>
        <button 
          className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Player Analytics
        </button>
        <button 
          className={`nav-btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          User Results
        </button>
      </div>

      {!loading && (
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalQuestions}</span>
              <span className="stat-label">Total Questions</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalUsers}</span>
              <span className="stat-label">Total Users Registered</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-info">
              <span className="stat-value">{stats.completedGames || 0}</span>
              <span className="stat-label">Games Completed</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🟢</div>
            <div className="stat-info">
              <span className="stat-value">{stats.activePlayers}</span>
              <span className="stat-label">Active Players</span>
            </div>
          </div>
        </div>
      )}

      <div className="admin-content">
        {activeTab === 'questions' && (
          <QuestionManagement 
            onSeedQuestions={handleSeedQuestions} 
            seeding={seeding} 
            refreshStats={fetchStats}
          />
        )}
        {activeTab === 'analytics' && <PlayerAnalytics />}
        {activeTab === 'results' && <UserResults />}
      </div>
    </div>
  )
}

function PlayerAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/admin/stats')
      setAnalytics(response.data.data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading analytics...</div>

  return (
    <div className="player-analytics">
      <h2>Player Analytics</h2>
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Game Completion Rate</h3>
          <div className="analytics-value">
            {analytics.totalGamesPlayed > 0 
              ? Math.round((analytics.completedGames / analytics.totalGamesPlayed) * 100)
              : 0}%
          </div>
          <p>{analytics.completedGames} of {analytics.totalGamesPlayed} games completed</p>
        </div>
        <div className="analytics-card">
          <h3>Average Play Time</h3>
          <div className="analytics-value">{analytics.averageTime || '0m'}</div>
          <p>Mean time per game</p>
        </div>
        <div className="analytics-card">
          <h3>Questions by Topic</h3>
          <div className="topic-breakdown">
            {Object.entries(analytics.questionCounts || {}).map(([topic, count]) => (
              <div key={topic} className="topic-row">
                <span className="topic-name">{topic}</span>
                <span className="topic-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="analytics-card">
          <h3>Player Activity</h3>
          <div className="analytics-value">{analytics.activePlayers}</div>
          <p>Active players this period</p>
        </div>
      </div>
    </div>
  )
}

function UserResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTopic, setFilterTopic] = useState('all')

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const response = await api.get('/maze/results')
      setResults(response.data.data)
    } catch (err) {
      console.error('Error fetching results:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredResults = filterTopic === 'all' 
    ? results 
    : results.filter(r => r.topic === filterTopic)

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (loading) return <div className="loading">Loading results...</div>

  return (
    <div className="user-results">
      <h2>User Results</h2>
      <div className="results-filters">
        <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
          <option value="all">All Topics</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="react">React</option>
          <option value="html_css">HTML+CSS</option>
          <option value="cpp">C++</option>
        </select>
      </div>
      <div className="results-table">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Topic</th>
              <th>Keys</th>
              <th>Solved</th>
              <th>Failed</th>
              <th>Moves</th>
              <th>Time</th>
              <th>Score</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map(result => (
              <tr key={result._id}>
                <td>{result.userName}</td>
                <td>{result.topic}</td>
                <td>{result.keysCollected}</td>
                <td>{result.questionsSolved}</td>
                <td>{result.questionsFailed}</td>
                <td>{result.moves}</td>
                <td>{formatTime(result.timeSpent)}</td>
                <td>{result.score}</td>
                <td>{result.completed ? 'Completed' : 'Incomplete'}</td>
                <td>{new Date(result.playedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredResults.length === 0 && (
          <p className="no-results">No results found</p>
        )}
      </div>
    </div>
  )
}

function QuestionManagement({ onSeedQuestions, seeding, refreshStats }) {
  const [questions, setQuestions] = useState([])
  const [filterTopic, setFilterTopic] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)

  useEffect(() => {
    fetchQuestions()
  }, [filterTopic, filterType])

  const fetchQuestions = async () => {
    try {
      const params = {}
      if (filterTopic !== 'all') params.topic = filterTopic
      if (filterType !== 'all') params.type = filterType
      
      const response = await api.get('/admin/questions', { params })
      
      if (filterTopic === 'all') {
        const allQuestions = []
        Object.entries(response.data.data).forEach(([topic, topicQuestions]) => {
          topicQuestions.forEach(q => {
            allQuestions.push({ ...q, topic })
          })
        })
        setQuestions(allQuestions)
      } else {
        setQuestions(response.data.data)
      }
    } catch (err) {
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, topic) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return
    
    try {
      await api.delete(`/admin/questions/${topic}/${id}`)
      setQuestions(questions.filter(q => q._id !== id))
      refreshStats()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete question')
    }
  }

  const filteredQuestions = filterTopic === 'all' && filterType === 'all' 
    ? questions 
    : questions.filter(q => {
        if (filterTopic !== 'all' && q.topic !== filterTopic) return false
        if (filterType !== 'all' && q.type !== filterType) return false
        return true
      })

  return (
    <div className="question-management">
      <div className="qm-header">
        <h2>Question Management</h2>
        <div className="qm-actions">
          <button 
            className="seed-btn" 
            onClick={onSeedQuestions}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : 'Seed Questions'}
          </button>
        </div>
      </div>

      <div className="filters">
        <select 
          value={filterTopic} 
          onChange={(e) => setFilterTopic(e.target.value)}
        >
          <option value="all">All Topics</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="react">React</option>
          <option value="html_css">HTML+CSS</option>
          <option value="cpp">C++</option>
        </select>

        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="QUIZ">QUIZ</option>
          <option value="CODING">CODING</option>
          <option value="INTERACTIVE_SCENARIO">INTERACTIVE</option>
          <option value="DEBUGGING">DEBUGGING</option>
          <option value="SHARP_SHOOTER">SHARP_SHOOTER</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading questions...</div>
      ) : (
        <div className="questions-table">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Type</th>
                <th>Question</th>
                <th>Difficulty</th>
                <th>Keys</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map(q => (
                <tr key={q._id}>
                  <td>{q.topic}</td>
                  <td>{q.type}</td>
                  <td className="question-text">{q.questionText?.substring(0, 50)}...</td>
                  <td>{q.difficulty}</td>
                  <td>{q.rewardKeys}</td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDelete(q._id, q.topic)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
