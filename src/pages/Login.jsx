import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import artistImg from '/assets/login-artist.png';
import observerImg from '/assets/login-observer.png';

/**
 * Login page with role selection. Presents two options: login as
 * Artist or as Observer. Selecting an option invokes the AuthContext
 * login function with the appropriate role and redirects the user to
 * the feed (dashboard). This page uses marketing styling.
 */
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (role) => {
    // Use demo credentials for login. The server will create or
    // return a user with this email and role.
    const email = role === 'artist' ? 'artist@demo.com' : 'observer@demo.com';
    const u = await login(email, '', role);
    // If the user has not completed their profile, send them to the
    // onboarding wizard. Otherwise go straight to the feed.
    if (!u.profileComplete) {
      navigate('/setup');
    } else {
      navigate('/feed');
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
          <img
            src={artistImg}
            alt="Login as Artist"
            className="login-image"
          />
          <h3>Login as Artist</h3>
          <button
            className="btn primary"
            onClick={() => handleLogin('artist')}
          >
            Continue as Artist
          </button>
        </div>
        <div className="login-option">
          <img
            src={observerImg}
            alt="Login as Observer"
            className="login-image"
          />
          <h3>Login as Observer</h3>
          <button
            className="btn primary"
            onClick={() => handleLogin('observer')}
          >
            Continue as Observer
          </button>
        </div>
      </div>
    </div>
  );
}