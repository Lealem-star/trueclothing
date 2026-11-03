import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Please enter both username and password');
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginAdmin(username.trim(), password);
      if (res.success) {
        showToast('Admin signed in');
        navigate('/admin');
      }
    } catch (err) {
      showToast(err.message || 'Wrong username or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ct" style={{ maxWidth: '380px', paddingTop: '50px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img
          src="/true-clothing-logo.jpg"
          alt="True Clothing"
          style={{ width: '120px', height: '120px', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
        />
      </div>
      <h1 style={{ margin: 0, fontSize: '24px', textAlign: 'center' }}>Admin sign in</h1>
      <p className="mut" style={{ margin: '8px 0 20px', textAlign: 'center' }}>Staff only. Sign in to manage True Clothing.</p>

      <form onSubmit={handleSubmit}>
        <FormField
          id="au"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          required
        />

        <FormField
          id="ap"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="rw end" style={{ marginTop: '20px' }}>
          <button
            className="chip"
            onClick={() => navigate('/')}
            type="button"
          >
            Back to the shop
          </button>
          <button className="btn acc" type="submit" disabled={submitting}>
            {submitting ? '...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}

