import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, tokenStore } from '../api.js';
import { artUrl } from '../lib.js';
import Icon from '../components/Icon.jsx';
import { useStore } from '../store.jsx';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, setUser, setWishlist, setToast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/';

  if (user) return <Navigate to={destination} replace />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.signup(form);
      tokenStore.set(result.token);
      setWishlist([]);
      setUser(result.user);
      api.wishlist().then(setWishlist).catch((problem) => setToast(problem.message));
      navigate(destination, { replace: true });
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-art"><img src={artUrl('Welcome', 'Loomcraft')} alt="" /></div>
      <div className="auth-panel">
        <div className="auth-box">
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Join Loomcraft'}</p>
          <h1>{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
          </div>
          <form onSubmit={submit} className="form-stack">
            {mode === 'signup' && <label>Your name<input value={form.name} onChange={update('name')} autoComplete="name" required minLength={2} maxLength={80} /></label>}
            <label>Email<input type="email" value={form.email} onChange={update('email')} autoComplete="email" required /></label>
            <label>Password<input type="password" value={form.password} onChange={update('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : 1} maxLength={128} /></label>
            {mode === 'signup' && <p className="hint">Use at least 8 characters.</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button wide" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'} <Icon name="arrow" size={18} /></button>
          </form>
          <p className="hint"><Link to="/shop" className="text-link">Continue browsing</Link></p>
        </div>
      </div>
    </main>
  );
}
