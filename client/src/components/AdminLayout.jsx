import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { key: 'dash', label: 'Dashboard', path: '/admin' },
  { key: 'ord', label: 'Orders', path: '/admin/orders' },
  { key: 'prod', label: 'Products', path: '/admin/products' },
  { key: 'req', label: 'Requests', path: '/admin/requests' },
  { key: 'cus', label: 'Customers', path: '/admin/customers' },
  { key: 'set', label: 'Settings', path: '/admin/settings' }
];

export default function AdminLayout({ children, currentTab = 'dash' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutAdmin } = useAuth();

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/account');
  };

  return (
    <div className="ad">
      <aside className="sb">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
          <img
            src="/logo-dress-mark.png"
            alt="Logo"
            style={{ width: '32px', height: '32px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '50%', padding: '2px' }}
          />
          <div>
            <b style={{ color: '#FFFFFF', fontSize: '16px', display: 'block', padding: 0 }}>True Clothing</b>
            <span style={{ color: '#F2B705', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Admin Portal</span>
          </div>
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || (item.key === 'dash' && location.pathname === '/admin');
          return (
            <button
              key={item.key}
              className={`nv ${isActive ? 'on' : ''}`}
              onClick={() => navigate(item.path)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}

        <button
          className="nv"
          onClick={() => navigate('/')}
          type="button"
          style={{ marginTop: '12px' }}
        >
          View shop
        </button>

        <button
          className="nv"
          onClick={handleLogout}
          type="button"
          style={{ marginTop: 'auto' }}
        >
          Log out
        </button>
      </aside>

      <main className="mn">{children}</main>
    </div>
  );
}

