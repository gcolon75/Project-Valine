// src/pages/Login.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import artistImg from '/assets/login-artist.png';
import observerImg from '/assets/login-seeker.png';

/**
 * Classic marketing-style login:
 * - Same visuals as before (marketing-section, login-options, login-option)
 * - Logic updated:
 *    • if profile incomplete → /setup
 *    • else → /dashboard
 */
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (role) => {
    const email = role === 'artist' ? 'artist@demo.com' : 'observer@demo.com';
    const u = await login(email, '', role);
    if (!u?.profileComplete) {
      navigate('/setup', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div>
      <section className="marketing-section" style={{ textAlign: 'center' }}>
        <h1>Login to Joint</h1>
        <p>Please select your role to continue.</p>
      </section>

      <div className="login-options">
        <div className="login-option">
          <img src={artistImg} alt="Login as Artist" />
          <h3>Login as Artist</h3>
          <button className="btn" onClick={() => handleLogin('artist')}>
            Continue as Artist
          </button>
        </div>

        <div className="login-option">
          <img src={observerImg} alt="Login as Observer" />
          <h3>Login as Observer</h3>
          <button className="btn" onClick={() => handleLogin('observer')}>
            Continue as Observer
          </button>
        </div>
      </div>
    </div>
  );
}
