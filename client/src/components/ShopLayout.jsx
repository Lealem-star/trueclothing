import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function ShopLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLang, t } = useLanguage();
  const { customer, admin } = useAuth();
  const { settings } = useSettings();

  const currentPath = location.pathname;
  const isHome = currentPath === '/';
  const isReq = currentPath === '/request';
  const isAccount = currentPath === '/account';

  const cleanPhone = (settings.phone || '').replace(/\D/g, '');
  const telegramHref = settings.telegramUrl?.startsWith('http')
    ? settings.telegramUrl
    : `https://${settings.telegramUrl}`;

  return (
    <div>
      {/* Top Luxury Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-text">
          <span className="announcement-gold">✨ Addis Ababa Atelier:</span>
          <span>Bespoke Shifon & Habesha Kemis Tailoring • Worldwide Express Delivery via DHL/EMS</span>
        </div>
        <div className="announcement-links">
          <a className="announcement-link" href={`tel:${cleanPhone}`}>
            📞 {settings.phone}
          </a>
          <span>•</span>
          <a className="announcement-link" href={telegramHref} target="_blank" rel="noreferrer">
            ✈️ Telegram Channel
          </a>
        </div>
      </div>

      {/* Main Luxury Header */}
      <header className="hd">
        <div className="brand-wrap" onClick={() => navigate('/')}>
          <img
            src="/logo-dress-mark.png"
            alt="True Clothing Logo"
            className="brand-logo-img"
          />
          <div className="brand-info">
            <span className="lg font-display">True Clothing</span>
            <span className="brand-sub">Habesha & Shifon Atelier</span>
          </div>
        </div>

        <nav>
          {/* Quick Call Pill */}
          <a className="call-atelier-pill" href={`tel:${cleanPhone}`}>
            <span className="pulse-dot"></span>
            <span>{settings.phone}</span>
          </a>

          <button
            className={`chip ${isHome ? 'on' : ''}`}
            onClick={() => navigate('/')}
            type="button"
          >
            {t('home')}
          </button>

          <button
            className={`chip ${isReq ? 'on' : ''}`}
            onClick={() => navigate('/request')}
            type="button"
          >
            ✨ {t('req')}
          </button>

          <button
            className={`chip ${isAccount ? 'on' : ''}`}
            onClick={() => navigate('/account')}
            type="button"
          >
            {customer ? '👤 Client Portal' : admin ? 'Admin' : t('in')}
          </button>

          <button className="chip" onClick={toggleLang} type="button" title="Switch Language">
            <span>🇪🇹</span>
            <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
          </button>
        </nav>
      </header>

      {/* Page Content */}
      <main className="ct">{children}</main>

      {/* Floating Telegram Support Widget */}
      <a
        className="floating-telegram-btn"
        href={telegramHref}
        target="_blank"
        rel="noreferrer"
        title="Chat with us on Telegram"
      >
        <span style={{ fontSize: '18px' }}>✈️</span>
        <span>Chat on Telegram</span>
      </a>

      {/* Luxury Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--soft)', marginTop: '48px', padding: '40px 16px 28px' }}>
        <div className="ct" style={{ padding: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '32px',
              marginBottom: '32px'
            }}
          >
            {/* Column 1: Brand & Heritage */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img
                  src="/logo-dress-mark.png"
                  alt="True Clothing Logo"
                  style={{ width: '42px', height: '42px', objectFit: 'contain' }}
                />
                <div>
                  <b className="lg font-display" style={{ fontSize: '19px', display: 'block' }}>{settings.businessName || 'True Clothing'}</b>
                  <span className="brand-sub" style={{ fontSize: '11px' }}>Habesha & Shifon Atelier</span>
                </div>
              </div>
              <p className="mut" style={{ lineHeight: 1.6, fontSize: '13.5px', marginBottom: '16px' }}>
                Authentic Ethiopian Shifon dresses, traditional royal Habesha Kemis, and premium fabrics.
                Handcrafted with love by master weavers and tailors in Addis Ababa.
              </p>
              <div className="rw" style={{ gap: '10px' }}>
                <a className="chip" href={`tel:${cleanPhone}`}>
                  📞 {settings.phone}
                </a>
                <a className="chip" href={telegramHref} target="_blank" rel="noreferrer">
                  ✈️ @Trueclothing16
                </a>
              </div>
            </div>

            {/* Column 2: Atelier Services */}
            <div>
              <b style={{ fontSize: '14px', display: 'block', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>
                Atelier Services
              </b>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/request')}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    ✨ Bespoke Tailoring & Custom Kemis
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/request')}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    📦 Wholesale & Bulk Fabric Supply
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/request')}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    🌍 Worldwide Express Delivery (DHL / EMS)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('/account')}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    👤 Client Orders & Measurements Portal
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Showroom & Hours */}
            <div>
              <b style={{ fontSize: '14px', display: 'block', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink)' }}>
                Atelier & Showrooms
              </b>
              <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <b style={{ color: 'var(--ink)', display: 'block' }}>📍 Addis Ababa, Ethiopia</b>
                  <span>Mercato Fabric Quarter & Bole Medhanialem Showroom</span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <b style={{ color: 'var(--ink)', display: 'block' }}>🕒 Working Hours (EAT)</b>
                  <span>Monday – Saturday: 8:30 AM – 7:30 PM</span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <b style={{ color: 'var(--ink)', display: 'block' }}>✈️ Diaspora Orders & Support</b>
                  <span>Direct fitting consultations 7 days a week on Telegram</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--mut)' }}>
            <span>© {new Date().getFullYear()} {settings.businessName || 'True Clothing'}. Handcrafted Ethiopian Heritage Fashion.</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>
              Staff Portal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
