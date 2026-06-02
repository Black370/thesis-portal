import { useState, useEffect } from 'react';
import { apiFetch } from './api';
import { AdminDash, ProfessorDash, StudentDash } from './Dashboards';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [db, setDb] = useState({ users: [], classes: [], topics: [], classAccess: [], registrations: [] });
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadData = async () => {
    try {
      const data = await apiFetch('/api/data', 'GET');
      setDb(data);
    } catch (e) {
      console.error(e);
      handleLogout();
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedSession = localStorage.getItem('hustUserProfile');
      if (savedSession) {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        await loadData();
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const data = await apiFetch('/api/login', 'POST', { username, password });
      setCurrentUser(data.user);
      localStorage.setItem('hustUserProfile', JSON.stringify(data.user));
      await loadData();
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("Gateway")) {
        setLoginError('Server is initializing cloud database connections. Please click Sign In again.');
      } else {
        setLoginError(err.message || 'Invalid credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiFetch('/api/logout', 'POST');
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      setCurrentUser(null);
      setDb({ users: [], classes: [], topics: [], classAccess: [], registrations: [] });
      localStorage.removeItem('hustUserProfile');
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div id="loading-screen" className="login-wrapper">
          <div className="login-hero-container" style={{ maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
            <h2 style={{ border: 'none', marginTop: '0' }}>Waking up server...</h2>
            <p style={{ color: '#555' }}>Please wait for cloud database containers to initialize.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container">
        <div id="login-view" className="login-wrapper">
          <div className="login-hero-container">
            <div className="login-hero-header">
              <h1>Graduation Thesis Portal</h1>
              <p>University Academic System</p>
            </div>
            <div className="login-hero-body">
              <form className="classic-login-box" onSubmit={handleLogin}>
                <h2 className="login-title">Portal Login</h2>
                {loginError && <div id="login-error" className="alert alert-warning">{loginError}</div>}
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" id="login-username" name="username" placeholder="Enter your username..." disabled={isLoggingIn} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" id="login-password" name="password" placeholder="Enter your password..." disabled={isLoggingIn} />
                </div>
                <button type="submit" style={{ width: '100%', marginTop: '15px' }} disabled={isLoggingIn}>
                  {isLoggingIn ? "Waking up server..." : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="app-navbar" className="navbar">
        <h1>Graduation Thesis Portal</h1>
        <div className="user-controls">
          <span id="user-greeting">
            {currentUser.role === 'admin' ? 'System Administrator' : `${currentUser.name} (ID: ${currentUser.id})`}
          </span>
          <button onClick={handleLogout} disabled={isLoggingOut} style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.3) !important', border: '1px solid rgba(255,255,255,0.4) !important' }}>
            {isLoggingOut ? "Waking up server..." : "Logout"}
          </button>
        </div>
      </div>

      <div className="container">
        <div id="dashboard-view">
          {currentUser.role === 'admin' && <AdminDash db={db} refreshDb={() => loadData()} currentUser={currentUser} />}
          {currentUser.role === 'professor' && <ProfessorDash db={db} refreshDb={() => loadData()} currentUser={currentUser} />}
          {currentUser.role === 'student' && <StudentDash db={db} refreshDb={() => loadData()} currentUser={currentUser} />}
        </div>
      </div>
    </>
  );
}