import { useState, useEffect } from 'react';
import { apiFetch } from './api';
import { AdminDash, ProfessorDash, StudentDash } from './Dashboards';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [db, setDb] = useState({ users: [], classes: [], topics: [], classAccess: [], registrations: [] });
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  const loadData = async () => {
    try {
      // No token needed! Cookies handle it securely.
      const data = await apiFetch('/api/data', 'GET');
      setDb(data);
    } catch (e) {
      console.error(e);
      handleLogout();
    }
  };

  useEffect(() => {
    const init = async () => {
      // We only save the basic user profile for the UI, NOT the token!
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
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      // Using your new secure apiFetch instead of raw fetch
      const data = await apiFetch('/api/login', 'POST', { username, password });

      setCurrentUser(data.user);
      localStorage.setItem('hustUserProfile', JSON.stringify(data.user));
      await loadData();
    } catch (err) {
      setLoginError('Invalid credentials.');
    }
  };

  const handleLogout = async () => {
    try {
      // Tell the backend to actively destroy the secure cookies
      await apiFetch('/api/logout', 'POST');
    } catch (e) { console.error("Logout error", e); }

    setCurrentUser(null);
    setDb({ users: [], classes: [], topics: [], classAccess: [], registrations: [] });
    localStorage.removeItem('hustUserProfile');
  };

  if (loading) {
    return (
      <div className="container">
        <div id="loading-screen" className="login-wrapper">
          <div className="login-hero-container" style={{ maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
            <h2 style={{ border: 'none', marginTop: '0' }}>Connecting to Database...</h2>
            <p style={{ color: '#555' }}>Please wait.</p>
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
                  <input type="text" id="login-username" name="username" placeholder="Enter your username..." />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" id="login-password" name="password" placeholder="Enter your password..." />
                </div>
                <button type="submit" style={{ width: '100%', marginTop: '15px' }}>Sign In</button>
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
          <button onClick={handleLogout} style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.3) !important', border: '1px solid rgba(255,255,255,0.4) !important' }}>Logout</button>
        </div>
      </div>

      <div className="container">
        <div id="dashboard-view">
          {/* Notice the tokens are completely removed from these components! */}
          {currentUser.role === 'admin' && <AdminDash db={db} refreshDb={() => loadData()} currentUser={currentUser} />}
          {currentUser.role === 'professor' && <ProfessorDash db={db} refreshDb={() => loadData()} currentUser={currentUser} />}
          {currentUser.role === 'student' && <StudentDash db={db} refreshDb={() => loadData()} currentUser={currentUser} />}
        </div>
      </div>
    </>
  );
}