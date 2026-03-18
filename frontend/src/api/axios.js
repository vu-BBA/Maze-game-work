import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://maze-game-backend-mu.vercel.app/api'

const api = axios.create({
  baseURL: `${API_URL}`
})

const adminApi = axios.create({
  baseURL: `${API_URL}`
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      window.location.href = '/signin'
    }
    return Promise.reject(error)
  }
)

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin')
      localStorage.removeItem('adminToken')
      localStorage.removeItem('isAdmin')
      window.location.href = '/admin'
    }
    return Promise.reject(error)
  }
)

export { adminApi }
export default api
