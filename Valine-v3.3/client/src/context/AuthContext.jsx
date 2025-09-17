import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('valine_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me').then(({ data }) => {
      setUser(data.user)
    }).catch(() => {
      localStorage.removeItem('valine_token')
    }).finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('valine_token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('valine_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
