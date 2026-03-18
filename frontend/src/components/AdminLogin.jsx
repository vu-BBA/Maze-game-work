import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'

function AdminLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/admin/login', formData)
      
      if (response.data.token) {
        localStorage.setItem('admin', JSON.stringify(response.data.user))
        localStorage.setItem('adminToken', response.data.token)
        localStorage.setItem('isAdmin', 'true')
        navigate('/admin-dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Admin Panel</h2>
        <p className="auth-subtitle">Sign in to access admin dashboard</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Admin Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter admin email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing In...' : 'Admin Login'}
          </button>
        </form>
        
        <p className="auth-switch">
          <Link to="/signin">User Login</Link>
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
