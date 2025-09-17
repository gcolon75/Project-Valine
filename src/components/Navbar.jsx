import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="mx-auto container-narrow px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-semibold">Project Valine</Link>
        <nav className="flex items-center gap-3">
          <NavLink to="/about" className="text-gray-600 hover:text-gray-900">About</NavLink>
          {!user && (
            <>
              <NavLink to="/auth/artist" className="text-gray-600 hover:text-gray-900">Become an Artist</NavLink>
              <NavLink to="/auth/observer" className="text-gray-600 hover:text-gray-900">Become an Observer</NavLink>
              <NavLink to="/login" className="btn btn-ghost">Login</NavLink>
            </>
          )}
          {user && (
            <>
              <NavLink to="/dashboard" className="btn btn-ghost">Dashboard</NavLink>
              <button
                className="btn btn-brand"
                onClick={() => { logout(); navigate('/') }}
              >Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
