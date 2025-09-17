import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { AuthProvider } from './context/AuthContext'

import Home from './pages/Home'
import Login from './pages/Login'
import ArtistAuth from './pages/ArtistAuth'
import ObserverAuth from './pages/ObserverAuth'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/artist" element={<ArtistAuth />} />
            <Route path="/auth/observer" element={<ObserverAuth />} />
            <Route path="/about" element={<About />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  )
}
