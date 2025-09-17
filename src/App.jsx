import { Routes, Route } from 'react-router-dom'

// adjust these to match your actual files in src/pages
import Home from '@/pages/Home.jsx'
import Login from '@/pages/Login.jsx'
import ArtistAuth from '@/pages/ArtistAuth.jsx'      // or '@/pages/auth/ArtistAuth.jsx'
import ObserverAuth from '@/pages/ObserverAuth.jsx'  // or '@/pages/auth/ObserverAuth.jsx'
import AuthCallback from '@/pages/AuthCallback.jsx'  // if you have a callback page

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/artist" element={<ArtistAuth />} />
      <Route path="/auth/observer" element={<ObserverAuth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<div>Not Found</div>} />
    </Routes>
  )
}
